# 🧠 Mindora — Enterprise Multi-Modal RAG Platform

Mindora is a production-grade Document Intelligence and Question-Answering system powered by **Spring Boot 3.4.3**, **PostgreSQL pgvector**, **Spring AI (OpenAI)**, and **React + Vite**. It features parallel hybrid retrieval, out-of-domain guardrails, real-time voice chat, conversational memory, and deep citation verification.

---

## ⚡ Key Capabilities & Architecture

### 1. 🔍 Parallel Hybrid Search (pgvector + Keyword RRF)
* Executes **1536-dimensional semantic vector search** (`pgvector`) and **PostgreSQL exact keyword matching** (`ILIKE`) concurrently on separate worker threads (`CompletableFuture.allOf`).
* Merges and reranks candidates using **Reciprocal Rank Fusion (RRF with $K=60$)** to guarantee 100% recall on technical acronyms, serial numbers, and semantic context.

### 2. 🛡️ Anti-Hallucination Guardrails & Query Routing
* Evaluates similarity confidence; if queries fall below threshold ($<0.45$ for unscoped queries), Mindora triggers safety guardrails.
* Disclaims out-of-domain knowledge, strips false citations, and answers safely from general AI knowledge without hallucinating.

### 3. 💬 Persistent Chat History & Conversational Memory
* **Multi-turn dialogue persistence** in PostgreSQL (`conversations` and `chat_messages` tables).
* Automatically injects the **last 4 dialogue turns** into the prompt context for seamless follow-up inquiries.
* **Async AI Title Generator**: The LLM automatically generates a concise 3–5 word topic title (e.g., *"PromptCraft Architecture Summary"*) in the background.
* **1-Click Export**: Export conversation transcripts to **Markdown (`.md`)** or **JSON (`.json`)**.

### 4. 🧠 Interactive Mind Map & Concept Hierarchy Visualizer
* Generates an **interactive draggable concept tree** from document vector chunks with smooth SVG Bézier curves, pan & zoom, branch collapse/expand, and a **Concept Inspector Drawer**.
* **1-Click Ask AI**: Select any concept node to immediately ask targeted inquiries.
* **Multi-Format Export**: Download knowledge trees as **PNG**, **SVG**, or **Markdown (`.md`)**.
* **Redis + DB Cache**: 24-hour Redis caching + PostgreSQL record persistence with exact token telemetry.

### 5. 🖼️ Multi-Modal Image & Architecture Diagram Citations
* **Apache PDFBox 3.x Extraction**: Automatically extracts high-resolution embedded architecture diagrams, workflow charts, and system designs during document ingestion.
* **Inline Chat Citations**: Embeds diagram preview cards directly in the assistant chat bubble when answering related questions.
* **Interactive Lightbox Modal**: Full-screen modal with **Zoom (up to 400%)**, **Pan & Drag**, **Rotate 90°**, and **1-Click Download**.

### 6. 🎓 Active Recall Study Hub & AI Quiz Generator
* Automatically creates **multiple-choice quizzes** and **3D flip flashcard decks** from document chunks with instant grading, score percentages, and source explanations.

### 7. 📚 Multi-Document Scoping & Cross-Document Comparison (Multi-RAG)
* Select multiple documents via checkboxes or the chat scope dropdown to perform comparative analysis (e.g. comparing contracts, candidate resumes, or architecture specifications side-by-side).

### 8. 🎙️ Real-Time Voice Chat & Read Aloud Audio AI
* **Speech-to-Text (STT)**: Speak questions directly into your microphone with live waveform feedback.
* **Text-to-Speech (TTS)**: 1-click audio reading of responses with markdown cleaning.

### 9. 📑 Click-to-Highlight Citation Deep-Dive
* Verified citations showing page numbers, chunk indices, and similarity match percentages.
* 1-click modal inspector displaying full extracted passage snippets and raw JSON vector embedding metadata.

### 10. ⚡ Redis Semantic Caching & Distributed Rate Limiter
* **Sub-15ms Latency & $0 Cost**: Identical or scoped queries hit Redis cache and return instantaneously with 0 LLM token cost.
* **Targeted Invalidation**: Deleting or re-indexing documents automatically clears associated cached queries.
* **Distributed Token Bucket**: Enforces cluster-wide rate limits (30 chat queries/min, 10 uploads/min) across load-balanced instances.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Java 21, Spring Boot 3.4.3, Spring AI 1.0.0-M6, Spring Security, JWT (JJWT) |
| **Database & Vector Store** | PostgreSQL 16, `pgvector` extension, Hibernate / JPA, JDBC Template |
| **Caching & Rate Limiting** | Redis 7, Spring Data Redis, Lettuce Pool, `@Cacheable`, Token Bucket |
| **Document Processing** | Apache Tika, Spring AI Token/Text Splitters |
| **AI Models** | OpenAI `gpt-4o` / `gpt-4o-mini`, `text-embedding-3-small` (1536 dims) |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Web Speech API |

---

## 🚀 Getting Started

### 1. Prerequisites
* **Java 21**
* **Node.js 18+**
* **Docker & Docker Compose** (for PostgreSQL + pgvector + Redis)

### 2. Start PostgreSQL & Redis Services
```bash
docker-compose up -d
```

### 3. Start the Spring Boot Backend
```bash
./mvnw clean spring-boot:run
```
*Backend runs on `http://localhost:9081` with OpenAPI documentation at `/swagger-ui.html`.*

### 4. Start the Frontend
```bash
cd frontend/docmind-frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 📖 How to Use Mindora

1. **Upload Documents**: Upload `.pdf`, `.docx`, `.txt`, `.md`, or `.csv` files via the upload dialog.
2. **Select / Scope Documents**: Choose 1 document, multiple documents for comparison, or query across all files.
3. **Ask via Voice or Text**: Speak or type questions with real-time streaming answers.
4. **Inspect Citations**: Click on citation badges or the external inspect icon to verify source passages.
5. **Access Platform Guide**: Click **"Guide & Docs"** in the top navbar or **"Platform Guide & Arch"** in the sidebar.
