import { FastifyInstance } from "fastify";
import { nutritionLogCreateSchema } from "./nutrition-log.schema.js";
import * as nutritionLogService from "./nutrition-log.service.js";
import { NutritionLogError } from "./nutrition-log.service.js";

export default async function nutritionLogRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  // GET /api/nutrition-logs?clientId=...&days=...
  fastify.get<{
    Querystring: { clientId?: string; days?: string };
  }>("/", async (request, reply) => {
    try {
      const { clientId, days } = request.query;
      return await nutritionLogService.getLogs(
        request.user.tenantId,
        request.user.id,
        request.user.role,
        request.user.clientProfileId,
        clientId,
        days ? parseInt(days, 10) : undefined
      );
    } catch (err) {
      if (err instanceof NutritionLogError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  // POST /api/nutrition-logs
  fastify.post("/", async (request, reply) => {
    const body = nutritionLogCreateSchema.parse(request.body);
    try {
      const log = await nutritionLogService.createLog(
        body,
        request.user.id,
        request.user.role,
        request.user.clientProfileId,
        request.user.tenantId
      );
      return reply.code(201).send(log);
    } catch (err) {
      if (err instanceof NutritionLogError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });
}
