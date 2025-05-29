export const Policies = {
  /**
   * bearer token
   */
  Bearer: "Bearer",
  /**
   * bearer token
   */
  BearerRefresh: "BearerRefresh",
  /**
   * cookie token
   */
  Cookie: "Cookie",
  /**
   * cookie token
   */
  CookieRefresh: "CookieRefresh",

  /**
   * bearer token + require role
   */
  BearerAdmin: "BearerAdmin",
  /**
   * bearer token + require role
   */
  BearerRefreshAdmin: "BearerRefreshAdmin",
  /**
   * bearer token + require role
   */
  BearerUser: "BearerUser",
  /**
   * bearer token + require role
   */
  BearerRefreshUser: "BearerRefreshUser",
  /**
   * cookie token + require role
   */
  CookieAdmin: "CookieAdmin",
  /**
   * cookie token + require role
   */
  CookieRefreshAdmin: "CookieRefreshAdmin",
  /**
   * cookie token + require role
   */
  CookieUser: "CookieUser",
  /**
   * cookie token + require role
   */
  CookieRefreshUser: "CookieRefreshUser",
} as const;
