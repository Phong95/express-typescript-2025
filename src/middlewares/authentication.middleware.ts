import { AuthenticationSchemes } from "@/constants/authentication-schemes.constant";
import { type JwtPayload, JwtService } from "@/services/jwt.service";
import { logger } from "@/services/logger.service";
import type { NextFunction, Request, Response } from "express";
import type { VerifyOptions } from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  authScheme?: string;
  skipAuth?: boolean;
}

export type TokenExtractionStrategy = (req: Request) => string | null;

export interface AuthSchemeConfig {
  name: string;
  extractToken: TokenExtractionStrategy;
  validateIssuer?: boolean;
  validateAudience?: boolean;
  validIssuers?: string[];
  validAudiences?: string[];
}

export class AuthenticationMiddleware {
  private schemes: Map<string, AuthSchemeConfig> = new Map();

  constructor() {
    this.setupDefaultSchemes();
  }

  private setupDefaultSchemes() {
    // Your existing setupDefaultSchemes code stays the same
    this.addScheme({
      name: AuthenticationSchemes.Default,
      extractToken: JwtService.extractFromHeader,
      validateIssuer: false,
      validateAudience: false,
    });
    // ... other schemes
  }

  addScheme(config: AuthSchemeConfig) {
    this.schemes.set(config.name, config);
  }

  authenticate(schemeName?: string) {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      // ✅ Add Promise<void> return type
      try {
        const schemesToTry = schemeName
          ? [schemeName]
          : [AuthenticationSchemes.Default];

        for (const scheme of schemesToTry) {
          const schemeConfig = this.schemes.get(scheme);
          if (!schemeConfig) continue;

          const token = schemeConfig.extractToken(req);
          if (!token) continue;

          try {
            const verifyOptions: VerifyOptions = {};

            if (schemeConfig.validateIssuer && schemeConfig.validIssuers) {
              verifyOptions.issuer = schemeConfig.validIssuers;
            }

            if (schemeConfig.validateAudience && schemeConfig.validAudiences) {
              verifyOptions.audience = schemeConfig.validAudiences;
            }

            const payload = JwtService.verifyToken(token, verifyOptions);
            req.user = payload;
            req.authScheme = scheme;
            next(); // ✅ Remove return statement
            return; // ✅ Explicit return void to exit the function
          } catch (tokenError) {
            continue;
          }
        }

        // No valid token found
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        // ✅ Remove return statement - just let function end
      } catch (error) {
        res.status(401).json({
          success: false,
          message: "Authentication failed",
        });
        // ✅ Remove return statement - just let function end
      }
    };
  }

  optionalAuthenticate(schemeName?: string) {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      // ✅ Check if this route should skip authentication
      if (req.skipAuth === true) {
        logger.info("🟢 Skipping authentication for:", req.path);
        return next();
      }

      logger.info("🔵 Attempting optional authentication for:", req.path);

      try {
        const schemesToTry = schemeName
          ? [schemeName]
          : [AuthenticationSchemes.Default];
        logger.info(schemesToTry);
        for (const scheme of schemesToTry) {
          console.log(this.schemes);
          const schemeConfig = this.schemes.get(scheme);
          if (!schemeConfig) continue;

          const token = schemeConfig.extractToken(req);
          if (!token) {
            logger.info("🟡 No token found for scheme:", scheme);
            continue; // No token, but that's OK for optional auth
          }

          try {
            const verifyOptions: VerifyOptions = {};

            if (schemeConfig.validateIssuer && schemeConfig.validIssuers) {
              verifyOptions.issuer = schemeConfig.validIssuers;
            }

            if (schemeConfig.validateAudience && schemeConfig.validAudiences) {
              verifyOptions.audience = schemeConfig.validAudiences;
            }

            const payload = JwtService.verifyToken(token, verifyOptions);
            req.user = payload;
            req.authScheme = scheme;
            logger.info("🟢 Optional authentication successful for:", req.path);
            return next();
          } catch (tokenError) {
            logger.info("🟡 Token verification failed for scheme:", scheme);
            continue; // Token invalid, but continue without auth
          }
        }

        // ✅ No valid token found, but for optional auth, this is OK
        logger.info(
          "🟡 No valid authentication found, continuing without auth for:",
          req.path
        );
        next(); // Continue without authentication
      } catch (error) {
        logger.info(
          "🟡 Optional authentication error, continuing without auth:",
          error
        );
        next(); // Continue without authentication
      }
    };
  }

  requireAuth(schemes?: string[]) {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      // ✅ Add Promise<void> return type
      const schemesToTry = schemes || [AuthenticationSchemes.Default];

      for (const scheme of schemesToTry) {
        const middleware = this.authenticate(scheme);
        await new Promise<void>((resolve, reject) => {
          middleware(req, res, (err) => {
            if (err) reject(err);
            else if (req.user) resolve();
            else reject(new Error("Authentication failed"));
          });
        }).catch(() => {});

        if (req.user) {
          next(); // ✅ Remove return statement
          return; // ✅ Explicit return void to exit
        }
      }

      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      // ✅ Remove return statement - just let function end
    };
  }
}

export const allowAnonymous = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  req.skipAuth = true;
  next();
};
