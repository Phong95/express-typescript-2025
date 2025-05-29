import type { Request, RequestHandler, Response } from "express";

import { userRepository } from "@/repositories/user/user.repository";
import { APIResponseHelper } from "@/helper/api-response.helper";
import { taskQueueService } from "@/services/queues.service";
import { logger } from "@/services/logger.service";

class UserController {
  public createUser = async (req: Request, res: Response) => {
    const userData = req.body;
    const user = await userRepository.postAsync(userData);
    APIResponseHelper.okResult(res, user);
  };

  public listUser = async (req: Request, res: Response) => {
    try {
      // taskQueueService.registerTask<string>(
      //   "abc",
      //   async (input, context, job) => {
      //     setTimeout(() => {
      //       logger.info("abc task input:", input);
      //       logger.info("context:", context);
      //       logger.info("job id:", job.id);
      //     }, 5000);

      //     return "done"; // or any result you want to return
      //   }
      // );
      // taskQueueService.enqueueTask("abc");

      const users = await userRepository.getsAsync();
      APIResponseHelper.okResult(res, users);
    } catch (error) {
      APIResponseHelper.internalServerErrorResult(
        res,
        "Internal server error a"
      );
    }
  };
}

export const userController = new UserController();
