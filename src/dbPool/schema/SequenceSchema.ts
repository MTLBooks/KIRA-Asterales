import { Schema } from 'mongoose'

/**
 * Auto-increment sequence
 */
export class SequenceValueSchemaFactory {
	schema = {
		/** Auto-increment item, e.g.: videoId */
		_id: { type: String, unique: true, required: true },
		/** Auto-increment value */
		sequenceValue: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'sequence-value'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}

export const SequenceValueSchema = new SequenceValueSchemaFactory()
