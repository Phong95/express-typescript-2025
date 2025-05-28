import jwt, { SignOptions } from "jsonwebtoken";
import { Request } from "express";

export interface JwtPayload {
  sub: string;
  role: string;
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
}

export class JwtService {
  private static getSigningKey(): string {
    return process.env.JWT_SIGNING_KEY || "your-secret-key";
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

  static extractFromCookie(req: Request, cookieName: string): string | null {
    return req.cookies[cookieName] || null;
  }

  static extractFromQuery(
    req: Request,
    paramName: string = "access_token"
  ): string | null {
    return (req.query[paramName] as string) || null;
  }
}
