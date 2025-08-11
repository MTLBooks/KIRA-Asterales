/**
 * Novel Genre name
 */
type NovelGenreNameSchema = {
	/** Genre name - required */
	name: string;
	/** Whether this is the default name under this language - required */
	isDefault: boolean;
	/** Whether this is the original genre name - optional */
	isOriginalGenreName?: boolean;
}

/**
 * Multilingual Genre names
 */
type MultilingualNovelGenreNameSchema = {
	/** Language code of the genre - required; should be unique in business logic */
	lang: string;
	/** Genre names under this language */
	genreName: NovelGenreNameSchema[];
}

/**
 * Create novel genre request payload
 */
export type CreateNovelGenreRequestDto = {
	/** Multilingual genre names */
	genreNameList: MultilingualNovelGenreNameSchema[];
}

/**
 * Novel genre entity
 */
export type NovelGenre = {
	/** Genre ID */
	genreId: number;
	/** Multilingual genre names */
	genreNameList: MultilingualNovelGenreNameSchema[];
}

/**
 * Create novel genre response
 */
export type CreateNovelGenreResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Created genre on success */
	result?: NovelGenre;
}

/**
 * Search novel genre request payload
 */
export type SearchNovelGenreRequestDto = {
	/** Search keyword for genre name */
	genreNameSearchKey: string;
}

/**
 * Search novel genre response
 */
export type SearchNovelGenreResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Matched genres on success */
	result?: NovelGenre[];
}

/**
 * Get novel genres by IDs request payload
 */
export type GetNovelGenreByIdRequestDto = {
	/** Genre IDs */
	genreId: number[];
}

/** Response for getting novel genres by IDs */
export type GetNovelGenreByIdResponseDto = SearchNovelGenreResponseDto & {} 