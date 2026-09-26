const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const cluster = require("cluster");
const os = require("os");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const envWorkers = process.env.WEB_CONCURRENCY || process.env.WORKERS;
const numWorkers = envWorkers
  ? Math.max(1, parseInt(envWorkers, 10))
  : process.env.CLUSTER_MODE === "true"
    ? Math.max(1, os.availableParallelism ? os.availableParallelism() : os.cpus().length)
    : 1;

if (numWorkers > 1 && cluster.isPrimary) {
  console.log(`Frontend Primary process ${process.pid} running. Spawning ${numWorkers} worker processes...`);
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker, code, signal) => {
    console.warn(`Frontend worker ${worker.process.pid} exited (code: ${code}, signal: ${signal}). Spawning replacement...`);
    cluster.fork();
  });
} else {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error occurred handling request:", err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    }).listen(port, () => {
      console.log(`> Frontend worker ${process.pid} ready on http://${hostname}:${port}`);
    });
  });
}
