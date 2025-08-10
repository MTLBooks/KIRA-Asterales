import { Client } from '@elastic/elasticsearch'
import axios from 'axios'
import mongoose, { InferSchemaType, PipelineStage } from 'mongoose'
import { createCloudflareImageUploadSignedUrl } from '../cloudflare/index.js'
import { isEmptyObject } from '../common/ObjectTool.js'
import { generateSecureRandomString } from '../common/RandomTool.js'
import { CreateOrUpdateBrowsingHistoryRequestDto } from '../controller/BrowsingHistoryControllerDto.js'
import { ApprovePendingReviewVideoRequestDto, ApprovePendingReviewVideoResponseDto, CheckVideoBlockedByKvidResponseDto, CheckVideoExistRequestDto, CheckVideoExistResponseDto, DeleteVideoRequestDto, DeleteVideoResponseDto, GetVideoByKvidRequestDto, GetVideoByKvidResponseDto, GetVideoByUidRequestDto, GetVideoByUidResponseDto, GetVideoCoverUploadSignedUrlResponseDto, GetVideoFileTusEndpointRequestDto, PendingReviewVideoResponseDto, SearchVideoByKeywordRequestDto, SearchVideoByKeywordResponseDto, SearchVideoByVideoTagIdRequestDto, SearchVideoByVideoTagIdResponseDto, ThumbVideoResponseDto, UploadVideoRequestDto, UploadVideoResponseDto, VideoPartDto } from '../controller/VideoControllerDto.js'
import { DbPoolOptions, deleteDataFromMongoDB, findOneAndUpdateData4MongoDB, insertData2MongoDB, selectDataByAggregateFromMongoDB, selectDataFromMongoDB } from '../dbPool/DbClusterPool.js'
import { OrderByType, QueryType, SelectType, UpdateType } from '../dbPool/DbClusterPoolTypes.js'
import { UserInfoSchema } from '../dbPool/schema/UserSchema.js'
import { RemovedVideoSchema, VideoSchema } from '../dbPool/schema/VideoSchema.js'
import { deleteDataFromElasticsearchCluster, insertData2ElasticsearchCluster, searchDataFromElasticsearchCluster } from '../elasticsearchPool/ElasticsearchClusterPool.js'
import { EsSchema2TsType } from '../elasticsearchPool/ElasticsearchClusterPoolTypes.js'
import { VideoDocument } from '../elasticsearchPool/template/VideoDocument.js'
import { createOrUpdateBrowsingHistoryService } from './BrowsingHistoryService.js'
import { getNextSequenceValueEjectService } from './SequenceValueService.js'
import { checkUserTokenByUuidService, checkUserTokenService, getUserUid, getUserUuid } from './UserService.js'
import { FollowingSchema } from '../dbPool/schema/FeedSchema.js'
import { buildBlockListMongooseFilter, checkBlockUserService, checkIsBlockedByOtherUserService } from './BlockService.js'

/**
 * Upload video
 * @param uploadVideoRequest Request payload
 * @param esClient Elasticsearch client
 * @returns Upload result
 */
export const updateVideoService = async (uploadVideoRequest: UploadVideoRequestDto, uid: number, token: string, esClient?: Client): Promise<UploadVideoResponseDto> => {
	try {
		if (checkUploadVideoRequest(uploadVideoRequest) && esClient && !isEmptyObject(esClient)) {
			if (!(await checkUserTokenService(uid, token)).success) {
				console.error('ERROR', 'Upload video failed: user verification failed')
				return { success: false, message: 'Upload video failed: user verification failed' }
			}

			if (uploadVideoRequest.uploaderId !== uid) {
				console.error('ERROR', 'Upload video failed: UID not matched with cookie')
				return { success: false, message: 'Upload video failed: account mismatch' }
			}

			const UUID = await getUserUuid(uid) // DELETE ME Temporary solution; cookie should store UUID
			if (!UUID) {
				console.error('ERROR', 'Upload video failed: UUID not found', { uid })
				return { success: false, message: 'Upload video failed: UUID not found' }
			}

			// Start transaction
			const session = await mongoose.startSession()
			session.startTransaction()

			const __VIDEO_SEQUENCE_EJECT__ = [9, 42, 233, 404, 2233, 10388, 10492, 114514] // Values to skip when generating KVID
			const videoIdNextSequenceValueResult = await getNextSequenceValueEjectService('video', __VIDEO_SEQUENCE_EJECT__, 1, 1, session)
			const videoId = videoIdNextSequenceValueResult.sequenceValue
			if (videoIdNextSequenceValueResult?.success && videoId !== null && videoId !== undefined) {
				// Prepare video data
				const nowDate = new Date().getTime()
				const title = uploadVideoRequest.title
				const description = uploadVideoRequest.description
				const videoCategory = uploadVideoRequest.videoCategory
				const videoPart = uploadVideoRequest.videoPart.map(video => ({ ...video, editDateTime: nowDate }))
				const videoTagList = uploadVideoRequest.videoTagList.map(tag => ({ ...tag, editDateTime: nowDate }))

				// Prepare data for MongoDB
				const { collectionName, schemaInstance } = VideoSchema
				type Video = InferSchemaType<typeof schemaInstance>

				const video: Video = {
					videoId,
					videoPart: videoPart as Video['videoPart'], // TODO: Mongoose issue: #12420
					title,
					image: uploadVideoRequest.image,
					uploadDate: nowDate,
					watchedCount: 0,
					uploaderUUID: UUID,
					uploaderId: uploadVideoRequest.uploaderId,
					duration: uploadVideoRequest.duration,
					description,
					videoCategory,
					copyright: uploadVideoRequest.copyright,
					originalAuthor: uploadVideoRequest.originalAuthor,
					originalLink: uploadVideoRequest.originalLink,
					pushToFeed: uploadVideoRequest.pushToFeed,
					ensureOriginal: uploadVideoRequest.ensureOriginal,
					videoTagList: videoTagList as Video['videoTagList'], // TODO: Mongoose issue: #12420
					pendingReview: true,
					editDateTime: nowDate,
				}

				// Prepare data for Elasticsearch
				const { indexName: esIndexName, schema: videoEsSchema } = VideoDocument
				const videoEsData: EsSchema2TsType<typeof videoEsSchema> = {
					title,
					description,
					kvid: videoId,
					videoCategory,
					videoTagList,
				}

				try {
					const insert2MongoDBPromise = insertData2MongoDB(video, schemaInstance, collectionName, { session })
					const refreshFlag = true
					const insert2ElasticsearchPromise = insertData2ElasticsearchCluster(esClient, esIndexName, videoEsSchema, videoEsData, refreshFlag)
					const [insert2MongoDBResult, insert2ElasticsearchResult] = await Promise.all([insert2MongoDBPromise, insert2ElasticsearchPromise])

					if (insert2MongoDBResult.success && insert2ElasticsearchResult.success) {
						await session.commitTransaction()
						session.endSession()
						return { success: true, videoId, message: 'Upload video success' }
					} else {
						if (session.inTransaction()) {
							await session.abortTransaction()
						}
						session.endSession()
						console.error('ERROR', 'Upload video failed: cannot import into DB or search engine')
						return { success: false, message: 'Upload video failed: cannot import into DB or search engine' }
					}
				} catch (error) {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.error('ERROR', 'Upload video failed: cannot insert into DB:', error)
					return { success: false, message: 'Upload video failed: cannot record video info' }
				}
			} else {
				if (session.inTransaction()) {
					await session.abortTransaction()
				}
				session.endSession()
				console.error('ERROR', 'Get next video ID failed', uploadVideoRequest)
				return { success: false, message: 'Upload video failed: get video ID failed' }
			}
		} else {
			console.error('ERROR', `Upload video validation failed or ES client not connected, uid: ${uploadVideoRequest.uploaderId}`)
			return { success: false, message: 'Upload video failed: invalid parameters or search engine not connected' }
		}
	} catch (error) {
		console.error('ERROR', 'Upload video failed:', error)
		return { success: false, message: 'Upload video failed' }
	}
}

