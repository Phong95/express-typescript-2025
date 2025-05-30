import { env } from "@/utils/env-config.util";
import IORedis from "ioredis";

export const redisClient = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
