/**
 * Basic video comment data
 */
type BasicVideoCommentDto = {
	/** KVID */
	videoId: number;
	/** Comment text */
	text: string;
}

/**
 * Emit video comment request payload
 */
export type EmitVideoCommentRequestDto = BasicVideoCommentDto

/**
 * Emit video comment response
 */
export type EmitVideoCommentResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Comment data when success */
	videoComment?: VideoCommentResult;
}

/**
 * Props to get a user's upvotes on a video's comments
 */
export type GetVideoCommentUpvotePropsDto = {
	/** KVID */
	videoId: number;
	/** UID of the user who upvoted */
	uid: number;
}

/**
 * Result of a user's upvotes on a video's comments
 */
export type GetVideoCommentUpvoteResultDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Upvote list */
	videoCommentUpvoteResult: {
		/** KVID */
		videoId: number;
		/** Comment ID */
		commentId: string;
		/** UID */
		uid: number;
		/** Last edit time */
		editDateTime: number;
	}[];
}

/**
 * Props to get a user's downvotes on a video's comments
 */
export type GetVideoCommentDownvotePropsDto = {
	/** KVID */
	videoId: number;
	/** UID of the user who downvoted */
	uid: number;
}

/**
 * Result of a user's downvotes on a video's comments
 */
export type GetVideoCommentDownvoteResultDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Downvote list */
	videoCommentDownvoteResult: {
		/** KVID */
		videoId: number;
		/** Comment ID */
		commentId: string;
		/** UID */
		uid: number;
		/** Last edit time */
		editDateTime: number;
	}[];
}

/**
 * Get comments by KVID request payload
 */
export type GetVideoCommentByKvidRequestDto = {
	/** KVID */
	videoId: number;
	/** Pagination */
	pagination: {
		/** Current page */
		page: number;
		/** Page size */
		pageSize: number;
	}
}

/**
 * Comment ID type (for sub-comments of a main comment)
 */
type VideoCommentIdDto = {
	/** Comment route, e.g. 1.2.3 (1st comment's 2nd reply's 3rd sub-reply) */
	commentRoute: string;
	/** Upvote count (legacy field name) */
	upvoteCount: string;
	/** Floor index */
	commentIndex: number;
}

/**
 * Comment sender's user info
 */
type CommentSenderUserInfo = {
	/** Nickname */
	userNickname?: string;
	/** Username */
	username?: string;
	/** Avatar URL */
	avatar?: string;
	/** Banner image URL */
	userBannerImage?: string;
	/** Signature */
	signature?: string;
	/** Gender: male, female, or custom (string) */
	gender?: string;
}

/**
 * One comment result
 */
export type VideoCommentResult = {
	/** MongoDB unique _id */
	_id: string;
	/** Comment route, e.g. 1.2.3 */
	commentRoute: string;
	/** KVID */
	videoId: number;
	/** Sender UID */
	uid: number;
	/** Sender info */
	userInfo?: CommentSenderUserInfo;
	/** Emit time */
	emitTime: number;
	/** Text */
	text: string;
	/** Has upvoted */
	isUpvote: boolean;
	/** Has downvoted */
	isDownvote: boolean;
	/** Upvote count */
	upvoteCount: number;
	/** Downvote count */
	downvoteCount: number;
	/** Floor index */
	commentIndex: number;
	/** Sub comments */
	subComments: VideoCommentIdDto[];
	/** Number of immediate child comments */
	subCommentsCount: number;
	/** Last edit time */
	editDateTime: number;
}

/**
 * Get comments response
 */
export type GetVideoCommentByKvidResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Total count */
	videoCommentCount: number;
	/** Comment list */
	videoCommentList: (VideoCommentResult& { isBlockedByOther?: boolean })[];
}

/**
 * Upvote request payload
 */
export type EmitVideoCommentUpvoteRequestDto = {
	/** Comment unique ID */
	id: string;
	/** KVID */
	videoId: number;
}

/**
 * Upvote response
 */
export type EmitVideoCommentUpvoteResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Cancel upvote request payload
 */
export type CancelVideoCommentUpvoteRequestDto = {
	/** Comment unique ID */
	id: string;
	/** KVID */
	videoId: number;
}

/**
 * Cancel upvote response
 */
export type CancelVideoCommentUpvoteResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Downvote request payload
 */
export type EmitVideoCommentDownvoteRequestDto = {
	/** Comment unique ID */
	id: string;
	/** KVID */
	videoId: number;
}

/**
 * Downvote response
 */
export type EmitVideoCommentDownvoteResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Cancel downvote request payload
 */
export type CancelVideoCommentDownvoteRequestDto = {
	/** Comment unique ID */
	id: string;
	/** KVID */
	videoId: number;
}

/**
 * Cancel downvote response
 */
export type CancelVideoCommentDownvoteResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Delete own comment request payload
 */
export type DeleteSelfVideoCommentRequestDto = {
	/** Comment route */
	commentRoute: string;
	/** KVID */
	videoId: number;
}

/**
 * Delete own comment response
 */
export type DeleteSelfVideoCommentResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Admin delete a comment request payload
 */
export type AdminDeleteVideoCommentRequestDto = {
	/** Comment route */
	commentRoute: string;
	/** KVID */
	videoId: number;
}

/**
 * Admin delete a comment response
 */
export type AdminDeleteVideoCommentResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}
