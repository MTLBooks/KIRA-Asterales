/**
 * Browsed content category
 */
export type BrowsingHistoryCategory = 'video' | 'photo' | 'comment'

/**
 * Favorites entity
 */
type Favorites = {
	/** Favorites ID - required - unique */
	favoritesId: number;
	/** Creator UID - required */
	creator: number;
	/** Other editors */
	editor?: number[];
	/** Title - required */
	favoritesTitle: string;
	/** Description */
	favoritesBio?: string;
	/** Cover image URL */
	favoritesCover?: string;
	/** Visibility - required - 1 public, 0 followers, -1 private */
	favoritesVisibility: number;
	/** Creation time - required */
	favoritesCreateDateTime: number;
}

/**
 * Create favorites request
 */
export type CreateFavoritesRequestDto = {
	/** Title - required */
	favoritesTitle: string;
	/** Description */
	favoritesBio?: string;
	/** Cover image URL */
	favoritesCover?: string;
	/** Visibility - required */
	favoritesVisibility: number;
}

/**
 * Create favorites response
 */
export type CreateFavoritesResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Created favorites */
	result?: Favorites;
}

/**
 * Get user's favorites response
 */
export type GetFavoritesResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Favorites list */
	result?: Favorites[];
}
