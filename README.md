# PDF Intelligence — MERN Stack

A RAG-powered PDF chat app built with **React + Express + Node.js + Qdrant**.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Express (Node.js ESM) |
| Embeddings | Google Gemini Embedding |
| LLM | Gemini 2.0 Flash (via OpenAI-compatible API) |
| Vector DB | Qdrant |

## Project Structure

```
pdf-intelligence/
├── backend/
│   ├── server.js          # Express API (upload + chat endpoints)
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main chat UI
│   │   ├── api/index.js   # API helpers (upload + SSE streaming)
│   │   └── components/
│   │       ├── Sidebar.jsx   # File upload panel
│   │       └── Message.jsx   # Chat message with Markdown
│   ├── vite.config.js
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## Quick Start

### 1. Set environment variable

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set GOOGLE_API_KEY=your_key
```

### 2. Run with Docker Compose

```bash
docker-compose up --build
```

- Frontend → http://localhost:3000  
- Backend API → http://localhost:5000  
- Qdrant dashboard → http://localhost:6333/dashboard

### 3. Local Development (without Docker)

**Start Qdrant:**
```bash
docker-compose up qdrant
```

**Backend:**
```bash
cd backend
cp .env.example .env   # fill in GOOGLE_API_KEY
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/upload` | Upload PDFs → embed → return `collectionName` |
| POST | `/api/chat` | SSE stream: query vector store + LLM response |
| GET | `/api/health` | Health check |

### Upload request
```
POST /api/upload
Content-Type: multipart/form-data
Body: pdfs[] = <files>
```

### Chat request
```
POST /api/chat
Content-Type: application/json
{ "question": "...", "collectionName": "pdf_abc12345" }
```
Response: Server-Sent Events stream of `{ delta: "..." }` tokens, ending with `[DONE]`.
