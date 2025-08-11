import { ReadPreferenceMode } from 'mongodb'
import mongoose, { AnyKeys, ClientSession, InferSchemaType, Model, PipelineStage, Schema } from 'mongoose'
import { DbPoolResultsType, DbPoolResultType, OrderByType, QueryType, SelectType, UpdateResultType, UpdateType } from './DbClusterPoolTypes.js'
import { SequenceValueSchema } from './schema/SequenceSchema.js'
import { UserInfoSchema, UserTotpAuthenticatorSchema } from './schema/UserSchema.js'

/**
 * Virtual properties for association queries
 *
 * @example Define virtual property 'uploader' to associate through username (can be understood as SQL JOIN)
 * videoSchema.virtual('uploader', {
 *   ref: 'User', // Associate to User model
 *   localField: 'uploaderUsername', // Field in Video model used for association
 *   foreignField: 'username', // Field in User model used for association
 *   justOne: true // Only return one user document
 * });
 * const Video = mongoose.model('Video', videoSchema);
 *
 * // Use populate method to query this virtual property
 * Video.find().populate('uploader')
 *
 */
type MongoDBVirtualSettingType<T, P> = {
	name: string; // Virtual property name
	options: {
		ref: string; // Associated child model
		localField: Extract<keyof T, string>; // Field in parent model used for association
		foreignField: Extract<keyof P, string>; // Field in child model used for association
		justOne: boolean; // If true, only one piece of data associates with one document (even if there are many matching conditions)
	};
	// model: {
	// 	modelName: string;
	// 	model: Model<P>;
	// };
}

/** Basic Mongoose options */
type BaseDbPoolOptions = {
		/** Transaction session */
		session?: ClientSession;
		/** Read preference, will override the read preference set when creating the connection, when session is not empty, readPreference needs to be set to primary (usually set automatically) */
		readPreference?: ReadPreferenceMode;
}

/** Define a unique type that cannot appear in any type as an identifier */
type DbPoolOptionsMarkerType = { __FLAG_DB_POOL_OPTIONS_MARKER_TYPE_F6WEISS8900SWEDE5URV3KCAL98HBY8PG5JP4Y5XK1OOXXNBWJ70NVR4SURCOAT3SIB9AXML3Y4LXRCWNOGDH7CRKGNUIGJ7O5__: never } // Define a unique type that cannot appear in any type as an identifier

/** Mongoose options */
export type DbPoolOptions<T = unknown, P = DbPoolOptionsMarkerType> =
	P extends DbPoolOptionsMarkerType ?
		BaseDbPoolOptions
	:
		BaseDbPoolOptions & {
			/** Virtual properties for association queries // WARN Don't set unless you know what you're doing! */
			virtual?: MongoDBVirtualSettingType<T, P>;
			/** Virtual property name associated in populate method, for association queries // WARN Don't set unless you know what you're doing! */
			populate?: MongoDBVirtualSettingType<T, P>['name'];
		}

/**
 * Connect to MongoDB replica set, this method should be called during system initialization
 */
