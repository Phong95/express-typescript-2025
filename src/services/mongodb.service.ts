import { logger } from "@/services/logger.service";
import mongoose from "mongoose";
import { env } from "../utils/env-config.util";

export class MongoDBService {
  private static instance: MongoDBService;

  private constructor() {}

  public static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    }
    return MongoDBService.instance;
  }

  public async connect(): Promise<void> {
    try {
      const mongoUri = env.MONGODB_URI;
      await mongoose.connect(mongoUri);
      logger.info("Connected to MongoDB successfully");
    } catch (error) {
      logger.error("MongoDB connection error:", error);

      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      logger.info("Disconnected from MongoDB");
    } catch (error) {
      logger.error("Error disconnecting from MongoDB:", error);
    }
  }
}
