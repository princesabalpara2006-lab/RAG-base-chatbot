# DocuMind RAG - Document Question Answering System

DocuMind RAG is a production-ready Document Question Answering (QA) application. Users can upload PDF or PPT/PPTX files, get auto-generated suggested questions, summarize the file on-demand, and ask questions through a sleek, real-time streaming chat interface.

The system enforces a **Strict RAG Guardrail** and a **Confidence Check** to ensure answers are only generated from the uploaded document, preventing hallucinations.

---

## Tech Stack

### Backend
- **Python FastAPI**: Core REST and SSE streaming endpoints.
- **LangChain**: Core RAG pipeline, loaders, and templates.
- **FAISS**: Local Vector database (stored on disk by `document_id`).
- **Sentence Transformers**: `all-MiniLM-L6-v2` local embeddings model.
- **Groq API**: Llama 3 (`llama-3.3-70b-versatile` or `llama-3.1-8b-instant`) for fast response generation.
- **python-pptx**: Slide-by-slide PowerPoint parser.
- **PyPDF**: PDF loader.

### Frontend
- **React.js (Vite)**: Component-driven UI.
- **Tailwind CSS**: Sleek glassmorphic dark-theme styles.
- **Axios & Fetch Streams**: Handle uploads and SSE token chunks.
- **Lucide Icons**: Modern vector icon set.

---

## Project Structure

```text
RAG bas chatbot/
├── backend/
│   ├── app.py                  # FastAPI Application Entry
│   ├── requirements.txt        # Python Dependencies
│   ├── .env.example            # Environment Configurations
│   ├── routes/
│   │   ├── upload.py           # POST /upload (indexing & suggestion)
│   │   ├── ask.py              # POST /ask (SSE streaming & citation)
│   │   └── summary.py          # POST /summary (document summarization)
│   └── rag/
│       ├── loaders.py          # PDF & PPTX parsing engines
│       ├── splitter.py         # Text chunker (RecursiveCharacterTextSplitter)
│       ├── embeddings.py       # SentenceTransformers local model
│       ├── vectorstore.py      # FAISS read/write disk utility
│       ├── retriever.py        # Cosine similarity and confidence checker
│       └── prompt.py           # Strict guardrail prompt definition
├── frontend/
│   ├── package.json            # React Node Packages
│   ├── index.html              # Core HTML structure
│   ├── tailwind.config.js      # Custom theme configurations
│   ├── postcss.config.js       # PostCSS loader configuration
│   └── src/
│       ├── main.jsx            # React Bootstrap
│       ├── App.jsx             # React Router setups
│       ├── index.css           # Core styling directives
│       ├── pages/
│       │   └── Dashboard.jsx   # Page Controller (States & Coordination)
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── UploadArea.jsx  # Drag & Drop with progress
│       │   ├── DocumentStatus.jsx
│       │   ├── ChatWindow.jsx  # ChatGPT-like window with citations
│       │   ├── SuggestedQuestions.jsx
│       │   └── SummaryPanel.jsx
│       └── services/
│           └── api.js          # HTTP requests and SSE stream handler
├── docs/
│   ├── PRD.md                  # Product Requirements Document
│   └── FRD.md                  # Functional Requirements Document
└── README.md                   # Setup Guide (This file)
```

---

## Setup & Running Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+
- Groq API Key (Sign up at [Groq Console](https://console.groq.com/))

### 1. Setup Backend

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Create a Python Virtual Environment:
   ```bash
   python -m venv venv
   ```

3. Activate the Virtual Environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

4. Install the backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Configure Environment Variables:
   Copy `.env.example` to `.env` and enter your Groq API key:
   ```bash
   copy .env.example .env
   ```
   Edit the `.env` file:
   ```env
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=llama-3.3-70b-versatile
   RAG_SIMILARITY_THRESHOLD=0.4
   ```

6. Run the FastAPI development server:
   ```bash
   python app.py
   ```
   The backend will be running at `http://localhost:8000`.

---

### 2. Setup Frontend

1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the React development server:
   ```bash
   npm run dev
   ```
   The frontend will be running at `http://localhost:5173`. Open this URL in your web browser.

---

## How It Works

1. **File Uploading**: Standard progress bars show the progress of client-to-server uploads. Files are processed byte-by-byte and stored.
2. **Text Chunking & Indexing**: PDF/PPTX contents are extracted, parsed, split into `800` character overlapping segments, embedded locally, and written to disk in a FAISS folder.
3. **Question Suggester**: Llama-3 automatically reviews representative chunks from the document and outputs 5 highly specific questions.
4. **Similarity Confidence Check**: When a user queries, the database performs a cosine similarity lookup. If the maximum similarity score is below `0.4`, it instantly stops execution and outputs the guardrail text: `"Sorry, this information is not available in the uploaded document."` to prevent hallucinating.
5. **Streaming Response**: Valid answers are streamed to the frontend character-by-character, accompanied by source page/slide citations.
