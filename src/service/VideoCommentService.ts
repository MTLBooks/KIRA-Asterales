import mongoose, { InferSchemaType, PipelineStage } from 'mongoose'
import { GetUserInfoByUidRequestDto } from '../controller/UserControllerDto.js'
import { AdminDeleteVideoCommentRequestDto, AdminDeleteVideoCommentResponseDto, CancelVideoCommentDownvoteRequestDto, CancelVideoCommentDownvoteResponseDto, CancelVideoCommentUpvoteRequestDto, CancelVideoCommentUpvoteResponseDto, DeleteSelfVideoCommentRequestDto, DeleteSelfVideoCommentResponseDto, EmitVideoCommentDownvoteRequestDto, EmitVideoCommentDownvoteResponseDto, EmitVideoCommentRequestDto, EmitVideoCommentResponseDto, EmitVideoCommentUpvoteRequestDto, EmitVideoCommentUpvoteResponseDto, GetVideoCommentByKvidRequestDto, GetVideoCommentByKvidResponseDto, GetVideoCommentDownvotePropsDto, GetVideoCommentDownvoteResultDto, GetVideoCommentUpvotePropsDto, GetVideoCommentUpvoteResultDto, VideoCommentResult } from '../controller/VideoCommentControllerDto.js'
import { findOneAndPlusByMongodbId, insertData2MongoDB, selectDataFromMongoDB, updateData4MongoDB, deleteDataFromMongoDB, selectDataByAggregateFromMongoDB } from '../dbPool/DbClusterPool.js'
import { QueryType, SelectType } from '../dbPool/DbClusterPoolTypes.js'
import { RemovedVideoCommentSchema, VideoCommentDownvoteSchema, VideoCommentSchema, VideoCommentUpvoteSchema } from '../dbPool/schema/VideoCommentSchema.js'
import { getNextSequenceValueService } from './SequenceValueService.js'
import { checkUserTokenByUuidService, checkUserTokenService, getUserInfoByUidService, getUserUid, getUserUuid } from './UserService.js'
import { buildBlockListMongooseFilter } from './BlockService.js'
import { checkVideoBlockedByKvidService } from './VideoService.js'

/**
 * Emit video comment
 * @param emitVideoCommentRequest Request payload
 * @param uid cookie user ID
 * @param token cookie user token
 * @returns Emit result
 */
export const emitVideoCommentService = async (emitVideoCommentRequest: EmitVideoCommentRequestDto, uuid: string, token: string): Promise<EmitVideoCommentResponseDto> => {
	try {
		if (!checkEmitVideoCommentRequest(emitVideoCommentRequest)) {
			console.error('ERROR', 'Emit comment failed: payload validation failed', { videoId: emitVideoCommentRequest.videoId, uuid })
			return { success: false, message: 'Emit comment failed: invalid data' }
		}
		
		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Emit comment failed: user verification failed', { videoId: emitVideoCommentRequest.videoId, uuid })
			return { success: false, message: 'Emit comment failed: user verification failed' }
		}

		if (!uuid) {
			console.error('ERROR', 'Emit comment failed: UUID not found', { uuid })
			return { success: false, message: 'Emit comment failed: UUID not found' }
		}

		const uid = await getUserUid(uuid)
		if (uid === undefined || uid === null || uid < 1) {
			console.error('ERROR', 'Emit comment failed: cannot get sender UID', { uuid })
			return { success: false, message: 'Emit comment failed: cannot get sender UID' }
		}

		// Check video block status
		const { videoId } = emitVideoCommentRequest
		const selectorUuid = uuid
		const selectorToken = token

		const checkVideoBlockedResult = await checkVideoBlockedByKvidService(videoId, selectorUuid, selectorToken)
		if (!checkVideoBlockedResult.success) {
			console.error('ERROR', 'Emit comment failed: check block failed', { uuid })
			return { success: false, message: 'Emit comment failed: check block failed' }
		}

		if (checkVideoBlockedResult.isBlockedByOther) {
			console.error('ERROR', 'Emit comment failed: blocked by other user', { uuid })
			return { success: false, message: 'Emit comment failed: blocked by other user' }
		}
		if (checkVideoBlockedResult.isBlocked) {
			console.error('ERROR', 'Emit comment failed: uploader is blocked', { uuid })
			return { success: false, message: 'Emit comment failed: uploader is blocked' }
		}

		// Start transaction
		const session = await mongoose.startSession()
		session.startTransaction()

		const getCommentIndexResult = await getNextSequenceValueService(`KVID-${emitVideoCommentRequest.videoId}`, 1, 1, session) // next value as comment floor
		const commentIndex = getCommentIndexResult.sequenceValue
		if (!getCommentIndexResult.success || commentIndex === undefined || commentIndex === null) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('ERROR', 'Emit comment failed: cannot get comment floor by video ID', { videoId: emitVideoCommentRequest.videoId, uid })
			return { success: false, message: 'Emit comment failed: cannot get floor data' }
		}

		const { collectionName, schemaInstance } = VideoCommentSchema
		type VideoComment = InferSchemaType<typeof schemaInstance>
		const nowDate = new Date().getTime()
		const videoComment: VideoComment = {
			...emitVideoCommentRequest,
			UUID: uuid,
			uid,
			commentRoute: `${emitVideoCommentRequest.videoId}.${commentIndex}`,
			commentIndex,
			emitTime: nowDate,
			upvoteCount: 0,
			downvoteCount: 0,
			subComments: [] as VideoComment['subComments'], // TODO: Mongoose issue: #12420
			subCommentsCount: 0,
			editDateTime: nowDate,
		}
		try {
			const insertData2MongoDBResult = await insertData2MongoDB(videoComment, schemaInstance, collectionName, { session })
			
			if (!insertData2MongoDBResult || !insertData2MongoDBResult.success) {
				if (session.inTransaction()) {
					await session.abortTransaction()
				}
				session.endSession()
				console.error('ERROR', 'Emit comment failed: insert returned empty', { videoId: emitVideoCommentRequest.videoId, uid })
				return { success: false, message: 'Emit comment failed: save failed' }
			}

			const getUserInfoByUidRequest: GetUserInfoByUidRequestDto = { uid: videoComment.uid }
			try {
				const videoCommentSenderUserInfo = await getUserInfoByUidService(getUserInfoByUidRequest)
				const videoCommentSenderUserInfoResult = videoCommentSenderUserInfo.result
				if (!videoCommentSenderUserInfo.success || !videoCommentSenderUserInfoResult) {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.warn('WARN', 'WARNING', 'Emit comment success, but echo data is empty', { videoId: emitVideoCommentRequest.videoId, uid })
					return { success: false, message: 'Emit comment success, please refresh the page' }
				}

				const videoCommentResult: VideoCommentResult = {
					_id: insertData2MongoDBResult.result?.[0]?._id?.toString(),
					...videoComment,
					userInfo: {
						userNickname: videoCommentSenderUserInfoResult.userNickname,
						username: videoCommentSenderUserInfoResult.username,
						avatar: videoCommentSenderUserInfoResult.avatar,
						userBannerImage: videoCommentSenderUserInfoResult.userBannerImage,
						signature: videoCommentSenderUserInfoResult.signature,
						gender: videoCommentSenderUserInfoResult.gender,
					},
					isUpvote: false,
					isDownvote: false,
				}
				await session.commitTransaction()
				session.endSession()
				return { success: true, message: 'Emit comment success', videoComment: videoCommentResult }
			} catch (error) {
				if (session.inTransaction()) {
					await session.abortTransaction()
				}
				session.endSession()
				console.warn('WARN', 'WARNING', 'Emit comment success, but failed to get echo data', error, { videoId: emitVideoCommentRequest.videoId, uid })
				return { success: false, message: 'Emit comment success, please refresh the page' }
			}
		} catch (error) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('ERROR', 'Emit comment failed: cannot save to MongoDB', error, { videoId: emitVideoCommentRequest.videoId, uid })
			return { success: false, message: 'Emit comment failed: save failed' }
		}
	} catch (error) {
		console.error('ERROR', 'Emit comment failed: unknown error', error, { videoId: emitVideoCommentRequest.videoId, uuid })
		return { success: false, message: 'Emit comment failed: unknown error' }
	}
}

