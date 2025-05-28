import { AuthenticationMiddleware } from "@/common/middleware/authentication.middleware";
import { AuthorizationMiddleware } from "@/common/middleware/authorization.middleware";

// auth/index.ts - Main export
export const authMiddleware = new AuthenticationMiddleware();
export const authzMiddleware = new AuthorizationMiddleware();

// Convenience functions
export const authenticate = (scheme?: string) =>
  authMiddleware.authenticate(scheme);
export const requireAuth = (schemes?: string[]) =>
  authMiddleware.requireAuth(schemes);
export const requirePolicy = (policyName: string) =>
  authzMiddleware.requirePolicy(policyName);
export const requireRole = (roles: string | string[]) =>
  authzMiddleware.requireRole(roles);

export const optionalAuthenticate = (scheme?: string) =>
  authMiddleware.optionalAuthenticate(scheme);
