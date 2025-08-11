import { Schema } from 'mongoose'

/**
 * Part P video data
 */
const VideoPartSchema = {
	/** Part P video order - non-null */
	id: { type: Number, required: true },
	/** Each P video title - non-null */
	videoPartTitle: { type: String, required: true },
	/** Each P video link - non-null */
	link: { type: String, required: true },
	/** System field - last edit time - non-null */
	editDateTime: { type: Number, required: true },
}

const VideoTagNameSchema = {
	/** TAG name - non-null */
	name: { type: String, required: true },
	/** Whether it's the default name for this language - non-null */
	isDefault: { type: Boolean, required: true },
	/** Whether it's the original TAG name - non-null */
	isOriginalTagName: { type: Boolean, required: false },
}

/**
 * TAG names corresponding to different languages
 */
const MultilingualVideoTagNameSchema = {
	/** TAG language - non-null, should be unique in principle // WARN: Cannot specify unique index for sub-documents, can only avoid in business logic and do validation */
	lang: { type: String, required: true },
	/** TAG names corresponding to different languages */
	tagName: { type: [VideoTagNameSchema], required: true },
}

/**
 * Video TAG data
 */
const VideoTagSchema = {
	/** TAG ID - non-null, unique */
	tagId: { type: Number, required: true },
	/** TAG names corresponding to different languages */
	tagNameList: { type: [MultilingualVideoTagNameSchema], required: true },
	/** System field - last edit time - non-null */
	editDateTime: { type: Number, required: true },
}

/**
 * Video data
 */
class VideoSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** KVID video ID - non-null - unique */
		videoId: { type: Number, unique: true, required: true },
		/** Video title - non-null */
		title: { type: String, required: true },
		/** Part P video data - non-null */
		videoPart: { type: [VideoPartSchema], required: true },
		/** Cover image link - non-null */
		image: { type: String, required: true },
		/** Video upload date, timestamp format - non-null */
		uploadDate: { type: Number, required: true },
		/** Video view count - non-null */
		watchedCount: { type: Number, required: true },
		/** Creator UUID - non-null */
		uploaderUUID: { type: String, required: true },
		/** Creator UID - non-null */
		uploaderId: { type: Number, required: true },
		/** Video duration, unit ms - non-null */
		duration: { type: Number, required: true },
		/** Video description */
		description: String,
		/** Video category - non-null */
		videoCategory: { type: String, required: true },
		/** Video copyright - non-null */
		copyright: { type: String, required: true },
		/** Original author */
		originalAuthor: { type: String, required: false },
		/** Original video link */
		originalLink: { type: String, required: false },
		/** Whether to publish to feed - non-null */
		pushToFeed: { type: Boolean, required: true },
		/** Declare as original - non-null */
		ensureOriginal: { type: Boolean, required: true },
		/** Video TAG - non-null */
		videoTagList: { type: [VideoTagSchema], required: true },
		/** Whether pending review - non-null */
		pendingReview: { type: Boolean, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'video'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const VideoSchema = new VideoSchemaFactory()

/**
 * Removed video data table
 */
class RemovedVideoSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** Original video data collection */
		...VideoSchema.schema,
		/** Operator UUID - non-null */
		_operatorUUID_: { type: String, required: true },
		/** Operator UID - non-null */
		_operatorUid_: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'removed-video'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const RemovedVideoSchema = new RemovedVideoSchemaFactory()
