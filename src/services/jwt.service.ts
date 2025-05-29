import jwt, { SignOptions } from "jsonwebtoken";
import { Request } from "express";
import { env } from "@/common/utils/envConfig";
import { TokenExtractionStrategy } from "@/middlewares/authentication.middleware";

export interface JwtPayload {
  id: string;
  email: string;
  sub?: string;
  role: string;
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
}

export class JwtService {
  private static getSigningKey(): string {
    return env.JWT_SIGNING_KEY || "your-secret-key";
  }

  static verifyToken(token: string, options?: jwt.VerifyOptions): JwtPayload {
    return jwt.verify(token, this.getSigningKey(), options) as JwtPayload;
  }

  static generateToken(
    payload: Omit<JwtPayload, "exp" | "iat">,
    expiresIn: number
  ): string {
    return jwt.sign(payload, this.getSigningKey(), { expiresIn });
  }

  // Token extraction strategies
  static extractFromHeader(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
    return null;
  }

  static extractFromCookie(cookieName: string): TokenExtractionStrategy {
    return (req: Request) => {
      return req.cookies?.[cookieName] || null;
    };
  }

  static extractFromQuery(
    req: Request,
    paramName: string = "access_token"
  ): string | null {
    return (req.query[paramName] as string) || null;
  }
}
