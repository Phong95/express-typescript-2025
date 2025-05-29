import z from "zod";

export class RestfulAPIResponseModel<T> {
  public statusCode = 200;
  public success = true;
  public message = "";
  public result?: T;

  constructor(model: T);
  constructor(success: boolean, statusCode?: number, message?: string);
  constructor(successOrModel: boolean | T, statusCode = 200, message = "") {
    if (typeof successOrModel === "boolean") {
      // Constructor for success/failure
      this.success = successOrModel;
      this.statusCode = statusCode;
      this.message = message;
    } else {
      // Constructor with model/result
      this.result = successOrModel;
    }
  }
}

export const RestfulAPIResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T
) => {
  return z.object({
    statusCode: z.number().int().min(100).max(599),
    success: z.boolean(),
    message: z.string(),
    result: dataSchema.optional(),
  });
};
