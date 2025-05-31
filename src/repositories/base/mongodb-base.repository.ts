import type { IBaseEntity } from "@/models/base/base-identity";
import {
  type ClientSession,
  type DeleteResult,
  type HydratedDocument,
  type Model,
  type Query,
  type SortOrder,
  Types,
  type UpdateWriteOpResult,
} from "mongoose";
import type {
  FilterQuery,
  QueryOptions,
} from "../interfaces/iread-repository-base";
import type { IRepository } from "../interfaces/irepository";

// Type-safe Mongoose document handling
type MongooseDoc<T> = HydratedDocument<T>;
type MongooseQuery<T> = Query<MongooseDoc<T>[], MongooseDoc<T>>;
type MongooseSingleQuery<T> = Query<MongooseDoc<T> | null, MongooseDoc<T>>;

// More specific filter query type for Mongoose
type MongooseFilterQuery<T extends IBaseEntity> = {
  [K in keyof T]?: T[K] extends string
    ? T[K] | RegExp | { $regex: string; $options?: string }
    : T[K] extends number
    ?
        | T[K]
        | {
            $gt?: number;
            $gte?: number;
            $lt?: number;
            $lte?: number;
            $ne?: number;
          }
    : T[K] extends Date
    ? T[K] | { $gt?: Date; $gte?: Date; $lt?: Date; $lte?: Date }
    : T[K] | { $in?: T[K][]; $ne?: T[K]; $exists?: boolean };
} & {
  _id?: string | Types.ObjectId | { $in?: (string | Types.ObjectId)[] };
  $or?: MongooseFilterQuery<T>[];
  $and?: MongooseFilterQuery<T>[];
};

// Type-safe sort object
type SortObject = Record<string, SortOrder>;

