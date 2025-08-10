import { type VideoTag } from "./VideoTagControllerDto.js";

/**
 * Block user request payload
 */
export type BlockUserByUidRequestDto = {
	/** UID to block - required */
	blockUid: number;
}

/**
 * Block user response
 */
export type BlockUserByUidResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Hide user request payload
 */
export type HideUserByUidRequestDto = {
	/** UID to hide - required */
	hideUid: number;
}

/**
 * Hide user response
 */
export type HideUserByUidResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Block tag request payload
 */
export type BlockTagRequestDto = {
	/* Tag ID to block - required */
	tagId: number;
}

/**
 * Block tag response
 */
export type BlockTagResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Block keyword request payload
 */
export type BlockKeywordRequestDto = {
	/* Keyword to block - required */
	blockKeyword: string;
}

/**
 * Block keyword response
 */
export type BlockKeywordResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Add regex request payload
 */
export type AddRegexRequestDto = {
	/** Regular expression - required */
	blockRegex: string;
	/** Regular expression flags - required */
	// flag: string;
}

/**
 * Add regex response
 */
export type AddRegexResponseDto = {
	/** Execution result */
	success: boolean;
	/** Whether the regex is unsafe */
	unsafeRegex: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Unblock user request payload
 */
export type UnblockUserByUidRequestDto = {
	/** UID to unblock - required */
	blockUid: number;
}

/**
 * Unblock user response
 */
export type UnblockUserByUidResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Show user request payload (undo hide)
 */
export type ShowUserByUidRequestDto = {
	/** UID to show - required */
	hideUid: number;
}

/**
 * Show user response
 */
export type ShowUserByUidResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Unblock tag request payload
 */
export type UnblockTagRequestDto = {
	/* Tag ID to unblock - required */
	tagId: number;
}

/**
 * Unblock tag response
 */
export type UnblockTagResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Unblock keyword request payload
 */
export type UnblockKeywordRequestDto = {
	/** Keyword to unblock - required */
	blockKeyword: string;
}

/**
 * Remove regex request payload
 */
export type RemoveRegexRequestDto = {
	/** Regular expression - required */
	blockRegex: string;
	/** Regular expression flags - required */
	// flag: string;
}

/**
 * Remove regex response
 */
export type RemoveRegexResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Unblock keyword response
 */
export type UnblockKeywordResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Get block list request payload
 */
export type GetBlockListRequestDto = {
	/** Block type - required */
	type: string;
	/** Pagination */
	pagination: {
		/** Current page */
		page: number;
		/** Page size */
		pageSize: number;
	};
}

export type GetBlocklistResult = {
	/** Type */
	type: string;
	/** Value */
	value: string;
	/** Block create time */
	createDateTime: number;
	/** Blocked user UID */
	uid?: number;
	/** Blocked username */
	username?: string;
	/** Blocked user nickname */
	userNickname?: string;
	/** Blocked user avatar */
	avatar?: string;
	/** Blocked TAG */
	tag?: VideoTag;
}

/**
 * Get block list response
 */
export type GetBlockListResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Count */
	blocklistCount?: number;
	/** Results */
	result?: GetBlocklistResult[];
}

/**
 * Check content is blocked request payload
 */
export type CheckContentIsBlockedRequestDto = {
	/** Content */
	content: string;
}

/**
 * Check tag is blocked request payload
 */
export type CheckTagIsBlockedRequestDto = {
	/** TAG IDs */
	tagId: number[];
}

/**
 * Check user is blocked request payload
 */
export type CheckUserIsBlockedRequestDto = {
	/** Target UID */
	uid: number;
}

/**
 * Check if blocked by other user request payload
 */
export type CheckIsBlockedByOtherUserRequestDto = {
	/** Target UID */
	targetUid: number;
}

/** Response: check if blocked by other user */
export type CheckIsBlockedByOtherUserResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Is blocked */
	isBlocked: boolean;
}
/**
 * Check if blocked response
 */
export type CheckIsBlockedResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Is blocked */
	isBlocked: boolean;
}

/**
 * Check user is blocked response
 */
export type CheckUserIsBlockedResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Is blocked */
	isBlocked: boolean;
	/** Is hidden */
	isHidden: boolean;
}
