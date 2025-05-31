import crypto from "node:crypto";
import { Request } from "express";

export function generateDeviceFingerprint(req: Request) {
  const components = [
    req.headers["user-agent"] || "",
    req.headers["accept-language"] || "",
    req.headers["accept-encoding"] || "",
    req.headers.accept || "",
    req.ip,
    req.headers["x-forwarded-for"] || "",
  ];

  const fingerprint = components.join("|");
  return crypto.createHash("sha256").update(fingerprint).digest("hex");
}

/**
 * Extract device information from Express request object
 */
export function getServerDeviceInfo(req: Request) {
  const userAgent = req.headers["user-agent"] || "";

  // Parse User-Agent for basic info
  const deviceInfo = {
    // Basic headers
    userAgent: userAgent,
    acceptLanguage: req.headers["accept-language"] || "",
    acceptEncoding: req.headers["accept-encoding"] || "",
    accept: req.headers.accept || "",

    // IP information
    ip: getClientIP(req),

    // Browser detection
    browser: detectBrowser(userAgent),

    // OS detection
    os: detectOS(userAgent),

    // Device type
    deviceType: detectDeviceType(userAgent),

    // Additional headers that might be useful
    dnt: req.headers.dnt || req.headers["do-not-track"] || "",
    connection: req.headers.connection || "",

    // Timestamp
    timestamp: new Date().toISOString(),
  };

  return deviceInfo;
}

/**
 * Get real client IP address
 */
function getClientIP(req: Request): string {
  // Handle x-forwarded-for header which can be string or string[]
  const xForwardedFor = req.headers["x-forwarded-for"];
  let forwardedIP: string | undefined;

  if (Array.isArray(xForwardedFor)) {
    forwardedIP = xForwardedFor[0]?.trim();
  } else if (typeof xForwardedFor === "string") {
    forwardedIP = xForwardedFor.split(",")[0]?.trim();
  }

  return (
    forwardedIP ||
    (req.headers["x-real-ip"] as string) ||
    (req.headers["x-client-ip"] as string) ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown"
  );
}

/**
 * Detect browser from User-Agent
 */
function detectBrowser(userAgent: string) {
  const ua = userAgent.toLowerCase();

  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("chrome/") && !ua.includes("edg/")) return "Chrome";
  if (ua.includes("firefox/")) return "Firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
  if (ua.includes("opera/") || ua.includes("opr/")) return "Opera";
  if (ua.includes("trident/") || ua.includes("msie"))
    return "Internet Explorer";

  return "Unknown";
}

/**
 * Detect operating system from User-Agent
 */
function detectOS(userAgent: string) {
  const ua = userAgent.toLowerCase();

  if (ua.includes("windows nt 10.0")) return "Windows 10/11";
  if (ua.includes("windows nt 6.3")) return "Windows 8.1";
  if (ua.includes("windows nt 6.2")) return "Windows 8";
  if (ua.includes("windows nt 6.1")) return "Windows 7";
  if (ua.includes("windows")) return "Windows";

  if (ua.includes("mac os x")) {
    const version = ua.match(/mac os x ([\d_]+)/);
    return version ? `macOS ${version[1].replace(/_/g, ".")}` : "macOS";
  }

  if (ua.includes("iphone os")) {
    const version = ua.match(/iphone os ([\d_]+)/);
    return version ? `iOS ${version[1].replace(/_/g, ".")}` : "iOS";
  }

  if (ua.includes("android")) {
    const version = ua.match(/android ([\d.]+)/);
    return version ? `Android ${version[1]}` : "Android";
  }

  if (ua.includes("linux")) return "Linux";
  if (ua.includes("ubuntu")) return "Ubuntu";
  if (ua.includes("cros")) return "Chrome OS";

  return "Unknown";
}

/**
 * Detect device type from User-Agent
 */
function detectDeviceType(userAgent: string) {
  const ua = userAgent.toLowerCase();

  if (
    ua.includes("mobile") ||
    ua.includes("android") ||
    ua.includes("iphone")
  ) {
    return "mobile";
  }
  if (ua.includes("tablet") || ua.includes("ipad")) {
    return "tablet";
  }

  return "desktop";
}
