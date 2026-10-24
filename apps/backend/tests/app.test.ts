import { describe, it, expect } from "vitest";
import { buildApp } from "../src/app.js";

describe("Fastify Foundation & Error Envelope", () => {
  it("should respond 200 OK on /health with request_id", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe("ok");
    expect(body.request_id).toBeDefined();
  });

  it("should format errors in canonical uniform envelope { error: { code, message, request_id } }", async () => {
    const app = buildApp();
    app.get("/test-error", async () => {
      const err: any = new Error("Custom validation error");
      err.statusCode = 400;
      err.code = "CUSTOM_ERROR";
      throw err;
    });

    const res = await app.inject({
      method: "GET",
      url: "/test-error",
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("CUSTOM_ERROR");
    expect(body.error.message).toBe("Custom validation error");
    expect(body.error.request_id).toBeDefined();
  });
});
