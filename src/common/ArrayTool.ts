
/**
 *
 * Remove duplicate objects from a complex object array in JavaScript
 * BY: ChatGPT-4, 02
 *
 * @param array Array to be deduplicated
 * @returns Deduplicated array
 */
export const removeDuplicateObjects = <T>(array: T[]): T[] => {
	if (array && array.length > 0) {
		const uniqueJSONStrings = new Set()

		return array.filter(item => {
			const jsonString: string = JSON.stringify(item)
			if (!uniqueJSONStrings.has(jsonString)) {
				uniqueJSONStrings.add(jsonString)
				return true
			}
			return false
		})
	} else {
		return [] as T[]
	}
}

type NestedArray<T> = T | NestedArray<T>[]

/**
 *
 * Remove duplicate objects from object arrays with recursive deep comparison and better robustness
 * // ? When deduplicating, objects with changed property order cannot be compared, {foo: 1, bar: 2} and {bar: 2, foo: 1} are treated as different objects, better performance
 * BY: ChatGPT-4, 02
 *
 * @param array Array to be deduplicated
 * @returns Deduplicated array
 */
export const removeDuplicateObjectsInDeepArrayStrong = <T>(inputArray: NestedArray<T>): T[] => {
	try {
		// Flatten the input array into a one-dimensional array
		const flattenArray = <T>(arr: NestedArray<T>): T[] => {
			if (!Array.isArray(arr)) {
				return [arr]
			}

			return arr.reduce<T[]>((flat, toFlatten) => {
				return flat.concat(flattenArray(toFlatten))
			}, [])
		}

		// Check if two objects are equal
		const isEqual = (obj1: unknown, obj2: unknown): boolean => {
			return JSON.stringify(obj1) === JSON.stringify(obj2)
		}

		// Remove duplicate objects
		const removeDuplicates = <T>(arr: T[]): T[] => {
			return arr.filter((value, index, self) => {
				return self.findIndex(item => isEqual(item, value)) === index
			})
		}

		if (inputArray && Array.isArray(inputArray) && inputArray.length > 0) {
			const flattenedArray = flattenArray<T>(inputArray)
			return removeDuplicates<T>(flattenedArray)
		} else {
			console.error('something error in function removeDuplicateObjectsStrongInDeepArray, required data "inputArray" is empty')
			return []
		}
	} catch (error) {
		console.error('something error in function removeDuplicateObjectsStrongInDeepArray')
		return []
	}
}

// Object comparison function
const objectsAreEqual = <T>(a: T, b: T): boolean => {
	if (a && b) {
		const keysA = Object.keys(a).sort()
		const keysB = Object.keys(b).sort()
		if (keysA.length !== keysB.length) {
			return false
		}
			
		for (let i = 0; i < keysA.length; i++) {
			if (keysA[i] !== keysB[i] || a[keysA[i]] !== b[keysB[i]]) {
				return false
			}
		}
			
		return true
	} else {
		console.error('something error in function objectsAreEqual, required data "a" or "b" is empty')
		return false
	}
}


/**
 *
 * Remove duplicate objects from object arrays with recursive deep comparison and better robustness
 * // > When deduplicating, objects with changed property order can still be compared, {foo: 1, bar: 2} and {bar: 2, foo: 1} are treated as the same object, performance decreases
 * BY: ChatGPT-4, 02
 *
 * @param array Array to be deduplicated
 * @returns Deduplicated array
 */
export const removeDuplicateObjectsInDeepArrayAndDeepObjectStrong = <T>(inputArray: NestedArray<T>): T[] => {
	try {
		// Flatten the input array into a one-dimensional array
		const flattenArray = <T>(arr: NestedArray<T>): T[] => {
			if (!Array.isArray(arr)) {
				return [arr]
			}

			return arr.reduce<T[]>((flat, toFlatten) => {
				return flat.concat(flattenArray(toFlatten))
			}, [])
		}

		// Remove duplicate objects
		const removeDuplicates = <T>(arr: T[]): T[] => {
			return arr.filter((value, index, self) => {
				return self.findIndex(item => objectsAreEqual<T>(item, value)) === index
			})
		}

		if (inputArray && Array.isArray(inputArray) && inputArray.length > 0) {
			const flattenedArray = flattenArray<T>(inputArray)
			return removeDuplicates<T>(flattenedArray)
		} else {
			console.error('something error in function removeDuplicateObjectsStrongInDeepArray, required data "inputArray" is empty')
			return []
		}
	} catch (error) {
		console.error('something error in function removeDuplicateObjectsStrongInDeepArray')
		return []
	}
}

/**
 * Merge and deduplicate two object arrays
 * BY: ChatGPT-4, 02
 *
 * @param arr1 First object array to merge
 * @param arr2 Second object array to merge
 *
 * @returns New merged object array with deduplication processing
 */
export const mergeAndDeduplicateObjectArrays = <T>(arr1: T[], arr2: T[]): T[] => {
	try {
		// Check if arrays are empty
		if (arr1 || arr2) {
			// Handle empty array cases
			if (arr1 === undefined || arr1 === null) return arr2
			if (arr2 === undefined || arr2 === null) return arr1

			// Merge arrays and deduplicate
			const mergedArray: T[] = [...arr1, ...arr2]
			const uniqueArray: T[] = []

			
			mergedArray.forEach((item: T) => {
				if (!uniqueArray.some((uniqueItem: T) => objectsAreEqual(item, uniqueItem))) {
					uniqueArray.push(item)
				}
			})

			return uniqueArray
		} else {
			console.error('something error in function mergeAndDeduplicateObjectArrays, required data "inputArray(arr1 and arr2)" is empty')
			return []
		}
	} catch (error) {
		console.error('something error in function mergeAndDeduplicateObjectArrays')
		return []
	}
}