/**
 * Get videos for home page // TODO should use recommendation rather than last 100 uploads
 * @returns Response
 */
export const getThumbVideoService = async (uuid?: string, token?: string): Promise<ThumbVideoResponseDto> => {
	try {
		const blockListFilter = await buildBlockListMongooseFilter(
			[
				{
					attr: 'uploaderUUID',
					category: 'block-uuid',
				},
				{
					attr: 'uploaderUUID',
					category: 'hide-uuid',
				},
				{
					attr: 'videoTagList.tagId',
					category: 'tag-id',
				},
				{
					attr: 'title',
					category: 'keyword',
				},
				{
					attr: 'title',
					category: 'regex',
				},
			],
			uuid,
			token
		)

		const getThumbVideoPipeline: PipelineStage[] = [
			{
				$lookup: {
					from: 'user-infos',
					localField: 'uploaderUUID',
					foreignField: 'UUID',
					as: 'uploader_info',
				},
			},
			...blockListFilter.filter,
			{ $skip: 0 }, // placeholder
			{ $limit: 100 }, // placeholder
			{
				$unwind: '$uploader_info',
			},
			{
				$sort: {
					uploadDate: -1, // sort desc by uploadDate
				},
			},
			{
				$project: {
					videoId: 1,
					title: 1,
					image: 1,
					uploadDate: 1,
					watchedCount: 1,
					uploaderId: 1, // uploader UID
					duration: 1,
					description: 1,
					editDateTime: 1,
					uploader: '$uploader_info.username', // uploader name
					uploaderNickname: '$uploader_info.userNickname', // uploader nickname
					...blockListFilter.additionalFields, // extra fields from blocklist filter
				}
			}
		]

		try {
			const { collectionName: videoCollectionName, schemaInstance: videoSchemaInstance } = VideoSchema
			type ThumbVideo = InferSchemaType<typeof videoSchemaInstance>

			const result = await selectDataByAggregateFromMongoDB<ThumbVideo>(videoSchemaInstance, videoCollectionName, getThumbVideoPipeline)
			const videoResult = result.result

			if (!result.success || !videoResult) {
				console.error('ERROR', 'Video list length <= 0')
				return { success: false, message: 'Get home videos error: empty list', videosCount: 0, videos: [] }
			}

			const videosCount = videoResult.length
			return { success: true, message: 'Get home videos success', videosCount, videos: videoResult }
		} catch (error) {
			console.error('ERROR', 'Get home videos error, query failed:', error)
			return { success: false, message: 'Get home videos error', videosCount: 0, videos: [] }
		}
	} catch (error) {
		console.error('ERROR', 'Get home videos failed:', error)
		return { success: false, message: 'Get home videos failed', videosCount: 0, videos: [] }
	}
}

/**
 * Check video existence by KVID
 * @param getVideoByKvidRequest Request payload
 * @returns Whether the video exists
 */
export const checkVideoExistByKvidService = async (checkVideoExistRequestDto: CheckVideoExistRequestDto): Promise<CheckVideoExistResponseDto> => {
	try {
		if (checkGetVideoByKvidRequest(checkVideoExistRequestDto)) {
			const { collectionName, schemaInstance } = VideoSchema
			type Video = InferSchemaType<typeof schemaInstance>
			const where: QueryType<Video> = {
				videoId: checkVideoExistRequestDto.videoId,
			}
			const select: SelectType<Video> = {
				videoId: 1,
			}
			try {
				const result = await selectDataFromMongoDB<Video>(where, select, schemaInstance, collectionName)
				const videoResult = result.result
				if (result.success && videoResult) {
					const videosCount = videoResult?.length
					if (videosCount === 1) {
						return { success: true, message: "Video exists", exist: true }
					} else {
						console.error('ERROR', 'Video array length != 1')
						return { success: false, message: "Get video info error: not exist", exist: false }
					}
				} else {
					console.error('ERROR', 'Video result or array is empty')
					return { success: false, message: "Get video info error: not exist", exist: false }
				}
			} catch (error) {
				console.error('ERROR', 'Get video failed:', error)
				return { success: false, message: "Get video info error: not exist", exist: false }
			}
		} else {
			console.error('ERROR', 'KVID is empty')
			return { success: false, message: "Get video info error: KVID is empty", exist: false }
		}
	} catch (error) {
		console.error('ERROR', 'Get video failed:', error)
		return { success: false, message: "Get video info error: unknown error", exist: false }
	}
}