export const connectMongoDBCluster = async (): Promise<void> => {
	try {
		const databaseProtocol = process.env.MONGODB_PROTOCOL
		const databaseHost = process.env.MONGODB_CLUSTER_HOST
		const databaseTlsCa = process.env.MONGODB_TLS_CA_BASE64 ? Buffer.from(process.env.MONGODB_TLS_CA_BASE64, 'base64').toString('utf-8') : ''
		const databaseTlsCert = process.env.MONGODB_TLS_CERT_BASE64 ? Buffer.from(process.env.MONGODB_TLS_CERT_BASE64, 'base64').toString('utf-8') : ''
		const databaseTlsKey = process.env.MONGODB_TLS_KEY_BASE64 ? Buffer.from(process.env.MONGODB_TLS_KEY_BASE64, 'base64').toString('utf-8') : ''
		const databaseName = process.env.MONGODB_NAME
		const databaseUsername = process.env.MONGODB_USERNAME
		const databasePassword = process.env.MONGODB_PASSWORD

		if (!databaseHost) {
			console.error('ERROR', 'Failed to create database connection, databaseHost is empty')
			process.exit()
		}
		if (!databaseName) {
			console.error('ERROR', 'Failed to create database connection, databaseName is empty')
			process.exit()
		}
		if (!databaseUsername) {
			console.error('ERROR', 'Failed to create database connection, databaseUsername is empty')
			process.exit()
		}
		if (!databasePassword) {
			console.error('ERROR', 'Failed to create database connection, databasePassword is empty')
			process.exit()
		}

		const protocol = databaseProtocol === 'mongodb+srv' ? 'mongodb+srv' : 'mongodb'
		const mongoURL = `${protocol}://${databaseUsername}:${databasePassword}@${databaseHost}/${databaseName}?authSource=admin`

		const connectionOptions = {
			readPreference: ReadPreferenceMode.secondaryPreferred, // Default read preference is to read from replica first, this setting will be overridden in certain cases, such as when using transactions, it will prioritize reading from primary.
		}

		if (databaseProtocol === 'mongodb+srv' && !databaseTlsCa) {
			connectionOptions['tlsAllowInvalidCertificates'] = true
			console.warn('WARN', 'WARNING', "Your MongoDB connection protocol is 'mongodb+srv', but can not find any TLS credentials. Communications with the database may be eavesdropped!")
		}

		if (databaseTlsCa && databaseTlsCert && databaseTlsKey) {
			connectionOptions['tls'] = true
			connectionOptions['ca'] = databaseTlsCa
			connectionOptions['cert'] = databaseTlsCert
			connectionOptions['key'] = databaseTlsKey
			connectionOptions['tlsAllowInvalidCertificates'] = false
		}

		try {
			mongoose.set('strictQuery', true) // If set to true, if fields other than those defined in the schema are passed during queries, these fields will be ignored
			await mongoose.connect(mongoURL, connectionOptions)

			// Place models that need to be registered early here
			// User info should be registered early so that other tables can use Mongoose's virtual properties to associate user info data
			mongoose.model(UserInfoSchema.collectionName, UserInfoSchema.schemaInstance)
			// User TOTP authentication collection needs to be registered early, otherwise executing transactions will cause errors.
			mongoose.model(UserTotpAuthenticatorSchema.collectionName, UserTotpAuthenticatorSchema.schemaInstance)

			console.info()
			console.info('MongoDB Cluster Connect successfully!')
		} catch (error) {
			console.error('ERROR', 'Failed to create database connection:', error)
			process.exit()
		}
	} catch (error) {
		console.error('ERROR', 'Failed to create database connection: connectMongoDBCluster unexpectedly terminated:', error)
		process.exit()
	}
}

/**
 * Insert data into database
 * @param data Data to be inserted
 * @param schema MongoDB Schema object
 * @param collectionName Name of the MongoDB collection where data will be inserted (inputting a singular noun will automatically create a collection name in plural form)
 * @param options Settings
 * @returns Status and result of data insertion
 */
export const insertData2MongoDB = async <T, P = DbPoolOptionsMarkerType>(data: T, schema: Schema, collectionName: string, options?: DbPoolOptions<T, P>): Promise< DbPoolResultsType<T & {_id: string}> > => {
	try {
		// Check if transaction session exists, if it does, set readPreference to 'primary'
		if (options?.session) {
			options.readPreference = 'primary'
		}

		let mongoModel: Model<T>
		// Check if model already exists
		if (mongoose.models[collectionName]) {
			mongoModel = mongoose.models[collectionName]
		} else {
			mongoModel = mongoose.model<T>(collectionName, schema)
		}
		mongoModel.createIndexes()
		const model = new mongoModel(data)
		try {
			const result = await model.save(options) as unknown as T & {_id: string}
			return { success: true, message: 'Data insertion successful', result: [result] }
		} catch (error) {
			console.error('ERROR', 'Data insertion failed:', error)
			throw { success: false, message: 'Data insertion failed', error }
		}
	} catch (error) {
		console.error('ERROR', 'Error occurred in insertData2MongoDB')
		throw { success: false, message: 'Data insertion failed, error occurred in insertData2MongoDB:', error }
	}
}

/**
 * Delete data from MongoDB database
 * @param where Query conditions
 * @param schema MongoDB Schema object
 * @param collectionName Name of the MongoDB collection used when deleting data (inputting a singular noun will automatically create a collection name in plural form)
 * @param options Settings
 * @returns Deletion status and result
 */
