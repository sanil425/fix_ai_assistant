import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal map for Day 2; easy to extend later
const fileMap = {
  "4.4": {
    "D": path.join(__dirname, "..", "schemas", "4.4", "new_order_single.json")
  }
};

router.get("/:version/:msgType", (req, res) => {
  const { version, msgType } = req.params;
  const fp = fileMap?.[version]?.[msgType];
  if (!fp) return res.status(404).json({ error: "Schema not found" });

  try {
    const json = JSON.parse(fs.readFileSync(fp, "utf8"));
    res.json(json);
  } catch (e) {
    res.status(500).json({ error: "Failed to load schema", details: String(e?.message || e) });
  }
});

export default router;
