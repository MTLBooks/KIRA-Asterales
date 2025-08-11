// /**
//  * TAG names corresponding to different languages
//  */
// export const VideoTagNameDocument = {
// 	/** TAG language - non-null, should be unique in principle // WARN: Cannot specify unique index for sub-documents, can only avoid in business logic and do validation */
// 	lang: { type: String, required: true as const },
// 	/** TAG names corresponding to different languages */
// 	tagName: { type: String, required: true as const },
// }

// /**
//  * Video TAG data
//  */
// export const VideoTagDocument = {
// 	/** Elasticsearch index template */
// 	schema: {
// 		/** TAG ID - non-null, unique */
// 		tagId: { type: Number, required: true as const },
// 		/** TAG names corresponding to different languages */
// 		tagNameList: { type: [VideoTagNameDocument], required: true as const },
// 		/** System field - last edit time - non-null */
// 		editDateTime: { type: Number, required: true as const },
// 	},
// 	/** Elasticsearch index name */
// 	indexName: 'search-kirakira-video-tag-elasticsearch',
// }
