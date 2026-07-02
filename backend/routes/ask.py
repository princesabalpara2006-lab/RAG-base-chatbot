import os
import json
import asyncio
import time
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from rag.vectorstore import load_vectorstore
from rag.retriever import retrieve_context
from rag.db import RAGDatabase

router = APIRouter()

class AskRequest(BaseModel):
    document_id: str
    question: str
    conversation_id: str = None

@router.post("/ask")
async def ask_question(request: AskRequest):
    # Record starting time to measure performance
    start_time = time.time()
    
    # Verify document exists and load FAISS index
    try:
        db = load_vectorstore(request.document_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, 
            detail="Document not found. Please upload the file first."
        )
    except Exception as e:
        print(f"Error loading vectorstore: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Error loading vector database."
        )
        
    # Get active settings from local DB
    settings = RAGDatabase.get_settings()
    provider = settings.get("provider", "groq")
    model = settings.get("model", "llama-3.3-70b-versatile")
    threshold = settings.get("threshold", 0.3)
    system_prompt_template = settings.get("system_prompt", "")
    api_keys = settings.get("api_keys", {})
    
    # Retrieve relevant contexts
    results, max_score, is_confident = retrieve_context(db, request.question, threshold=threshold)
    
    # Create conversation if id provided but doesn't exist
    conversation_id = request.conversation_id
    if conversation_id:
        conv = RAGDatabase.get_conversation(conversation_id)
        if not conv:
            RAGDatabase.create_conversation(conversation_id, request.document_id)
            
    # Get chat history (up to last 8 messages for context memory)
    chat_history_block = ""
    if conversation_id:
        conv = RAGDatabase.get_conversation(conversation_id)
        if conv:
            past_msgs = conv.get("messages", [])[-8:]
            if past_msgs:
                history_lines = []
                for msg in past_msgs:
                    role_label = "User" if msg["role"] == "user" else "Assistant"
                    history_lines.append(f"{role_label}: {msg['text']}")
                chat_history_block = "Conversation History:\n" + "\n".join(history_lines) + "\n\n"
                
    # Record user message in DB
    if conversation_id:
        RAGDatabase.add_message(conversation_id, "user", request.question)
        
    async def event_generator():
        # strict guardrail check
        if not is_confident or not results:
            guardrail_text = "Sorry, this information is not available in the uploaded document."
            tokens = guardrail_text.split(" ")
            for i, token in enumerate(tokens):
                space = " " if i > 0 else ""
                yield f"data: {json.dumps({'token': space + token})}\n\n"
                await asyncio.sleep(0.03)
                
            # Add message to DB
            if conversation_id:
                RAGDatabase.add_message(conversation_id, "ai", guardrail_text, "N/A")
                RAGDatabase.add_response_time(time.time() - start_time)
                
            yield f"data: {json.dumps({'source': 'N/A', 'confidence': 0.0, 'chunks': [], 'done': True})}\n\n"
            return
            
        # Format the chunks into standard context for the LLM
        context_parts = []
        retrieved_chunks = []
        for i, (doc, score) in enumerate(results):
            p = doc.metadata.get("page", 1)
            t = doc.metadata.get("type", "pdf")
            label = "Page" if t == "pdf" else "Slide"
            
            context_parts.append(
                f"Chunk {i+1} (Source {label}: {p}):\n{doc.page_content}"
            )
            retrieved_chunks.append({
                "text": doc.page_content,
                "page": p,
                "type": t,
                "score": round(score, 4)
            })
        context = "\n\n".join(context_parts)
        
        # Build prompt using custom system template
        prompt = f"""{system_prompt_template}
        
Context:
{context}

{chat_history_block}Current Question: {request.question}

Answer:"""
        
        # Fetch API key based on chosen provider
        api_key = api_keys.get(provider) or os.environ.get(f"{provider.upper()}_API_KEY")
        
        if not api_key:
            err = f"Error: API Key for {provider.upper()} is not configured. Please set it in Settings."
            yield f"data: {json.dumps({'token': err})}\n\n"
            yield f"data: {json.dumps({'source': 'N/A', 'confidence': 0.0, 'chunks': [], 'done': True})}\n\n"
            return
            
        # Build list of de-duplicated page citations
        sources = []
        for doc, score in results:
            p = doc.metadata.get("page")
            t = doc.metadata.get("type", "pdf")
            label = "Page" if t == "pdf" else "Slide"
            sources.append(f"{label} {p}")
        
        unique_sources = []
        for s in sources:
            if s not in unique_sources:
                unique_sources.append(s)
        source_citation = ", ".join(unique_sources)
        
        full_response = ""
        
        try:
            if provider == "groq":
                from groq import Groq
                client = Groq(api_key=api_key)
                # Use settings model, or fall back to llama-3.3-70b-versatile
                model_name = model if model else "llama-3.3-70b-versatile"
                chat_completion = client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=model_name,
                    temperature=0.0,
                    stream=True
                )
                
                for chunk in chat_completion:
                    delta = chunk.choices[0].delta.content
                    if delta:
                        full_response += delta
                        yield f"data: {json.dumps({'token': delta})}\n\n"
                        
            elif provider in ["openai", "gemini"]:
                from openai import OpenAI
                
                if provider == "openai":
                    client = OpenAI(api_key=api_key)
                    model_name = model if model else "gpt-4o-mini"
                else: # gemini
                    # Google Gemini API OpenAI Compatibility Endpoint
                    client = OpenAI(
                        api_key=api_key,
                        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
                    )
                    model_name = model if model else "gemini-1.5-flash"
                
                chat_completion = client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=model_name,
                    temperature=0.0,
                    stream=True
                )
                
                for chunk in chat_completion:
                    if chunk.choices and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta.content
                        if delta:
                            full_response += delta
                            yield f"data: {json.dumps({'token': delta})}\n\n"
            
            # Check for refusal indicators
            refusal_indicators = [
                "sorry, this information is not available",
                "not available in the uploaded document",
                "cannot find"
            ]
            if any(ind in full_response.lower() for ind in refusal_indicators):
                source_citation = "N/A"
            
            # Save AI response in DB
            if conversation_id:
                RAGDatabase.add_message(conversation_id, "ai", full_response, source_citation)
                # Save response metrics
                RAGDatabase.add_response_time(time.time() - start_time)
                
            yield f"data: {json.dumps({
                'source': source_citation, 
                'confidence': round(max_score, 4),
                'chunks': retrieved_chunks,
                'done': True
            })}\n\n"
            
        except Exception as e:
            print(f"{provider.upper()} API Error: {e}")
            err_msg = f"Something went wrong while querying {provider.upper()}. Please verify your API keys and try again."
            yield f"data: {json.dumps({'token': err_msg})}\n\n"
            yield f"data: {json.dumps({'source': 'N/A', 'confidence': 0.0, 'chunks': [], 'done': True})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")
