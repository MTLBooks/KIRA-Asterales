import { Schema } from 'mongoose'

const NovelGenreNameSchema = {
	/** Genre name - non-null */
	name: { type: String, required: true, unique: true },
	/** Whether it's the default name for this language - non-null */
	isDefault: { type: Boolean, required: true },
	/** Whether it's the original genre name - non-null */
	isOriginalGenreName: { type: Boolean, required: false },
}

/**
 * Genre names corresponding to different languages
 */
const MultilingualNovelGenreNameSchema = {
	/** Genre language - non-null, should be unique in principle // WARN: Cannot specify unique index for sub-documents, can only avoid in business logic and do validation */
	lang: { type: String, required: true },
	/** Genre names corresponding to different languages */
	genreName: { type: [NovelGenreNameSchema], required: true },
}

/**
 * Novel Genre data
 */
class NovelGenreSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** Genre ID - non-null, unique */
		genreId: { type: Number, required: true, unique: true },
		/** Genre names corresponding to different languages */
		genreNameList: { type: [MultilingualNovelGenreNameSchema], required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'novel-genre'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const NovelGenreSchema = new NovelGenreSchemaFactory() 