export const deleteDataFromMongoDB = async <T, P = DbPoolOptionsMarkerType>(where: QueryType<T>, schema: Schema<T>, collectionName: string, options?: DbPoolOptions<T, P>): Promise< DbPoolResultType<mongoose.mongo.DeleteResult> > => {
	try {
		// Check if transaction session exists, if it does, set readPreference to 'primary'
		if (options?.session) {
			options.readPreference = 'primary'
		}

		let mongoModel: Model<T>
		// Check if model already exists
		if (mongoose.models[collectionName]) {
			mongoModel = mongoose.models[collectionName]
		} else {
			mongoModel = mongoose.model<T>(collectionName, schema)
		}

		try {
			const result = await mongoModel.deleteOne(where, options)
			return { success: true, message: 'Data query successful', result }
		} catch (error) {
			console.error('ERROR', 'Data query failed:', error)
			throw { success: false, message: 'Data query failed', error }
		}
	} catch (error) {
		console.error('ERROR', 'Error occurred in selectDataFromMongoDB')
		throw { success: false, message: 'Data query failed, error occurred in selectDataFromMongoDB:', error }
	}
}

/**
 * Find data in MongoDB database
 * @param where Query conditions
 * @param select Projection (can be understood as SQL's SELECT clause)
 * @param schema MongoDB Schema object
 * @param collectionName Name of the MongoDB collection used when querying data (inputting a singular noun will automatically create a collection name in plural form)
 * @param options Settings
 * @returns Query status and result
 */
/** Pagination query */
type Pagination = {
	/** Current page number */
	page: number;
	/** How many items to display per page */
	pageSize: number;
}
export const selectDataFromMongoDB = async <T, P = DbPoolOptionsMarkerType>(where: QueryType<T>, select: SelectType<T>, schema: Schema<T>, collectionName: string, options?: DbPoolOptions<T, P>, sort?: OrderByType<T>, pagination?: Pagination): Promise< DbPoolResultsType<T> > => {
	try {
		// Check if transaction session exists, if it does, set readPreference to 'primary'
		if (options?.session) {
			options.readPreference = 'primary'
		}

		if (options && 'virtual' in options && options.virtual) {
			if (mongoose.models[options.virtual.options.ref]) {
				schema.virtual(options.virtual.name, options.virtual.options)
			}
		}

		let mongoModel: Model<T>
		// Check if model already exists
		if (mongoose.models[collectionName]) {
			mongoModel = mongoose.models[collectionName]
		} else {
			mongoModel = mongoose.model<T>(collectionName, schema)
		}

		let pageSize = undefined
		let skip = 0
		if (pagination && pagination.page > 0 && pagination.pageSize > 0) {
			skip = (pagination.page - 1) * pagination.pageSize
			pageSize = pagination.pageSize
		}

		try {
			let result
			if (options && 'populate' in options && options.populate) {
				result = (await mongoModel.find(where, select, options).populate({ path: options.populate, strictPopulate: false }).sort(sort).skip(skip).limit(pageSize)).map(results => results.toObject({ virtuals: true }) as T)
			} else {
				result = (await mongoModel.find(where, select, options).sort(sort).skip(skip).limit(pageSize)).map(results => results.toObject() as T)
			}
			return { success: true, message: 'Data query successful', result }
		} catch (error) {
			console.error('ERROR', 'Data query failed:', error)
			throw { success: false, message: 'Data query failed', error }
		}
	} catch (error) {
		console.error('ERROR', 'Error occurred in selectDataFromMongoDB')
		throw { success: false, message: 'Data query failed, error occurred in selectDataFromMongoDB:', error }
	}
}

/**
 * Find data using Aggregate in MongoDB database
 * @param schema MongoDB Schema object
 * @param collectionName Name of the MongoDB collection used when querying data (inputting a singular noun will automatically create a collection name in plural form)
 * @param props Aggregation query steps
 * @returns Query status and result
 */
export const selectDataByAggregateFromMongoDB = async <T>(schema: Schema<T>, collectionName: string, props: PipelineStage[]): Promise< DbPoolResultsType<T> > => {
	try {
		let mongoModel: Model<T>
		// Check if model already exists
		if (mongoose.models[collectionName]) {
			mongoModel = mongoose.models[collectionName]
		} else {
			mongoModel = mongoose.model<T>(collectionName, schema)
		}

		try {
			const result = (await mongoModel.aggregate(props)) as T[]
			return { success: true, message: 'Data aggregation query successful', result }
		} catch (error) {
			console.error('ERROR', 'Data aggregation query failed:', error)
			throw { success: false, message: 'Data aggregation query failed', error }
		}
	} catch (error) {
		console.error('ERROR', 'Error occurred in selectDataByAggregateFromMongoDB')
		throw { success: false, message: 'Data aggregation query failed, error occurred in selectDataByAggregateFromMongoDB:', error }
	}
}

/**
 * Update data in database
 * @param where Query conditions
 * @param update Data to be updated
 * @param schema MongoDB Schema object
 * @param collectionName Name of the MongoDB collection used when querying data (inputting a singular noun will automatically create a collection name in plural form)
 * @param options Settings
 * @returns Result of data update
 */
