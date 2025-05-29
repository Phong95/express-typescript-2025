import type { IBaseEntity } from "@/models/base/base-identity";
import {
  type ClientSession,
  type Model,
  type SortOrder,
  Types,
} from "mongoose";
import type {
  FilterQuery,
  QueryOptions,
} from "../interfaces/iread-repository-base";
import type { IRepository } from "../interfaces/irepository";

export abstract class MongoDBBaseRepository<T extends IBaseEntity>
  implements IRepository<T>
{
  protected collection: Model<T>;

  constructor(model: Model<T>) {
    this.collection = model;
  }

  // Create operations
  async postAsync(entity: Omit<T, "_id">): Promise<T | null> {
    try {
      const newEntity = new this.collection(entity);
      const savedEntity = await newEntity.save();
      return this.toPlainObject(savedEntity);
    } catch (error) {
      console.error("Error creating entity:", error);
      return null;
    }
  }

  async postsAsync(entities: Omit<T, "_id">[]): Promise<T[] | null> {
    try {
      const savedEntities = await this.collection.insertMany(
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        entities as any
      );
      return savedEntities.map((entity) => this.toPlainObject(entity));
    } catch (error) {
      console.error("Error creating entities:", error);
      return null;
    }
  }

  // Update operations
  async putAsync(entity: T): Promise<boolean> {
    try {
      if (!entity._id) {
        throw new Error("Entity must have an _id for update operation");
      }

      const result = await this.collection.updateOne(
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        { _id: entity._id } as any,
        { $set: entity },
        { runValidators: true }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error updating entity:", error);
      return false;
    }
  }

  async putByIdAsync(id: string, updateData: Partial<T>): Promise<T | null> {
    const updatedEntity = await this.collection.findByIdAndUpdate(
      id,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      updateData as any, // Type assertion
      { new: true, runValidators: true }
    );
    return updatedEntity ? this.toPlainObject(updatedEntity) : null;
  }

  async putsAsync(entities: T[]): Promise<boolean> {
    try {
      const bulkOps = entities.map((entity) => ({
        updateOne: {
          filter: { _id: entity._id },
          update: { $set: entity },
          upsert: false,
        },
      }));

      const result = await this.collection.bulkWrite(bulkOps);
      return result.modifiedCount === entities.length;
    } catch (error) {
      console.error("Error updating entities:", error);
      return false;
    }
  }

  // Delete operations
  async deleteAsync(entity: T): Promise<boolean> {
    try {
      if (!entity._id) {
        throw new Error("Entity must have an _id for delete operation");
      }

      const result = await this.collection.deleteOne({
        _id: entity._id,
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      } as any);
      return result.deletedCount > 0;
    } catch (error) {
      console.error("Error deleting entity:", error);
      return false;
    }
  }

  async deleteByIdAsync(id: string): Promise<boolean> {
    try {
      const result = await this.collection.findByIdAndDelete(id);
      return result !== null;
    } catch (error) {
      console.error("Error deleting entity by ID:", error);
      return false;
    }
  }

  async deletesAsync(entities: T[]): Promise<boolean> {
    try {
      const ids = entities.map((entity) => entity._id).filter((id) => id);
      const result = await this.collection.deleteMany({
        _id: { $in: ids },
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      } as any);
      return result.deletedCount === ids.length;
    } catch (error) {
      console.error("Error deleting entities:", error);
      return false;
    }
  }

  async deleteByPredicateAsync(predicate: FilterQuery<T>): Promise<number> {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const result = await this.collection.deleteMany(predicate as any);
      return result.deletedCount || 0;
    } catch (error) {
      console.error("Error deleting entities by predicate:", error);
      return 0;
    }
  }

  // Transaction support
  async executeInTransactionAsync(
    action: () => Promise<void>
  ): Promise<boolean> {
    const session: ClientSession = await this.collection.db.startSession();

    try {
      await session.withTransaction(async () => {
        await action();
      });
      return true;
    } catch (error) {
      console.error("Transaction failed:", error);
      return false;
    } finally {
      await session.endSession();
    }
  }

  // Read operations
  async getAsync(
    predicate: FilterQuery<T>,
    includes?: (keyof T)[]
  ): Promise<T | null> {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      let query = this.collection.findOne(predicate as any);

      if (includes && includes.length > 0) {
        query = query.populate(includes.join(" "));
      }

      const result = await query.exec();
      return result ? this.toPlainObject(result) : null;
    } catch (error) {
      console.error("Error finding entity:", error);
      return null;
    }
  }

  // Overloaded getsAsync methods
  async getsAsync(): Promise<T[]>;
  async getsAsync(
    predicate: FilterQuery<T>,
    options?: QueryOptions<T>
  ): Promise<T[]>;
  async getsAsync(
    predicate?: FilterQuery<T>,
    options?: QueryOptions<T>
  ): Promise<T[]> {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      let query = this.collection.find((predicate as any) || {});

      if (options) {
        // Handle pagination
        if (options.pageIndex !== undefined && options.limit !== undefined) {
          const skip = options.pageIndex * options.limit;
          query = query.skip(skip).limit(options.limit);
        }

        // Handle sorting
        if (options.sortBy) {
          const sortDirection: SortOrder = options.sortDescending ? -1 : 1;
          const sortObj: Record<string, SortOrder> = {
            [options.sortBy as string]: sortDirection,
          };
          query = query.sort(sortObj);
        }

        // Handle includes/population
        if (options.includes && options.includes.length > 0) {
          query = query.populate(options.includes.join(" "));
        }
      }

      const results = await query.exec();
      return results.map((result) => this.toPlainObject(result));
    } catch (error) {
      console.error("Error finding entities:", error);
      return [];
    }
  }

  // Overloaded countAsync methods
  async countAsync(): Promise<number>;
  async countAsync(predicate: FilterQuery<T>): Promise<number>;
  async countAsync(predicate?: FilterQuery<T>): Promise<number> {
    try {
      if (predicate) {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        return await this.collection.countDocuments(predicate as any);
      }
      return await this.collection.countDocuments();
    } catch (error) {
      console.error("Error counting entities:", error);
      return 0;
    }
  }

  // Overloaded anyAsync methods
  async anyAsync(): Promise<boolean>;
  async anyAsync(predicate: FilterQuery<T>): Promise<boolean>;
  async anyAsync(predicate?: FilterQuery<T>): Promise<boolean> {
    try {
      const count = predicate
        ? // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          await this.collection.countDocuments(predicate as any).limit(1)
        : await this.collection.countDocuments().limit(1);
      return count > 0;
    } catch (error) {
      console.error("Error checking entity existence:", error);
      return false;
    }
  }

  // Helper methods
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  protected toPlainObject(doc: any): T {
    if (doc?.toObject) {
      return doc.toObject();
    }
    return doc;
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  protected validateEntity(entity: any): void {
    if (!entity) {
      throw new Error("Entity cannot be null or undefined");
    }
  }

  // Additional helper method for ObjectId validation
  protected isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }
}