/**
 * Check block state by KVID
 * @param videoId KVID
 * @param selectorUuid User UUID
 * @param selectorToken User Token
 */
export const checkVideoBlockedByKvidService = async (videoId: number, selectorUuid: string, selectorToken: string): Promise<CheckVideoBlockedByKvidResponseDto> => {
	try {
		let isBlocked = false
		let isBlockedByOther = false
		let isHidden = false

		const { collectionName, schemaInstance } = VideoSchema
		type Video = InferSchemaType<typeof schemaInstance>
		const where: QueryType<Video> = {
			videoId,
		}
		const select: SelectType<Video> = {
			uploaderUUID: 1,
		}
		const videoResult = await selectDataFromMongoDB<Video>(where, select, schemaInstance, collectionName)
		if (!videoResult.success || !videoResult.result || videoResult.result.length === 0) {
			console.error('ERROR', 'Check video block failed: video not found')
			return { success: false, message: 'Check video block failed: video not found'}
		}
		const video = videoResult.result?.[0]
		const uploaderUUID = video.uploaderUUID
		if (!uploaderUUID) {
			console.error('ERROR', 'Check video block failed: uploader UID is empty')
			return { success: false, message: 'Check video block failed: uploader UID is empty' }
		}
		const targetUid = await getUserUid(uploaderUUID)
		if (!targetUid) {
			console.error('ERROR', 'Check video block failed: uploader UID not found')
			return { success: false, message: 'Check video block failed: uploader UID not found' }
		}

		const checkBlockUserResult = await checkBlockUserService({ uid: targetUid }, selectorUuid, selectorToken)
		const checkIsBlockedByOtherUserResult = await checkIsBlockedByOtherUserService({ targetUid }, selectorUuid, selectorToken)
		if (!checkBlockUserResult.success && !checkIsBlockedByOtherUserResult.success) {
			console.error('ERROR', 'Check video block failed: cannot check user block state')
			return { success: false, message: 'Check video block failed: cannot check user block state' }
		}

		// 1. Check if uploader is hidden by current user
		if (checkBlockUserResult.isHidden) {
			isHidden = true
		}

		// 2. Check if current user is blocked by uploader
		if (checkIsBlockedByOtherUserResult.isBlocked) {
			isBlockedByOther = true
		}

		// 3. Check mutual block
		if (checkBlockUserResult.isBlocked && checkIsBlockedByOtherUserResult.isBlocked) {
			return { success: true, message: 'Mutual block', isBlockedByOther, isBlocked: true, isHidden }
		}

		// 4. Check if uploader is blocked by current user
		if (checkBlockUserResult.isBlocked) {
			return { success: true, message: 'Uploader blocked by current user', isBlockedByOther, isBlocked: true, isHidden }
		}
		return { success: true, message: 'Not blocked', isBlocked, isBlockedByOther, isHidden }
	} catch (error) {
		console.error('ERROR', 'Check video block failed:', error)
		return { success: false, message: 'Check video block failed: unknown error'}
	}
}

/**
 * Get video detail by KVID (video page)
 * @param uploadVideoRequest Request payload
 * @returns Video data
 */
export const getVideoByKvidService = async (getVideoByKvidRequest: GetVideoByKvidRequestDto, selectorUuid?: string, selectorToken?: string): Promise<GetVideoByKvidResponseDto> => {
	try {
		const { videoId } = getVideoByKvidRequest
		const { collectionName: videoCollectionName, schemaInstance: videoSchemaInstance } = VideoSchema

		let isHidden = false
		let isBlockedByOther = false

		// Validate request
		if (!checkGetVideoByKvidRequest(getVideoByKvidRequest)) {
			console.error('ERROR', 'Video page - KVID is empty')
			return { success: false, message: 'Video page - required parameter is empty', isBlocked: false, isBlockedByOther, isHidden }
		}

		// Build pipeline
		const getThumbVideoPipeline: PipelineStage[] = [
			{
				$match: {
					videoId, // filter by videoId
				},
			},
			{
				$limit: 1, // if multiple, only take first
			},
			{
				$lookup: { // join uploader info
					from: 'user-infos',
					localField: 'uploaderUUID',
					foreignField: 'UUID',
					as: 'uploader_info',
				},
			},
			{
				$unwind: '$uploader_info', // flatten
			},
			{
				$project: {
					videoId: 1,
					videoPart: 1,
					title: 1,
					image: 1,
					uploadDate: 1,
					watchedCount: 1,
					uploaderUUID: 1,
					uploaderId: 1,
					duration: 1,
					description: 1,
					editDateTime: 1,
					videoCategory: 1,
					copyright: 1,
					videoTagList: 1,
					ensureOriginal: 1,
					pushToFeed: 1,
					uploaderInfo: {
						uid: '$uploader_info.uid',
						username: '$uploader_info.username',
						userNickname: '$uploader_info.userNickname',
						avatar: '$uploader_info.avatar',
						userBannerImage: '$uploader_info.userBannerImage',
						signature: '$uploader_info.signature',
					}
				}
			}
		]

		try {
			// Query video and uploader data
			const result = await selectDataByAggregateFromMongoDB(videoSchemaInstance, videoCollectionName, getThumbVideoPipeline)
			const video = result.result?.[0] as GetVideoByKvidResponseDto['video']
			if (!result.success || !video) {
				console.error('ERROR', 'Video page - video result empty')
				return { success: false, message: 'Video page - no video found', isBlocked: false, isBlockedByOther, isHidden }
			}

			video.uploaderInfo.isFollowing = false // default not following
			video.uploaderInfo.isSelf = false // default not self

			if ((await checkUserTokenByUuidService(selectorUuid, selectorToken)).success) { // if logged in
				const checkBlockUserResult = await checkBlockUserService({ uid: video.uploaderInfo.uid }, selectorUuid, selectorToken)
				const checkIsBlockedByOtherUserResult = await checkIsBlockedByOtherUserService({ targetUid: video.uploaderInfo.uid }, selectorUuid, selectorToken)

				// 1. Hidden by current user
				if (checkBlockUserResult.isHidden) {
					isHidden = true
				}

				// 2. Blocked by uploader
				if (checkIsBlockedByOtherUserResult.isBlocked) {
					isBlockedByOther = true
				}

				// 3. Mutual block
				if (checkBlockUserResult.isBlocked && checkIsBlockedByOtherUserResult.isBlocked) {
					return { success: true, message: 'Video page - mutual block', isBlockedByOther, isBlocked: true, isHidden }
				}

				// 4. Uploader blocked by current user
				if (checkBlockUserResult.isBlocked) {
					return { success: true, message: 'Video page - uploader blocked by current user', isBlockedByOther, isBlocked: true, isHidden }
				}

				// 5. Save browsing history
				const createOrUpdateBrowsingHistoryRequest: CreateOrUpdateBrowsingHistoryRequestDto = {
					uuid: selectorUuid,
					category: 'video',
					id: String(video.videoId),
				}
				await createOrUpdateBrowsingHistoryService(createOrUpdateBrowsingHistoryRequest, selectorUuid, selectorToken)

				// 6. Check if following
				const { collectionName: followingSchemaCollectionName, schemaInstance: followingSchemaInstance } = FollowingSchema
				type Following = InferSchemaType<typeof followingSchemaInstance>
				const followingWhere: QueryType<Following> = {
					followerUuid: selectorUuid,
					followingUuid: video.uploaderUUID,
				}
				const followingSelect: SelectType<Following> = {
					followerUuid: 1,
					followingUuid: 1,
					followingType: 1,
				}
				const selectFollowingDataResult = await selectDataFromMongoDB<Following>(followingWhere, followingSelect, followingSchemaInstance, followingSchemaCollectionName)
				const followingResult = selectFollowingDataResult?.result
				if (selectFollowingDataResult.success && followingResult.length === 1) { // following
					video.uploaderInfo.isFollowing = true
				}

				// 7. Self-check
				if (video.uploaderUUID === selectorUuid) {
					video.uploaderInfo.isSelf = true
				}
			}

			return {
				success: true,
				message: 'Video page - get video success',
				video,
				isBlocked: false,
				isBlockedByOther,
				isHidden,
			}
		} catch (error) {
			console.error('ERROR', 'Video page - video query failed:', error)
			return { success: false, message: 'Video page - video query failed', isBlocked: false, isBlockedByOther, isHidden }
		}
	} catch (error) {
		console.error('ERROR', 'Get video failed:', error)
		return { success: false, message: 'Get video failed:', isBlocked: false, isBlockedByOther: false, isHidden: false }
	}
}

