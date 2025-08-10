/**
 * Video TAG name
 */
type VideoTagNameSchema = {
	/** TAG name - required */
	name: string;
	/** Whether this is the default name under this language - required */
	isDefault: boolean;
	/** Whether this is the original TAG name - required */
	isOriginalTagName: boolean;
}

/**
 * Multilingual TAG names
 */
type MultilingualVideoTagNameSchema = {
	/** Language code of the TAG - required; should be unique in business logic */
	lang: string;
	/** TAG names under this language */
	tagName: VideoTagNameSchema[];
}

/**
 * Create video TAG request payload
 */
export type CreateVideoTagRequestDto = {
	/** Multilingual TAG names */
	tagNameList: MultilingualVideoTagNameSchema[];
}

/**
 * Video TAG entity
 */
export type VideoTag = {
	/** TAG ID */
	tagId: number;
	/** Multilingual TAG names */
	tagNameList: MultilingualVideoTagNameSchema[];
}

/**
 * Create video TAG response
 */
export type CreateVideoTagResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Created TAG on success */
	result?: VideoTag;
}

/**
 * Search video TAG request payload
 */
export type SearchVideoTagRequestDto = {
	/** Search keyword for TAG name */
	tagNameSearchKey: string;
}

/**
 * Search video TAG response
 */
export type SearchVideoTagResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Matched TAGs on success */
	result?: VideoTag[];
}

/**
 * Get video TAGs by TAG IDs request payload
 */
export type GetVideoTagByTagIdRequestDto = {
	/** TAG IDs */
	tagId: number[];
}

/** Response for getting video TAGs by TAG IDs */
export type GetVideoTagByTagIdResponseDto = SearchVideoTagResponseDto & {}
