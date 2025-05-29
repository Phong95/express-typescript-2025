import mongoose from "mongoose";
import { env } from "../utils/envConfig";
import { logger } from "@/services/logger.service";

export class MongoDBConnection {
  private static instance: MongoDBConnection;

  private constructor() {}

  public static getInstance(): MongoDBConnection {
    if (!MongoDBConnection.instance) {
      MongoDBConnection.instance = new MongoDBConnection();
    }
    return MongoDBConnection.instance;
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
