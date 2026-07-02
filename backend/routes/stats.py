from fastapi import APIRouter
from rag.db import RAGDatabase

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats():
    stats = RAGDatabase.get_stats()
    
    # Get recent documents (up to 5)
    docs = RAGDatabase.get_documents()
    recent_docs = sorted(docs, key=lambda d: d.get("upload_time", ""), reverse=True)[:5]
    
    # Get recent conversations (up to 5)
    convs = RAGDatabase.get_conversations()
    # Strip full messages list from recent chats list to keep payload light
    recent_convs = []
    for c in convs[:5]:
        recent_convs.append({
            "conversation_id": c["conversation_id"],
            "document_id": c["document_id"],
            "title": c["title"],
            "timestamp": c["timestamp"],
            "message_count": len(c.get("messages", []))
        })
        
    return {
        "metrics": {
            "total_documents": stats.get("total_documents", 0),
            "total_chats": stats.get("total_chats_created", 0),
            "storage_usage_bytes": stats.get("storage_usage_bytes", 0),
            "total_questions": stats.get("total_questions", 0),
            "average_response_time": stats.get("average_response_time", 0.0)
        },
        "recent_documents": recent_docs,
        "recent_conversations": recent_convs
    }
