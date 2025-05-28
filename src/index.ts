import { env } from "@/common/utils/envConfig";
import { app } from "@/server";
import { MongoDBConnection } from "./common/database/mongodb";
import chalk from "chalk";
import { logger } from "./services/logger.service";

const startServer = async () => {
  try {
    // Connect to database first
    const db = MongoDBConnection.getInstance();
    await db.connect();
    logger.info(chalk.cyan("Database connected successfully"));

    // Start the server after database connection
    const server = app.listen(env.PORT, () => {
      const { NODE_ENV, HOST, PORT } = env;
      logger.info(
        `Server (${NODE_ENV}) running on port http://${HOST}:${PORT}`
      );
    });

    const onCloseSignal = async () => {
      logger.info("sigint received, shutting down");

      // Close server first
      server.close(async () => {
        logger.info("server closed");

        // Then disconnect from database
        try {
          await db.disconnect();
          logger.info("database disconnected");
        } catch (error) {
          logger.error("Error disconnecting from database:", error);
        }

        process.exit(0);
      });

      // Force shutdown after 10s
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGINT", onCloseSignal);
    process.on("SIGTERM", onCloseSignal);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the application
startServer();
