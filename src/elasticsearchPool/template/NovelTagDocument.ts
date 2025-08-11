/**
 * TAG names corresponding to different languages
 */
const NovelTagNameDocument = {
	/** TAG language - non-null, should be unique in principle // WARN: Cannot specify unique index for sub-documents, can only avoid in business logic and do validation */
	lang: { type: String, required: true as const },
	/** TAG name - non-null */
	tagName: { type: String, required: true as const },
}

/**
 * Novel TAG data for Elasticsearch
 */
export const NovelTagDocument = {
	/** Elasticsearch index template */
	schema: {
		/** TAG ID - non-null, unique */
		tagId: { type: Number, required: true as const },
		/** TAG names corresponding to different languages */
		tagNameList: { type: [NovelTagNameDocument], required: true as const },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true as const },
	},
	/** Elasticsearch index name */
	indexName: 'search-kira-novel-tag-elasticsearch',
} 