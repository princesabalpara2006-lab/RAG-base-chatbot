import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from rag.db import RAGDatabase

router = APIRouter()

class ConversationCreate(BaseModel):
    document_id: str
    title: str = "New Conversation"

class RenameRequest(BaseModel):
    title: str

class FeedbackRequest(BaseModel):
    message_index: int
    feedback: str = None # 'like', 'dislike', or None/empty

class BookmarkRequest(BaseModel):
    message_index: int
    bookmarked: bool

@router.get("/conversations")
def get_conversations():
    return RAGDatabase.get_conversations()

@router.post("/conversations")
def create_conversation(req: ConversationCreate):
    # Verify document exists
    doc = RAGDatabase.get_document(req.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    conversation_id = uuid.uuid4().hex
    conv = RAGDatabase.create_conversation(conversation_id, req.document_id, req.title)
    return conv

@router.get("/conversations/{conversation_id}")
def get_conversation_details(conversation_id: str):
    conv = RAGDatabase.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conv

@router.put("/conversations/{conversation_id}/rename")
def rename_conversation(conversation_id: str, req: RenameRequest):
    conv = RAGDatabase.update_conversation_title(conversation_id, req.title)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conv

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str):
    success = RAGDatabase.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {"status": "success", "message": "Conversation deleted."}

@router.post("/conversations/{conversation_id}/feedback")
def update_feedback(conversation_id: str, req: FeedbackRequest):
    # Validate feedback value
    if req.feedback not in ["like", "dislike", None, ""]:
        raise HTTPException(status_code=400, detail="Invalid feedback type. Must be 'like', 'dislike', or null/empty.")
        
    val = req.feedback if req.feedback in ["like", "dislike"] else None
    msg = RAGDatabase.update_message_feedback(conversation_id, req.message_index, val)
    if not msg:
        raise HTTPException(status_code=404, detail="Conversation or message index not found.")
    return {"status": "success", "message": "Feedback updated.", "message_data": msg}

@router.post("/conversations/{conversation_id}/bookmark")
def update_bookmark(conversation_id: str, req: BookmarkRequest):
    msg = RAGDatabase.update_message_bookmark(conversation_id, req.message_index, req.bookmarked)
    if not msg:
        raise HTTPException(status_code=404, detail="Conversation or message index not found.")
    return {"status": "success", "message": "Bookmark updated.", "message_data": msg}
