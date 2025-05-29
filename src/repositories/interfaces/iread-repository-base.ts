// Base types and utilities for MongoDB operations
export type FilterQuery<T> = Partial<T>;
export type SortQuery<T> = { [K in keyof T]?: 1 | -1 } | string;
export type ProjectionFields<T> = { [K in keyof T]?: 1 | 0 } | string[];

export interface PaginationOptions {
  pageIndex?: number; // starts at 0
  limit?: number;
}

export interface SortOptions<T> {
  sortBy?: keyof T | string;
  sortDescending?: boolean;
}

export interface QueryOptions<T> extends PaginationOptions, SortOptions<T> {
  randomize?: boolean;
  includes?: (keyof T)[];
}

/**
 * A IReadRepositoryBase<T> can be used to query instances of T.
 * This interface provides read-only operations for entities.
 */
export interface IReadRepositoryBase<T> {
  /**
   * Finds an entity with filter criteria
   * @param predicate - Filter criteria for the entity
   * @param includes - Fields to populate/include in the result
   * @returns Promise resolving to the entity or null if not found
   * @example const order = await repository.getAsync({ orderId: 1 }, ['customer']);
   */
  getAsync(
    predicate: FilterQuery<T>,
    includes?: (keyof T)[]
  ): Promise<T | null>;

  /**
   * Finds all entities of T from the database.
   * @returns Promise resolving to a list of all entities
   */
  getsAsync(): Promise<T[]>;

  /**
   * Finds entities with filter criteria, pagination, and sorting
   * @param predicate - Filter criteria for entities
   * @param options - Query options including pagination, sorting, and includes
   * @returns Promise resolving to a list of entities
   * @example const orders = await repository.getsAsync(
   *   { status: 'active' },
   *   { pageIndex: 0, limit: 10, sortBy: 'createdAt', sortDescending: true, includes: ['customer'] }
   * );
   */
  getsAsync(predicate: FilterQuery<T>, options?: QueryOptions<T>): Promise<T[]>;

  /**
   * Returns the total number of records.
   * @returns Promise resolving to the total count of entities
   */
  countAsync(): Promise<number>;

  /**
   * Returns the total number of records matching the predicate.
   * @param predicate - Filter criteria for counting
   * @returns Promise resolving to the count of matching entities
   */
  countAsync(predicate: FilterQuery<T>): Promise<number>;

  /**
   * Returns a boolean whether any entity exists or not.
   * @returns Promise resolving to true if any entities exist, false otherwise
   */
  anyAsync(): Promise<boolean>;

  /**
   * Returns a boolean whether any entity matching the predicate exists.
   * @param predicate - Filter criteria for existence check
   * @returns Promise resolving to true if matching entities exist, false otherwise
   */
  anyAsync(predicate: FilterQuery<T>): Promise<boolean>;
}
