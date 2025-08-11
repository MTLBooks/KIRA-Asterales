import { Schema } from 'mongoose';

/**
 * User block data
 */
class BlockListSchemaFactory {
	schema = {
		/** Blacklist type - non-null */
		type: { type: String, required: true },
		/** Blacklist content - non-null */
		value: { type: String, required: true },
		/** Creator UID - non-null */
		operatorUid: { type: Number, required: true },
		/** Creator UUID - non-null */
		operatorUUID: { type: String, required: true },
		/** System field - creation time - non-null */
		createDateTime: { type: Number, required: true, index: true },
	}
	/** MongoDB collection name */
	collectionName = 'blocklist'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const BlockListSchema = new BlockListSchemaFactory()

/**
 * User unblock data
 */
class UnblockListSchemaFactory {
	schema = {
		/** Originally blocked collection */
		...BlockListSchema.schema,
		/** Operator UUID - non-null */
		_operatorUUID_: { type: String, required: true },
		/** Operator UID - non-null */
		_operatorUid_: { type: Number, required: true },
		/** System field - last edit time - non-null */
		createDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'unblocklist'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const UnblockListSchema = new UnblockListSchemaFactory()

