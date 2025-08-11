import { Schema } from 'mongoose'

const NovelTagNameSchema = {
	/** TAG name - non-null */
	name: { type: String, required: true, unique: true },
	/** Whether it's the default name for this language - non-null */
	isDefault: { type: Boolean, required: true },
	/** Whether it's the original TAG name - non-null */
	isOriginalTagName: { type: Boolean, required: false },
}

/**
 * TAG names corresponding to different languages
 */
const MultilingualNovelTagNameSchema = {
	/** TAG language - non-null, should be unique in principle // WARN: Cannot specify unique index for sub-documents, can only avoid in business logic and do validation */
	lang: { type: String, required: true },
	/** TAG names corresponding to different languages */
	tagName: { type: [NovelTagNameSchema], required: true },
}

/**
 * Novel TAG data
 */
class NovelTagSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** TAG ID - non-null, unique */
		tagId: { type: Number, required: true, unique: true },
		/** TAG names corresponding to different languages */
		tagNameList: { type: [MultilingualNovelTagNameSchema], required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'novel-tag'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const NovelTagSchema = new NovelTagSchemaFactory() 