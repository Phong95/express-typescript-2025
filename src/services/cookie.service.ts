import { env } from "@/common/utils/envConfig";
import type { Response, Request } from "express";

export class CookieService {
  static setCookie(
    res: Response,
    name: string,
    value: string,
    options: {
      maxAge?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: boolean | "lax" | "strict" | "none";
      path?: string;
    } = {}
  ) {
    res.cookie(name, value, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax",
      path: "/",
      ...options,
    });
  }

  static getCookie(req: Request, name: string): string | undefined {
    return req.cookies?.[name];
  }

  static clearCookie(res: Response, name: string) {
    res.clearCookie(name, {
      path: "/",
    });
  }
}
