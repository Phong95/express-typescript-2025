import { Roles } from "@/constants/roles.constant";
import { APIResponseHelper } from "@/helpers/api-response.helper";
import type { IUser, IUserRegister } from "@/models/user/user.model";
import {
  CreateUserSchema,
  RegisterUserSchema,
} from "@/models/user/user.schema";
import { userRepository } from "@/repositories/user/user.repository";
import { validateRequest } from "@/utils/http-handlers.util";
import { createSalt, hashPassword } from "@/utils/string.util";
import express, { type Router } from "express";
import type { Request, Response } from "express";

export const registerRouter: Router = express.Router();

registerRouter.post(
  "",
  validateRequest(RegisterUserSchema),
  async (req: Request, res: Response) => {
    const registerModel: IUserRegister = req.body;
    console.log(registerModel);

    const findedUser: IUser | null = await userRepository.getAsync({
      email: registerModel.email,
    });

    if (findedUser) {
      APIResponseHelper.conflictResult(res, "email exist!");
      return;
    }
    const salt = createSalt(10);
    const newUser: IUser = {
      name: registerModel.name,
      email: registerModel.email,
      salt: salt,
      password: hashPassword(salt, registerModel.password),
      role: Roles.User,
      refreshTokens: [],
    };
    await userRepository.postAsync(newUser);
    APIResponseHelper.createdResult(res, { email: newUser.email });
  }
);
