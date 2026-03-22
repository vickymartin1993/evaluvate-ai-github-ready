/**
 * Evaluvate AI — Health Check Function
 *
 * GET /api/health
 *
 * Used by the deploy workflow to confirm the Function App started
 * correctly after deployment. Returns current environment and version.
 *
 * Also useful for: Azure App Service health check configuration,
 * uptime monitoring (e.g., UptimeRobot), and quick sanity checks.
 *
 * Returns 200 if the function runtime is healthy.
 * Does NOT check Cosmos DB or Blob Storage connectivity (that would
 * slow startup and require credentials in the health endpoint).
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous", // Health check must be accessible without a key
  route: "health",
  handler: async (_req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    return {
      status: 200,
      jsonBody: {
        status: "healthy",
        service: "evaluvate-backend",
        version: "0.1.0",
        environment: process.env.NODE_ENV ?? "unknown",
        timestamp: new Date().toISOString(),
        // Show which AI services are configured (not the keys, just presence)
        services: {
          gemini: !!process.env.GEMINI_API_KEY,
          azureOpenAI: !!process.env.AZURE_OPENAI_API_KEY,
          cosmos: !!process.env.COSMOS_CONNECTION_STRING,
          blobStorage: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
        },
      },
    };
  },
});