export const updateData4MongoDB = async <T, P = DbPoolOptionsMarkerType>(where: QueryType<T>, update: UpdateType<T>, schema: Schema<T>, collectionName: string, options?: DbPoolOptions<T, P>): Promise<UpdateResultType> => {
	try {
		// Check if transaction session exists, if it does, set readPreference to 'primary'
		if (options?.session) {
			options.readPreference = 'primary'
		}

		let mongoModel: Model<T>
		// Check if model already exists
		if (mongoose.models[collectionName]) {
			mongoModel = mongoose.models[collectionName]
		} else {
			mongoModel = mongoose.model<T>(collectionName, schema)
		}
		try {
			const updateResult = await mongoModel.updateMany(where, { $set: update }, options)
			const acknowledged = updateResult.acknowledged
			const matchedCount = updateResult.matchedCount
			const modifiedCount = updateResult.modifiedCount
			if (acknowledged && matchedCount > 0) {
				if (modifiedCount > 0) {
					return { success: true, message: 'Data update successful', result: { acknowledged, matchedCount, modifiedCount } }
				} else {
					console.warn('WARN', 'WARNING', 'Data was matched and update was attempted, but data was not (need not) updated, possibly because the data values before and after update are the same', { where, update })
					return { success: true, message: 'Attempted to update data, but data need not be updated', result: { acknowledged, matchedCount, modifiedCount } }
				}
			} else {
				console.warn('ERROR', 'Attempted to update data, but update failed because no data was matched', { where, update })
				return { success: false, message: 'Attempted to update data, but update failed, possibly no data was matched', result: { acknowledged, matchedCount, modifiedCount } }
			}
		} catch (error) {
			console.error('ERROR', 'Data update failed:', error, { where, update })
			throw { success: false, message: 'Data update failed', error }
		}
	} catch (error) {
		console.error('ERROR', 'Data update failed, unknown error')
		throw { success: false, message: 'Data update failed, error occurred in updateData4MongoDB:', error }
	}
}

/**
 * Find one matching data from database and update it, then return the updated result // WARN Please avoid query conditions matching multiple data in business logic. If multiple data are matched, only the first one will be updated, causing data mismatch!
 * @param where Query conditions // WARN Please avoid query conditions matching multiple data in business logic. If multiple data are matched, only the first one will be updated, causing data mismatch!
 * @param update Data to be updated
 * @param schema MongoDB Schema object
 * @param collectionName Name of the MongoDB collection used when querying data (inputting a singular noun will automatically create a collection name in plural form)
 * @param options Settings
 * @param upsert Whether to create if not found (default will create)
 * @returns Updated data
 */
export const findOneAndUpdateData4MongoDB = async <T, P = DbPoolOptionsMarkerType>(where: QueryType<T>, update: UpdateType<T>, schema: Schema<T>, collectionName: string, options?: DbPoolOptions<T, P>, upsert: boolean = true): Promise< DbPoolResultType<T> > => {
	try {
		// Check if transaction session exists, if it does, set readPreference to 'primary'
		if (options?.session) {
			options.readPreference = 'primary'
		}

		let mongoModel: Model<T>
		// Check if model already exists
		if (mongoose.models[collectionName]) {
			mongoModel = mongoose.models[collectionName]
		} else {
			mongoModel = mongoose.model<T>(collectionName, schema)
		}
		try {
			const updateResult = (await mongoModel.findOneAndUpdate(where, { $set: update }, { new: true, upsert, ...options }))?.toObject() as T

			if (updateResult) {
				return { success: true, message: 'Data update successful', result: updateResult }
			} else {
				console.warn('ERROR', 'Data update failed, no return result found', { where, update })
				return { success: false, message: 'Data update failed, no return result found' }
			}
		} catch (error) {
			console.error('ERROR', 'Data update failed:', error, { where, update })
			throw { success: false, message: 'Data update failed', error }
		}
	} catch (error) {
		console.error('ERROR', 'Data update failed, unknown error')
		throw { success: false, message: 'Data update failed, error occurred in findOneAndUpdateData4MongoDB:', error }
	}
}

