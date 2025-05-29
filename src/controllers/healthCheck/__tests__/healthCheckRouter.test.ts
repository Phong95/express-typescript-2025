import { StatusCodes } from "http-status-codes";
import request from "supertest";

import { RestfulAPIResponseModel } from "@/models/base/restful-api-response.model";
import { app } from "@/server";

describe("Health Check API endpoints", () => {
  it("GET / - success", async () => {
    const response = await request(app).get("/health-check");
    const result: RestfulAPIResponseModel<unknown> = response.body;

    expect(response.statusCode).toEqual(StatusCodes.OK);
    expect(result.success).toBeTruthy();
    expect(result.result).toBeNull();
    expect(result.message).toEqual("Service is healthy");
  });
});
