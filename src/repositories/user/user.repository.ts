import { type IUser, UserModel } from "@/models/user/user.model";
import { MongoDBBaseRepository } from "../base/mongodb-base.repository";

export class UserRepository extends MongoDBBaseRepository<IUser> {
  constructor() {
    super(UserModel);
  }
}

export const userRepository = new UserRepository();
