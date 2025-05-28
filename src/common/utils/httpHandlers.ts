import { APIResponseHelper } from "@/helper/api-response.helper";
import { RestfulAPIResponseModel } from "@/models/base/restful-api-response.model";
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
      const errorMessage = `Invalid input: ${(err as ZodError).errors
        .map((e) => e.message)
        .join(", ")}`;

      APIResponseHelper.badRequestResult(res, errorMessage);
      return;
    }
  };

// Handle service response and send HTTP response
export const handleServiceResponse = (
  serviceResponse: RestfulAPIResponseModel<any>,
  response: Response
) => {
  return response.status(serviceResponse.statusCode).json(serviceResponse);
};
