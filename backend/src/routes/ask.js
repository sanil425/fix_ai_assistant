import { Router } from "express";
const router = Router();

/**
 * POST /ask
 * body: { query: string, version?: "4.0"|"4.2"|"4.4"|"5.0" }
 * returns: { answer, citations: [{title,url}], used_version }
 */
// NOTE: This route is intentionally disabled. Use FastAPI /api/ask on :8000.
router.post("/", (req, res) => {
  res.status(501).json({ error: "Use FastAPI at /api/ask on port 8000" });
});

export default router;
