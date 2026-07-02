import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from rag.vectorstore import load_vectorstore
from rag.db import RAGDatabase

router = APIRouter()

class SummaryRequest(BaseModel):
    document_id: str

@router.post("/summary")
async def generate_summary(request: SummaryRequest):
    try:
        db = load_vectorstore(request.document_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, 
            detail="Document not found. Please upload it first."
        )
    except Exception as e:
        print(f"Error loading vectorstore: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Error loading vector database."
        )
        
    # Retrieve all documents from the internal docstore in the FAISS index
    try:
        docs = list(db.docstore._dict.values())
    except Exception as e:
        print(f"Error reading docstore: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to retrieve document chunks from vector index."
        )
        
    if not docs:
        raise HTTPException(
            status_code=400, 
            detail="The document contains no indexable content to summarize."
        )
        
    # Sort pages to keep chronological reading order
    docs.sort(key=lambda d: d.metadata.get("page", 0))
    
    # Combine texts
    full_text = "\n\n".join([doc.page_content for doc in docs])
    
    # Cap size of text to send to LLM to prevent context overflow or high API latency
    max_char_limit = 20000
    if len(full_text) > max_char_limit:
        # Generate a smart, representative sample across the document (head, middle, tail chunks)
        n = len(docs)
        head = docs[:min(5, n)]
        tail = docs[-min(3, n):] if n > 5 else []
        middle = docs[n//2 - 1 : n//2 + 1] if n > 8 else []
        
        sampled_docs = []
        for d in head + middle + tail:
            if d not in sampled_docs:
                sampled_docs.append(d)
        
        sampled_docs.sort(key=lambda d: d.metadata.get("page", 0))
        full_text = "\n\n".join([d.page_content for d in sampled_docs])
        full_text = full_text[:max_char_limit]
        
    # Get active settings from local DB
    settings = RAGDatabase.get_settings()
    provider = settings.get("provider", "groq")
    model = settings.get("model", "llama-3.3-70b-versatile")
    api_keys = settings.get("api_keys", {})
    
    # Fetch API key
    api_key = api_keys.get(provider) or os.environ.get(f"{provider.upper()}_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=400, 
            detail=f"API Key for {provider.upper()} is not configured. Please set it in Settings."
        )
        
    prompt = f"""You are a document summarizer.
Write a concise, professional, and well-structured summary of the document based ONLY on the following text.
Highlight the main objective, key points, and critical conclusions using clear formatting and bullet points.
Do not use external knowledge or make assumptions.

Text:
{full_text}

Summary:"""

    try:
        if provider == "groq":
            from groq import Groq
            client = Groq(api_key=api_key)
            model_name = model if model else "llama-3.3-70b-versatile"
            
            response = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=model_name,
                temperature=0.3,
                max_tokens=600
            )
            summary = response.choices[0].message.content.strip()
            
        elif provider in ["openai", "gemini"]:
            from openai import OpenAI
            
            if provider == "openai":
                client = OpenAI(api_key=api_key)
                model_name = model if model else "gpt-4o-mini"
            else: # gemini
                client = OpenAI(
                    api_key=api_key,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
                )
                model_name = model if model else "gemini-1.5-flash"
                
            response = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=model_name,
                temperature=0.3,
                max_tokens=600
            )
            summary = response.choices[0].message.content.strip()
            
        return {"summary": summary}
        
    except Exception as e:
        print(f"Error querying {provider.upper()} for summary: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate document summary via {provider.upper()}. Please try again."
        )
