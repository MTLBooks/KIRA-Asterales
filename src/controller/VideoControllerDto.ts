import { VideoTag } from './VideoTagControllerDto.js'

/**
 * Single video part data
 */
export type VideoPartDto = {
	/** Part ID */
	id: number;
	/** Video part title */
	videoPartTitle: string;
	/** Direct link to the file */
	link: string;
}

/**
 * Upload video request payload
 */
export type UploadVideoRequestDto = {
	/** Data for each part */
	videoPart: VideoPartDto[];
	/** Video title */
	title: string;
	/** Cover image URL */
	image: string;
	/** Uploader UID */
	uploaderId: number;
	/** Duration in milliseconds */
	duration: number;
	/** Video description */
	description?: string;
	/** Video category */
	videoCategory: string;
	/** Copyright info */
	copyright: string;
	/** Original author */
	originalAuthor?: string;
	/** Original video link */
	originalLink?: string;
	/** Push to feed */
	pushToFeed: boolean;
	/** Declare original */
	ensureOriginal: boolean;
	/** Video tags */
	videoTagList: VideoTag[];
}

/**
 * 视频上传的返回的参数
 */
export type UploadVideoResponseDto = {
	/** 是否请求成功 */
	success: boolean;
	/** 附加的文本消息 */
	message?: string;
	/** 视频 ID */
	videoId?: number;
}

// export type ThumbVideoRequestDto = {
// 	username: string;
// }

/**
 * 展示视频卡片需要的返回参数
 */
export type ThumbVideoResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Number of videos retrieved, 0 if none */
	videosCount: number;
	/** Retrieved videos */
	videos: {
		/** Video ID (KVID) */
		videoId: number;
		/** Title */
		title: string;
		/** Cover image URL */
		image?: string;
		/** Upload timestamp */
		uploadDate?: number;
		/** View count */
		watchedCount?: number;
		/** Uploader username */
		uploader?: string;
		/** Uploader nickname */
		uploaderNickname?: string;
		/** Uploader UID */
		uploaderId?: number;
		/** Duration in ms */
		duration?: number;
		/** Description */
		description?: string;
		/** Whether blocked by other */
		isBlockedByOther?: boolean;
	}[];
}

/**
 * Get video by KVID request payload
 */
export type GetVideoByKvidRequestDto = {
	/** Video ID (KVID) */
	videoId: number;
}

/**
 * Uploader info
 */
type UploaderInfoDto = {
	/** UID */
	uid: number;
	/** Username */
	username: string;
	/** Nickname */
	userNickname?: string;
	/** Avatar URL */
	avatar?: string;
	/** Banner image URL */
	userBannerImage?: string;
	/** Signature */
	signature?: string;
	/** Following state */
	isFollowing: boolean;
	/** Whether self */
	isSelf: boolean;
}

/**
 * Block state for user/video context
 */
type BlockState = { isBlockedByOther: boolean, isBlocked: boolean; isHidden: boolean }

/**
 * Video page response
 */
export type GetVideoByKvidResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Video data */
	video?: {
		/** Video ID (KVID) */
		videoId: number;
		/** Video parts */
		videoPart: VideoPartDto[];
		/** Title */
		title: string;
		/** Cover image URL */
		image?: string;
		/** Upload timestamp */
		uploadDate?: number;
		/** View count */
		watchedCount?: number;
		/** Uploader ID (string from legacy) */
		uploader?: string;
		/** Uploader UUID */
		uploaderUUID?: string;
		/** Uploader UID */
		uploaderId?: number;
		/** Uploader info */
		uploaderInfo?: UploaderInfoDto;
		/** Duration in ms */
		duration?: number;
		/** Description */
		description?: string;
		/** Category */
		videoCategory: string;
		/** Copyright */
		copyright: string;
		/** Tags */
		videoTagList: VideoTag[];
	};
} & BlockState

/**
 * Check if video exists by KVID request payload
 */
export type CheckVideoExistRequestDto = {
	/** Video ID (KVID) */
	videoId: number;
}

/**
 * Check if video exists by KVID response
 */
export type CheckVideoExistResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Whether exists */
	exist: boolean;
}

/**
 * Check if video is blocked by KVID response
 */
export type CheckVideoBlockedByKvidResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Blocked by self */
	isBlocked?: boolean;
	/** Blocked by other */
	isBlockedByOther?: boolean;
	/** Hidden */
	isHidden?: boolean;
}

/**
 * Get videos by UID request payload
 */
export type GetVideoByUidRequestDto = {
	/** UID */
	uid: number;
}

/**
 * Get videos by UID response
 */
export type GetVideoByUidResponseDto = ThumbVideoResponseDto & BlockState

/**
 * Search videos by keyword request payload
 */
export type SearchVideoByKeywordRequestDto = {
	keyword: string;
}

/**
 * Search videos by keyword response
 */
export type SearchVideoByKeywordResponseDto = ThumbVideoResponseDto & {}

/**
 * Get TUS upload endpoint request payload
 */
export type GetVideoFileTusEndpointRequestDto = {
	/** Chunk size in bytes; Cloudflare supports only multiples of 256KiB; min 5,242,880; max 209,715,200; recommended 52,428,800 */
	uploadLength: number;
	/** Upload metadata */
	uploadMetadata: string;
}

/**
 * Get pre-signed URL for uploading video cover response
 */
export type GetVideoCoverUploadSignedUrlResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Result data */
	result?: {
		/** Signed URL */
		signedUrl: string;
		/** File name */
		fileName: string;
	};
}

/**
 * Search videos by video TAG IDs request payload
 */
export type SearchVideoByVideoTagIdRequestDto = {
	/** TAG IDs */
	tagId: UploadVideoRequestDto['videoTagList'][number]['tagId'][];
}

/**
 * Search videos by video TAG IDs response
 */
export type SearchVideoByVideoTagIdResponseDto = ThumbVideoResponseDto & {}

/**
 * Delete a video request payload
 */
export type DeleteVideoRequestDto = {
	/** Video ID (KVID) */
	videoId: number;
}

/**
 * Delete a video response
 */
export type DeleteVideoResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Pending review video list response
 */
export type PendingReviewVideoResponseDto = {} & ThumbVideoResponseDto

/**
 * Approve a pending review video request payload
 */
export type ApprovePendingReviewVideoRequestDto = {
	/** Video ID (KVID) */
	videoId: number;
}

/**
 * Approve a pending review video response
 */
export type ApprovePendingReviewVideoResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}
