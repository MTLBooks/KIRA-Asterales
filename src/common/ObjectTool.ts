/**
 * Check if an object is empty
 */
export const isEmptyObject = (obj: object) => typeof obj === 'object' && !(Array.isArray(obj)) && Object.keys(obj).length === 0

/**
 * Remove elements with undefined values from an object, return a new object
 * The underlying principle is to (shallow) copy all elements that are not undefined to a new object
 * @param obj Object that needs to be cleaned up with elements having undefined values
 * @returns Object with undefined value elements cleaned up
 */
export const clearUndefinedItemInObject = <T extends Record<string, any> >(obj: T): Partial<T> => {
	const newObj: Partial<T> = {};
  (Object.keys(obj) as (keyof T)[]).forEach(key => {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
}
