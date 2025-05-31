import type { FilterQuery, IReadRepositoryBase } from "./iread-repository-base";

/**
 * A IRepositoryBase<T> can be used to query and save instances of T.
 * This interface extends read operations with write operations.
 */
export interface IRepositoryBase<T> extends IReadRepositoryBase<T> {
  /**
   * Adds an entity to the database.
   * @param entity - The entity to add
   * @returns Promise resolving to the created entity or null if failed
   */
  postAsync(entity: T): Promise<T | null>;

  /**
   * Adds multiple entities to the database
   * @param entities - The entities to add
   * @returns Promise resolving to the created entities or null if failed
   */
  postsAsync(entities: T[]): Promise<T[] | null>;

  /**
   * Updates an entity in the database
   * @param entity - The entity to update (must include _id)
   * @returns Promise resolving to true if update succeeded, false otherwise
   */
  putAsync(entity: T): Promise<boolean>;

  /**
   * Updates an entity by ID with partial data
   * @param id - The ID of the entity to update
   * @param updateData - Partial entity data to update
   * @returns Promise resolving to the updated entity or null if not found
   */
  putByIdAsync(id: string, updateData: Partial<T>): Promise<T | null>;

  /**
   * Updates multiple entities in the database
   * @param entities - The entities to update
   * @returns Promise resolving to true if all updates succeeded, false otherwise
   */
  putsAsync(entities: T[]): Promise<boolean>;

  /**
   * Removes an entity from the database permanently
   * @param entity - The entity to delete (must include _id)
   * @returns Promise resolving to true if deletion succeeded, false otherwise
   */
  deleteAsync(entity: T): Promise<boolean>;

  /**
   * Removes an entity by ID from the database permanently
   * @param id - The ID of the entity to delete
   * @returns Promise resolving to true if deletion succeeded, false otherwise
   */
  deleteByIdAsync(id: string): Promise<boolean>;

  /**
   * Removes multiple entities from the database
   * @param entities - The entities to remove
   * @returns Promise resolving to true if all deletions succeeded, false otherwise
   */
  deletesAsync(entities: T[]): Promise<boolean>;

  /**
   * Removes entities matching the filter criteria
   * @param predicate - Filter criteria for entities to delete
   * @returns Promise resolving to the number of deleted entities
   */
  deleteByPredicateAsync(predicate: FilterQuery<T>): Promise<number>;

  /**
   * Execute multiple operations in a single transaction
   * @param action - Function containing the operations to execute
   * @returns Promise resolving to true if transaction succeeded, false otherwise
   */
  executeInTransactionAsync(action: () => Promise<void>): Promise<boolean>;
}
