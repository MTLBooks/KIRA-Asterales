import { Schema } from 'mongoose'

/**
 * User following data
 */
class FollowingSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** Follower UUID - non-null */
		followerUuid: { type: String, required: true },
		/** Following UUID - non-null */
		followingUuid: { type: String, required: true },
		/** Following type - non-null - optional values: 'normal', 'auto', 'event', 'eventAutoBatch' */
		followingType: { type: String, enum: ['normal', 'auto', 'event', 'eventAutoBatch'],  required: true },
		/** Whether it's a favorite - non-null */
		isFavorite: { type: Boolean, required: true },
		/** System field - last edit time - non-null */
		followingEditDateTime: { type: Number, required: true },
		/** System field - creation time - non-null */
		followingCreateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'following'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const FollowingSchema = new FollowingSchemaFactory()

/**
 * User unfollowing data
 */
class UnfollowingSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** Original following data, inherited from FollowingSchema */
		...FollowingSchema.schema,
		/** Unfollowing reason type - non-null */
		unfollowingReasonType: { type: String, request: true },
		/** Date when user unfollowed - non-null */
		unfollowingDateTime: { type: Number, required: true },
		/** System field - last edit time - non-null */
		unfollowingEditDateTime: { type: Number, required: true },
		/** System field - creation time - non-null */
		unfollowingCreateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'unfollowing'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const UnfollowingSchema = new UnfollowingSchemaFactory()

/**
 * User created feed groups
 */
class FeedGroupSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** Feed group UUID - non-null */
		feedGroupUuid: { type: String, required: true },
		/** Feed group name - non-null */
		feedGroupName: { type: String, required: true },
		/** Feed group creator UUID - non-null */
		feedGroupCreatorUuid: { type: String, required: true },
		/** Users in feed group - non-null */
		uuidList: { type: [String], required: true },
		/** Feed group custom cover */
		customCover: { type: String },
		/** Whether feed group information was modified after last review approval, should be set to true when first creating and when updates occur, should be changed to false when admin approves */
		isUpdatedAfterReview: { type: Boolean, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
		/** System field - creation time - non-null */
		createDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'feed-group'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const FeedGroupSchema = new FeedGroupSchemaFactory()
