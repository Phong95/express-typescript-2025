import mongoose, { model, Schema } from "mongoose";
import { IBaseEntity } from "../base/base-identity";

export type DeviceInfo = {
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  accept: string;
  ip: string;
  browser: string;
  os: string;
  deviceType: string;
  dnt: string | string[];
  connection: string;
  timestamp: string;
};
export interface IUserSession extends IBaseEntity {
  userId: string;
  deviceId: string;
  accessToken: string;
  refreshToken: string;
  deviceInfo: DeviceInfo;
  isActive: boolean;
  expiresAt: Date;
}

const deviceInfoSchema = new Schema<DeviceInfo>(
  {
    userAgent: { type: String },
    acceptLanguage: { type: String },
    acceptEncoding: { type: String },
    accept: { type: String },
    ip: { type: String },
    browser: { type: String },
    os: { type: String },
    deviceType: {
      type: String,
      enum: ["mobile", "tablet", "desktop"],
      default: "desktop",
    },
    dnt: { type: String },
    connection: { type: String },
    timestamp: {
      type: String,
      required: true,
      default: () => new Date().toISOString(),
    },
  },
  { _id: false }
);

const userSessionSchema = new Schema<IUserSession>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    deviceInfo: {
      type: deviceInfoSchema,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index for auto cleanup
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
userSessionSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
userSessionSchema.index({ userId: 1, isActive: 1 });
userSessionSchema.index({ accessTokenHash: 1 });
userSessionSchema.index({ refreshTokenHash: 1 });

export const UserSessionModel = model<IUserSession>(
  "UserSessions",
  userSessionSchema
);
