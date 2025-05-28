import { env } from "@/common/utils/envConfig";
import pino from "pino";

export const logger = pino({
  name: "server start",
  ...(env.isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
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
