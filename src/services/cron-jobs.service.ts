import cron from "node-cron";
import { logger } from "./logger.service";
class CronJobsService {
  public executeJob() {
    cron.schedule("* * * * *", () => {
      logger.info("Running a task every minute");
    });

    // add more job in here...
  }
}

export const cronJobService = new CronJobsService();
