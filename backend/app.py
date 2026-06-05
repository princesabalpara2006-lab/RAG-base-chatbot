import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
backend_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(backend_dir, ".env")
load_dotenv(dotenv_path=dotenv_path)

app = FastAPI(
    title="RAG Document QA API",
    description="FastAPI backend for processing PDF/PPTX files and answering questions via local FAISS and Groq API.",
    version="1.0.0"
)

# Configure CORS for React frontend (Vite defaults to port 5173, but we allow all origins for ease of development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routes
from backend.routes.upload import router as upload_router
from backend.routes.ask import router as ask_router
from backend.routes.summary import router as summary_router

# Include routers directly to match expected endpoints
app.include_router(upload_router)
app.include_router(ask_router)
app.include_router(summary_router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "RAG Document QA API is running. Ready to upload documents."
    }

if __name__ == "__main__":
    import uvicorn
    # Allow running directly via python backend/app.py
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("backend.app:app", host="0.0.0.0", port=port, reload=True)
