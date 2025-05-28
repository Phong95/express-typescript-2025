import { model, Schema } from "mongoose";
import { IBaseEntity } from "../base/base-identity";

export interface IUser extends IBaseEntity {
  name: string;
  email: string;
  age: number;
  isActive?: boolean;
  role?: string;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    age: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true, // This adds createdAt and updatedAt automatically
  }
);

export const UserModel = model<IUser>("User", userSchema);