/**
 * Get videos by UID
 * @param getVideoByUidRequest Request payload
 * @returns Video list
 */
export const getVideoByUidRequestService = async (getVideoByUidRequest: GetVideoByUidRequestDto, selectorUuid?: string, selectorToken?: string): Promise<GetVideoByUidResponseDto> => {
	try {
		let isHidden = false
		let isBlockedByOther = false

		if (!checkGetVideoByUidRequest(getVideoByUidRequest)) {
			console.error('ERROR', 'Get videos by UID failed: UID is empty')
			return { success: false, message: 'Get videos by UID failed: UID is empty', videosCount: 0, videos: [], isBlockedByOther, isBlocked: false, isHidden }
		}

		const { uid } = getVideoByUidRequest

		if (selectorUuid && selectorToken && (await checkUserTokenByUuidService(selectorUuid, selectorToken)).success) {
			const checkBlockUserResult = await checkBlockUserService({ uid }, selectorUuid, selectorToken)
			const checkIsBlockedByOtherUserResult = await checkIsBlockedByOtherUserService({ targetUid: uid }, selectorUuid, selectorToken)

			// 1. Hidden by current user
			if (checkBlockUserResult.isHidden) {
				isHidden = true
			}

			// 2. Blocked by uploader
			if (checkIsBlockedByOtherUserResult.isBlocked) {
				isBlockedByOther = true
			}

			// 3. Mutual block
			if (checkBlockUserResult.isBlocked && checkIsBlockedByOtherUserResult.isBlocked) {
				return { success: true, message: 'Get videos by UID failed: mutual block', videosCount: 0, videos: [], isBlockedByOther, isBlocked: true, isHidden }
			}

			// 4. Uploader blocked by current user
			if (checkBlockUserResult.isBlocked) {
				return { success: true, message: 'Get videos by UID failed: uploader blocked by current user', videosCount: 0, videos: [], isBlockedByOther, isBlocked: true, isHidden }
			}
		}

		const { collectionName, schemaInstance } = VideoSchema
		type Video = InferSchemaType<typeof schemaInstance>
		const where: QueryType<Video> = {
			uploaderId: uid,
		}
		const select: SelectType<Video> = {
			videoId: 1,
			videoPart: 1,
			title: 1,
			image: 1,
			uploadDate: 1,
			watchedCount: 1,
			uploaderId: 1,
			duration: 1,
			description: 1,
			editDateTime: 1,
		}

		try {
			const result = await selectDataFromMongoDB<Video>(where, select, schemaInstance, collectionName)
			const videoResult = result.result
			if (!result.success || !videoResult) {
				console.error('ERROR', 'Get videos by UID failed: query failed or empty')
				return { success: false, message: 'Get videos by UID failed: query failed or empty', videosCount: 0, videos: [], isBlockedByOther, isBlocked: false, isHidden }
			}

			const videoResultLength = videoResult?.length

			if (videoResultLength <= 0) {
				return { success: true, message: 'User seems not uploaded any video', videosCount: 0, videos: [], isBlockedByOther, isBlocked: false, isHidden }
			}

			return { success: true, message: 'Get videos by UID success', videosCount: videoResultLength, videos: videoResult, isBlockedByOther, isBlocked: false, isHidden }
		} catch (error) {
			console.error('ERROR', 'Get videos by UID failed: query error:', error)
			return { success: false, message: 'Get videos by UID failed: query error', videosCount: 0, videos: [], isBlockedByOther, isBlocked: false, isHidden }
		}
	} catch (error) {
		console.error('ERROR', 'Get videos by UID failed: unknown reason:', error)
		return { success: false, message: 'Get videos by UID failed: unknown reason', videosCount: 0, videos: [], isBlockedByOther: false, isBlocked: false, isHidden: false }
	}
}

