from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from rag.db import RAGDatabase

router = APIRouter()

class SettingsUpdate(BaseModel):
    provider: str = None
    model: str = None
    threshold: float = None
    system_prompt: str = None
    api_keys: dict[str, str] = None

def mask_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "********"
    return f"{key[:4]}...{key[-4:]}"

@router.get("/settings")
def get_settings():
    settings = RAGDatabase.get_settings()
    # Mask API keys before sending to the client
    api_keys = settings.get("api_keys", {})
    masked_keys = {k: mask_key(v) for k, v in api_keys.items()}
    
    return {
        "provider": settings.get("provider", "groq"),
        "model": settings.get("model", "llama-3.3-70b-versatile"),
        "threshold": settings.get("threshold", 0.3),
        "system_prompt": settings.get("system_prompt", ""),
        "api_keys_status": {k: bool(v) for k, v in api_keys.items()},
        "masked_api_keys": masked_keys
    }

@router.post("/settings")
def update_settings(update: SettingsUpdate):
    # Retrieve current settings
    settings = RAGDatabase.get_settings()
    
    update_dict = {}
    if update.provider is not None:
        if update.provider not in ["groq", "openai", "gemini"]:
            raise HTTPException(status_code=400, detail="Invalid provider. Must be groq, openai, or gemini.")
        update_dict["provider"] = update.provider
        
    if update.model is not None:
        update_dict["model"] = update.model
        
    if update.threshold is not None:
        if not (0.0 <= update.threshold <= 1.0):
            raise HTTPException(status_code=400, detail="Threshold must be between 0.0 and 1.0.")
        update_dict["threshold"] = update.threshold
        
    if update.system_prompt is not None:
        update_dict["system_prompt"] = update.system_prompt
        
    if update.api_keys is not None:
        current_keys = settings.get("api_keys", {})
        for provider, key in update.api_keys.items():
            if provider not in ["groq", "openai", "gemini"]:
                continue
            # If the user sends a masked key, do not overwrite the actual key in the database
            if key.startswith("****") or ("..." in key and len(key) < 20):
                continue
            current_keys[provider] = key
        update_dict["api_keys"] = current_keys
        
    RAGDatabase.update_settings(update_dict)
    
    return {"status": "success", "message": "Settings updated successfully."}
