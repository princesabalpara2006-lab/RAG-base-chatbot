import os
from langchain_community.vectorstores import FAISS
from backend.rag.embeddings import get_embeddings

# Root storage directory for vector index files
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VECTORSTORE_DIR = os.path.join(BASE_DIR, "storage", "vectorstores")

def get_vectorstore_path(document_id: str) -> str:
    """Returns the local path where the vector store for document_id is stored."""
    return os.path.join(VECTORSTORE_DIR, document_id)

def create_vectorstore(docs, document_id: str) -> FAISS:
    """Creates a FAISS index from documents and saves it to disk."""
    embeddings = get_embeddings()
    db = FAISS.from_documents(docs, embeddings)
    
    path = get_vectorstore_path(document_id)
    os.makedirs(path, exist_ok=True)
    db.save_local(path)
    return db

def load_vectorstore(document_id: str) -> FAISS:
    """Loads an existing FAISS index from disk."""
    embeddings = get_embeddings()
    path = get_vectorstore_path(document_id)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Vector store path not found: {path}")
    
    # allow_dangerous_deserialization is required for loading pickled FAISS objects
    db = FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True)
    return db

def delete_vectorstore(document_id: str):
    """Deletes a saved vector store from disk."""
    path = get_vectorstore_path(document_id)
    if os.path.exists(path):
        import shutil
        shutil.rmtree(path)
