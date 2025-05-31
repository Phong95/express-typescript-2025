import { AuthenticationSchemes } from "@/constants/authentication-schemes.constant";
import { Policies } from "@/constants/policies.constant";
import { APIResponseHelper } from "@/helpers/api-response.helper";
import { AuthenticatedRequest } from "@/middlewares/authentication.middleware";
import {
  type IUser,
  type IUserLogin,
  IUserRegister,
} from "@/models/user/user.model";
import {
  CreateUserSchema,
  LoginUserSchema,
  RegisterUserSchema,
} from "@/models/user/user.schema";
import { userRepository } from "@/repositories/user/user.repository";
import { authenticate, requirePolicy } from "@/services/auth.service";
import { CookieService } from "@/services/cookie.service";
import { JwtService } from "@/services/jwt.service";
import { env } from "@/utils/env-config.util";
import { validateRequest } from "@/utils/http-handlers.util";
import { createSalt, hashPassword } from "@/utils/string.util";
import express, { type Router } from "express";
import type { Request, Response } from "express";

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
        id: findedUser.id || "",
        role: findedUser.role,
        iss: env.JWT_ISSUER,
        aud: env.JWT_AUDIENCE,
      };
      const refresh_payload = {
        email: findedUser.email,
        id: findedUser.id || "",
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
        id: findedUser.id || "",
        role: findedUser.role,
        iss: env.JWT_ISSUER,
        aud: env.JWT_AUDIENCE,
      };
      const refresh_payload = {
        email: findedUser.email,
        id: findedUser.id || "",
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

authenticateRouter.get(
  "/exchange-token",
  requirePolicy(Policies.CookieRefreshUser),
  async (req: AuthenticatedRequest, res: Response) => {
    console.log(req.query.id);
    const findedUser = await userRepository.getAsync({
      id: req.query.id as string,
    });
    console.log(findedUser);
    if (findedUser) {
      const result = await userRepository.deleteAsync(findedUser);
      APIResponseHelper.okResult(res, result);
      return;
    }

    APIResponseHelper.failedResult(res);
  }
);
