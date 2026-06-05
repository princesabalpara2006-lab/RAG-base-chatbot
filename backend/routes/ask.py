import os
import json
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from backend.rag.vectorstore import load_vectorstore
from backend.rag.retriever import retrieve_context

router = APIRouter()

class AskRequest(BaseModel):
    document_id: str
    question: str

@router.post("/ask")
async def ask_question(request: AskRequest):
    # Load the document's FAISS index
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
        
    # Retrieve relevant contexts
    results, max_score, is_confident = retrieve_context(db, request.question)
    
    async def event_generator():
        # strict guardrail check
        if not is_confident or not results:
            guardrail_text = "Sorry, this information is not available in the uploaded document."
            # Simulate streaming of the exact guardrail text
            tokens = guardrail_text.split(" ")
            for i, token in enumerate(tokens):
                space = " " if i > 0 else ""
                yield f"data: {json.dumps({'token': space + token})}\n\n"
                await asyncio.sleep(0.04) # brief sleep to animate
            # Return N/A source for guardrail response
            yield f"data: {json.dumps({'source': 'N/A', 'done': True})}\n\n"
            return
            
        # Format the chunks into standard context for the LLM
        context_parts = []
        for i, (doc, score) in enumerate(results):
            context_parts.append(
                f"Chunk {i+1} (Source Page/Slide: {doc.metadata.get('page')}):\n{doc.page_content}"
            )
        context = "\n\n".join(context_parts)
        
        # Format the RAG guardrail prompt
        from backend.rag.prompt import SYSTEM_PROMPT
        prompt = SYSTEM_PROMPT.format(context=context, question=request.question)
        
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            err = "Error: GROQ_API_KEY is not configured on the backend server."
            yield f"data: {json.dumps({'token': err})}\n\n"
            yield f"data: {json.dumps({'source': 'N/A', 'done': True})}\n\n"
            return
            
        try:
            from groq import Groq
            client = Groq(api_key=api_key)
            model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
            
            chat_completion = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=model,
                temperature=0.0,  # 0.0 is crucial to keep answers precise and strictly tied to context
                stream=True
            )
            
            # Extract citations from the sources of retrieved chunks
            sources = []
            for doc, score in results:
                p = doc.metadata.get("page")
                t = doc.metadata.get("type", "pdf")
                label = "Page" if t == "pdf" else "Slide"
                sources.append(f"{label} {p}")
            
            # De-duplicate citations
            unique_sources = []
            for s in sources:
                if s not in unique_sources:
                    unique_sources.append(s)
            source_citation = ", ".join(unique_sources)
            
            full_response = ""
            for chunk in chat_completion:
                delta = chunk.choices[0].delta.content
                if delta:
                    full_response += delta
                    yield f"data: {json.dumps({'token': delta})}\n\n"
            
            # If the LLM generates the guardrail message or states it can't find it, cite source as N/A
            refusal_indicators = [
                "sorry, this information is not available",
                "not available in the uploaded document"
            ]
            if any(ind in full_response.lower() for ind in refusal_indicators):
                source_citation = "N/A"
                
            yield f"data: {json.dumps({'source': source_citation, 'done': True})}\n\n"
            
        except Exception as e:
            print(f"Groq API Error: {e}")
            yield f"data: {json.dumps({'token': 'Something went wrong. Please try again.'})}\n\n"
            yield f"data: {json.dumps({'source': 'N/A', 'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
