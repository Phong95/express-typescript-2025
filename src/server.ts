import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { openAPIRouter } from "@/api-docs/openAPIRouter";
import { healthCheckRouter } from "@/controllers/healthCheck/healthCheckRouter";
import { userRouter } from "@/controllers/user/user.router";
import errorHandler from "@/middlewares/error-handler.middleware";
import rateLimiter from "@/middlewares/rate-limiter.middleware";
import requestLogger from "@/middlewares/request-logger.middleware";
import { env } from "@/common/utils/envConfig";
import { registerRouter } from "./controllers/IAM/register.controller";
import { authenticateRouter } from "./controllers/IAM/authenticate.controller";

const app: Express = express();

// Set the application to trust the reverse proxy
app.set("trust proxy", true);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(helmet());
app.use(rateLimiter);

// Request logging
app.use(requestLogger);

// Routes
app.use("/api/v1/health-check", healthCheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/register", registerRouter);
app.use("/api/v1/authenticate", authenticateRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Invalid endpoint" });
});

// Swagger UI
app.use(openAPIRouter);

// Error handlers
app.use(errorHandler());

export { app };

// I add this line to test CI
