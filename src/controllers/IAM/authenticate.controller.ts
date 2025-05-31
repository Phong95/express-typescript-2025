import { AuthenticationSchemes } from "@/constants/authentication-schemes.constant";
import { Policies } from "@/constants/policies.constant";
import { APIResponseHelper } from "@/helpers/api-response.helper";
import { AuthenticatedRequest } from "@/middlewares/authentication.middleware";
import { IUserSession } from "@/models/user-session/user-session.model";
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
import { userSessionRepository } from "@/repositories/user-session/user-session.repository";
import { userRepository } from "@/repositories/user/user.repository";
import { authenticate, requirePolicy } from "@/services/auth.service";
import { CookieService } from "@/services/cookie.service";
import { JwtService } from "@/services/jwt.service";
import { env } from "@/utils/env-config.util";
import {
  generateDeviceFingerprint,
  getServerDeviceInfo,
} from "@/utils/fingerprint.util";
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
      //#region create session and return token
      const fingerprint = generateDeviceFingerprint(req);
      const deviceInfo = getServerDeviceInfo(req);
      const newSession: IUserSession = {
        userId: findedUser.id!,
        deviceId: fingerprint,
        accessToken: token,
        refreshToken: refreshToken,
        deviceInfo: deviceInfo,
        isActive: true,
        expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES),
      };
      const existSession = await userSessionRepository.getAsync({
        userId: findedUser.id,
        deviceId: fingerprint,
      });
      if (existSession) {
        newSession.id = existSession.id;
        const updateSessionResult = await userSessionRepository.putAsync(
          newSession
        );
        if (updateSessionResult) {
          APIResponseHelper.okResult(res, existSession?.id);
        } else {
          APIResponseHelper.internalServerErrorResult(res);
        }
        return;
      }

      const newSessionResult = await userSessionRepository.postAsync(
        newSession
      );
      if (newSessionResult) {
        APIResponseHelper.okResult(res, newSessionResult.id);
        return;
      }
      APIResponseHelper.failedResult(res);
      //#endregion
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