/**
 * Create or get the next value of an auto-increment sequence and increment it
 * // WARN Please call the getNextSequenceValueEjectService method or getNextSequenceValueService method of SequenceValueService to get the auto-increment value, rather than directly calling the Pool layer
 * @param sequenceId Auto-increment sequence key
 * @param sequenceDefaultNumber Initial value of the sequence, default: 0, if the sequence is already created, this is invalid, this value can be negative
 * @param sequenceStep Step size of the sequence, default: 1, can specify different step size each time this method is called, this value can be negative
 * @param options Settings
 * @returns Query status and result, should be the next value of the auto-increment sequence
 */
export const getNextSequenceValuePool = async (sequenceId: string, sequenceDefaultNumber: number = 0, sequenceStep: number = 1, options?: DbPoolOptions): Promise< DbPoolResultType<number> > => {
	try {
		// Check if transaction session exists, if it does, set readPreference to 'primary'
		if (options?.session) {
			options.readPreference = 'primary'
		}

		const { collectionName, schemaInstance } = SequenceValueSchema
		type Schema = InferSchemaType<typeof schemaInstance>
		let mongoModel: Model<Schema>

		// Check if model already exists
		if (mongoose.models[collectionName]) {
			mongoModel = mongoose.models[collectionName]
		} else {
			mongoModel = mongoose.model(collectionName, schemaInstance)
		}
		try {
			let sequenceDocument = await mongoModel.findOne({ _id: sequenceId })
			if (!sequenceDocument) {
				sequenceDocument = await mongoModel.findOneAndUpdate(
					{ _id: sequenceId },
					{ $inc: { sequenceValue: sequenceDefaultNumber } }, // When the document is first created, set the initial value by setting the step size
					{ upsert: true, new: true, ...options },
				)
			} else {
				sequenceDocument = await mongoModel.findOneAndUpdate(
					{ _id: sequenceId },
					{ $inc: { sequenceValue: sequenceStep } }, // When the document already exists, only increment by one step size
					{ new: true, ...options },
				)
			}
			if (sequenceDocument.sequenceValue !== undefined && !sequenceDocument.sequenceValue !== null) {
				return { success: true, message: 'Auto-increment ID query successful', result: sequenceDocument.sequenceValue as number }
			} else {
				console.error('ERROR', 'Auto-increment ID query result is empty:')
				throw { success: false, message: 'Auto-increment ID query result is empty' }
			}
		} catch (error) {
			console.error('ERROR', 'Auto-increment ID query failed:', error)
			throw { success: false, message: 'Auto-increment ID query failed', error }
		}
	} catch (error) {
		console.error('ERROR', 'getNextSequenceValuePool error occurred')
		throw { success: false, message: 'Error occurred during auto-increment ID query', error }
	}
}

/**
 * In the specified schema and collectionName, find a value through MongoDB unique ID and increment it
 * @param mongodbId MongoDB unique ID
 * @param key The item in the found MongoDB document to be incremented
 * @param schema MongoDB Schema object
 * @param collectionName Name of the MongoDB collection used when querying data (inputting a singular noun will automatically create a collection name in plural form), must match the schema
 * @param sequenceStep Increment step size, default: 1, can specify different step size each time this method is called, this value can be negative
 * @param options Settings
 * @returns Query status and result, on success, should be the next value of the auto-increment sequence
 */
type KeysMatching<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never
}[keyof T]
export const findOneAndPlusByMongodbId = async <T extends Record<string, unknown>, U extends KeysMatching<T, number>, P = unknown>(mongodbId: string, key: U, schema: Schema<T>, collectionName: string, sequenceStep: number = 1, options?: DbPoolOptions<T, P>): Promise< DbPoolResultType<number> > => {
	try {
		// Check if transaction session exists, if it does, set readPreference to 'primary'
		if (options?.session) {
			options.readPreference = 'primary'
		}

		let mongoModel: Model<T>
		// Check if model already exists
		if (mongoose.models[collectionName]) {
			mongoModel = mongoose.models[collectionName]
		} else {
			mongoModel = mongoose.model<T>(collectionName, schema)
		}
		try {
			const sequenceDocument = await mongoModel.findOneAndUpdate(
				{ _id: mongodbId },
				{ $inc: ({ [key]: sequenceStep }) as AnyKeys<T> }, // key: increment key; sequenceStep: step size (can be negative)
				{ new: false, options },
			)
			return { success: true, message: 'Increment successful', result: sequenceDocument.sequenceValue as number }
		} catch (error) {
			console.error('ERROR', 'Increment failed:', error)
			throw { success: false, message: 'Increment failed', error }
		}
	} catch (error) {
		console.error('ERROR', 'findOneAndPlusByMongodbId error occurred')
		throw { success: false, message: 'Error occurred during increment', error }
	}
}