/**
 * Search video by keyword (Elasticsearch)
 * @param searchVideoByKeywordRequest Search keyword
 * @param client Elasticsearch client
 * @returns Response
 */
export const searchVideoByKeywordService = async (searchVideoByKeywordRequest: SearchVideoByKeywordRequestDto, client: Client | undefined): Promise<SearchVideoByKeywordResponseDto> => {
	try {
		if (checkSearchVideoByKeywordRequest(searchVideoByKeywordRequest) && client && !isEmptyObject(client)) {
			const { indexName: esIndexName, schema: videoEsSchema } = VideoDocument
			const esQuery = {
				query_string: {
					query: searchVideoByKeywordRequest.keyword,
				},
			}

			try {
				const esSearchResult = await searchDataFromElasticsearchCluster(client, esIndexName, videoEsSchema, esQuery)
				if (esSearchResult.success) {
					const videoResult = esSearchResult?.result
					if (videoResult && videoResult?.length > 0) {
						try {
							const videos: SearchVideoByKeywordResponseDto['videos'] = await Promise.all(videoResult.map(async video => {
								const esVideoId = video.kvid
								const esVideoTitle = video.title
								const uploadVideoRequest: GetVideoByKvidRequestDto = {
									videoId: esVideoId,
								}
								const result = await getVideoByKvidService(uploadVideoRequest)
								const videoResult = result?.video
								if (result.success && videoResult && !isEmptyObject(videoResult)) {
									return {
										videoId: videoResult.videoId,
										title: videoResult.title,
										image: videoResult.image,
										uploadDate: videoResult.uploadDate,
										watchedCount: videoResult.watchedCount,
										uploader: videoResult.uploaderInfo?.username,
										uploaderId: videoResult.uploaderId,
										duration: videoResult.duration,
										description: videoResult.description,
									}
								} else {
									return {
										videoId: esVideoId,
										title: esVideoTitle,
									}
								}
							}))
							const videosCount = videos?.length
							if (videos && videosCount !== undefined && videosCount !== null && videosCount > 0) {
								return { success: true, message: 'Search videos by keyword success', videosCount, videos }
							} else {
								console.error('ERROR', 'Search videos by keyword failed: ES ok but MongoDB missing data')
								return { success: false, message: 'Search videos by keyword failed: found in ES but missing in DB', videosCount: 0, videos: [] }
							}
						} catch (error) {
							console.error('ERROR', 'Search videos by keyword failed: ES ok but MongoDB query error')
							return { success: false, message: 'Search videos by keyword failed: found in ES but DB query error', videosCount: 0, videos: [] }
						}
					} else {
						return { success: true, message: 'Search videos by keyword success: empty result', videosCount: 0, videos: [] }
					}
				} else {
					console.error('ERROR', 'Search videos by keyword failed: ES search failed')
					return { success: false, message: 'Search videos by keyword failed: ES search failed', videosCount: 0, videos: [] }
				}
			} catch (error) {
				console.error('ERROR', 'Search videos by keyword failed: ES search exception', error)
				return { success: false, message: 'Search videos by keyword failed: ES search exception', videosCount: 0, videos: [] }
			}
		} else {
			console.error('ERROR', 'Search videos by keyword failed: keyword or ES client is empty')
			return { success: false, message: 'Search videos by keyword failed: required parameter is empty', videosCount: 0, videos: [] }
		}
	} catch (error) {
		console.error('ERROR', 'Search videos by keyword failed: unknown reason:', error)
		return { success: false, message: 'Search videos by keyword failed: unknown reason', videosCount: 0, videos: [] }
	}
}

/**
 * Get Stream TUS upload endpoint
 * @param uid User UID
 * @param token User token
 * @param getVideoFileTusEndpointRequest Request payload
 * @returns TUS endpoint URL
 */
export const getVideoFileTusEndpointService = async (uid: number, token: string, getVideoFileTusEndpointRequest: GetVideoFileTusEndpointRequestDto): Promise<string | undefined> => {
	try {
		if ((await checkUserTokenService(uid, token)).success) {
			const streamTusEndpointUrl = process.env.CF_STREAM_TUS_ENDPOINT_URL
			const streamToken = process.env.CF_STREAM_TOKEN

			const uploadLength = getVideoFileTusEndpointRequest.uploadLength
			const uploadMetadata = getVideoFileTusEndpointRequest.uploadMetadata

			if (!streamTusEndpointUrl && !streamToken) {
				console.error('ERROR', 'Cannot create Cloudflare Stream TUS endpoint: missing env CF_STREAM_TUS_ENDPOINT_URL or CF_STREAM_TOKEN')
				return undefined
			}

			// Axios config
			const config = {
				headers: {
					Authorization: `Bearer ${streamToken}`,
					'Tus-Resumable': '1.0.0',
					'Upload-Length': uploadLength,
					'Upload-Metadata': uploadMetadata,
				},
			}

			try {
				const videoTusEndpointResult = await axios.post(streamTusEndpointUrl, {}, config)
				const videoTusEndpoint = videoTusEndpointResult.headers?.location
				if (videoTusEndpoint) {
					return videoTusEndpoint
				} else {
					console.error('ERROR', 'Cannot create Cloudflare Stream TUS endpoint: empty response')
					return undefined
				}
			} catch (error) {
				console.error('ERROR', 'Cannot create Cloudflare Stream TUS endpoint: request failed', error?.response?.data)
				return undefined
			}
		} else {
			console.error('ERROR', 'Cannot create Cloudflare Stream TUS endpoint: user verification failed', { uid })
			return undefined
		}
	} catch (error) {
		console.error('ERROR', 'Cannot create Cloudflare Stream TUS endpoint: unknown error', error)
		return undefined
	}
}

/**
 * Get pre-signed URL for uploading video cover
 * @param uid User UID
 * @param token User token
 * @returns GetVideoCoverUploadSignedUrlResponseDto
 */
