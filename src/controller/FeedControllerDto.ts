import { ThumbVideoResponseDto } from "./VideoControllerDto.js"

// marker.ts
const ONLY_IN_TS_FILE = Symbol("ONLY_IN_TS_FILE") // WARN: DO NOT RENAME THIS FILE AS `*.d.ts`
void ONLY_IN_TS_FILE

/** Following types */
export enum FOLLOWING_TYPE {
	/** Follow normally via buttons on pages like video/user */
	normal = 'normal',
	/** Auto follow */ // MEME: really?
	auto = 'auto',
	/** Follow via event page */
	event = 'event',
	/** Auto-batch follow via event page */
	eventAutoBatch = 'eventAutoBatch',
}

/**
 * Follow uploader request
 */
export type FollowingUploaderRequestDto = {
	/** UID to follow */
	followingUid: number;
};

/**
 * Follow uploader response
 */
export type FollowingUploaderResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
};

/**
 * Unfollow uploader request
 */
export type UnfollowingUploaderRequestDto = {
	/** UID to unfollow */
	unfollowingUid: number;
};

/**
 * Unfollow uploader response
 */
export type UnfollowingUploaderResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
};

/**
 * Feed group
 */
type FeedGroup = {
	/** Feed group UUID - required */
	feedGroupUuid: string,
	/** Feed group name - required */
	feedGroupName: string,
	/** Creator UUID - required */
	feedGroupCreatorUuid: string,
	/** User UUIDs in the group - required */
	uuidList: string[],
	/** Custom cover */
	customCover?: string,
	/** Last edit time - required */
	editDateTime: number,
	/** Creation time - required */
	createDateTime: number,
}

/**
 * Create feed group request
 */
export type CreateFeedGroupRequestDto = {
	/** Group name */
	feedGroupName: string;
	/** Optional initial UID list */
	withUidList?: number[];
	/** Optional custom cover URL */
	withCustomCoverUrl?: string;
};

/**
 * Create feed group response
 */
export type CreateFeedGroupResponseDto = {
	/** Execution result */
	success: boolean;
	/** Too many UIDs added at once */
	tooManyUidInOnce: boolean;
	/** Extra message */
	message?: string;
};

/**
 * Add UIDs to a feed group request
 */
export type AddNewUid2FeedGroupRequestDto = {
	/** Feed group UUID */
	feedGroupUuid: string;
	/** UIDs to add */
	uidList: number[];
}

/**
 * Add UIDs to a feed group response
 */
export type AddNewUid2FeedGroupResponseDto = {
	/** Execution result */
	success: boolean;
	/** Too many UIDs added at once */
	tooManyUidInOnce: boolean;
	/** Group overload */
	isOverload: boolean;
	/** Extra message */
	message?: string;
	/** Group when success */
	feedGroupResult?: FeedGroup
}

/**
 * Remove UIDs from a feed group request
 */
export type RemoveUidFromFeedGroupRequestDto = {
	/** Feed group UUID */
	feedGroupUuid: string;
	/** UIDs to remove */
	uidList: number[];
}

/**
 * Remove UIDs from a feed group response
 */
export type RemoveUidFromFeedGroupResponseDto = {
	/** Execution result */
	success: boolean;
	/** Too many UIDs added at once */
	tooManyUidInOnce: boolean;
	/** Extra message */
	message?: string;
	/** Group when success */
	feedGroupResult?: FeedGroup
};

/**
 * Delete feed group request
 */
export type DeleteFeedGroupRequestDto = {
	/** Feed group UUID */
	feedGroupUuid: string;
}

/**
 * Delete feed group response
 */
export type DeleteFeedGroupResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Get pre-signed URL for feed group cover upload response
 */
export type GetFeedGroupCoverUploadSignedUrlResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Result */
	result?: {
		/** Signed URL */
		signedUrl: string;
		/** File name */
		fileName: string;
	};
}

/**
 * Create or edit feed group info request
 */
export type CreateOrEditFeedGroupInfoRequestDto = {
	/** Feed group UUID */
	feedGroupUuid: string;
	/** Group name */
	feedGroupName?: string;
	/** Custom cover URL */
	feedGroupCustomCoverUrl?: string;
}

/***
 * Create or edit feed group info response
 */
export type CreateOrEditFeedGroupInfoResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Group when success */
	feedGroupResult?: FeedGroup
}

/**
 * Admin approve feed group info change request
 */
export type AdministratorApproveFeedGroupInfoChangeRequestDto = {
	/** Feed group UUID */
	feedGroupUuid: string;
}

/**
 * Admin approve feed group info change response
 */
export type AdministratorApproveFeedGroupInfoChangeResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Admin delete feed group request
 */
export type AdministratorDeleteFeedGroupRequestDto = {
	/** Feed group UUID */
	feedGroupUuid: string;
}

/**
 * Admin delete feed group response
 */
export type AdministratorDeleteFeedGroupResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Get feed group list response
 */
export type GetFeedGroupListResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Result */
	result?: FeedGroup[];
}

/**
 * Get feed content request
 */
export type GetFeedContentRequestDto = {
	feedGroupUuid?: string;
	/** Pagination */
	pagination: {
		/** Current page */
		page: number;
		/** Page size */
		pageSize: number;
	};
}

/**
 * Get feed content response
 */
export type GetFeedContentResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Whether user is lonely (no following or no users in group) */
	isLonely: false | {
		/** Has no following */
		noFollowing: boolean;
	} | {
		/** No users in feed group */
		noUserInFeedGroup: boolean;
	};
	/** Result */
	result?: {
		/** Count */
		count: number;
		/** Content */
		content: ThumbVideoResponseDto['videos'];
	};
}
