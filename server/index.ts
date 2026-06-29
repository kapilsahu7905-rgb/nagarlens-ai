import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeCivicIssue,
  compareResolutionImages,
  demoFollowup,
  demoIssueAnalysis,
  demoResolution,
  generateIssueFollowup,
} from "./gemini.js";
import {
  analyzeRequestSchema,
  followupRequestSchema,
  resolutionRequestSchema,
} from "./schemas.js";
import { safeErrorMessage } from "./utils.js";

const app = express();
const port = Number(process.env.PORT || 3001);
const demoMode = process.env.DEMO_MODE === "true";

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(cors());
app.use(express.json({ limit: "14mb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait a minute and try again." },
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    demoMode,
  });
});

app.post("/api/analyze-issue", async (req, res) => {
  try {
    const input = analyzeRequestSchema.parse(req.body);
    const analysis = demoMode
      ? demoIssueAnalysis(input.description, input.language)
      : await analyzeCivicIssue(input);
    res.json({ analysis, meta: { demo: demoMode, model: process.env.GEMINI_MODEL || "gemini-3.5-flash" } });
  } catch (error) {
    console.error("analyze-issue error", error);
    res.status(400).json({ error: safeErrorMessage(error) });
  }
});

app.post("/api/verify-resolution", async (req, res) => {
  try {
    const input = resolutionRequestSchema.parse(req.body);
    const analysis = demoMode ? demoResolution(input.language) : await compareResolutionImages(input);
    res.json({ analysis, meta: { demo: demoMode, model: process.env.GEMINI_MODEL || "gemini-3.5-flash" } });
  } catch (error) {
    console.error("verify-resolution error", error);
    res.status(400).json({ error: safeErrorMessage(error) });
  }
});

app.post("/api/generate-followup", async (req, res) => {
  try {
    const input = followupRequestSchema.parse(req.body);
    const followup = demoMode ? demoFollowup(input.language) : await generateIssueFollowup(input);
    res.json({ followup, meta: { demo: demoMode, model: process.env.GEMINI_MODEL || "gemini-3.5-flash" } });
  } catch (error) {
    console.error("generate-followup error", error);
    res.status(400).json({ error: safeErrorMessage(error) });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

app.use(express.static(distPath));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"), (error) => {
    if (error) res.status(404).send("NagarLens AI frontend has not been built. Run npm run build.");
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`NagarLens AI server running on http://0.0.0.0:${port}`);
});