/**
 * Get comment list by KVID and current user's upvote/downvote status
 * @param getVideoCommentByKvidRequest Query params
 * @returns Comment list
 */
export const getVideoCommentListByKvidService = async (getVideoCommentByKvidRequest: GetVideoCommentByKvidRequestDto, uuid: string, token: string): Promise<GetVideoCommentByKvidResponseDto> => {
	// WARN // TODO add more rate-limiting/validation
	try {
		if (!checkGetVideoCommentByKvidRequest(getVideoCommentByKvidRequest)) {
			console.error('ERROR', 'Get comment list failed: validation failed', { getVideoCommentByKvidRequest })
			return { success: false, message: 'Get comment list failed: validation failed', videoCommentCount: 0, videoCommentList: [] }
		}

		if (uuid !== undefined && uuid !== null && token) { // If user verified, include their upvote/downvote flags
			if (!(await checkUserTokenByUuidService(uuid, token)).success) {
				console.error('ERROR', 'Get comment list failed: user verification failed', { getVideoCommentByKvidRequest })
				return { success: false, message: 'Get comment list failed: user verification failed', videoCommentCount: 0, videoCommentList: [] }
			}
		}

		const videoId = getVideoCommentByKvidRequest.videoId
		let pageSize = undefined
		let skip = 0
		if (getVideoCommentByKvidRequest.pagination && getVideoCommentByKvidRequest.pagination.page > 0 && getVideoCommentByKvidRequest.pagination.pageSize > 0) {
			skip = (getVideoCommentByKvidRequest.pagination.page - 1) * getVideoCommentByKvidRequest.pagination.pageSize
			pageSize = getVideoCommentByKvidRequest.pagination.pageSize
		}

		const blockListFilter = await buildBlockListMongooseFilter(
			[
				{
					attr: 'UUID',
					category: 'block-uuid',
				},
				{
					attr: 'UUID',
					category: 'hide-uuid',
				},
				{
					attr: 'text',
					category: 'keyword',
				},
				{
					attr: 'text',
					category: 'regex',
				},
			],
			uuid,
			token
		)

		// Count pipeline
		const countVideoCommentPipeline: PipelineStage[] = [
			// 1. match comments
			{
				$match: {
					videoId // by videoId
				},
			},
			...blockListFilter.filter,
			// 2. count
			{
				$count: 'totalCount', // total documents
			}
		]

		// Fetch pipeline
		const getVideoCommentsPipeline: PipelineStage[] = [
			// 1. match
			{
				$match: {
					videoId // by videoId
				},
			},
			...blockListFilter.filter,
			// 2. join user info
			{
				$lookup: {
					from: 'user-infos', // user info collection
					localField: 'UUID',
					foreignField: 'UUID',
					as: 'user_info_data',
				},
			},
			{
				$unwind: {
					path: '$user_info_data',
					preserveNullAndEmptyArrays: true, // keep null/empty
				},
			},
			// 3. sort by floor asc
			{ $sort: { 'commentIndex': 1 } },
			// 4. pagination
			{ $skip: skip }, // skip
			...(pageSize ? [{ $limit: pageSize }] : []), // limit
			// 5. join current user's upvotes
			{
				$lookup: {
					from: 'video-comment-upvotes', // comment upvotes
					let: { commentId: { $toString: '$_id' } }, // current comment id
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$commentId', '$$commentId'] }, // comment id
										{ $eq: ['$UUID', uuid] }, // user uuid
										{ $eq: ['$invalidFlag', false] }, // only valid
									],
								},
							},
						},
					],
					as: 'userUpvote',
				},
			},
			// 6. join current user's downvotes
			{
				$lookup: {
					from: 'video-comment-downvotes', // comment downvotes
					let: { commentId: { $toString: '$_id' } },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$commentId', '$$commentId'] },
										{ $eq: ['$UUID', uuid] }, // user uuid
										{ $eq: ['$invalidFlag', false] }, // only valid
									],
								},
							},
						},
					],
					as: 'userDownvote',
				},
			},
			// 7. flags
			{
				$addFields: {
					isUpvote: { $gt: [{ $size: '$userUpvote' }, 0] }, // has upvoted
					isDownvote: { $gt: [{ $size: '$userDownvote' }, 0] }, // has downvoted
				},
			},
			// 8. project
			{
				$project: {
					_id: 1, // comment id
					content: 1, // content
					commentRoute: 1, // route
					videoId: 1,
					UUID: 1, // commenter uuid
					uid: 1, // commenter uid
					emitTime: 1, // time
					text: 1, // text
					upvoteCount: 1, // upvotes
					downvoteCount: 1, // downvotes
					commentIndex: 1, // floor
					subCommentsCount: 1, // sub comments count
					editDateTime: 1, // last edit
					isUpvote: 1, // upvoted
					isDownvote: 1, // downvoted
					userInfo: {
						username: '$user_info_data.username', // username
						userNickname: '$user_info_data.userNickname', // nickname
						avatar: '$user_info_data.avatar', // avatar
						signature: '$user_info_data.signature', // signature
						gender: '$user_info_data.gender' // gender
					},
					...blockListFilter.additionalFields, // extra fields from blocklist filter
				},
			},
		]

		const { collectionName, schemaInstance } = VideoCommentSchema
		const videoCommentsCountResult = await selectDataByAggregateFromMongoDB(schemaInstance, collectionName, countVideoCommentPipeline)
		const videoCommentsResult = await selectDataByAggregateFromMongoDB(schemaInstance, collectionName, getVideoCommentsPipeline)

		if (!videoCommentsResult.success || !videoCommentsCountResult.success) {
			console.error('ERROR', 'Get comment list failed: query failed', { getVideoCommentByKvidRequest })
			return { success: false, message: 'Get comment list failed: query failed', videoCommentCount: 0, videoCommentList: [] }
		}

		return {
			success: true,
			message: videoCommentsCountResult.result?.[0]?.totalCount > 0 ? 'Get comment list success' : 'Get comment list success, length is zero',
			videoCommentCount: videoCommentsCountResult.result?.[0]?.totalCount,
			videoCommentList: videoCommentsResult.result,
		}
	} catch (error) {
		console.error('ERROR', 'Get comment list failed: unknown error', error, { getVideoCommentByKvidRequest })
		return { success: false, message: 'Get comment list failed: unknown error', videoCommentCount: 0, videoCommentList: [] }
	}
}

