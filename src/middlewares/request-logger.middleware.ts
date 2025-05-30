import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import pinoHttp from "pino-http";

import { logger } from "@/services/logger.service";
import { env } from "@/utils/env-config.util";

const getLogLevel = (status: number) => {
  if (status >= StatusCodes.INTERNAL_SERVER_ERROR) return "error";
  if (status >= StatusCodes.BAD_REQUEST) return "warn";
  return "info";
};

const addRequestId = (req: Request, res: Response, next: NextFunction) => {
  const existingId = req.headers["x-request-id"] as string;
  const requestId = existingId || randomUUID();

  // Set for downstream use
  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-Id", requestId);

  next();
};

const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers["x-request-id"] as string,
  customLogLevel: (_req, res) => getLogLevel(res.statusCode),
  customSuccessMessage: (req) => {
    const expressReq = req as Request;

    return `${req.method} ${expressReq.originalUrl} completed`;
  },
  customErrorMessage: (_req, res) =>
    `Request failed with status code: ${res.statusCode}`,
  // Only log response bodies in development
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      id: req.id,
    }),
  },
});

// Middleware wrapper
/**
 * only log api
 * @param req
 * @param res
 * @param next
 */
const filteredLogger = (req: Request, res: Response, next: NextFunction) => {
  if (req.url.startsWith("/api/")) {
    httpLogger(req, res, next);
  } else {
    next(); // Skip logging
  }
};

const captureResponseBody = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!env.isProduction) {
    const originalSend = res.send;
    res.send = function (body) {
      res.locals.responseBody = body;
      return originalSend.call(this, body);
    };
  }
  next();
};

export default [addRequestId, captureResponseBody, filteredLogger];
