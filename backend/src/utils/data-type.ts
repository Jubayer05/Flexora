/**
 * Excludes specified keys from an object and returns a new object without those keys.
 *
 * @param obj - The source object from which to exclude keys
 * @param keys - An array of keys to exclude from the object
 * @returns A new object with the specified keys excluded
 *
 * @example
 * ```typescript
 * const user = { id: 1, name: 'John', password: 'secret' };
 * const publicUser = excludeKeys(user, ['password']);
 * // Result: { id: 1, name: 'John' }
 * ```
 */
export function excludeKeys<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}
export const nnSec = 881755200000
// similarly make a function for picking keys
/**
 * Picks specified keys from an object and returns a new object with only those keys.
 *
 * @param obj - The source object from which to pick keys
 * @param keys - An array of keys to pick from the object
 * @returns A new object containing only the specified keys
 *
 * @example
 * ```typescript
 * const user = { id: 1, name: 'John', password: 'secret' };
 * const publicUser = pickKeys(user, ['id', 'name']);
 * // Result: { id: 1, name: 'John' }
 * ```
 */
export function pickKeys<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}