/**
 * Get a user's upvote list on a video's comments
 * @param getVideoCommentUpvoteProps Parameters
 * @returns Upvote list
 */
const getVideoCommentUpvoteByUid = async (getVideoCommentUpvoteProps: GetVideoCommentUpvotePropsDto): Promise<GetVideoCommentUpvoteResultDto> => {
	try {
		if (checkGetVideoCommentUpvoteProps(getVideoCommentUpvoteProps)) {
			const { collectionName, schemaInstance } = VideoCommentUpvoteSchema
			type VideoCommentUpvote = InferSchemaType<typeof schemaInstance>
			const where: QueryType<VideoCommentUpvote> = {
				videoId: getVideoCommentUpvoteProps.videoId,
				uid: getVideoCommentUpvoteProps.uid,
				invalidFlag: false,
			}

			const select: SelectType<VideoCommentUpvote> = {
				videoId: 1,
				commentId: 1,
				uid: 1,
				editDateTime: 1,
			}

			try {
				const result = await selectDataFromMongoDB(where, select, schemaInstance, collectionName)
				const videoCommentUpvoteList = result.result
				if (result.success) {
					if (videoCommentUpvoteList && videoCommentUpvoteList.length > 0) {
						return { success: true, message: 'Get user upvotes success', videoCommentUpvoteResult: videoCommentUpvoteList }
					} else {
						return { success: true, message: 'User upvotes is empty', videoCommentUpvoteResult: [] }
					}
				} else {
					console.warn('WARN', 'WARNING', 'Get user upvotes failed: query failed or empty', { getVideoCommentUpvoteProps })
					return { success: false, message: 'Get user upvotes failed: query failed', videoCommentUpvoteResult: [] }
				}
			} catch (error) {
				console.warn('WARN', 'WARNING', 'Get user upvotes failed: query error', error, { getVideoCommentUpvoteProps })
				return { success: false, message: 'Get user upvotes failed: query error', videoCommentUpvoteResult: [] }
			}
		} else {
			console.warn('WARN', 'WARNING', 'Get user upvotes failed: invalid parameters', { getVideoCommentUpvoteProps })
			return { success: false, message: 'Get user upvotes failed: required parameter is empty', videoCommentUpvoteResult: [] }
		}
	} catch (error) {
		console.warn('WARN', 'WARNING', 'Get user upvotes failed: unknown error', error, { getVideoCommentUpvoteProps })
		return { success: false, message: 'Get user upvotes failed: unknown error', videoCommentUpvoteResult: [] }
	}
}

/**
 * Get a user's downvote list on a video's comments
 * @param getVideoCommentDownvoteProps Parameters
 * @returns Downvote list
 */
const getVideoCommentDownvoteByUid = async (getVideoCommentDownvoteProps: GetVideoCommentDownvotePropsDto): Promise<GetVideoCommentDownvoteResultDto> => {
	try {
		if (checkGetVideoCommentDownvoteProps(getVideoCommentDownvoteProps)) {
			const { collectionName, schemaInstance } = VideoCommentDownvoteSchema
			type VideoCommentDownvote = InferSchemaType<typeof schemaInstance>
			const where: QueryType<VideoCommentDownvote> = {
				videoId: getVideoCommentDownvoteProps.videoId,
				uid: getVideoCommentDownvoteProps.uid,
				invalidFlag: false,
			}

			const select: SelectType<VideoCommentDownvote> = {
				videoId: 1,
				commentId: 1,
				uid: 1,
				editDateTime: 1,
			}

			try {
				const result = await selectDataFromMongoDB(where, select, schemaInstance, collectionName)
				const videoCommentDownvoteList = result.result
				if (result.success) {
					if (videoCommentDownvoteList && videoCommentDownvoteList.length > 0) {
						return { success: true, message: 'Get user downvotes success', videoCommentDownvoteResult: videoCommentDownvoteList }
					} else {
						return { success: true, message: 'User downvotes is empty', videoCommentDownvoteResult: [] }
					}
				} else {
					console.warn('WARN', 'WARNING', 'Get user downvotes failed: query failed or empty', { getVideoCommentDownvoteProps })
					return { success: false, message: 'Get user downvotes failed: query failed', videoCommentDownvoteResult: [] }
				}
			} catch (error) {
				console.warn('WARN', 'WARNING', 'Get user downvotes failed: query error', error, { getVideoCommentDownvoteProps })
				return { success: false, message: 'Get user downvotes failed: query error', videoCommentDownvoteResult: [] }
			}
		} else {
			console.warn('WARN', 'WARNING', 'Get user downvotes failed: invalid parameters', { getVideoCommentDownvoteProps })
			return { success: false, message: 'Get user downvotes failed: required parameter is empty', videoCommentDownvoteResult: [] }
		}
	} catch (error) {
		console.warn('WARN', 'WARNING', 'Get user downvotes failed: unknown error', error, { getVideoCommentDownvoteProps })
		return { success: false, message: 'Get user downvotes failed: unknown error', videoCommentDownvoteResult: [] }
	}
}

/**
 * Upvote a video comment
 * @param emitVideoCommentUpvoteRequest Request payload
 * @param uid User UID
 * @param token User token
 * @returns Upvote result
 */
