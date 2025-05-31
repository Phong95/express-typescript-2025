import {
  IUserSession,
  UserSessionModel,
} from "@/models/user-session/user-session.model";
import { MongoDBBaseRepository } from "../base/mongodb-base.repository";

export class UserSessionRepository extends MongoDBBaseRepository<IUserSession> {
  constructor() {
    super(UserSessionModel);
  }
}

export const userSessionRepository = new UserSessionRepository();