export const getVideoCoverUploadSignedUrlService = async (uid: number, token: string): Promise<GetVideoCoverUploadSignedUrlResponseDto> => {
	try {
		if ((await checkUserTokenService(uid, token)).success) {
			const now = new Date().getTime()
			const fileName = `video-cover-${uid}-${generateSecureRandomString(32)}-${now}`
			try {
				const signedUrl = await createCloudflareImageUploadSignedUrl(fileName, 660)
				if (signedUrl) {
					return { success: true, message: 'Get video cover upload signed URL success', result: { fileName, signedUrl } }
				}
			} catch (error) {
				console.error('ERROR', 'Get video cover upload signed URL failed: request failed', error)
				return { success: false, message: 'Get video cover upload signed URL failed: request failed' }
			}
		} else {
			console.error('ERROR', 'Get video cover upload signed URL failed: user verification failed')
			return { success: false, message: 'Get video cover upload signed URL failed: user verification failed' }
		}
	} catch (error) {
		console.error('ERROR', 'Get video cover upload signed URL failed:', error)
		return { success: false, message: 'Get video cover upload signed URL failed: unknown error' }
	}
}

/**
 * Search videos by TAG IDs
 * @param searchVideoByVideoTagIdRequest Request payload
 * @returns Response
 */
export const searchVideoByVideoTagIdService = async (searchVideoByVideoTagIdRequest: SearchVideoByVideoTagIdRequestDto): Promise<SearchVideoByVideoTagIdResponseDto> => {
	try {
		if (checkSearchVideoByVideoTagIdRequest(searchVideoByVideoTagIdRequest)) {
			const { collectionName: videoCollectionName, schemaInstance: videoSchemaInstance } = VideoSchema
			const { collectionName: userInfoCollectionName, schemaInstance: userInfoSchemaInstance } = UserInfoSchema
			type Video = InferSchemaType<typeof videoSchemaInstance>
			type UserInfo = InferSchemaType<typeof userInfoSchemaInstance>
			const where: QueryType<Video> = {
				videoTagList: {
					$all: searchVideoByVideoTagIdRequest.tagId.map(tagId => ({ $elemMatch: { tagId } })),
				},
			}
			const select: SelectType<Video> = {
				videoId: 1,
				videoPart: 1,
				title: 1,
				image: 1,
				uploadDate: 1,
				watchedCount: 1,
				uploaderId: 1,
				duration: 1,
				description: 1,
				editDateTime: 1,
				videoCategory: 1,
				copyright: 1,
				videoTagList: 1,
			}
			const uploaderInfoKey = 'uploaderInfo'
			const option: DbPoolOptions<Video, UserInfo> = {
				virtual: {
					name: uploaderInfoKey, // virtual field
					options: {
						ref: userInfoCollectionName, // ref to sub-model (note plural)
						localField: 'uploaderId', // parent field
						foreignField: 'uid', // child field
						justOne: true, // only one document even if more match
					},
				},
				populate: uploaderInfoKey,
			}
			try {
				const result = await selectDataFromMongoDB<Video, UserInfo>(where, select, videoSchemaInstance, videoCollectionName, option)
				const videoResult = result.result
				if (result.success && videoResult) {
					const videoList = videoResult.map(video => {
						const uploaderInfo = uploaderInfoKey in video && video?.[uploaderInfoKey] as UserInfo
						if (uploaderInfo) { // attach uploader info
							const uid = uploaderInfo.uid
							const username = uploaderInfo.username
							const userNickname = uploaderInfo.userNickname
							const avatar = uploaderInfo.avatar
							const userBannerImage = uploaderInfo.userBannerImage
							const signature = uploaderInfo.signature
							video.uploaderInfo = { uid, username, userNickname, avatar, userBannerImage, signature }
						}
						return { ...video, uploaderInfo } as SearchVideoByVideoTagIdResponseDto['videos'][number]
					})

					if (videoList) {
						if (videoList.length > 0) {
							return { success: true, message: 'Search videos by TAG ID success', videosCount: videoList.length, videos: videoList }
						} else {
							return { success: true, message: 'Search videos by TAG ID: empty', videosCount: 0, videos: [] }
						}
					} else {
						console.error('ERROR', 'Search by TAG ID error: empty result')
						return { success: true, message: 'Search by TAG ID error: normalized empty result', videosCount: 0, videos: [] }
					}
				} else {
					console.error('ERROR', 'Search by TAG ID error: empty result')
					return { success: false, message: 'Search by TAG ID error: empty result', videosCount: 0, videos: [] }
				}
			} catch (error) {
				console.error('ERROR', 'Search by TAG ID error: query error:', error)
				return { success: false, message: 'Search by TAG ID error: query error', videosCount: 0, videos: [] }
			}
		} else {
			console.error('ERROR', 'Search by TAG ID failed: invalid parameters')
			return { success: false, message: 'Search by TAG ID failed: invalid parameters', videosCount: 0, videos: [] }
		}
	} catch (error) {
		console.error('ERROR', 'Search by TAG ID failed: unknown exception:', error)
		return { success: false, message: 'Search by TAG ID failed: unknown exception', videosCount: 0, videos: [] }
	}
}

/**
 * Delete a video
 * @param deleteVideoRequest Request payload
 * @param adminUid Admin UID
 * @param adminToken Admin token
 * @param esClient Elasticsearch client
 * @returns Response
 */
