/**
 * Genre names corresponding to different languages
 */
const NovelGenreNameDocument = {
	/** Genre language - non-null, should be unique in principle */
	lang: { type: String, required: true as const },
	/** Genre name - non-null */
	genreName: { type: String, required: true as const },
}

/**
 * Novel Genre data for Elasticsearch
 */
export const NovelGenreDocument = {
	/** Elasticsearch index template */
	schema: {
		/** Genre ID - non-null, unique */
		genreId: { type: Number, required: true as const },
		/** Genre names corresponding to different languages */
		genreNameList: { type: [NovelGenreNameDocument], required: true as const },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true as const },
	},
	/** Elasticsearch index name */
	indexName: 'search-kira-novel-genre-elasticsearch',
} 