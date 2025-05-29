import { model, Schema } from "mongoose";
import type { IBaseEntity } from "../base/base-identity";

export interface IUser extends IBaseEntity {
  name: string;
  email: string;
  password: string;
  salt: string;
  role: string;
  otp?: string;
  isActivate?: boolean;
  avatarUrl?: string;
  isLocked?: boolean;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    salt: { type: String, required: true },
    role: { type: String, required: false },
    otp: { type: String, required: false },
    isActivate: { type: Boolean, default: true },
    avatarUrl: { type: String, required: false },
    isLocked: { type: Boolean, default: false },
  },
  {
    timestamps: true, // This adds createdAt and updatedAt automatically
  }
);

export interface IUserRegister {
  name: string;
  email: string;
  password: string;
  avatarUrl: string;
}
export interface IUserLogin {
  email: string;
  password: string;
  otp?: string;
}

export const UserModel = model<IUser>("User", userSchema);
