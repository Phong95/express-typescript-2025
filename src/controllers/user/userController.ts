import type { Request, RequestHandler, Response } from "express";

import { userRepository } from "@/repositories/user/user.repository";
import { APIResponseHelper } from "@/helper/api-response.helper";

class UserController {
  public createUser = async (req: Request, res: Response) => {
    const userData = req.body;
    const user = await userRepository.postAsync(userData);
    console.log(user);
    APIResponseHelper.okResult(res, user);
    return;
  };

  public listUser = async (req: Request, res: Response) => {
    try {
      const users = await userRepository.getsAsync();
      APIResponseHelper.okResult(res, users);
      return;
    } catch (error) {
      APIResponseHelper.internalServerErrorResult(
        res,
        "Internal server error a"
      );
      return;
    }
  };
}

export const userController = new UserController();
