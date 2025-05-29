import { RestfulAPIResponseModel } from "@/models/base/restful-api-response.model";
import type { Response } from "express";
import { StatusCodes } from "http-status-codes";

export class APIResponseHelper {
  static okResult<T>(res: Response, result?: T, message?: string): Response {
    if (result !== undefined) {
      const response = new RestfulAPIResponseModel(result);
      if (message) response.message = message;
      return res.status(200).json(response);
    }
    const response = new RestfulAPIResponseModel(true);
    if (message) response.message = message;
    return res.status(200).json(response);
  }

  static failedResult(res: Response, message = "", statusCode = 400): Response {
    const response = new RestfulAPIResponseModel(false, statusCode, message);
    return res.status(statusCode).json(response);
  }

  static createdResult<T>(
    res: Response,
    result: T,
    message = "Created successfully"
  ): Response {
    const response = new RestfulAPIResponseModel(result);
    response.message = message;
    response.statusCode = 201;
    return res.status(201).json(response);
  }

  static notFoundResult(
    res: Response,
    message = "Resource not found"
  ): Response {
    const response = new RestfulAPIResponseModel(false, 404, message);
    return res.status(404).json(response);
  }

  static badRequestResult(res: Response, message = "Bad request"): Response {
    const response = new RestfulAPIResponseModel(false, 400, message);
    return res.status(400).json(response);
  }

  static conflictResult(res: Response, message = "Conflict"): Response {
    const response = new RestfulAPIResponseModel(false, 409, message);
    return res.status(409).json(response);
  }

  static unauthorizedResult(res: Response, message = "Unauthorized"): Response {
    const response = new RestfulAPIResponseModel(false, 401, message);
    return res.status(401).json(response);
  }

  static forbiddenResult(res: Response, message = "Forbidden"): Response {
    const response = new RestfulAPIResponseModel(false, 403, message);
    return res.status(403).json(response);
  }

  static internalServerErrorResult(
    res: Response,
    message = "Internal server error"
  ): Response {
    const response = new RestfulAPIResponseModel(false, 500, message);
    return res.status(500).json(response);
  }
}
