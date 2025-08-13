// DISABLED: Using FastAPI backend on :8000 for AI. Do not run this server.
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import askRouter from "./src/routes/ask.js";
import schemaRouter from "./src/routes/schema.js";
import toolsRouter from "./src/routes/tools.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const ALLOWED = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const isProd = process.env.NODE_ENV === "production";

// CORS: allow localhost in dev; restrict in prod using ALLOWED_ORIGIN
app.use(cors(isProd ? { origin: ALLOWED, credentials: true } : { origin: true, credentials: true }));

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/ask", askRouter);
app.use("/schema", schemaRouter);
app.use("/tools", toolsRouter);

// 404 for unknown routes
app.use((req, res) => res.status(404).json({ error: "Not found", path: req.path }));

// Central error handler
app.use((err, _req, res, _next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`FIX backend listening on http://localhost:${PORT}`);
});
