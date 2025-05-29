import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { Router } from "express";
import { z } from "zod";

import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { validateRequest } from "@/common/utils/httpHandlers";
import { userController } from "./user.controller";
import {
  CreateUserSchema,
  DeleteUserSchema,
  UserSchema,
} from "@/models/user/user.schema";
import {
  authenticate,
  optionalAuthenticate,
  requirePolicy,
} from "@/services/auth.service";
import { Policies } from "@/constants/policies.constant";
import {
  allowAnonymous,
  AuthenticatedRequest,
} from "@/middlewares/authentication.middleware";
import type { Request, RequestHandler, Response } from "express";
import { userRepository } from "@/repositories/user/user.repository";
import { APIResponseHelper } from "@/helper/api-response.helper";
import { AuthenticationSchemes } from "@/constants/authentication-schemes.constant";

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
userRouter.get(
  "",
  authenticate(AuthenticationSchemes.Global),
  async (req: AuthenticatedRequest, res: Response) => {
    userController.listUser(req, res);
  }
);

userRouter.delete(
  "",
  authenticate(AuthenticationSchemes.BearerToken),
  requirePolicy(Policies.BearerUser),
  validateRequest(DeleteUserSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const findedUser = await userRepository.getAsync({ _id: req.query.id });
    if (findedUser) {
      const result = await userRepository.deleteAsync(findedUser);
      APIResponseHelper.okResult(res, result);
      return;
    }

    APIResponseHelper.failedResult(res);
  }
);
