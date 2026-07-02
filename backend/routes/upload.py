import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from rag.loaders import load_document
from rag.splitter import split_documents
from rag.vectorstore import create_vectorstore, delete_vectorstore
from rag.db import RAGDatabase

router = APIRouter()

# Directories for temp files
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "storage", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class UploadResponse(BaseModel):
    status: str
    document_id: str
    filename: str
    questions: list[str]

def generate_suggested_questions(docs, document_id: str) -> list[str]:
    """Generates 5 relevant questions from the document chunks using Groq API."""
    if not docs:
        return []
    
    # Take a diverse set of chunks to represent the document
    n = len(docs)
    if n <= 3:
        sampled_docs = docs
    else:
        # Get start, middle, end chunks
        sampled_docs = [docs[0], docs[n // 2], docs[-1]]
        
    combined_text = "\n\n".join([doc.page_content for doc in sampled_docs])
    # Keep it to a safe token limit
    combined_text = combined_text[:3000]
    
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        # Default placeholder questions if API key is not present
        return [
            "What is the main topic of this document?",
            "What are the key findings?",
            "Can you summarize the introduction?",
            "What conclusions does the author draw?",
            "What are the main recommendations?"
        ]
        
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
        
        prompt = f"""You are a document analyzer.
Based on the following text extracted from a document, generate exactly 5 distinct, relevant, and specific questions that a user might ask about the content.
Each question must be answerable using only the provided text.
Format the output as a clean numbered list from 1 to 5. Do not include any intro, outro, or additional commentary.

Text:
{combined_text}

Questions:"""
        
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=model,
            temperature=0.7,
            max_tokens=300
        )
        
        content = response.choices[0].message.content.strip()
        questions = []
        for line in content.split("\n"):
            line = line.strip()
            # Detect lines starting with "1.", "2." etc.
            if line and any(line.startswith(f"{i}.") or line.startswith(f"{i})") for i in range(1, 6)):
                parts = line.split(".", 1) if "." in line else line.split(")", 1)
                if len(parts) > 1:
                    q = parts[1].strip()
                    if q:
                        questions.append(q)
                        
        if len(questions) >= 3:
            return questions[:5]
            
    except Exception as e:
        print(f"Error generating questions via Groq: {e}")
        
    return [
        "What is the main topic of this document?",
        "What are the key findings?",
        "Can you summarize the introduction?",
        "What conclusions does the author draw?",
        "What are the main recommendations?"
    ]

@router.get("/documents")
def get_all_documents():
    return RAGDatabase.get_documents()

@router.delete("/documents/{document_id}")
def delete_document_endpoint(document_id: str):
    doc = RAGDatabase.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    # Delete from local JSON DB
    RAGDatabase.delete_document(document_id)
    
    # Delete FAISS vectorstore on disk
    try:
        delete_vectorstore(document_id)
    except Exception as e:
        print(f"Error deleting vectorstore: {e}")
        
    # Delete uploaded source file if it exists
    filename = doc.get("filename", "")
    _, ext = os.path.splitext(filename.lower())
    source_file = os.path.join(UPLOAD_DIR, f"{document_id}{ext}")
    if os.path.exists(source_file):
        try:
            os.remove(source_file)
        except Exception as e:
            print(f"Error deleting raw file: {e}")
            
    return {"status": "success", "message": "Document and indexes deleted successfully."}

@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    # Validate extension
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    if ext not in [".pdf", ".ppt", ".pptx"]:
        raise HTTPException(
            status_code=400, 
            detail="Only PDF and PPT files are supported."
        )
    
    document_id = uuid.uuid4().hex
    temp_file_path = os.path.join(UPLOAD_DIR, f"{document_id}{ext}")
    
    try:
        # Save uploaded file locally
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_size = os.path.getsize(temp_file_path)
            
        # 1. Load document slide-by-slide or page-by-page
        raw_docs = load_document(temp_file_path)
        if not raw_docs:
            raise HTTPException(
                status_code=400, 
                detail="The uploaded document appears to be empty."
            )
            
        page_count = max([d.metadata.get("page", 0) for d in raw_docs]) if raw_docs else 0
            
        # 2. Split text into chunks
        chunks = split_documents(raw_docs)
        if not chunks:
            raise HTTPException(
                status_code=400, 
                detail="No text could be extracted and chunked from the document."
            )
            
        # 3. Create & save vector store locally
        create_vectorstore(chunks, document_id)
        
        # 4. Save metadata to DB
        RAGDatabase.add_document(document_id, filename, file_size, page_count)
        
        # 5. Generate suggested questions based on chunks
        suggested_questions = generate_suggested_questions(chunks, document_id)
        
        return UploadResponse(
            status="success",
            document_id=document_id,
            filename=filename,
            questions=suggested_questions
        )
        
    except HTTPException:
        # Clean up file on failure
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise
    except Exception as e:
        # Clean up file on failure
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        print(f"Error processing upload: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Something went wrong during document processing. Please try again."
        )