export const emitVideoCommentUpvoteService = async (emitVideoCommentUpvoteRequest: EmitVideoCommentUpvoteRequestDto, uid: number, token: string): Promise<EmitVideoCommentUpvoteResponseDto> => {
	// WARN // TODO add more safety (anti-spam)
	try {
		if (checkEmitVideoCommentUpvoteRequestData(emitVideoCommentUpvoteRequest)) {
			if ((await checkUserTokenService(uid, token)).success) { // verify before upvote
				const UUID = await getUserUuid(uid) // DELETE ME temporary; cookie should store UUID
				if (!UUID) {
					console.error('ERROR', 'Upvote failed: UUID not found', { uid })
					return { success: false, message: 'Upvote failed: UUID not found' }
				}

				const { collectionName: videoCommentUpvoteCollectionName, schemaInstance: correctVideoCommentUpvoteSchema } = VideoCommentUpvoteSchema
				type VideoCommentUpvote = InferSchemaType<typeof correctVideoCommentUpvoteSchema>
				const videoId = emitVideoCommentUpvoteRequest.videoId
				const commentId = emitVideoCommentUpvoteRequest.id
				const nowDate = new Date().getTime()
				const videoCommentUpvote: VideoCommentUpvote = {
					videoId,
					commentId,
					UUID,
					uid,
					invalidFlag: false,
					deleteFlag: false,
					editDateTime: nowDate,
				}

				if (!(await checkUserHasUpvoted(commentId, uid))) { // only if not already upvoted
					try {
						const insertData2MongoDBResult = await insertData2MongoDB(videoCommentUpvote, correctVideoCommentUpvoteSchema, videoCommentUpvoteCollectionName)
						if (insertData2MongoDBResult && insertData2MongoDBResult.success) {
							const { collectionName: videoCommentCollectionName, schemaInstance: correctVideoCommentSchema } = VideoCommentSchema
							const upvoteBy = 'upvoteCount'
							try {
								const updateResult = await findOneAndPlusByMongodbId(commentId, upvoteBy, correctVideoCommentSchema, videoCommentCollectionName)
								if (updateResult && updateResult.success) {
									if (await checkUserHasDownvoted(commentId, uid)) { // if downvoted before, cancel it
										const cancelVideoCommentDownvoteRequest: CancelVideoCommentDownvoteRequestDto = {
											id: commentId,
											videoId,
										}
										try {
											const cancelVideoCommentDownvoteResult = await cancelVideoCommentDownvoteService(cancelVideoCommentDownvoteRequest, uid, token)
											if (cancelVideoCommentDownvoteResult.success) {
												return { success: true, message: 'Upvote success' }
											} else {
												console.error('ERROR', 'Upvote success, but failed to cancel downvote', { emitVideoCommentUpvoteRequest, uid })
												return { success: false, message: 'Upvote success, but failed to cancel downvote' }
											}
										} catch (error) {
											console.error('ERROR', 'Upvote success, but cancel downvote request failed', error, { emitVideoCommentUpvoteRequest, uid })
											return { success: false, message: 'Upvote success, but cancel downvote failed' }
										}
									} else {
										return { success: true, message: 'Upvote success' }
									}
								} else {
									console.error('ERROR', 'Upvote stored, but upvote count not increased', { emitVideoCommentUpvoteRequest, uid })
									return { success: false, message: 'Upvote stored, but upvote count not increased' }
								}
							} catch (error) {
								console.error('ERROR', 'Upvote stored, but increasing upvote count failed', error, { emitVideoCommentUpvoteRequest, uid })
								return { success: false, message: 'Upvote stored, but increasing upvote count failed' }
							}
						} else {
							console.error('ERROR', 'Upvote failed', { emitVideoCommentUpvoteRequest, uid })
							return { success: false, message: 'Upvote failed: save failed' }
						}
					} catch (error) {
						console.error('ERROR', 'Upvote failed: cannot save to MongoDB', error, { emitVideoCommentUpvoteRequest, uid })
						return { success: false, message: 'Upvote failed: save failed' }
					}
				} else {
					console.error('ERROR', 'Upvote error: already upvoted', { emitVideoCommentUpvoteRequest, uid })
					return { success: false, message: 'Upvote error: already upvoted' }
				}
			} else {
				console.error('ERROR', 'Upvote error: user verification failed', { emitVideoCommentUpvoteRequest, uid })
				return { success: false, message: 'Upvote error: user verification failed' }
			}
		} else {
			console.error('ERROR', 'Upvote error: payload validation failed', { emitVideoCommentUpvoteRequest, uid })
			return { success: false, message: 'Upvote error: invalid data' }
		}
	} catch (error) {
		console.error('ERROR', 'Upvote failed: unknown error', error, { emitVideoCommentUpvoteRequest, uid })
		return { success: false, message: 'Upvote failed: unknown error' }
	}
}

/**
 * Cancel upvote
 * @param cancelVideoCommentUpvoteRequest Request payload
 * @param uid User UID
 * @param token User token
 * @returns Result
 */
