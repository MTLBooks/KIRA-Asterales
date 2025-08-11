import { Schema } from 'mongoose'

const NovelGenreNameSchema = {
    /** Genre name - required */
    name: { type: String, required: true },
    /** Is default name for this language - required */
    isDefault: { type: Boolean, required: true },
    /** Is original genre name - optional */
    isOriginalGenreName: { type: Boolean, required: false },
}

/**
 * Multilingual tag names
 */
const MultilingualNovelGenreNameSchema = {
    /** Language - required (should be unique per language by business logic) */
    lang: { type: String, required: true },
    /** Genre names for this language */
    genreName: { type: [NovelGenreNameSchema], required: true },
}

/**
 * Novel TAG data
 */
const NovelGenreSchema = {
    /** Genre ID - required, unique across list */
    genreId: { type: Number, required: true },
    /** Multilingual genre names */
    genreNameList: { type: [MultilingualNovelGenreNameSchema], required: true },
    /** System field - last edit time - required */
    editDateTime: { type: Number, required: true },
}
const NovelTagNameSchema = {
	/** TAG name - required */
	name: { type: String, required: true },
	/** Is default name for this language - required */
	isDefault: { type: Boolean, required: true },
	/** Is original tag name - optional */
	isOriginalTagName: { type: Boolean, required: false },
}

/**
 * Multilingual tag names
 */
const MultilingualNovelTagNameSchema = {
	/** Language - required (should be unique per language by business logic) */
	lang: { type: String, required: true },
	/** Tag names for this language */
	tagName: { type: [NovelTagNameSchema], required: true },
}

/**
 * Novel TAG data
 */
const NovelTagSchema = {
	/** TAG ID - required, unique across list */
	tagId: { type: Number, required: true },
	/** Multilingual tag names */
	tagNameList: { type: [MultilingualNovelTagNameSchema], required: true },
	/** System field - last edit time - required */
	editDateTime: { type: Number, required: true },
}

/**
 * Novel data
 */
class NovelSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** KVID-like novel ID - required - unique */
		novelId: { type: Number, unique: true, required: true },
		/** Novel title - required */
		title: { type: String, required: true },
		/** Novel slug - required, unique */
		slug: { type: String, required: true, unique: true },
		/** Cover image link - required */
		image: { type: String, required: true },
		/** Upload/publish date (timestamp) - required */
		uploadDate: { type: Number, required: true },
		/** Read count - required */
		watchedCount: { type: Number, required: true },
		/** Upvote count - required */
		upvoteCount: { type: Number, default: 0, required: true },
		/** Downvote count - required */
		downvoteCount: { type: Number, default: 0, required: true },
		/** Creator UUID - required */
		uploaderUUID: { type: String, required: true },
		/** Creator UID - required */
		uploaderId: { type: Number, required: true },
		/** Estimated reading duration in ms - required */
		duration: { type: Number, required: true },
		/** Novel description */
		description: String,
		/** Alternate names list */
		altName: { type: [String], required: false },
		/** Novel category - required */
		//novelCategory: { type: String, required: true },
		/** Copyright - required */
		copyright: { type: String, required: true },
		/** Original author */
		originalAuthor: { type: String, required: false },
		/** Original link */
		originalLink: { type: String, required: false },
		/** Push to feed - required */
		pushToFeed: { type: Boolean, required: true },
		/** Declare as original - required */
        ensureOriginal: { type: Boolean, required: true },
        /** Novel genre list - required */
        novelGenreList: { type: [NovelGenreSchema], required: true },
		/** Novel tags - required */
		novelTagList: { type: [NovelTagSchema], required: true },
		/** Pending review - required */
		pendingReview: { type: Boolean, required: true },
		/** Publication status */
		status: { type: String, required: false },
		/** Word count */
		wordCount: { type: Number, required: false },
		/** View metrics (buckets) */
		dailyViews: { type: Number, required: false, default: 0 },
		weeklyViews: { type: Number, required: false, default: 0 },
		monthlyViews: { type: Number, required: false, default: 0 },
		/** Publication flags */
		published: { type: Boolean, required: false, default: false },
		publishDateTime: { type: Number, required: false },
		/** DMCA fields */
		dmcaStatus: { type: String, required: false, default: 'clean' },
		dmcaReportedDateTime: { type: Number, required: false },
		dmcaResolvedDateTime: { type: Number, required: false },
		reportsCount: { type: Number, required: false, default: 0 },
		/** System field - last edit time - required */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'novel'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const NovelSchema = new NovelSchemaFactory()

/**
 * Removed novel data
 */
class RemovedNovelSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** Original novel data schema */
		...NovelSchema.schema,
		/** Operator UUID - required */
		_operatorUUID_: { type: String, required: true },
		/** Operator UID - required */
		_operatorUid_: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'removed-novel'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const RemovedNovelSchema = new RemovedNovelSchemaFactory() 