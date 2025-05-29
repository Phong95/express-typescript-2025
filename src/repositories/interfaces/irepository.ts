import type { IRepositoryBase } from "./irepository-base";

/**
 * Generic repository interface that extends the base repository
 * An abstraction for persistence operations
 */
export interface IRepository<T> extends IRepositoryBase<T> {
  // This interface can be extended with domain-specific methods
  // Currently inherits all methods from IRepositoryBase<T>
}
