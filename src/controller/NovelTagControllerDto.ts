/**
 * Novel TAG name
 */
type NovelTagNameSchema = {
	/** TAG name - required */
	name: string;
	/** Whether this is the default name under this language - required */
	isDefault: boolean;
	/** Whether this is the original TAG name - optional */
	isOriginalTagName?: boolean;
}

/**
 * Multilingual TAG names
 */
type MultilingualNovelTagNameSchema = {
	/** Language code of the TAG - required; should be unique in business logic */
	lang: string;
	/** TAG names under this language */
	tagName: NovelTagNameSchema[];
}

/**
 * Create novel TAG request payload
 */
export type CreateNovelTagRequestDto = {
	/** Multilingual TAG names */
	tagNameList: MultilingualNovelTagNameSchema[];
}

/**
 * Novel TAG entity
 */
export type NovelTag = {
	/** TAG ID */
	tagId: number;
	/** Multilingual TAG names */
	tagNameList: MultilingualNovelTagNameSchema[];
}

/**
 * Create novel TAG response
 */
export type CreateNovelTagResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Created TAG on success */
	result?: NovelTag;
}

/**
 * Search novel TAG request payload
 */
export type SearchNovelTagRequestDto = {
	/** Search keyword for TAG name */
	tagNameSearchKey: string;
}

/**
 * Search novel TAG response
 */
export type SearchNovelTagResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Matched TAGs on success */
	result?: NovelTag[];
}

/**
 * Get novel TAGs by TAG IDs request payload
 */
export type GetNovelTagByTagIdRequestDto = {
	/** TAG IDs */
	tagId: number[];
}

/** Response for getting novel TAGs by IDs */
export type GetNovelTagByTagIdResponseDto = SearchNovelTagResponseDto & {} 