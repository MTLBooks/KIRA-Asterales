const VideoTagNameDocument = {
	/** TAG name - non-null */
	name: { type: String, required: true as const },
	/** Whether it's the default name for this language - non-null */
	isDefault: { type: Boolean, required: true as const },
	/** Whether it's the original TAG name - non-null */
	isOriginalTagName: { type: Boolean, required: false as const },
}

/**
 * TAG names corresponding to different languages
 */
const MultilingualVideoTagNameDocument = {
	/** TAG language - non-null, should be unique in principle // WARN: Cannot specify unique index for sub-documents, can only avoid in business logic and do validation */
	lang: { type: String, required: true as const },
	/** TAG names corresponding to different languages */
	tagName: { type: [VideoTagNameDocument], required: true as const },
}

/**
 * Video TAG data
 */
const VideoTagDocument = {
	/** Elasticsearch index template */
	schema: {
		/** TAG ID - non-null, unique */
		tagId: { type: Number, required: true as const },
		/** TAG names corresponding to different languages */
		tagNameList: { type: [MultilingualVideoTagNameDocument], required: true as const },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true as const },
	},
	/** Elasticsearch index name */
	indexName: 'search-kirakira-video-tag-elasticsearch',
}

/**
 * Video data
 */
export const VideoDocument = {
	/** Elasticsearch index template */
	schema: {
		/** Video title - non-null */
		title: { type: String, required: true as const },
		/** Video description */
		description: { type: String, required: false as const },
		/** KVID video ID - non-null */
		kvid: { type: Number, required: true as const },
		/** Video category - non-null */
		videoCategory: { type: String, required: true as const },
		/** Video TAG - non-null */
		videoTagList: { type: [VideoTagDocument], required: true as const },
	},
	/** Elasticsearch index name */
	indexName: 'search-kirakira-video-elasticsearch',
}
