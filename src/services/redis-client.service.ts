import IORedis from "ioredis";
import { env } from "@/common/utils/envConfig";

export const redisClient = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