export const deleteVideoByKvidService = async (deleteVideoRequest: DeleteVideoRequestDto, adminUid: number, adminToken: string, esClient: Client): Promise<DeleteVideoResponseDto> => {
	try {
		if (checkDeleteVideoRequest(deleteVideoRequest) && esClient && !isEmptyObject(esClient)) {
			if ((await checkUserTokenService(adminUid, adminToken)).success) {
				const adminUUID = await getUserUuid(adminUid) // DELETE ME Temporary solution; cookie should store UUID
				if (!adminUUID) {
					console.error('ERROR', 'Delete video failed: adminUUID not found', { adminUid })
					return { success: false, message: 'Delete video failed: adminUUID not found' }
				}

				const videoId = deleteVideoRequest.videoId
				const nowDate = new Date().getTime()

				const { collectionName: videoCollectionName, schemaInstance: videoSchemaInstance } = VideoSchema
				type Video = InferSchemaType<typeof videoSchemaInstance>
				const deleteWhere: QueryType<Video> = {
					videoId,
				}

				const { indexName: esIndexName } = VideoDocument
				const conditions = {
					kvid: videoId,
				}

				const { collectionName: removedVideoCollectionName, schemaInstance: removedVideoSchemaInstance } = RemovedVideoSchema
				type RemovedVideo = InferSchemaType<typeof removedVideoSchemaInstance>

				// Start transaction
				const session = await mongoose.startSession()
				session.startTransaction()

				const option = { session }
				try {
					const getVideoByKvidRequest: GetVideoByKvidRequestDto = {
						videoId,
					}
					const videoResult = await getVideoByKvidService(getVideoByKvidRequest)
					const videoData = videoResult.video
					if (videoResult.success && videoData) {
						const removedVideoData: RemovedVideo = {
							...videoData as Video, // TODO: Mongoose issue: #12420
							pendingReview: false, // deleted videos do not require review
							_operatorUUID_: adminUUID,
							_operatorUid_: adminUid,
							editDateTime: nowDate,
						}
						const saveRemovedVideo = await insertData2MongoDB(removedVideoData, removedVideoSchemaInstance, removedVideoCollectionName, option)
						if (saveRemovedVideo.success) {
							const deleteResult = await deleteDataFromMongoDB<Video>(deleteWhere, videoSchemaInstance, videoCollectionName, option)
							const deleteFromElasticsearchResult = await deleteDataFromElasticsearchCluster(esClient, esIndexName, conditions)
							if (deleteResult.success && deleteFromElasticsearchResult) {
								await session.commitTransaction()
								session.endSession()
								return { success: true, message: 'Delete video success' }
							} else {
								if (session.inTransaction()) {
									await session.abortTransaction()
								}
								session.endSession()
								console.error('ERROR', 'Delete video failed: delete failed')
								return { success: false, message: 'Delete video failed: delete failed' }
							}
						} else {
							if (session.inTransaction()) {
								await session.abortTransaction()
							}
							session.endSession()
							console.error('ERROR', 'Delete video failed: save backup failed')
							return { success: false, message: 'Delete video failed: save backup failed' }
						}
					} else {
						if (session.inTransaction()) {
							await session.abortTransaction()
						}
						session.endSession()
						console.error('ERROR', 'Delete video failed: get video data failed')
						return { success: false, message: 'Delete video failed: get video data failed' }
					}
				} catch (error) {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.error('ERROR', 'Delete video error: get video failed')
					return { success: false, message: 'Delete video error: get video failed' }
				}
			} else {
				console.error('ERROR', 'Delete video failed: invalid user')
				return { success: false, message: 'Delete video failed: invalid user' }
			}
		} else {
			console.error('ERROR', 'Delete video failed: invalid parameters')
			return { success: false, message: 'Delete video failed: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Delete video error: unknown error:', error)
		return { success: false, message: 'Delete video error: unknown error' }
	}
}

/**
 * Get pending-review videos
 * @param adminUid Admin UID
 * @param adminToken Admin token
 * @returns Response
 */
export const getPendingReviewVideoService = async (adminUid: number, adminToken: string): Promise<PendingReviewVideoResponseDto> => {
	try {
		if (!(await checkUserTokenService(adminUid, adminToken)).success) {
			console.error('ERROR', 'Get pending-review videos failed: user verification failed')
			return { success: false, message: 'Get pending-review videos failed: user verification failed', videosCount: 0, videos: [] }
		}

		const { collectionName: videoCollectionName, schemaInstance: videoSchemaInstance } = VideoSchema
		const { collectionName: userInfoCollectionName, schemaInstance: userInfoSchemaInstance } = UserInfoSchema
		type Video = InferSchemaType<typeof videoSchemaInstance>
		type UserInfo = InferSchemaType<typeof userInfoSchemaInstance>
		const where: QueryType<Video> = {}
		const select: SelectType<Video> = {
			videoId: 1,
			title: 1,
			image: 1,
			uploadDate: 1,
			watchedCount: 1,
			uploaderId: 1,
			duration: 1,
			description: 1,
			editDateTime: 1,
		}
		const orderBy: OrderByType<Video> = {
			editDateTime: -1,
		}
		const uploaderInfoKey = 'uploaderInfo'
		const option: DbPoolOptions<Video, UserInfo> = {
			virtual: {
				name: uploaderInfoKey, // virtual field
				options: {
					ref: userInfoCollectionName, // sub-model
					localField: 'uploaderId', // parent field
					foreignField: 'uid', // child field
					justOne: true, // only one document
				},
			},
			populate: uploaderInfoKey,
		}
		try {
			const result = await selectDataFromMongoDB<Video, UserInfo>(where, select, videoSchemaInstance, videoCollectionName, option, orderBy)
			const videoResult = result.result
			if (result.success && videoResult) {
				const videosCount = videoResult?.length
				if (videosCount && videosCount > 0) {
					return {
						success: true,
						message: 'Get pending-review videos success',
						videosCount,
						videos: videoResult.map(video => {
							if (video) {
								const uploaderInfo = uploaderInfoKey in video && video?.[uploaderInfoKey] as UserInfo
								if (uploaderInfo) {
									const uploader = uploaderInfo.userNickname ?? uploaderInfo.username
									return { ...video, uploader }
								}
							}
							return { ...video, uploader: undefined }
						}),
					}
				} else {
					console.error('ERROR', 'Get pending-review videos failed: empty list')
					return { success: false, message: 'Get pending-review videos failed: empty list', videosCount: 0, videos: [] }
				}
			} else {
				console.error('ERROR', 'Get pending-review videos failed: empty result')
				return { success: false, message: 'Get pending-review videos failed: no videos', videosCount: 0, videos: [] }
			}
		} catch (error) {
			console.error('ERROR', 'Get pending-review videos error: query failed:', error)
			return { success: false, message: 'Get pending-review videos error: query failed', videosCount: 0, videos: [] }
		}
	} catch (error) {
		console.error('ERROR', 'Get pending-review videos error: get videos failed:', error)
		return { success: false, message: 'Get pending-review videos error: get videos failed', videosCount: 0, videos: [] }
	}
}

/**
 * Approve a pending-review video
 * @param approvePendingReviewVideoRequest Request payload
 * @param adminUid Admin UID
 * @param adminToken Admin token
 * @returns Response
 */
export const approvePendingReviewVideoService = async (approvePendingReviewVideoRequest: ApprovePendingReviewVideoRequestDto, adminUid: number, adminToken: string): Promise<ApprovePendingReviewVideoResponseDto> => {
	try {
		if (!checkApprovePendingReviewVideoRequest(approvePendingReviewVideoRequest)) {
			console.error('ERROR', 'Approve pending-review video failed: validation failed')
			return { success: false, message: 'Approve pending-review video failed: validation failed' }
		}

		if (!(await checkUserTokenService(adminUid, adminToken)).success) {
			console.error('ERROR', 'Approve pending-review video failed: user verification failed')
			return { success: false, message: 'Approve pending-review video failed: user verification failed' }
		}

		try {
			const { videoId } = approvePendingReviewVideoRequest
			const { collectionName: videoCollectionName, schemaInstance: videoSchemaInstance } = VideoSchema
			type Video = InferSchemaType<typeof videoSchemaInstance>
			const updatePendingReviewVideoWhere: QueryType<Video> = {
				videoId,
			}

			const updatePendingReviewVideoData: UpdateType<Video> = {
				pendingReview: false,
			}
			const updatePendingReviewVideoResult = await findOneAndUpdateData4MongoDB<Video>(updatePendingReviewVideoWhere, updatePendingReviewVideoData, videoSchemaInstance, videoCollectionName)

			if (!updatePendingReviewVideoResult.success) {
				console.error('ERROR', 'Approve pending-review video failed: update failed')
				return { success: false, message: 'Approve pending-review video failed: update failed' }
			}

			return { success: true, message: 'Approve pending-review video success' }
		} catch (error) {
			console.error('ERROR', 'Approve pending-review video error: update request failed:', error)
			return { success: false, message: 'Approve pending-review video error: update request failed' }
		}
	} catch (error) {
		console.error('ERROR', 'Approve pending-review video error: unknown error:', error)
		return { success: false, message: 'Approve pending-review video error: unknown error' }
	}
}

/**
 * Validate uploadVideoRequest
 * @param uploadVideoRequest Request payload
 * @returns true if valid
 */
const checkUploadVideoRequest = (uploadVideoRequest: UploadVideoRequestDto) => {
	// TODO // WARN may need stricter validation

	const VIDEO_CATEGORY = ['anime', 'music', 'otomad', 'tech', 'design', 'game', 'misc']
	return (
		uploadVideoRequest.videoPart && uploadVideoRequest.videoPart?.length > 0 && uploadVideoRequest.videoPart.every(checkVideoPartData)
		&& uploadVideoRequest.title
		&& uploadVideoRequest.image
		&& uploadVideoRequest.uploaderId !== null && uploadVideoRequest.uploaderId !== undefined
		&& uploadVideoRequest.duration
		&& VIDEO_CATEGORY.includes(uploadVideoRequest.videoCategory)
		&& uploadVideoRequest.copyright
		&& uploadVideoRequest.pushToFeed !== undefined && uploadVideoRequest.pushToFeed !== null
		&& uploadVideoRequest.ensureOriginal !== undefined && uploadVideoRequest.ensureOriginal !== null
	)
}

/**
 * Validate videoPartDate
 * @param videoPartDate Each P (part) data
 * @returns true if valid
 */
const checkVideoPartData = (videoPartDate: VideoPartDto) => {
	return (
		videoPartDate.id !== null && videoPartDate.id !== undefined
		&& videoPartDate.link
		&& videoPartDate.videoPartTitle
	)
}

/**
 * Validate getVideoByKvid request
 * @param getVideoByKvidRequest Request payload
 * @returns true if valid
 */
const checkGetVideoByKvidRequest = (getVideoByKvidRequest: GetVideoByKvidRequestDto) => {
	return (getVideoByKvidRequest.videoId !== null && getVideoByKvidRequest.videoId !== undefined)
}

/**
 * Validate getVideoByUid request
 * @param getVideoByUidRequest Request payload
 * @returns true if valid
 */
const checkGetVideoByUidRequest = (getVideoByUidRequest: GetVideoByUidRequestDto) => {
	return (getVideoByUidRequest.uid !== null && getVideoByUidRequest.uid !== undefined)
}

/**
 * Validate searchVideoByKeyword request
 * @param searchVideoByKeywordRequest Request payload
 * @returns true if valid
 */
const checkSearchVideoByKeywordRequest = (searchVideoByKeywordRequest: SearchVideoByKeywordRequestDto) => {
	return (!!searchVideoByKeywordRequest.keyword)
}

/**
 * Validate searchVideoByVideoTagId request
 * @param searchVideoByVideoTagIdRequest Request payload
 * @returns true if valid
 */
const checkSearchVideoByVideoTagIdRequest = (searchVideoByVideoTagIdRequest: SearchVideoByVideoTagIdRequestDto): boolean => {
	return (searchVideoByVideoTagIdRequest && searchVideoByVideoTagIdRequest.tagId && searchVideoByVideoTagIdRequest.tagId.length > 0)
}

/**
 * Validate deleteVideo request
 * @param deleteVideoRequest Request payload
 * @returns true if valid
 */
const checkDeleteVideoRequest = (deleteVideoRequest: DeleteVideoRequestDto): boolean => {
	return (!!deleteVideoRequest.videoId && typeof deleteVideoRequest.videoId === 'number' && deleteVideoRequest.videoId >= 0)
}

/**
 * Validate approvePendingReviewVideo request
 * @param approvePendingReviewVideoRequest Request payload
 * @returns true if valid
 */
const checkApprovePendingReviewVideoRequest = (approvePendingReviewVideoRequest: ApprovePendingReviewVideoRequestDto) => {
	return (!!approvePendingReviewVideoRequest.videoId && typeof approvePendingReviewVideoRequest.videoId === 'number' && approvePendingReviewVideoRequest.videoId >= 0)
}

