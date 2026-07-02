import os
import json
import threading
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "storage", "db.json")

# Ensure storage directory exists
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

class RAGDatabase:
    _lock = threading.Lock()

    @staticmethod
    def _read():
        with RAGDatabase._lock:
            if not os.path.exists(DB_PATH):
                # Initialize empty state
                initial_state = {
                    "documents": {},
                    "conversations": {},
                    "stats": {
                        "total_questions": 0,
                        "total_files_processed": 0,
                        "total_chats_created": 0,
                        "total_response_time": 0.0,
                        "average_response_time": 0.0
                    },
                    "settings": {
                        "provider": "groq",
                        "model": "llama-3.3-70b-versatile",
                        "threshold": 0.3,
                        "system_prompt": "You are DocuMind, a precise document Q&A assistant powered by RAG.\nYou answer ONLY from the retrieved document chunks provided.\nYou NEVER hallucinate facts, guess, or use outside knowledge.\n\nREASONING PROTOCOL — follow every step, in order, for every reply:\n\n<think>\nSTEP 1 — UNDERSTAND THE QUESTION\n  - Restate the user's question in one plain sentence.\n  - Identify: What type of answer is needed? (fact / list / explanation / comparison / procedure)\n  - Identify: Any ambiguous terms or pronouns that need resolving from context?\n\nSTEP 2 — SCAN THE CHUNKS\n  - List each retrieved chunk by index: [C1], [C2], [C3]…\n  - For each chunk, note in one line: is it RELEVANT, PARTIAL, or IRRELEVANT to the question?\n  - Flag any chunks that contradict each other.\n\nSTEP 3 — EXTRACT EVIDENCE\n  - Quote or closely paraphrase the exact sentences from the chunks that answer the question.\n  - Tag each piece of evidence with its chunk: (C2), (C4)…\n  - If no chunk contains the answer, write: EVIDENCE: NONE FOUND\n\nSTEP 4 — CHECK CONFIDENCE\n  - HIGH: The answer is directly stated in 1+ chunks.\n  - MEDIUM: The answer requires minor inference across chunks.\n  - LOW: The answer requires significant inference. Flag for the user.\n  - NONE: No evidence found. Refuse to answer; say so clearly.\n\nSTEP 5 — DRAFT THE ANSWER\n  - Write the final answer using ONLY the extracted evidence.\n  - Cite chunk references inline: [C2], [C4]\n  - Keep it concise and direct. No padding.\n</think>\n\nAfter </think>, output ONLY the final answer with inline citations.\nDo NOT reveal the <think> block to the user.\nIf confidence is NONE, reply: \"The document doesn't contain enough information to answer this question.\"",
                        "api_keys": {
                            "openai": "",
                            "gemini": "",
                            "groq": ""
                        }
                    }
                }
                with open(DB_PATH, "w", encoding="utf-8") as f:
                    json.dump(initial_state, f, indent=2, ensure_ascii=False)
                return initial_state

            try:
                with open(DB_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error reading DB: {e}")
                # Return standard dict if corrupted
                return {}

    @staticmethod
    def _write(data):
        with RAGDatabase._lock:
            try:
                with open(DB_PATH, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
            except Exception as e:
                print(f"Error writing DB: {e}")

    # Settings API
    @staticmethod
    def get_settings():
        db = RAGDatabase._read()
        return db.get("settings", {})

    @staticmethod
    def update_settings(settings):
        db = RAGDatabase._read()
        current_settings = db.get("settings", {})
        
        # Merge key values
        for key in ["provider", "model", "threshold", "system_prompt"]:
            if key in settings:
                current_settings[key] = settings[key]
                
        # Merge API keys if present
        if "api_keys" in settings:
            for provider, key in settings["api_keys"].items():
                current_settings["api_keys"][provider] = key
                
        db["settings"] = current_settings
        RAGDatabase._write(db)
        return current_settings

    # Documents API
    @staticmethod
    def add_document(doc_id, filename, file_size_bytes, page_count=0):
        db = RAGDatabase._read()
        doc = {
            "document_id": doc_id,
            "filename": filename,
            "file_size": file_size_bytes,
            "page_count": page_count,
            "upload_time": datetime.now().isoformat(),
            "status": "ready"
        }
        db["documents"][doc_id] = doc
        db["stats"]["total_files_processed"] += 1
        RAGDatabase._write(db)
        return doc

    @staticmethod
    def get_documents():
        db = RAGDatabase._read()
        return list(db.get("documents", {}).values())

    @staticmethod
    def get_document(doc_id):
        db = RAGDatabase._read()
        return db.get("documents", {}).get(doc_id)

    @staticmethod
    def delete_document(doc_id):
        db = RAGDatabase._read()
        if doc_id in db["documents"]:
            del db["documents"][doc_id]
            # Delete corresponding conversations if they belong to this doc
            conv_ids_to_del = [cid for cid, conv in db["conversations"].items() if conv.get("document_id") == doc_id]
            for cid in conv_ids_to_del:
                del db["conversations"][cid]
            # Decrement chat count by deleted conversation count
            db["stats"]["total_chats_created"] = max(0, db["stats"]["total_chats_created"] - len(conv_ids_to_del))
            RAGDatabase._write(db)
            return True
        return False

    # Conversations API
    @staticmethod
    def create_conversation(conversation_id, document_id, title="New Conversation"):
        db = RAGDatabase._read()
        conv = {
            "conversation_id": conversation_id,
            "document_id": document_id,
            "title": title,
            "messages": [],
            "timestamp": datetime.now().isoformat()
        }
        db["conversations"][conversation_id] = conv
        db["stats"]["total_chats_created"] += 1
        RAGDatabase._write(db)
        return conv

    @staticmethod
    def get_conversations():
        db = RAGDatabase._read()
        return sorted(list(db.get("conversations", {}).values()), key=lambda c: c["timestamp"], reverse=True)

    @staticmethod
    def get_conversation(conv_id):
        db = RAGDatabase._read()
        return db.get("conversations", {}).get(conv_id)

    @staticmethod
    def update_conversation_title(conv_id, title):
        db = RAGDatabase._read()
        if conv_id in db["conversations"]:
            db["conversations"][conv_id]["title"] = title
            RAGDatabase._write(db)
            return db["conversations"][conv_id]
        return None

    @staticmethod
    def add_message(conv_id, role, text, source="N/A", feedback=None, bookmarked=False):
        db = RAGDatabase._read()
        if conv_id not in db["conversations"]:
            return None
        
        msg = {
            "role": role,
            "text": text,
            "source": source,
            "feedback": feedback, # 'like', 'dislike', or None
            "bookmarked": bookmarked,
            "timestamp": datetime.now().isoformat()
        }
        db["conversations"][conv_id]["messages"].append(msg)
        
        # If it is a user question, update total questions counter
        if role == "user":
            db["stats"]["total_questions"] += 1
            
        RAGDatabase._write(db)
        return msg

    @staticmethod
    def delete_conversation(conv_id):
        db = RAGDatabase._read()
        if conv_id in db["conversations"]:
            del db["conversations"][conv_id]
            # Decrement chat count
            db["stats"]["total_chats_created"] = max(0, db["stats"]["total_chats_created"] - 1)
            RAGDatabase._write(db)
            return True
        return False

    @staticmethod
    def update_message_feedback(conv_id, msg_index, feedback):
        db = RAGDatabase._read()
        if conv_id in db["conversations"]:
            messages = db["conversations"][conv_id]["messages"]
            if 0 <= msg_index < len(messages):
                messages[msg_index]["feedback"] = feedback
                RAGDatabase._write(db)
                return messages[msg_index]
        return None

    @staticmethod
    def update_message_bookmark(conv_id, msg_index, bookmarked):
        db = RAGDatabase._read()
        if conv_id in db["conversations"]:
            messages = db["conversations"][conv_id]["messages"]
            if 0 <= msg_index < len(messages):
                messages[msg_index]["bookmarked"] = bookmarked
                RAGDatabase._write(db)
                return messages[msg_index]
        return None

    # Stats API
    @staticmethod
    def get_stats():
        db = RAGDatabase._read()
        stats = db.get("stats", {})
        
        # Calculate storage size
        storage_size = 0
        documents = db.get("documents", {})
        for doc in documents.values():
            storage_size += doc.get("file_size", 0)
            
        # Get count details
        stats["total_documents"] = len(documents)
        stats["storage_usage_bytes"] = storage_size
        stats["total_chats_created"] = len(db.get("conversations", {}))
        return stats

    @staticmethod
    def add_response_time(duration):
        db = RAGDatabase._read()
        db["stats"]["total_response_time"] += duration
        total_questions = db["stats"]["total_questions"]
        if total_questions > 0:
            db["stats"]["average_response_time"] = round(db["stats"]["total_response_time"] / total_questions, 2)
        else:
            db["stats"]["average_response_time"] = round(duration, 2)
        RAGDatabase._write(db)
