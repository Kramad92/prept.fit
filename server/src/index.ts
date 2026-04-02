import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import closeWithGrace from "close-with-grace";

import { env } from "./config/env.js";
import authPlugin from "./plugins/auth.js";
import errorHandler from "./plugins/error-handler.js";
import { initSocket } from "./lib/socket.js";
import { startAllWorkers } from "./jobs/index.js";
import { setupRepeatableJobs } from "./lib/queue.js";

// Module routes
import authRoutes from "./modules/auth/auth.routes.js";
import clientRoutes from "./modules/clients/client.routes.js";
import clientDetailRoutes from "./modules/clients/client-detail.routes.js";
import messageRoutes from "./modules/messages/message.routes.js";
import workoutRoutes from "./modules/workouts/workout.routes.js";
import mealPlanRoutes from "./modules/meal-plans/meal-plan.routes.js";
import programRoutes from "./modules/programs/program.routes.js";
import nutritionProgramRoutes from "./modules/nutrition-programs/nutrition-program.routes.js";
import nutritionLogRoutes from "./modules/nutrition-logs/nutrition-log.routes.js";
import exerciseLibRoutes from "./modules/exercise-library/exerciseLibrary.routes.js";
import exerciseCategoryRoutes from "./modules/exercise-categories/exerciseCategory.routes.js";
import equipmentTypeRoutes from "./modules/equipment-types/equipmentType.routes.js";
import foodLibRoutes from "./modules/food-library/foodLibrary.routes.js";
import foodSearchRoutes from "./modules/food-search/foodSearch.routes.js";
import habitRoutes from "./modules/habits/habit.routes.js";
import checkInRoutes from "./modules/check-ins/checkIn.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";
import availabilityRoutes from "./modules/availability/availability.routes.js";
import scheduleRoutes from "./modules/schedules/schedule.routes.js";
import bookingRoutes from "./modules/booking/booking.routes.js";
import uploadRoutes from "./modules/upload/upload.routes.js";
import searchRoutes from "./modules/search/search.routes.js";
import paymentRoutes from "./modules/payments/payment.routes.js";
import trainingGroupRoutes from "./modules/training-groups/trainingGroup.routes.js";
import groupSessionRoutes from "./modules/group-sessions/groupSession.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import portalRoutes from "./modules/portal/portal.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import publicRoutes from "./modules/public/public.routes.js";
import inviteRoutes from "./modules/invite/invite.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import userRoutes from "./modules/user/user.routes.js";

// ─── Create Fastify instance ────────────────────────────────

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === "development" ? "info" : "warn",
    transport:
      env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

// ─── Register plugins ───────────────────────────────────────

await fastify.register(helmet);
await fastify.register(cors, {
  origin: env.FRONTEND_URL,
  credentials: true,
});
await fastify.register(cookie);
await fastify.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
await fastify.register(authPlugin);
await fastify.register(errorHandler);

// ─── Health check ───────────────────────────────────────────

fastify.get("/health", async () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
}));

// ─── Register module routes ─────────────────────────────────

// Auth (public)
await fastify.register(authRoutes, { prefix: "/api/auth" });
await fastify.register(inviteRoutes, { prefix: "/api/invite" });
await fastify.register(publicRoutes, { prefix: "/api/public" });

// Coach routes
await fastify.register(clientRoutes, { prefix: "/api/clients" });
await fastify.register(clientDetailRoutes, { prefix: "/api/clients" });
await fastify.register(messageRoutes, { prefix: "/api/messages" });
await fastify.register(workoutRoutes, { prefix: "/api/workouts" });
await fastify.register(mealPlanRoutes, { prefix: "/api/meal-plans" });
await fastify.register(programRoutes, { prefix: "/api/programs" });
await fastify.register(nutritionProgramRoutes, { prefix: "/api/nutrition-programs" });
await fastify.register(nutritionLogRoutes, { prefix: "/api/nutrition-logs" });
await fastify.register(exerciseLibRoutes, { prefix: "/api/exercise-library" });
await fastify.register(exerciseCategoryRoutes, { prefix: "/api/exercise-categories" });
await fastify.register(equipmentTypeRoutes, { prefix: "/api/equipment-types" });
await fastify.register(foodLibRoutes, { prefix: "/api/food-library" });
await fastify.register(foodSearchRoutes, { prefix: "/api/food-search" });
await fastify.register(habitRoutes, { prefix: "/api/habits" });
await fastify.register(checkInRoutes, { prefix: "/api/check-ins" });
await fastify.register(notificationRoutes, { prefix: "/api/notifications" });
await fastify.register(settingsRoutes, { prefix: "/api/settings" });
await fastify.register(availabilityRoutes, { prefix: "/api/availability" });
await fastify.register(scheduleRoutes, { prefix: "/api/schedules" });
await fastify.register(bookingRoutes, { prefix: "/api/booking" });
await fastify.register(uploadRoutes, { prefix: "/api/upload" });
await fastify.register(searchRoutes, { prefix: "/api/search" });
await fastify.register(paymentRoutes, { prefix: "/api/payments" });
await fastify.register(trainingGroupRoutes, { prefix: "/api/training-groups" });
await fastify.register(groupSessionRoutes, { prefix: "/api/group-sessions" });
await fastify.register(aiRoutes, { prefix: "/api/ai" });
await fastify.register(dashboardRoutes, { prefix: "/api/dashboard" });
await fastify.register(userRoutes, { prefix: "/api/user" });

// Portal (client-facing)
await fastify.register(portalRoutes, { prefix: "/api/portal" });

// Admin
await fastify.register(adminRoutes, { prefix: "/api/admin" });

// ─── Start server ───────────────────────────────────────────

const start = async () => {
  try {
    await fastify.listen({ port: env.PORT, host: "0.0.0.0" });

    // Initialize WebSocket on the underlying http server
    const httpServer = fastify.server;
    initSocket(httpServer);

    // Start background job workers
    const workers = startAllWorkers();

    // Register repeatable jobs (nutrition verification every 6h)
    await setupRepeatableJobs();

    // ─── Graceful shutdown ────────────────────────────────────
    closeWithGrace({ delay: 5000 }, async ({ signal, err }) => {
      if (err) fastify.log.error(err);
      fastify.log.info(`Shutting down (${signal})...`);

      await Promise.all(workers.map((w) => w.close()));
      await fastify.close();
    });

    fastify.log.info(`
  ┌─────────────────────────────────────────┐
  │  PrePT API Server (Fastify)             │
  │  http://localhost:${env.PORT}                │
  │  WebSocket: ws://localhost:${env.PORT}        │
  │  Environment: ${env.NODE_ENV.padEnd(24)}│
  └─────────────────────────────────────────┘
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
