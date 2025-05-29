import { validateRequest } from "@/common/utils/httpHandlers";
import {
  CreateUserSchema,
  LoginUserSchema,
  RegisterUserSchema,
} from "@/models/user/user.schema";
import express, { type Router } from "express";
import type { Request, Response } from "express";
import {
  type IUser,
  type IUserLogin,
  IUserRegister,
} from "@/models/user/user.model";
import { APIResponseHelper } from "@/helper/api-response.helper";
import { userRepository } from "@/repositories/user/user.repository";
import { createSalt, hashPassword } from "@/common/utils/string";
import { JwtService } from "@/services/jwt.service";
import { env } from "@/common/utils/envConfig";
import { CookieService } from "@/services/cookie.service";

export const authenticateRouter: Router = express.Router();

authenticateRouter.post(
  "/login",
  validateRequest(LoginUserSchema),
  async (req: Request, res: Response) => {
    const loginModel: IUserLogin = req.body;

    if (loginModel.otp) {
      const findedUser: IUser | null = await userRepository.getAsync({
        email: loginModel.email,
        otp: loginModel.otp,
      });

      if (!findedUser) {
        APIResponseHelper.notFoundResult(res);
        return;
      }

      const payload = {
        email: findedUser.email,
        id: findedUser._id || "",
        role: findedUser.role,
        iss: env.JWT_ISSUER,
        aud: env.JWT_AUDIENCE,
      };
      const refresh_payload = {
        email: findedUser.email,
        id: findedUser._id || "",
        role: findedUser.role,
        iss: env.JWT_ISSUER,
        aud: env.JWT_RT_AUDIENCE,
      };
      const token = JwtService.generateToken(payload, env.TOKEN_EXPIRES);
      const refreshToken = JwtService.generateToken(
        refresh_payload,
        env.REFRESH_TOKEN_EXPIRES
      );
      CookieService.setCookie(res, env.USER_TOKEN_COOKIE, token, {
        maxAge: env.TOKEN_EXPIRES,
      });
      CookieService.setCookie(
        res,
        env.USER_REFRESH_TOKEN_COOKIE,
        refreshToken,
        { maxAge: env.REFRESH_TOKEN_EXPIRES }
      );

      APIResponseHelper.okResult(res, "");
    } else {
      const findedUser: IUser | null = await userRepository.getAsync({
        email: loginModel.email,
      });

      if (!findedUser) {
        APIResponseHelper.notFoundResult(res);
        return;
      }

      const hashedPassword = hashPassword(findedUser.salt, loginModel.password);

      if (hashedPassword !== findedUser.password) {
        APIResponseHelper.notFoundResult(res);
        return;
      }

      const payload = {
        email: findedUser.email,
        id: findedUser._id || "",
        role: findedUser.role,
        iss: env.JWT_ISSUER,
        aud: env.JWT_AUDIENCE,
      };
      const refresh_payload = {
        email: findedUser.email,
        id: findedUser._id || "",
        role: findedUser.role,
        iss: env.JWT_ISSUER,
        aud: env.JWT_RT_AUDIENCE,
      };
      const token = JwtService.generateToken(payload, env.TOKEN_EXPIRES);
      const refreshToken = JwtService.generateToken(
        refresh_payload,
        env.REFRESH_TOKEN_EXPIRES
      );
      CookieService.setCookie(res, env.USER_TOKEN_COOKIE, token, {
        maxAge: env.TOKEN_EXPIRES,
      });
      CookieService.setCookie(
        res,
        env.USER_REFRESH_TOKEN_COOKIE,
        refreshToken,
        { maxAge: env.REFRESH_TOKEN_EXPIRES }
      );
      APIResponseHelper.okResult(res, "");
    }
  }
);
