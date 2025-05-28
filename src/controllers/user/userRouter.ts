import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { Router } from "express";
import { z } from "zod";

import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { validateRequest } from "@/common/utils/httpHandlers";
import { userController } from "./userController";
import { CreateUserSchema, UserSchema } from "@/models/user/user.schema";

export const userRouter: Router = express.Router();
//#region Document
export const userRegistry = new OpenAPIRegistry();

userRegistry.register("User", UserSchema);

// POST /user - Create new user
userRegistry.registerPath({
  method: "post",
  path: "/api/users",
  tags: ["User"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateUserSchema.shape.body,
        },
      },
    },
  },
  responses: {
    ...createApiResponse(UserSchema, "User created successfully", 201),
    ...createApiResponse(
      z.object({ message: z.string() }),
      "Validation error",
      400
    ),
    ...createApiResponse(
      z.object({ message: z.string() }),
      "Email already exists",
      409
    ),
  },
});

userRegistry.registerPath({
  method: "get",
  path: "/api/users",
  tags: ["User"],
  responses: createApiResponse(
    z.array(UserSchema),
    "List user successfully",
    200
  ),
});

//#endregion
userRouter.post(
  "",
  validateRequest(CreateUserSchema),
  userController.createUser
);
userRouter.get("", userController.listUser);
