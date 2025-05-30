import { APIResponseHelper } from "@/helpers/api-response.helper";
import { emailService } from "@/services/email.service";
import { viettelS3Service } from "@/services/s3.service";
import { env } from "@/utils/env-config.util";
import express, { type Router } from "express";
import type { Request, Response } from "express";

export const testRouter: Router = express.Router();

testRouter.post("/email", async (req: Request, res: Response) => {
  //   await emailService.sendWelcomeEmail("phongthehuynh95@gmail.com", "phong");
  //   await emailService.sendOTP({
  //     to: "phongthehuynh95@gmail.com",
  //     username: "phong",
  //     otp: "123456",
  //   });

  await emailService.sendNotification({
    to: "phongthehuynh95@gmail.com",
    username: "phong",
    subject: "this is a very long subject",
    content: "you should click this",
  });
  APIResponseHelper.okResult(res);
});

testRouter.get("/s3", async (req: Request, res: Response) => {
  //   await emailService.sendWelcomeEmail("phongthehuynh95@gmail.com", "phong");
  //   await emailService.sendOTP({
  //     to: "phongthehuynh95@gmail.com",
  //     username: "phong",
  //     otp: "123456",
  //   });

  const url = await viettelS3Service.putPresignedUrl(
    "d33785184832fd6ca423.jpg",
    env.S3_DEFAULT_BUCKET_NAME
  );
  APIResponseHelper.okResult(res, url);
});
