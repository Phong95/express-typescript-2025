import { validateRequest } from "@/common/utils/httpHandlers";
import {
  CreateUserSchema,
  RegisterUserSchema,
} from "@/models/user/user.schema";
import express, { Router } from "express";
import type { Request, Response } from "express";
import { IUser, IUserRegister } from "@/models/user/user.model";
import { APIResponseHelper } from "@/helper/api-response.helper";
import { userRepository } from "@/repositories/user/user.repository";
import { createSalt, hashPassword } from "@/common/utils/string";
import { Roles } from "@/constants/roles.constant";

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
    };
    await userRepository.postAsync(newUser);
    APIResponseHelper.createdResult(res, { email: newUser.email });
  }
);
