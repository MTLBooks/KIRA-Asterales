import { Types } from 'mongoose'

/**
 * Data operation result list (result is an array of objects)
 */
export type DbPoolResultsType<T> = {
	/** Whether the operation was successful */
	success: boolean;
	/** Additional message */
	message: string;
	/** Error information (if any) */
	error?: unknown;
	/** Data operation result array (if any) */
	result?: T[];
}

/**
 * Data operation result (result is an object)
 */
export type DbPoolResultType<T> = {
	/** Whether the operation was successful */
	success: boolean;
	/** Additional message */
	message: string;
	/** Error information (if any) */
	error?: unknown;
	/** Data operation result object (if any) */
	result?: T;
}

/**
 * success Whether the update operation was successful
 * message Additional message
 * error Error information (if any)
 * result Update operation result (if any)
	* acknowledged Whether the update was successful
	* matchedCount Number of matches (before the update operation, how many data should be updated)
	* modifiedCount Actual update count (after the update operation, actually updated data)
 */
export type UpdateResultType = {
	success: boolean;
	message: string;
	error?: unknown;
	result?: {
		acknowledged: boolean;
		matchedCount: number;
		modifiedCount: number;
	};
}

/**
 * MongoDB available query conditions
 */
type MongoDBConditionsType<T> = {
	$gt?: number; // Greater than
	$gte?: number; // Greater than or equal
	$lt?: number; // Less than
	$lte?: number; // Less than or equal
	$ne?: number; // Not equal

	$and?: QueryType<T>[]; // And
	$or?: QueryType<T>[]; // Or
	$not?: QueryType<T>; // Not

	$exists?: boolean; // Whether the property exists, e.g.: { 'phone.number': { $exists: true } } Find all documents containing phone.number
	$type?: string; // Match field type, e.g.: { age: { $type: 'number' } }

	$in?: unknown[]; // Field value matches any value in the array, e.g.: { status: { $in: ['A', 'B'] } }
	$nin?: unknown[]; // Field value does not match any value in the array
	$all?: unknown[]; // Array field contains all specified elements, e.g.: { tags: { $all: ['tech', 'health'] } }
	$size?: number; // Array size, e.g.: { tags: { $size: 3 } }

	$elemMatch?: MongoDBConditionsType<T>; // Ensure at least one element in the database array matches the provided conditions

	$regex?: RegExp; // Regular expression
}

// Database Query, equivalent to WHERE in SQL
export type QueryType<T> = {
	[K in keyof T]?: T[K] extends Types.DocumentArray<unknown> ? MongoDBConditionsType<T> : T[K] | MongoDBConditionsType<T>;
} & Record< string, boolean | string | number | MongoDBConditionsType<T> >

// Database Update, equivalent to SET in SQL UPDATE
export type UpdateType<T> = {
	[K in keyof T]?: T[K];
}

// Database Select projection, equivalent to SELECT in SQL
export type SelectType<T> = {
	[K in keyof T]?: 1;
}

// Database sorting, equivalent to ORDER BY in SQL
export type OrderByType<T> = {
	[K in keyof T]?: 1 | -1;
}
