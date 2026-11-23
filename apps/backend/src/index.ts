import { buildApp } from "./app.js";
import { APP_VERSION, getDeployCommit } from "./config/version.js";

const app = buildApp();

/**
 * Serverless function entrypoint for Vercel deployment.
 * Bridges incoming Vercel/Node.js HTTP request and response into Fastify.
 */
export default async function handler(req: any, res: any) {
  // Direct diagnostic probe for health endpoint
  if (req.url === "/api/v1/health" || req.url === "/health" || req.url?.endsWith("/health")) {
    if (res && !res.headersSent) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          status: "ok",
          version: APP_VERSION,
          commit: getDeployCommit(),
          probe: "handler_reached",
          url: req.url,
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }
  }

  try {
    await app.ready();
    await new Promise<void>((resolve, reject) => {
      if (res.writableEnded || res.finished) {
        return resolve();
      }
      const timer = setTimeout(() => {
        resolve();
      }, 15000);
      res.once("finish", () => {
        clearTimeout(timer);
        resolve();
      });
      res.once("close", () => {
        clearTimeout(timer);
        resolve();
      });
      res.once("error", (err: any) => {
        clearTimeout(timer);
        reject(err);
      });
      app.server.emit("request", req, res);
    });
  } catch (err: any) {
    console.error("[SERVERLESS_HANDLER_ERROR]:", err);
    if (res && !res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: err?.message || "Internal serverless error",
          },
        })
      );
    }
  }
}

export { app };
