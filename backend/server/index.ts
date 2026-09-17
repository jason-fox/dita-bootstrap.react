import path from "node:path";
import express from "express";
import cors from "cors";

const PORT = Number(process.env.PORT ?? 4000);
// point this at a dita2bootstrap-ast output directory to serve real content
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, "../data");

const app = express();
app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ ok: true, dataDir: DATA_DIR });
});

app.use(
  "/data",
  express.static(DATA_DIR, {
    extensions: ["json"],
    setHeaders: (res) => res.setHeader("Cache-Control", "no-cache"),
  }),
);

app.listen(PORT, () => {
  console.log(`dbjson-harness backend listening on http://localhost:${PORT}`);
  console.log(`serving ${DATA_DIR} under /data`);
});
