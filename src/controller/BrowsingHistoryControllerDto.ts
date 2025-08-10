import { ThumbVideoResponseDto } from './VideoControllerDto.js'

/**
 * Browsed content category
 */
export type BrowsingHistoryCategory = 'video' | 'photo' | 'comment'

/**
 * User browsing history
 */
type BrowsingHistory = {
	/** User UUID - required */
	uuid: string;
	/** Content category, e.g. video, photo - required */
	category: BrowsingHistoryCategory;
	/** Content unique ID - required */
	id: string;
	/** Anchor (e.g. playback time for video; use string for compatibility) */
	anchor?: string;
}

/**
 * Create or update browsing history request payload
 */
export type CreateOrUpdateBrowsingHistoryRequestDto = BrowsingHistory & {}

/**
 * Create or update browsing history response
 */
export type CreateOrUpdateBrowsingHistoryResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Created/updated history on success */
	result?: BrowsingHistory;
}

/**
 * Get browsing history (with optional filters) request
 * Mainly used to apply filter conditions
 */
export type GetUserBrowsingHistoryWithFilterRequestDto = {
	/** Filter by video title */
	videoTitle?: string;
}

/**
 * Get browsing history (all or filtered) response
 */
export type GetUserBrowsingHistoryWithFilterResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** History list */
	result?: (
		& BrowsingHistory
		& {
			/** Last update time */
			lastUpdateDateTime: number;
		}
		& ThumbVideoResponseDto['videos'][number])[];
}
