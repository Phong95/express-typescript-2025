import { AuthenticationSchemes } from "@/constants/authentication-schemes.constant";
import { Policies } from "@/constants/policies.constant";
import { Roles } from "@/constants/roles.constant";
import type { NextFunction, Response } from "express";
import type {
  AuthenticatedRequest,
  AuthenticationMiddleware,
} from "./authentication.middleware";

export interface PolicyConfig {
  name: string;
  schemes: string[];
  roles?: string[];
  customCheck?: (req: AuthenticatedRequest) => boolean;
}

export class AuthorizationMiddleware {
  private policies: Map<string, PolicyConfig> = new Map();
  private authMiddleware: AuthenticationMiddleware;

  constructor(authMiddleware: AuthenticationMiddleware) {
    this.authMiddleware = authMiddleware;
  }
  addPolicy(config: PolicyConfig) {
    this.policies.set(config.name, config);
  }

  requirePolicy(policyName: string) {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const policy = this.policies.get(policyName);
      if (!policy) {
        res.status(500).json({
          success: false,
          message: "Invalid authorization policy",
        });
        return;
      }

      // Auto-authenticate using the policy's schemes
      if (!req.user && policy.schemes.length > 0) {
        let authenticated = false;

        // Try each scheme in the policy
        for (const scheme of policy.schemes) {
          try {
            // Create a promise-based wrapper for the authentication middleware
            await new Promise<void>((resolve, reject) => {
              const authMiddleware = this.authMiddleware.authenticate(scheme);
              authMiddleware(req, res, (error) => {
                if (error) {
                  reject(error);
                } else if (req.user) {
                  authenticated = true;
                  resolve();
                } else {
                  reject(new Error("Authentication failed"));
                }
              });
            });

            if (authenticated) break;
          } catch (error) {
            // Continue to next scheme if this one fails
            continue;
          }
        }

        // If no scheme worked, return authentication error
        if (!authenticated) {
          res.status(401).json({
            success: false,
            message: "Authentication required",
          });
          return;
        }
      }

      // Check if user is authenticated (after auto-authentication attempt)
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      // Check authentication scheme
      if (
        policy.schemes.length > 0 &&
        !policy.schemes.includes(req.authScheme || "")
      ) {
        res.status(401).json({
          success: false,
          message: "Invalid authentication scheme",
        });
        return;
      }

      // Check roles
      if (policy.roles && policy.roles.length > 0) {
        if (!policy.roles.includes(req.user.role)) {
          res.status(403).json({
            success: false,
            message: "Insufficient permissions",
          });
          return;
        }
      }

      // Custom check
      if (policy.customCheck && !policy.customCheck(req)) {
        res.status(403).json({
          success: false,
          message: "Authorization failed",
        });
        return;
      }

      next();
    };
  }

  requireRole(roles: string | string[]) {
    const roleArray = Array.isArray(roles) ? roles : [roles];

    return (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): void => {
      // ✅ Add void return type
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return; // ✅ Explicit return void is OK here
      }

      if (!roleArray.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions",
        });
        return; // ✅ Explicit return void is OK here
      }

      next(); // ✅ No return statement with next()
    };
  }
}
