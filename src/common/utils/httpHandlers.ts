import { APIResponseHelper } from "@/helper/api-response.helper";
import type { RestfulAPIResponseModel } from "@/models/base/restful-api-response.model";
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ZodError, ZodSchema } from "zod";

export const validateRequest =
  (schema: ZodSchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      const zodError = err as ZodError;

      // Create structured error response
      const validationErrors = zodError.errors.map((error) => ({
        field: error.path.join("."),
        message:
          error.message === "Required"
            ? `${error.path.join(".")} is required`
            : error.message,
        code: error.code,
      }));

      // Also create a simple message for backwards compatibility
      const simpleMessage = validationErrors
        .map((err) => err.message)
        .join(", ");

      APIResponseHelper.badRequestResult(
        res,
        `Validation failed: ${simpleMessage}`
      );
      return;
    }
  };