export abstract class MongoDBBaseRepository<T extends IBaseEntity>
  implements IRepository<T>
{
  protected readonly collection: Model<T>;

  constructor(model: Model<T>) {
    this.collection = model;
  }

  // Create operations
  async postAsync(entity: T): Promise<T | null> {
    try {
      const newEntity = new this.collection(entity);
      const savedEntity: MongooseDoc<T> = await newEntity.save();
      return this.documentToPlainObject(savedEntity);
    } catch (error) {
      console.error("Error creating entity:", error);
      return null;
    }
  }

  async postsAsync(entities: T[]): Promise<T[] | null> {
    try {
      const savedEntities: MongooseDoc<T>[] = await this.collection.insertMany(
        entities
      );
      return savedEntities.map((entity) => this.documentToPlainObject(entity));
    } catch (error) {
      console.error("Error creating entities:", error);
      return null;
    }
  }

  // Update operations
  async putAsync(entity: T): Promise<boolean> {
    try {
      this.validateEntityForUpdate(entity);

      const filter = this.createIdFilter(entity.id);
      const updateDoc = this.createUpdateDocument(entity);

      const result: UpdateWriteOpResult = await this.collection.updateOne(
        filter,
        { $set: updateDoc },
        { runValidators: true }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error updating entity:", error);
      return false;
    }
  }

  async putByIdAsync(id: string, updateData: Partial<T>): Promise<T | null> {
    try {
      const updatedEntity: MongooseDoc<T> | null =
        await this.collection.findByIdAndUpdate(
          id,
          { $set: updateData },
          { new: true, runValidators: true }
        );
      return updatedEntity ? this.documentToPlainObject(updatedEntity) : null;
    } catch (error) {
      console.error("Error updating entity by ID:", error);
      return null;
    }
  }

  async putsAsync(entities: T[]): Promise<boolean> {
    try {
      // Use session for transaction-like behavior with individual updates
      const session = await this.collection.db.startSession();
      let successCount = 0;

      try {
        await session.withTransaction(async () => {
          for (const entity of entities) {
            this.validateEntityForUpdate(entity);

            const filter = this.createIdFilter(entity.id);
            const updateDoc = this.createUpdateDocument(entity);

            const result: UpdateWriteOpResult = await this.collection.updateOne(
              filter,
              { $set: updateDoc },
              { runValidators: true, session }
            );

            if (result.modifiedCount > 0) {
              successCount++;
            }
          }
        });

        return successCount === entities.length;
      } finally {
        await session.endSession();
      }
    } catch (error) {
      console.error("Error updating entities:", error);
      return false;
    }
  }

  // Alternative bulk update method using raw MongoDB operations
  async putsBulkAsync(entities: T[]): Promise<boolean> {
    try {
      // Create bulk operations using the raw MongoDB driver
      const bulkOps = entities.map((entity) => {
        this.validateEntityForUpdate(entity);
        const updateDoc = this.createUpdateDocument(entity);

        return {
          updateOne: {
            filter: { _id: new Types.ObjectId(entity.id) },
            update: { $set: updateDoc },
            upsert: false,
          },
        };
      });

      // Use the native MongoDB driver's bulkWrite (bypassing Mongoose's type system)
      const result = await this.collection.collection.bulkWrite(bulkOps);
      return result.modifiedCount === entities.length;
    } catch (error) {
      console.error("Error bulk updating entities:", error);
      return false;
    }
  }

  // Delete operations
  async deleteAsync(entity: T): Promise<boolean> {
    try {
      this.validateEntityForUpdate(entity);
      return await this.deleteByIdAsync(entity.id);
    } catch (error) {
      console.error("Error deleting entity:", error);
      return false;
    }
  }

  async deleteByIdAsync(id: string): Promise<boolean> {
    try {
      const result: DeleteResult = await this.collection.deleteOne(
        this.createIdFilter(id)
      );
      return result.deletedCount > 0;
    } catch (error) {
      console.error("Error deleting entity by ID:", error);
      return false;
    }
  }

  async deletesAsync(entities: T[]): Promise<boolean> {
    try {
      const ids = this.extractValidIds(entities);
      if (ids.length === 0) return true;

      const filter: MongooseFilterQuery<T> = {
        _id: { $in: ids },
      } as MongooseFilterQuery<T>;

      const result: DeleteResult = await this.collection.deleteMany(filter);
      return result.deletedCount === ids.length;
    } catch (error) {
      console.error("Error deleting entities:", error);
      return false;
    }
  }

  async deleteByPredicateAsync(predicate: FilterQuery<T>): Promise<number> {
    try {
      const mongooseFilter = this.convertFilterQuery(predicate);
      const result: DeleteResult = await this.collection.deleteMany(
        mongooseFilter
      );
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
      const mongooseFilter = this.convertFilterQuery(predicate);
      let query: MongooseSingleQuery<T> =
        this.collection.findOne(mongooseFilter);

      if (includes && includes.length > 0) {
        query = this.applyPopulation(query, includes);
      }

      const result: MongooseDoc<T> | null = await query.exec();
      return result ? this.documentToPlainObject(result) : null;
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
      const mongooseFilter = predicate
        ? this.convertFilterQuery(predicate)
        : this.createEmptyFilter();

      let query: MongooseQuery<T> = this.collection.find(mongooseFilter);

      if (options) {
        query = this.applyQueryOptionsToFindQuery(query, options);
      }

      const results: MongooseDoc<T>[] = await query.exec();
      return results.map((result) => this.documentToPlainObject(result));
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
      const mongooseFilter = predicate
        ? this.convertFilterQuery(predicate)
        : this.createEmptyFilter();

      return await this.collection.countDocuments(mongooseFilter);
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
      const mongooseFilter = predicate
        ? this.convertFilterQuery(predicate)
        : this.createEmptyFilter();

      const count = await this.collection
        .countDocuments(mongooseFilter)
        .limit(1);
      return count > 0;
    } catch (error) {
      console.error("Error checking entity existence:", error);
      return false;
    }
  }

  // Protected helper methods - all fully typed
  protected documentToPlainObject(doc: MongooseDoc<T>): T {
    const obj = doc.toObject();

    // Transform _id to id for API responses
    if (obj._id) {
      (obj as T).id = obj._id.toString();
      // Use Reflect.deleteProperty or object destructuring to avoid TypeScript error
      Reflect.deleteProperty(obj, "_id");
    }

    // Remove Mongoose's __v field
    if ("__v" in obj) {
      Reflect.deleteProperty(obj, "__v");
    }

    return obj as T;
  }

  protected convertFilterQuery(
    predicate: FilterQuery<T>
  ): MongooseFilterQuery<T> {
    const mongooseFilter: Record<string, unknown> = { ...predicate };

    // Convert 'id' to '_id' for MongoDB queries
    if ("id" in mongooseFilter) {
      mongooseFilter._id = mongooseFilter.id;
      Reflect.deleteProperty(mongooseFilter, "id");
    }

    return mongooseFilter as MongooseFilterQuery<T>;
  }

  protected createEmptyFilter(): MongooseFilterQuery<T> {
    return {} as MongooseFilterQuery<T>;
  }

  protected createIdFilter(id: string): MongooseFilterQuery<T> {
    return { _id: id } as MongooseFilterQuery<T>;
  }

  protected createUpdateDocument(entity: T): Partial<T> {
    const updateDoc: Partial<T> = { ...entity };
    // biome-ignore lint/performance/noDelete: <explanation>
    delete updateDoc.id;
    return updateDoc;
  }

  protected extractValidIds(entities: T[]): string[] {
    return entities
      .map((entity) => entity.id)
      .filter((id): id is string => Boolean(id));
  }

  protected validateEntityForUpdate(
    entity: T
  ): asserts entity is T & { id: string } {
    if (!entity) {
      throw new Error("Entity cannot be null or undefined");
    }
    if (!entity.id) {
      throw new Error("Entity must have an _id for update/delete operation");
    }
  }

  protected applyPopulation<Q extends MongooseSingleQuery<T>>(
    query: Q,
    includes: (keyof T)[]
  ): Q {
    const populateFields = includes.map((field) => String(field)).join(" ");
    return query.populate(populateFields) as Q;
  }

  protected applyQueryOptionsToFindQuery(
    query: MongooseQuery<T>,
    options: QueryOptions<T>
  ): MongooseQuery<T> {
    let typedQuery = query;

    // Handle pagination
    if (options.pageIndex !== undefined && options.limit !== undefined) {
      const skip = options.pageIndex * options.limit;
      typedQuery = typedQuery.skip(skip).limit(options.limit);
    }

    // Handle sorting
    if (options.sortBy) {
      const sortDirection: SortOrder = options.sortDescending ? -1 : 1;
      const sortField = String(options.sortBy);
      const sortObj: SortObject = {
        [sortField]: sortDirection,
      };
      typedQuery = typedQuery.sort(sortObj);
    }

    // Handle includes/population
    if (options.includes && options.includes.length > 0) {
      const populateFields = options.includes
        .map((field) => String(field))
        .join(" ");
      typedQuery = typedQuery.populate(populateFields);
    }

    return typedQuery;
  }

  // Additional utility methods
  protected isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  protected validateObjectId(id: string): void {
    if (!this.isValidObjectId(id)) {
      throw new Error(`Invalid ObjectId format: ${id}`);
    }
  }

  // Type-safe helper for checking if object has toObject method
  protected hasToObjectMethod(obj: unknown): obj is { toObject(): T } {
    return (
      obj !== null &&
      typeof obj === "object" &&
      "toObject" in obj &&
      typeof (obj as Record<string, unknown>).toObject === "function"
    );
  }

  // Alternative document conversion for edge cases
  protected safeDocumentToPlainObject(doc: unknown): T {
    if (this.hasToObjectMethod(doc)) {
      return doc.toObject();
    }
    return doc as T;
  }
}
