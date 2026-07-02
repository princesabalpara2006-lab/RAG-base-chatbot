import os
import sys
import time
import json
import logging
from datetime import datetime

# Ensure the backend directory is always on sys.path so that
# `from routes.xxx import ...` works when running `python app.py`
# from inside the backend/ folder or from the project root.
_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv

# Load environment variables
backend_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(backend_dir, ".env")
load_dotenv(dotenv_path=dotenv_path)

# Configure logging
LOG_DIR = os.path.join(backend_dir, "storage", "logs")
os.makedirs(LOG_DIR, exist_ok=True)
log_file = os.path.join(LOG_DIR, "app.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_file, encoding="utf-8")
    ]
)
logger = logging.getLogger("RAGApplication")
logger.info("Initializing FastAPI Backend Server...")

app = FastAPI(
    title="RAG Document QA API",
    description="Production-grade API for processing PDF/PPTX files and querying with strict guardrails.",
    version="1.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Rate Limiter Middleware
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 120, window: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window = window
        self.requests = {} # IP -> list of timestamps

    async def dispatch(self, request: Request, call_next):
        # Exclude preflight and healthcheck
        if request.method == "OPTIONS" or request.url.path in ["/health", "/"]:
            return await call_next(request)
            
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Clean expired timestamps
        if client_ip in self.requests:
            self.requests[client_ip] = [t for t in self.requests[client_ip] if now - t < self.window]
        else:
            self.requests[client_ip] = []
            
        if len(self.requests[client_ip]) >= self.limit:
            logger.warning(f"Rate limit triggered for client: {client_ip} on path: {request.url.path}")
            return Response(
                content=json.dumps({"detail": "Rate limit exceeded. Please wait a moment."}),
                status_code=429,
                media_type="application/json"
            )
            
        self.requests[client_ip].append(now)
        return await call_next(request)

app.add_middleware(RateLimitMiddleware, limit=120, window=60)

# Custom Exception Handler / Request logger middleware
@app.middleware("http")
async def log_requests_and_handle_errors(request: Request, call_next):
    start_time = time.time()
    response = None
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        logger.info(f"{request.method} {request.url.path} - Status: {response.status_code} - Completed in: {process_time:.2f}ms")
        return response
    except Exception as e:
        logger.error(f"Unhandled server error on {request.method} {request.url.path}: {str(e)}", exc_info=True)
        return Response(
            content=json.dumps({
                "detail": "An internal server error occurred. Our engineers have been notified."
            }),
            status_code=500,
            media_type="application/json"
        )

# Import routes
from routes.upload import router as upload_router
from routes.ask import router as ask_router
from routes.summary import router as summary_router
from routes.settings import router as settings_router
from routes.stats import router as stats_router
from routes.history import router as history_router

# Include routers
app.include_router(upload_router)
app.include_router(ask_router)
app.include_router(summary_router)
app.include_router(settings_router)
app.include_router(stats_router)
app.include_router(history_router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "RAG Document QA API is running. Ready to upload documents."
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "storage_connected": os.path.exists(os.path.join(backend_dir, "storage"))
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
