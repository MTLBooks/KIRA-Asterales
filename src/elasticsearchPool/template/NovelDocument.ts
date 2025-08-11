const NovelTagNameDocument = {
	/** TAG name - non-null */
	name: { type: String, required: true as const },
	/** Whether it's the default name for this language - non-null */
	isDefault: { type: Boolean, required: true as const },
	/** Whether it's the original TAG name */
	isOriginalTagName: { type: Boolean, required: false as const },
}

/**
 * TAG names corresponding to different languages
 */
const MultilingualNovelTagNameDocument = {
	/** TAG language - non-null, should be unique in principle // WARN: Cannot specify unique index for sub-documents, can only avoid in business logic and do validation */
	lang: { type: String, required: true as const },
	/** TAG names list */
	tagName: { type: [NovelTagNameDocument], required: true as const },
}

/**
 * Novel TAG data
 */
const NovelTagDocument = {
	/** Elasticsearch index template */
	schema: {
		/** TAG ID - non-null, unique */
		tagId: { type: Number, required: true as const },
		/** TAG names corresponding to different languages */
		tagNameList: { type: [MultilingualNovelTagNameDocument], required: true as const },
		/** System field – last edit time */
		editDateTime: { type: Number, required: true as const },
	},
	/** Elasticsearch index name */
	indexName: 'search-kirakira-novel-tag-elasticsearch',
}

// -------- Genre definitions --------
const NovelGenreNameDocument = {
	/** Genre name - non-null */
	name: { type: String, required: true as const },
	/** Whether it's the default name for this language - non-null */
	isDefault: { type: Boolean, required: true as const },
	/** Whether it's the original genre name */
	isOriginalGenreName: { type: Boolean, required: false as const },
}

/**
 * Genre names corresponding to different languages
 */
const MultilingualNovelGenreNameDocument = {
	/** Genre language */
	lang: { type: String, required: true as const },
	/** Genre names list */
	genreName: { type: [NovelGenreNameDocument], required: true as const },
}

/**
 * Novel genre data
 */
const NovelGenreDocument = {
	/** Elasticsearch index template */
	schema: {
		/** Genre ID - non-null, unique */
		genreId: { type: Number, required: true as const },
		/** Genre names corresponding to different languages */
		genreNameList: { type: [MultilingualNovelGenreNameDocument], required: true as const },
		/** System field – last edit time */
		editDateTime: { type: Number, required: true as const },
	},
	/** Elasticsearch index name */
	indexName: 'search-kirakira-novel-genre-elasticsearch',
}

/**
 * Novel data
 */
export const NovelDocument = {
	/** Elasticsearch index template */
	schema: {
		/** Novel title - non-null */
		title: { type: String, required: true as const },
		/** Novel description */
		description: { type: String, required: false as const },
		/** KVID-like novel ID - non-null */
		novelId: { type: Number, required: true as const },
		/** Novel genres */
		novelGenreList: { type: [NovelGenreDocument], required: true as const },
		/** Novel TAGs */
		novelTagList: { type: [NovelTagDocument], required: true as const },
	},
	/** Elasticsearch index name */
	indexName: 'search-kira-novel-elasticsearch',
} 