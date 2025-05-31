import { env } from "@/utils/env-config.util";
import pino from "pino";

export const logger = pino({
  name: "server start",
  ...(env.isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname,res",
        singleLine: true,
        messageFormat: "{msg}", // Show just the message
      },
    },
  }),

  // For production, keep structured logging
  ...(env.isProduction && {
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  }),
});
