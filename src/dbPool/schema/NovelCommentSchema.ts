import { Schema } from 'mongoose'

/**
 * Sub-comment ID stored in parent comment or sub-comment
 */
const NovelSubCommentIdSchema = {
	/** Comment route - non-null */ /** e.g.: 1.2.3 (first novel's second comment's third sub-reply) */
	commentRoute: { type: String, required: true },
	/** Comment ID - non-null */
	upvoteCount: { type: String, default: 0, required: true },
	/** Comment floor number - non-null */
	commentIndex: { type: Number, required: true },
}

// /**
//  * Novel sub-comment, not just first-level sub-comment
//  */
// export const NovelSubCommentSchema = {
// 	/** MongoDB Schema */
// 	schema: {
// 		/** Comment route - non-null */ /** e.g.: 1.2.3 (first novel's second comment's third sub-reply) */
// 		commentRoute: { type: String, required: true },
// 		/** Parent comment ID */
// 		parentCommentsId: { type: String, required: true },
// 		/** Novel ID - non-null */
// 		novelId: { type: Number, required: true },
// 		/** Comment sender's user UID - non-null */
// 		uid: { type: Number, required: true },
// 		/** Comment send time - non-null */
// 		time: { type: Number, required: true },
// 		/** Comment content - non-null */
// 		text: { type: String, required: true },
// 		/** Comment upvote count - non-null */ /** Default: 0 —— no one upvoted ＞﹏＜ */
// 		upvoteCount: { type: Number, default: 0, required: true },
// 		/** Comment downvote count - non-null */ /** Default: 0 —— no opposition votes! */
// 		downvote: { type: Number, default: 0, required: true },
// 		/** Comment floor number - non-null */
// 		commentIndex: { type: Number, required: true },
// 		/** Sub-comments */
// 		subComments: [NovelSubCommentIdSchema],
// 		/** Next level sub-comment count for this comment */
// 		subCommentsCount: { type: Number, required: true },
// 		/** System field - last edit time - non-null */
// 		editDateTime: { type: Number, required: true },
// 	},
// 	/** MongoDB collection name */
// 	collectionName: 'novel-sub-comment',
// }

/**
 * Novel comment data
 */
class NovelCommentSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** Comment route - non-null - unique */ /** e.g.: 1.2.3 (first novel's second comment's third sub-reply) */
		commentRoute: { type: String, required: true, unique: true },
		/** Novel ID - non-null */
		novelId: { type: Number, required: true },
		/** Comment sender's UUID - non-null */
		UUID: { type: String, required: true },
		/** Comment sender's UID - non-null */
		uid: { type: Number, required: true },
		/** Comment send time - non-null */
		emitTime: { type: Number, required: true },
		/** Comment content - non-null */
		text: { type: String, required: true },
		/** Comment upvote count - non-null */ /** Default: 0 —— no one upvoted ＞﹏＜ */
		upvoteCount: { type: Number, default: 0, required: true },
		/** Comment downvote count - non-null */ /** Default: 0 —— no opposition votes! */
		downvoteCount: { type: Number, default: 0, required: true },
		/** Comment floor number - non-null */
		commentIndex: { type: Number, required: true },
		/** Sub-comments */
		subComments: [NovelSubCommentIdSchema],
		/** Next level sub-comment count for this comment */
		subCommentsCount: { type: Number, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'novel-comment'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const NovelCommentSchema = new NovelCommentSchemaFactory()

/**
 * Removed novel comment data
 */
class RemovedNovelCommentSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** Original novel comment data collection */
		...NovelCommentSchema.schema,
		/** Operator UUID - non-null */
		_operatorUUID_: { type: String, required: true },
		/** Operator UID - non-null */
		_operatorUid_: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'removed-novel-comment'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const RemovedNovelCommentSchema = new RemovedNovelCommentSchemaFactory()

/**
 * Novel comment upvote
 */
class NovelCommentUpvoteSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** Novel ID - non-null */
		novelId: { type: Number, required: true },
		/** Comment ID - non-null */
		commentId: { type: String, required: true },
		/** Comment upvoter's UUID - non-null */
		UUID: { type: String, required: true },
		/** Comment upvoter's UID - non-null */
		uid: { type: Number, required: true },
		/** Comment upvote invalidation flag (user cancels upvote) */
		invalidFlag: { type: Boolean, required: true },
		/** System field - deletion flag - non-null */
		deleteFlag: { type: Boolean, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'novel-comment-upvote'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const NovelCommentUpvoteSchema = new NovelCommentUpvoteSchemaFactory()


/**
 * Novel comment downvote
 */
class NovelCommentDownvoteSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** Novel ID - non-null */
		novelId: { type: Number, required: true },
		/** Comment ID - non-null */
		commentId: { type: String, required: true },
		/** Comment downvoter's UUID - non-null */
		UUID: { type: String, required: true },
		/** Comment downvoter's user UID - non-null */
		uid: { type: Number, required: true },
		/** Comment downvote invalidation flag (user cancels downvote) */
		invalidFlag: { type: Boolean, required: true },
		/** System field - deletion flag - non-null */
		deleteFlag: { type: Boolean, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'novel-comment-downvote'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}

export const NovelCommentDownvoteSchema = new NovelCommentDownvoteSchemaFactory() 