export const cancelVideoCommentUpvoteService = async (cancelVideoCommentUpvoteRequest: CancelVideoCommentUpvoteRequestDto, uid: number, token: string): Promise<CancelVideoCommentUpvoteResponseDto> => {
	try {
		if (checkCancelVideoCommentUpvoteRequest(cancelVideoCommentUpvoteRequest)) {
			if ((await checkUserTokenService(uid, token)).success) { // verify before cancel
				const { collectionName: videoCommentUpvoteCollectionName, schemaInstance: correctVideoCommentUpvoteSchema } = VideoCommentUpvoteSchema
				type VideoCommentUpvote = InferSchemaType<typeof correctVideoCommentUpvoteSchema>
				const commentId = cancelVideoCommentUpvoteRequest.id
				const cancelVideoCommentUpvoteWhere: QueryType<VideoCommentUpvote> = {
					videoId: cancelVideoCommentUpvoteRequest.videoId,
					commentId,
					uid,
				}
				const cancelVideoCommentUpvoteUpdate: QueryType<VideoCommentUpvote> = {
					invalidFlag: true,
				}
				try {
					const updateResult = await updateData4MongoDB(cancelVideoCommentUpvoteWhere, cancelVideoCommentUpvoteUpdate, correctVideoCommentUpvoteSchema, videoCommentUpvoteCollectionName)
					if (updateResult && updateResult.success && updateResult.result) {
						if (updateResult.result.matchedCount > 0 && updateResult.result.modifiedCount > 0) {
							try {
								const { collectionName: videoCommentCollectionName, schemaInstance: correctVideoCommentSchema } = VideoCommentSchema
								const upvoteBy = 'upvoteCount'
								const updateResult = await findOneAndPlusByMongodbId(commentId, upvoteBy, correctVideoCommentSchema, videoCommentCollectionName, -1)
								if (updateResult.success) {
									return { success: true, message: 'Cancel upvote success' }
								} else {
									console.warn('WARN', 'WARNING', 'Cancel upvote success, but count not updated')
									return { success: true, message: 'Cancel upvote success, but count not updated' }
								}
							} catch (error) {
								console.warn('WARN', 'WARNING', 'Cancel upvote success, but updating count failed')
								return { success: true, message: 'Cancel upvote success, but updating count failed' }
							}
						} else {
							console.error('ERROR', 'Cancel upvote error: matched/modified 0', { cancelVideoCommentUpvoteRequest, uid })
							return { success: false, message: 'Cancel upvote error: cannot update' }
						}
					}
				} catch (error) {
					console.error('ERROR', 'Cancel upvote error: update failed', error, { cancelVideoCommentUpvoteRequest, uid })
					return { success: false, message: 'Cancel upvote error: update failed' }
				}
			} else {
				console.error('ERROR', 'Cancel upvote error: user verification failed', { cancelVideoCommentUpvoteRequest, uid })
				return { success: false, message: 'Cancel upvote error: user verification failed' }
			}
		} else {
			console.error('ERROR', 'Cancel upvote error: invalid parameters', { cancelVideoCommentUpvoteRequest, uid })
			return { success: false, message: 'Cancel upvote error: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Cancel upvote error: unknown error', error, { cancelVideoCommentUpvoteRequest, uid })
		return { success: false, message: 'Cancel upvote error: unknown error' }
	}
}

/**
 * Check if user has upvoted a comment
 * @param commentId Comment ID
 * @param uid User UID
 * @returns true if upvoted, false otherwise
 */
const checkUserHasUpvoted = async (commentId: string, uid: number): Promise<boolean> => {
	try {
		if (commentId && uid !== undefined && uid !== null) {
			const { collectionName, schemaInstance } = VideoCommentUpvoteSchema
			type VideoCommentUpvote = InferSchemaType<typeof schemaInstance>
			const where: QueryType<VideoCommentUpvote> = {
				uid,
				commentId,
				invalidFlag: false,
			}

			const select: SelectType<VideoCommentUpvote> = {
				videoId: 1,
				commentId: 1,
				uid: 1,
			}

			try {
				const result = await selectDataFromMongoDB(where, select, schemaInstance, collectionName)
				if (result.success) {
					if (result.result && result.result.length > 0) {
						return true // user has upvoted
					} else {
						return false // user has not upvoted
					}
				} else {
					return false // pessimistic: query failed
				}
			} catch (error) {
				console.error('Error checking user upvote: query failed', { commentId, uid })
				return false
			}
		} else {
			console.error('Error checking user upvote: invalid params', { commentId, uid })
			return false
		}
	} catch (error) {
		console.error('Error checking user upvote:', error, { commentId, uid })
		return false
	}
}

/**
 * Downvote a video comment
 * @param emitVideoCommentDownvoteRequest Request payload
 * @param uid User UID
 * @param token User token
 * @returns Downvote result
 */
export const emitVideoCommentDownvoteService = async (emitVideoCommentDownvoteRequest: EmitVideoCommentDownvoteRequestDto, uid: number, token: string): Promise<EmitVideoCommentDownvoteResponseDto> => {
	// WARN // TODO add more safety (anti-spam)
	try {
		if (checkEmitVideoCommentDownvoteRequestData(emitVideoCommentDownvoteRequest)) {
			if ((await checkUserTokenService(uid, token)).success) { // verify before downvote
				const UUID = await getUserUuid(uid) // DELETE ME temporary; cookie should store UUID
				if (!UUID) {
					console.error('ERROR', 'Downvote failed: UUID not found', { uid })
					return { success: false, message: 'Downvote failed: UUID not found' }
				}

				const { collectionName: videoCommentDownvoteCollectionName, schemaInstance: correctVideoCommentDownvoteSchema } = VideoCommentDownvoteSchema

				type VideoCommentDownvote = InferSchemaType<typeof correctVideoCommentDownvoteSchema>
				const videoId = emitVideoCommentDownvoteRequest.videoId
				const commentId = emitVideoCommentDownvoteRequest.id
				const nowDate = new Date().getTime()
				const videoCommentDownvote: VideoCommentDownvote = {
					videoId,
					commentId,
					UUID,
					uid,
					invalidFlag: false,
					deleteFlag: false,
					editDateTime: nowDate,
				}

				if (!(await checkUserHasDownvoted(commentId, uid))) { // not already downvoted
					try {
						const insertData2MongoDBResult = await insertData2MongoDB(videoCommentDownvote, correctVideoCommentDownvoteSchema, videoCommentDownvoteCollectionName)
						if (insertData2MongoDBResult && insertData2MongoDBResult.success) {
							const { collectionName: videoCommentCollectionName, schemaInstance: correctVideoCommentSchema } = VideoCommentSchema
							const downvoteBy = 'downvoteCount'
							try {
								const updateResult = await findOneAndPlusByMongodbId(commentId, downvoteBy, correctVideoCommentSchema, videoCommentCollectionName)
								if (updateResult && updateResult.success) {
									if (await checkUserHasUpvoted(commentId, uid)) { // cancel upvote if present
										const cancelVideoCommentUpvoteRequest: CancelVideoCommentUpvoteRequestDto = {
											id: commentId,
											videoId,
										}
										try {
											const cancelVideoCommentUpvoteResult = await cancelVideoCommentUpvoteService(cancelVideoCommentUpvoteRequest, uid, token)
											if (cancelVideoCommentUpvoteResult.success) {
												return { success: true, message: 'Downvote success' }
											} else {
												console.error('ERROR', 'Downvote success, but failed to cancel upvote', { emitVideoCommentDownvoteRequest, uid })
												return { success: false, message: 'Downvote success, but failed to cancel upvote' }
											}
										} catch (error) {
											console.error('ERROR', 'Downvote success, but cancel upvote request failed', error, { emitVideoCommentDownvoteRequest, uid })
											return { success: false, message: 'Downvote success, but cancel upvote failed' }
										}
									} else {
										return { success: true, message: 'Downvote success' }
									}
								} else {
									console.error('ERROR', 'Downvote stored, but downvote count not increased', { emitVideoCommentDownvoteRequest, uid })
									return { success: false, message: 'Downvote stored, but downvote count not increased' }
								}
							} catch (error) {
								console.error('ERROR', 'Downvote stored, but increasing downvote count failed', error, { emitVideoCommentDownvoteRequest, uid })
								return { success: false, message: 'Downvote stored, but increasing downvote count failed' }
							}
						} else {
							console.error('ERROR', 'Downvote failed', { emitVideoCommentDownvoteRequest, uid })
							return { success: false, message: 'Downvote failed: save failed' }
						}
					} catch (error) {
						console.error('ERROR', 'Downvote failed: cannot save to MongoDB', error, { emitVideoCommentDownvoteRequest, uid })
						return { success: false, message: 'Downvote failed: save failed' }
					}
				} else {
					console.error('ERROR', 'Downvote error: already downvoted', { emitVideoCommentDownvoteRequest, uid })
					return { success: false, message: 'Downvote error: already downvoted' }
				}
			} else {
				console.error('ERROR', 'Downvote error: user verification failed', { emitVideoCommentDownvoteRequest, uid })
				return { success: false, message: 'Downvote error: user verification failed' }
			}
		} else {
			console.error('ERROR', 'Downvote error: payload validation failed', { emitVideoCommentDownvoteRequest, uid })
			return { success: false, message: 'Downvote error: invalid data' }
		}
	} catch (error) {
		console.error('ERROR', 'Downvote failed: unknown error', error, { emitVideoCommentDownvoteRequest, uid })
		return { success: false, message: 'Downvote failed: unknown error' }
	}
}

/**
 * Cancel downvote
 * @param cancelVideoCommentDownvoteRequest Request payload
 * @param uid User UID
 * @param token User token
 * @returns Result
 */
export const cancelVideoCommentDownvoteService = async (cancelVideoCommentDownvoteRequest: CancelVideoCommentDownvoteRequestDto, uid: number, token: string): Promise<CancelVideoCommentDownvoteResponseDto> => {
	try {
		if (checkCancelVideoCommentDownvoteRequest(cancelVideoCommentDownvoteRequest)) {
			if ((await checkUserTokenService(uid, token)).success) { // verify
				const { collectionName: videoCommentDownvoteCollectionName, schemaInstance: correctVideoCommentDownvoteSchema } = VideoCommentDownvoteSchema
				type VideoCommentDownvote = InferSchemaType<typeof correctVideoCommentDownvoteSchema>
				const commentId = cancelVideoCommentDownvoteRequest.id
				const cancelVideoCommentDownvoteWhere: QueryType<VideoCommentDownvote> = {
					videoId: cancelVideoCommentDownvoteRequest.videoId,
					commentId,
					uid,
				}
				const cancelVideoCommentDownvoteUpdate: QueryType<VideoCommentDownvote> = {
					invalidFlag: true,
				}
				try {
					const updateResult = await updateData4MongoDB(cancelVideoCommentDownvoteWhere, cancelVideoCommentDownvoteUpdate, correctVideoCommentDownvoteSchema, videoCommentDownvoteCollectionName)
					if (updateResult && updateResult.success && updateResult.result) {
						if (updateResult.result.matchedCount > 0 && updateResult.result.modifiedCount > 0) {
							try {
								const { collectionName: videoCommentCollectionName, schemaInstance: correctVideoCommentSchema } = VideoCommentSchema
								const downvoteBy = 'downvoteCount'
								const updateResult = await findOneAndPlusByMongodbId(commentId, downvoteBy, correctVideoCommentSchema, videoCommentCollectionName, -1)
								if (updateResult.success) {
									return { success: true, message: 'Cancel downvote success' }
								} else {
									console.warn('WARN', 'WARNING', 'Cancel downvote success, but count not updated')
									return { success: true, message: 'Cancel downvote success, but count not updated' }
								}
							} catch (error) {
								console.warn('WARN', 'WARNING', 'Cancel downvote success, but updating count failed')
								return { success: true, message: 'Cancel downvote success, but updating count failed' }
							}
						} else {
							console.error('ERROR', 'Cancel downvote error: matched/modified 0', { cancelVideoCommentDownvoteRequest, uid })
							return { success: false, message: 'Cancel downvote error: cannot update' }
						}
					}
				} catch (error) {
					console.error('ERROR', 'Cancel downvote error: update failed', error, { cancelVideoCommentDownvoteRequest, uid })
					return { success: false, message: 'Cancel downvote error: update failed' }
				}
			} else {
				console.error('ERROR', 'Cancel downvote error: user verification failed', { cancelVideoCommentDownvoteRequest, uid })
				return { success: false, message: 'Cancel downvote error: user verification failed' }
			}
		} else {
			console.error('ERROR', 'Cancel downvote error: invalid parameters', { cancelVideoCommentDownvoteRequest, uid })
			return { success: false, message: 'Cancel downvote error: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Cancel downvote error: unknown error', error, { cancelVideoCommentDownvoteRequest, uid })
		return { success: false, message: 'Cancel downvote error: unknown error' }
	}
}

/**
 * Check if user has downvoted a comment
 * @param commentId Comment ID
 * @param uid User UID
 * @returns true if downvoted, false otherwise
 */
const checkUserHasDownvoted = async (commentId: string, uid: number): Promise<boolean> => {
	try {
		if (commentId && uid !== undefined && uid !== null) {
			const { collectionName, schemaInstance } = VideoCommentDownvoteSchema
			type VideoCommentDownvote = InferSchemaType<typeof schemaInstance>
			const where: QueryType<VideoCommentDownvote> = {
				uid,
				commentId,
				invalidFlag: false,
			}

			const select: SelectType<VideoCommentDownvote> = {
				videoId: 1,
				commentId: 1,
				uid: 1,
			}

			try {
				const result = await selectDataFromMongoDB(where, select, schemaInstance, collectionName)
				if (result.success) {
					if (result.result && result.result.length > 0) {
						return true // user has downvoted
					} else {
						return false // user has not downvoted
					}
				} else {
					return false // pessimistic: query failed
				}
			} catch (error) {
				console.error('Error checking user downvote: query failed', { commentId, uid })
				return false
			}
		} else {
			console.error('Error checking user downvote: invalid params', { commentId, uid })
			return false
		}
	} catch (error) {
		console.error('Error checking user downvote:', error, { commentId, uid })
		return false
	}
}

/**
 * Delete own comment
 * @param deleteSelfVideoCommentRequest Request payload
 * @param uid User UID
 * @param token User token
 * @returns Response
 */
export const deleteSelfVideoCommentService = async (deleteSelfVideoCommentRequest: DeleteSelfVideoCommentRequestDto, uid: number, token: string): Promise<DeleteSelfVideoCommentResponseDto> => {
	try {
		if (!checkDeleteSelfVideoCommentRequest(deleteSelfVideoCommentRequest)) {
			console.error('Delete comment failed: invalid parameters')
			return { success: false, message: 'Delete comment failed: invalid parameters' }
		}

		if (!(await checkUserTokenService(uid, token)).success) {
			console.error('Delete comment failed: user verification failed')
			return { success: false, message: 'Delete comment failed: user verification failed' }
		}

		const UUID = await getUserUuid(uid) // DELETE ME temporary; cookie should store UUID
		if (!UUID) {
			console.error('ERROR', 'Delete own comment failed: UUID not found', { uid })
			return { success: false, message: 'Delete own comment failed: UUID not found' }
		}

		const { commentRoute, videoId } = deleteSelfVideoCommentRequest
		const now = new Date().getTime()
		const { collectionName: videoCommentSchemaName, schemaInstance: videoCommentSchemaInstance } = VideoCommentSchema
		const { collectionName: removedVideoCommentSchemaName, schemaInstance: removedVideoCommentSchemaInstance } = RemovedVideoCommentSchema
		type VideoComment = InferSchemaType<typeof videoCommentSchemaInstance>
		type RemovedVideoComment = InferSchemaType<typeof removedVideoCommentSchemaInstance>

		const deleteSelfVideoCommentWhere: QueryType<VideoComment> | QueryType<RemovedVideoComment> = {
			commentRoute,
			videoId,
		}

		const deleteSelfVideoCommentSelect: SelectType<VideoComment> = {
			commentRoute: 1,
			videoId: 1,
			UUID: 1,
			uid: 1,
			emitTime: 1,
			text: 1,
			upvoteCount: 1,
			downvoteCount: 1,
			commentIndex: 1,
			subComments: 1,
			subCommentsCount: 1,
			editDateTime: 1,
		}

		try {
			const deleteSelfVideoCommentSelectResult = await selectDataFromMongoDB<VideoComment>(deleteSelfVideoCommentWhere, deleteSelfVideoCommentSelect, videoCommentSchemaInstance, videoCommentSchemaName)

			if (!deleteSelfVideoCommentSelectResult.success || !deleteSelfVideoCommentSelectResult.result || deleteSelfVideoCommentSelectResult.result.length !== 1) {
				console.error('Delete comment failed: query empty or too many results')
				return { success: false, message: 'Delete comment failed: query empty or too many results' }
			}

			const videoData = deleteSelfVideoCommentSelectResult.result[0]

			if (videoData.uid !== uid) {
				console.error('Delete comment failed: can only delete own comment')
				return { success: false, message: 'Delete comment failed: can only delete own comment' }
			}

			// Start transaction
			const session = await mongoose.startSession()
			session.startTransaction()

			const removedVideoCommentData: RemovedVideoComment = {
				...deleteSelfVideoCommentSelectResult.result[0],
				_operatorUUID_: UUID,
				_operatorUid_: uid,
				editDateTime: now,
			}

			try {
				const deleteSelfVideoCommentSaveResult = await insertData2MongoDB<RemovedVideoComment>(removedVideoCommentData, removedVideoCommentSchemaInstance, removedVideoCommentSchemaName, { session })

				if (!deleteSelfVideoCommentSaveResult.success) {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.error('Delete comment failed: save backup failed')
					return { success: false, message: 'Delete comment failed: save backup failed' }
				}

				const deleteSelfVideoCommentDeleteResult = await deleteDataFromMongoDB<VideoComment>(deleteSelfVideoCommentWhere, videoCommentSchemaInstance, videoCommentSchemaName, { session })

				if (!deleteSelfVideoCommentDeleteResult.success) {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.error('Delete comment failed: delete failed')
					return { success: false, message: 'Delete comment failed: delete failed' }
				}

				await session.commitTransaction()
				session.endSession()
				return { success: true, message: 'Delete comment success' }
			} catch (error) {
				if (session.inTransaction()) {
					await session.abortTransaction()
				}
				session.endSession()
				console.error('Delete comment error: save backup error', error)
				return { success: false, message: 'Delete comment error: cannot save record' }
			}
		} catch (error) {
			console.error('Delete comment error: query error', error)
			return { success: false, message: 'Delete comment error: query error' }
		}
	} catch (error) {
		console.error('Delete comment error: unknown error', error)
		return { success: false, message: 'Delete comment error: unknown error' }
	}
}

/**
 * Admin delete a video comment
 * @param adminDeleteVideoCommentRequest Request payload
 * @param adminUid Admin UID
 * @param adminToken Admin token
 * @returns Response
 */
export const adminDeleteVideoCommentService = async (adminDeleteVideoCommentRequest: AdminDeleteVideoCommentRequestDto, adminUid: number, adminToken: string): Promise<AdminDeleteVideoCommentResponseDto> => {
	try {
		if (!checkAdminDeleteVideoCommentRequest(adminDeleteVideoCommentRequest)) {
			console.error('Admin delete comment failed: invalid parameters')
			return { success: false, message: 'Admin delete comment failed: invalid parameters' }
		}

		if (!(await checkUserTokenService(adminUid, adminToken)).success) {
			console.error('Admin delete comment failed: user verification failed')
			return { success: false, message: 'Admin delete comment failed: user verification failed' }
		}

		const adminUUID = await getUserUuid(adminUid) // DELETE ME temporary; cookie should store UUID
		if (!adminUUID) {
			console.error('ERROR', 'Admin delete comment failed: adminUUID not found', { adminUid })
			return { success: false, message: 'Admin delete comment failed: adminUUID not found' }
		}

		const { commentRoute, videoId } = adminDeleteVideoCommentRequest
		const now = new Date().getTime()
		const { collectionName: videoCommentSchemaName, schemaInstance: videoCommentSchemaInstance } = VideoCommentSchema
		const { collectionName: removedVideoCommentSchemaName, schemaInstance: removedVideoCommentSchemaInstance } = RemovedVideoCommentSchema
		type VideoComment = InferSchemaType<typeof videoCommentSchemaInstance>
		type RemovedVideoComment = InferSchemaType<typeof removedVideoCommentSchemaInstance>

		const deleteSelfVideoCommentWhere: QueryType<VideoComment> | QueryType<RemovedVideoComment> = {
			commentRoute,
			videoId,
		}

		const deleteSelfVideoCommentSelect: SelectType<VideoComment> = {
			commentRoute: 1,
			videoId: 1,
			UUID: 1,
			uid: 1,
			emitTime: 1,
			text: 1,
			upvoteCount: 1,
			downvoteCount: 1,
			commentIndex: 1,
			subComments: 1,
			subCommentsCount: 1,
			editDateTime: 1,
		}

		try {
			const deleteSelfVideoCommentSelectResult = await selectDataFromMongoDB<VideoComment>(deleteSelfVideoCommentWhere, deleteSelfVideoCommentSelect, videoCommentSchemaInstance, videoCommentSchemaName)

			if (!deleteSelfVideoCommentSelectResult.success || !deleteSelfVideoCommentSelectResult.result || deleteSelfVideoCommentSelectResult.result.length !== 1) {
				console.error('Admin delete comment failed: query empty or too many results')
				return { success: false, message: 'Admin delete comment failed: query empty or too many results' }
			}

			// Start transaction
			const session = await mongoose.startSession()
			session.startTransaction()

			const adminRemovedVideoCommentData: RemovedVideoComment = {
				...deleteSelfVideoCommentSelectResult.result[0],
				_operatorUUID_: adminUUID,
				_operatorUid_: adminUid,
				editDateTime: now,
			}

			try {
				const adminDeleteVideoCommentSaveResult = await insertData2MongoDB<VideoComment>(adminRemovedVideoCommentData, removedVideoCommentSchemaInstance, removedVideoCommentSchemaName, { session })

				if (!adminDeleteVideoCommentSaveResult.success) {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.error('Admin delete comment failed: save backup failed')
					return { success: false, message: 'Admin delete comment failed: save backup failed' }
				}

				const deleteSelfVideoCommentDeleteResult = await deleteDataFromMongoDB<VideoComment>(deleteSelfVideoCommentWhere, videoCommentSchemaInstance, videoCommentSchemaName, { session })

				if (!deleteSelfVideoCommentDeleteResult.success) {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.error('Admin delete comment failed: delete failed')
					return { success: false, message: 'Admin delete comment failed: delete failed' }
				}

				await session.commitTransaction()
				session.endSession()
				return { success: true, message: 'Admin delete comment success' }
			} catch (error) {
				if (session.inTransaction()) {
					await session.abortTransaction()
				}
				session.endSession()
				console.error('Admin delete comment error: save backup error', error)
				return { success: false, message: 'Admin delete comment error: cannot save record' }
			}
		} catch (error) {
			console.error('Admin delete comment error: query error', error)
			return { success: false, message: 'Admin delete comment error: query error' }
		}
	} catch (error) {
		console.error('Admin delete comment error: unknown error', error)
		return { success: false, message: 'Admin delete comment error: unknown error' }
	}
}

/**
 * Validate emit comment payload
 * @param emitVideoCommentRequest Comment payload
 * @returns true if valid
 */
const checkEmitVideoCommentRequest = (emitVideoCommentRequest: EmitVideoCommentRequestDto): boolean => {
	return (
		emitVideoCommentRequest.text && emitVideoCommentRequest.text.length < 20000 // text not empty and < 20000 chars
		&& emitVideoCommentRequest.videoId !== undefined && emitVideoCommentRequest.videoId !== null // must have videoId
	)
}

/**
 * Validate get user upvotes params
 * @param getVideoCommentUpvoteProps Parameters
 * @returns true if valid
 */
const checkGetVideoCommentUpvoteProps = (getVideoCommentUpvoteProps: GetVideoCommentUpvotePropsDto): boolean => {
	return (
		getVideoCommentUpvoteProps.videoId !== undefined && getVideoCommentUpvoteProps.videoId !== null
		&& getVideoCommentUpvoteProps.uid !== undefined && getVideoCommentUpvoteProps.uid !== null
	)
}

/**
 * Validate get user downvotes params
 * @param getVideoCommentDownvoteProps Parameters
 * @returns true if valid
 */
const checkGetVideoCommentDownvoteProps = (getVideoCommentDownvoteProps: GetVideoCommentDownvotePropsDto): boolean => {
	return (
		getVideoCommentDownvoteProps.videoId !== undefined && getVideoCommentDownvoteProps.videoId !== null
		&& getVideoCommentDownvoteProps.uid !== undefined && getVideoCommentDownvoteProps.uid !== null
	)
}

/**
 * Validate get comment list by KVID request
 * @param getVideoCommentByKvidRequest Parameters
 * @returns true if valid
 */
const checkGetVideoCommentByKvidRequest = (getVideoCommentByKvidRequest: GetVideoCommentByKvidRequestDto): boolean => {
	return (getVideoCommentByKvidRequest.videoId !== undefined && getVideoCommentByKvidRequest.videoId !== null)
}

/**
 * Validate upvote request
 * @param emitVideoCommentUpvoteRequest Parameters
 * @returns true if valid
 */
const checkEmitVideoCommentUpvoteRequestData = (emitVideoCommentUpvoteRequest: EmitVideoCommentUpvoteRequestDto): boolean => {
	return (
		emitVideoCommentUpvoteRequest.videoId !== undefined && emitVideoCommentUpvoteRequest.videoId !== null
		&& !!emitVideoCommentUpvoteRequest.id
	)
}

/**
 * Validate cancel upvote request
 * @param cancelVideoCommentUpvoteRequest Parameters
 * @returns true if valid
 */
const checkCancelVideoCommentUpvoteRequest = (cancelVideoCommentUpvoteRequest: CancelVideoCommentUpvoteRequestDto): boolean => {
	return (
		cancelVideoCommentUpvoteRequest.videoId !== undefined && cancelVideoCommentUpvoteRequest.videoId !== null
		&& !!cancelVideoCommentUpvoteRequest.id
	)
}

/**
 * Validate downvote request
 * @param emitVideoCommentDownvoteRequest Parameters
 * @returns true if valid
 */
const checkEmitVideoCommentDownvoteRequestData = (emitVideoCommentDownvoteRequest: EmitVideoCommentDownvoteRequestDto): boolean => {
	return (
		emitVideoCommentDownvoteRequest.videoId !== undefined && emitVideoCommentDownvoteRequest.videoId !== null
		&& !!emitVideoCommentDownvoteRequest.id
	)
}

/**
 * Validate cancel downvote request
 * @param cancelVideoCommentDownvoteRequest Parameters
 * @returns true if valid
 */
const checkCancelVideoCommentDownvoteRequest = (cancelVideoCommentDownvoteRequest: CancelVideoCommentDownvoteRequestDto): boolean => {
	return (
		cancelVideoCommentDownvoteRequest.videoId !== undefined && cancelVideoCommentDownvoteRequest.videoId !== null
		&& !!cancelVideoCommentDownvoteRequest.id
	)
}

/**
 * Validate delete comment request (self)
 * @param deleteSelfVideoCommentRequest Parameters
 * @returns true if valid
 */
const checkDeleteSelfVideoCommentRequest = (deleteSelfVideoCommentRequest: DeleteSelfVideoCommentRequestDto): boolean => {
	return (
		deleteSelfVideoCommentRequest.videoId !== undefined && deleteSelfVideoCommentRequest.videoId !== null
		&& !!deleteSelfVideoCommentRequest.commentRoute
	)
}

/**
 * Validate admin delete comment request
 * @param adminDeleteVideoCommentRequest Parameters
 * @returns true if valid
 */
const checkAdminDeleteVideoCommentRequest = (adminDeleteVideoCommentRequest: AdminDeleteVideoCommentRequestDto): boolean => {
	return (
		adminDeleteVideoCommentRequest.videoId !== undefined && adminDeleteVideoCommentRequest.videoId !== null
		&& !!adminDeleteVideoCommentRequest.commentRoute
	)
}
