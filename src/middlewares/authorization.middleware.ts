import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authentication.middleware";
import { Policies } from "@/constants/policies.constant";
import { AuthenticationSchemes } from "@/constants/authentication-schemes.constant";
import { Roles } from "@/constants/roles.constant";

export interface PolicyConfig {
  name: string;
  schemes: string[];
  roles?: string[];
  customCheck?: (req: AuthenticatedRequest) => boolean;
}

export class AuthorizationMiddleware {
  private policies: Map<string, PolicyConfig> = new Map();

  constructor() {}

  addPolicy(config: PolicyConfig) {
    this.policies.set(config.name, config);
  }

  requirePolicy(policyName: string) {
    return (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): void => {
      // ✅ Add void return type
      const policy = this.policies.get(policyName);
      if (!policy) {
        res.status(500).json({
          success: false,
          message: "Invalid authorization policy",
        });
        return; // ✅ Explicit return void is OK here
      }

      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return; // ✅ Explicit return void is OK here
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
        return; // ✅ Explicit return void is OK here
      }

      // Check roles
      if (policy.roles && policy.roles.length > 0) {
        if (!policy.roles.includes(req.user.role)) {
          res.status(403).json({
            success: false,
            message: "Insufficient permissions",
          });
          return; // ✅ Explicit return void is OK here
        }
      }

      // Custom check
      if (policy.customCheck && !policy.customCheck(req)) {
        res.status(403).json({
          success: false,
          message: "Authorization failed",
        });
        return; // ✅ Explicit return void is OK here
      }

      next(); // ✅ No return statement with next()
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
