import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import pdf from "pdf-parse";
import cors from 'cors'

import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import OpenAI from "openai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ---------------- OpenAI Compatible Gemini ----------------
const openai = new OpenAI({
  apiKey: process.env.GOOGLE_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// ---------------- Embeddings ----------------
const embedder = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY,
  modelName: "gemini-embedding-001",
});

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";

// ---------------- Upload Directory ----------------
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ---------------- Multer ----------------
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// =========================================================
// ROUTE: Upload PDFs
// =========================================================
app.post("/api/upload", upload.array("pdfs"), async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No PDF files uploaded" });
    }

    let allDocs = [];

    // Read all uploaded PDFs
    for (const file of files) {
      const buffer = fs.readFileSync(file.path);
      const parsedPdf = await pdf(buffer);

      const extractedText = parsedPdf.text.trim();

      // Only process documents that actually contain text
      if (extractedText.length > 0) {
        allDocs.push(
          new Document({
            pageContent: extractedText,
            metadata: { source: file.originalname },
          })
        );
      }
    }

    // Abort if no readable text was found (e.g., scanned images)
    if (allDocs.length === 0) {
      for (const file of files) fs.unlinkSync(file.path); // cleanup
      return res.status(400).json({
        error: "No readable text found in the uploaded PDFs. If these are scanned documents, you will need an OCR tool to extract the text.",
      });
    }

    // Split into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await splitter.splitDocuments(allDocs);

    // Filter out any completely empty chunks
    const validDocs = splitDocs.filter((doc) => doc.pageContent.trim().length > 0);

    const collectionName = `pdf_${uuidv4().replace(/-/g, "").slice(0, 8)}`;

    // Create collection and insert docs
    await QdrantVectorStore.fromDocuments(validDocs, embedder, {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName,
    });

    // Delete temp files
    for (const file of files) {
      try { fs.unlinkSync(file.path); } catch { }
    }

    return res.json({
      success: true,
      collectionName,
      chunksProcessed: validDocs.length,
      uploadedFiles: files.length,
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    // Cleanup temp files on error
    if (req.files) {
      for (const file of req.files) {
        try { fs.unlinkSync(file.path); } catch { }
      }
    }

    let errorMessage = error.message;

    // Sanitize database errors so the frontend UI doesn't break
    if (errorMessage.includes("422 Unprocessable Entity") || errorMessage.includes("dense vector must not be empty")) {
      errorMessage = "Failed to process PDF: The AI could not extract valid text. It may be an image-based or corrupted document.";
    }

    return res.status(500).json({ error: errorMessage });
  }
});

// =========================================================
// ROUTE: Chat
// =========================================================
app.post("/api/chat", async (req, res) => {
  try {
    const { question, collectionName } = req.body;

    if (!question || !collectionName) {
      return res.status(400).json({ error: "question and collectionName are required" });
    }

    const vectorStore = await QdrantVectorStore.fromExistingCollection(embedder, {
      url: QDRANT_URL,
      collectionName,
    });

    const docs = await vectorStore.similaritySearch(question, 10);
    const context = docs.map((doc) => doc.pageContent).join("\n\n");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gemini-3.1-flash-lite",
      stream: true,
      messages: [
        {
          role: "system",
          content: `
        You are an expert, highly precise AI assistant.
        
You have been provided with specific document context below. 
Your primary task is to fulfill the user's request using the provided context as your sole source of factual information.
        
CRITICAL RULES:
1. FACTUAL GROUNDING: You must not introduce external facts, outside knowledge, or new business logic to answer factual queries. If a factual question cannot be answered using the provided context, explicitly state: "I cannot answer this based on the uploaded documents." Do not guess or hallucinate.
2. CONTEXT ISOLATION: If the context contains multiple unrelated documents, isolate ONLY the information relevant to the user's specific question. Ignore the rest. Do NOT attempt to connect unrelated topics just because they appear in the same context.
3. PERMITTED TRANSFORMATIONS (CRITICAL): While you are strictly confined to the facts and raw data within the provided context, you ARE explicitly authorized to manipulate that data based on the user's instructions. You may use your internal knowledge to:
   - Refactor, shorten, optimize, or debug code found in the context.
   - Summarize, rewrite, translate, or explain text found in the context.
   - Reformat data into tables, lists, or JSON.
   When performing these transformations, ensure you preserve the original semantic meaning and functionality of the provided context.

Context:
${context}
      `,
        },
        { role: "user", content: question },
      ],
    });

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ delta: content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("CHAT ERROR:", error);
    res.status(500).json({ error: "An error occurred while processing your chat request." });
  }
});

app.get("/api/health", (_, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});