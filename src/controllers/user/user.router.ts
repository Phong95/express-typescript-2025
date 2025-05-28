import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { Router } from "express";
import { z } from "zod";

import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { validateRequest } from "@/common/utils/httpHandlers";
import { userController } from "./user.controller";
import { CreateUserSchema, UserSchema } from "@/models/user/user.schema";
import {
  authenticate,
  optionalAuthenticate,
  requirePolicy,
} from "@/services/auth.service";
import { Policies } from "@/constants/policies.constant";
import { allowAnonymous } from "@/common/middleware/authentication.middleware";

export const userRouter: Router = express.Router();
// Apply optional authentication to all routes
userRouter.use(optionalAuthenticate());

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
  allowAnonymous,
  validateRequest(CreateUserSchema),
  userController.createUser
);
userRouter.get("", requirePolicy(Policies.Admin), userController.listUser);
