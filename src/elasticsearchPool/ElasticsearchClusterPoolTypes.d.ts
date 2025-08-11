/**
 * Elasticsearch Document Schema Item's type parameter allowed types
 */
type EsDocumentItemConstructorType = StringConstructor | NumberConstructor | BooleanConstructor | DateConstructor | ArrayConstructor | unknown[] | ArrayConstructor | Record<string, EsDocumentItemType>

/**
 * Elasticsearch Document Schema Item type
 */
type EsDocumentItemType = {
	type: EsDocumentItemConstructorType;
	required?: boolean;
}

type ArrayElementType<T> = T extends (infer U)[] ? U : T

/**
 * Map from constructor type to corresponding TypeScript basic type; if it's an object, recursively determine
 */
type ConstructorTypeMapper<T> =
	T extends StringConstructor ? string :
		T extends NumberConstructor ? number :
			T extends BooleanConstructor ? boolean :
				T extends DateConstructor ? Date :
					T extends unknown[] ? EsSchema2TsType< ArrayElementType<T> >[] :
						T extends ArrayConstructor ? Array<unknown> :
							T extends Record<string, EsDocumentItemType> ? EsSchema2TsType<T> :
								never

/**
 * Guard type, ensure Elasticsearch Document Schema Item defines type, otherwise return never
 */
type PropertyType<T> = T extends { type: infer R } ? ConstructorTypeMapper<R> : never

/**
 * Convert Elasticsearch Document Schema to Ts type
 *
 * Using this method to define schema and indexName can establish an association relationship, ensuring schema matches the correct indexName (this is a bit like the problem that Rust's "[Slice type](https://kaisery.github.io/trpl-zh-cn/ch04-03-slices.html)" concept wants to solve)
 *
 * // WARN Note that the value of the required property must be declared like this → true as const, not just write a true or false, must add as const, otherwise it won't take effect
 *
 * @example
 * // Example: Define an Elasticsearch Document object containing schema and indexName
 * const fooDocument = {
 *   schema: {
 *     foo: { type: String },
 *     bar: { type: String, required: true as const },
 *     baz: {
 *       type: {
 *         foo1: { type: String },
 *         bar1: { type: Number, required: false as const },
 *       },
 *     },
 *   },
 *   indexName: 'test-index',
 * }
 *
 * // Use EsSchema2TsType to convert the above schema
 * type fooDocumentType = EsSchema2TsType<typeof fooDocument.schema>;
 *
 * // Converted TypeScript type:
 * // type fooDocumentType = {
 * //   foo?: string,
 * //   bar: string,
 * //   baz?: {
 * //     foo1?: string,
 * //     bar1?: number,
 * //   },
 * // }
 *
 */
export type EsSchema2TsType<T> = {
	[P in keyof T as T[P] extends { required: true } ? P : never]: PropertyType<T[P]>;
} & {
	[P in keyof T as T[P] extends { required: true } ? never : P]+?: PropertyType<T[P]>;
}


// /**
//  * Elasticsearch search data type mapping
//  */
// type QueryTypeMapper<T> =
// 	T extends Record<string, string> ? string :
// 		T extends Record<string, number> ? number :
// 			T extends Record<string, boolean> ? boolean :
// 				T extends Record<string, QueryTypeMapper<T> > ? QueryTypeMapper<T> :
// 					never


// /** Elasticsearch Query, equivalent to WHERE LIKE in SQL */
// export type EsQueryType<T> = {
// 	[K in keyof T]?: QueryTypeMapper<T[K]>;
// }

/** Result returned from executing operations in Elasticsearch */
export type EsResultType<T> = {
	/** Whether the operation executed in Elasticsearch was successful, true for success, false for failure */
	success: boolean;
	/** Additional message */
	message?: string;
	/** Result returned from executing the operation */
	result?: T[];
}
