import { AuthenticationSchemes } from "@/constants/authentication-schemes.constant";
import { Policies } from "@/constants/policies.constant";
import { Roles } from "@/constants/roles.constant";
import { AuthenticationMiddleware } from "@/middlewares/authentication.middleware";
import { AuthorizationMiddleware } from "@/middlewares/authorization.middleware";
import { env } from "@/utils/env-config.util";
import { JwtService } from "./jwt.service";

// auth/index.ts - Main export
export const authMiddleware = new AuthenticationMiddleware();

/**
 * global - get jwt from header (bearer) and then only match secret keys
 */
authMiddleware.addScheme({
  name: AuthenticationSchemes.Global,
  extractToken: JwtService.extractFromHeader,
  validateIssuer: true,
  validateAudience: true,
  validIssuers: [env.JWT_ISSUER],
  validAudiences: [env.JWT_AUDIENCE],
});
authMiddleware.addScheme({
  name: AuthenticationSchemes.BearerToken,
  extractToken: JwtService.extractFromHeader,
  validateIssuer: true,
  validateAudience: true,
  validIssuers: [env.JWT_ISSUER],
  validAudiences: [env.JWT_AUDIENCE],
});
authMiddleware.addScheme({
  name: AuthenticationSchemes.BearerRefreshToken,
  extractToken: JwtService.extractFromHeader,
  validateIssuer: true,
  validateAudience: true,
  validIssuers: [env.JWT_ISSUER],
  validAudiences: [env.JWT_RT_AUDIENCE],
});
authMiddleware.addScheme({
  name: AuthenticationSchemes.CookieToken,
  extractToken: JwtService.extractFromCookie(env.USER_TOKEN_COOKIE),
  validateIssuer: true,
  validateAudience: true,
  validIssuers: [env.JWT_ISSUER],
  validAudiences: [env.JWT_AUDIENCE],
});
authMiddleware.addScheme({
  name: AuthenticationSchemes.CookieRefreshToken,
  extractToken: JwtService.extractFromCookie(env.USER_REFRESH_TOKEN_COOKIE),
  validateIssuer: true,
  validateAudience: true,
  validIssuers: [env.JWT_ISSUER],
  validAudiences: [env.JWT_RT_AUDIENCE],
});

export const authzMiddleware = new AuthorizationMiddleware(authMiddleware);

authzMiddleware.addPolicy({
  name: Policies.Bearer,
  schemes: [AuthenticationSchemes.BearerToken],
});
authzMiddleware.addPolicy({
  name: Policies.BearerRefresh,
  schemes: [AuthenticationSchemes.BearerRefreshToken],
});
authzMiddleware.addPolicy({
  name: Policies.Cookie,
  schemes: [AuthenticationSchemes.CookieToken],
});
authzMiddleware.addPolicy({
  name: Policies.CookieRefresh,
  schemes: [AuthenticationSchemes.CookieRefreshToken],
});

//require admin role
authzMiddleware.addPolicy({
  name: Policies.BearerAdmin,
  schemes: [AuthenticationSchemes.BearerToken],
  roles: [Roles.Admin],
});
authzMiddleware.addPolicy({
  name: Policies.BearerRefreshAdmin,
  schemes: [AuthenticationSchemes.BearerRefreshToken],
  roles: [Roles.Admin],
});
authzMiddleware.addPolicy({
  name: Policies.CookieAdmin,
  schemes: [AuthenticationSchemes.CookieToken],
  roles: [Roles.Admin],
});
authzMiddleware.addPolicy({
  name: Policies.CookieRefreshAdmin,
  schemes: [AuthenticationSchemes.CookieRefreshToken],
  roles: [Roles.Admin],
});

//require user role
authzMiddleware.addPolicy({
  name: Policies.BearerUser,
  schemes: [AuthenticationSchemes.BearerToken],
  roles: [Roles.Admin, Roles.User],
});
authzMiddleware.addPolicy({
  name: Policies.BearerRefreshUser,
  schemes: [AuthenticationSchemes.BearerRefreshToken],
  roles: [Roles.Admin, Roles.User],
});
authzMiddleware.addPolicy({
  name: Policies.CookieUser,
  schemes: [AuthenticationSchemes.CookieToken],
  roles: [Roles.Admin, Roles.User],
});
authzMiddleware.addPolicy({
  name: Policies.CookieRefreshUser,
  schemes: [AuthenticationSchemes.CookieRefreshToken],
  roles: [Roles.Admin, Roles.User],
});

// Convenience functions
export const authenticate = (scheme?: string) =>
  authMiddleware.authenticate(scheme);
// export const requireAuth = (schemes?: string[]) =>
//   authMiddleware.requireAuth(schemes);
export const requirePolicy = (policyName: string) =>
  authzMiddleware.requirePolicy(policyName);
// export const requireRole = (roles: string | string[]) =>
//   authzMiddleware.requireRole(roles);

export const optionalAuthenticate = (scheme?: string) =>
  authMiddleware.optionalAuthenticate(scheme);
