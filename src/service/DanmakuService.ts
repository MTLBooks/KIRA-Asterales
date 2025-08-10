import { InferSchemaType, PipelineStage } from 'mongoose'
import { EmitDanmakuRequestDto, EmitDanmakuResponseDto, GetDanmakuByKvidDto, GetDanmakuByKvidRequestDto, GetDanmakuByKvidResponseDto } from '../controller/DanmakuControllerDto.js'
import { insertData2MongoDB, selectDataByAggregateFromMongoDB, selectDataFromMongoDB } from '../dbPool/DbClusterPool.js'
import { QueryType, SelectType } from '../dbPool/DbClusterPoolTypes.js'
import { DanmakuSchema } from '../dbPool/schema/DanmakuSchema.js'
import { checkUserTokenByUuidService, checkUserTokenService, getUserUid, getUserUuid } from './UserService.js'
import { buildBlockListMongooseFilter, checkIsBlockedByOtherUserService } from './BlockService.js'
import { checkVideoBlockedByKvidService, getVideoByKvidService } from './VideoService.js'

/**
 * Emit danmaku
 * @param emitDanmakuRequest Danmaku payload
 * @param uuid User UUID
 * @param token User token
 * @returns Emit result
 */
export const emitDanmakuService = async (emitDanmakuRequest: EmitDanmakuRequestDto, uuid: string, token: string): Promise<EmitDanmakuResponseDto> => {
	try {
		if (!checkEmitDanmakuRequest(emitDanmakuRequest)) {
			console.error('ERROR', 'Emit danmaku failed: payload validation failed:', { emitDanmakuRequest, uuid, token })
			return { success: false, message: 'Emit danmaku failed: invalid data' }
		}

		const { videoId } = emitDanmakuRequest
		const uid = await getUserUid(uuid)
		if (!uid) {
			console.error('ERROR', 'Emit danmaku failed: user id not found', { emitDanmakuRequest, uuid, token })
			return { success: false, message: 'Emit danmaku failed: user id not found' }
		}
		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Emit danmaku failed: token verification failed', { emitDanmakuRequest, uuid, token })
			return { success: false, message: 'Emit danmaku failed: token verification failed' }
		}

		// Check video block status
		const selectorUuid = uuid
		const selectorToken = token
		const checkVideoBlockedResult = await checkVideoBlockedByKvidService(videoId, selectorUuid, selectorToken)
		if (!checkVideoBlockedResult.success) {
			console.error('ERROR', 'Emit danmaku failed: check block status failed', { uid, token })
			return { success: false, message: 'Emit danmaku failed: check block status failed' }
		}

		if (checkVideoBlockedResult.isBlockedByOther) {
			console.error('ERROR', 'Emit danmaku failed: blocked by other user', { uid, token })
			return { success: false, message: 'Emit danmaku failed: blocked by other user' }
		}
		if (checkVideoBlockedResult.isBlocked) {
			console.error('ERROR', 'Emit danmaku failed: uploader is blocked', { uid, token })
			return { success: false, message: 'Emit danmaku failed: uploader is blocked' }
		}

		const { collectionName, schemaInstance } = DanmakuSchema
		type Danmaku = InferSchemaType<typeof schemaInstance>
		const nowDate = new Date().getTime()
		const danmaku: Danmaku = {
			UUID: uuid,
			uid,
			...emitDanmakuRequest,
			editDateTime: nowDate,
		}
		try {
			const insertData2MongoDBResult = await insertData2MongoDB(danmaku, schemaInstance, collectionName)
			if (insertData2MongoDBResult && insertData2MongoDBResult.success) {
				return { success: true, message: 'Emit danmaku success', danmaku: emitDanmakuRequest }
			}
		} catch (error) {
			console.error('ERROR', 'Emit danmaku failed: cannot save to MongoDB', error)
			return { success: false, message: 'Emit danmaku failed: save failed' }
		}

	} catch (error) {
		console.error('ERROR', 'Emit danmaku failed: unknown error:', error, { emitDanmakuRequest, uuid, token })
		return { success: false, message: 'Emit danmaku failed: unknown error' }
	}
}

/**
 * Get danmaku list by KVID
 * @param getDanmakuByKvidRequest Query params
 * @returns Danmaku list
 */
export const getDanmakuListByKvidService = async (getDanmakuByKvidRequest: GetDanmakuByKvidRequestDto, uuid?: string, token?: string): Promise<GetDanmakuByKvidResponseDto> => {
	try {
		if (!checkGetDanmakuByKvidRequest(getDanmakuByKvidRequest)) {
			console.error('ERROR', 'Get danmaku list failed: validation failed', getDanmakuByKvidRequest)
			return { success: false, message: 'Get danmaku list failed: validation failed' }
		}

		const { videoId } = getDanmakuByKvidRequest
		const { collectionName, schemaInstance } = DanmakuSchema
		type Danmaku = InferSchemaType<typeof schemaInstance>

		try {
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

			const getDanmakuPipeline: PipelineStage[] = [
				{
					$match: {
						videoId,
					}
				},
				...blockListFilter.filter,
				{
					$sort: {
						editDateTime: 1, // sort by editDateTime ascending
					},
				},
				{
					$project: {
						videoId: 1,
						UUID: 1,
						uid: 1,
						time: 1,
						text: 1,
						color: 1,
						fontSize: 1,
						mode: 1,
						enableRainbow: 1,
						editDateTime: 1,
						...blockListFilter.additionalFields, // extra fields from blocklist filter
					}
				}
			]

			const danmakuResult = await selectDataByAggregateFromMongoDB<Danmaku>(schemaInstance, collectionName, getDanmakuPipeline)

			if (!danmakuResult.success) {
				console.error('ERROR', 'Get danmaku list failed: query failed or empty:', getDanmakuByKvidRequest)
				return { success: false, message: 'Get danmaku list failed: query failed' }
			}

			const danmakuList = danmakuResult.result?.map(danmaku => {
				const fontSize = ['small', 'medium', 'large'].includes(danmaku.fontSize) ? danmaku.fontSize : 'medium'
				return { ...danmaku, uuid: danmaku.UUID, fontSize } as GetDanmakuByKvidDto
			})

			if (danmakuList && danmakuList.length > 0) {
				return { success: true, message: 'Get danmaku list success', danmaku: danmakuList }
			} else {
				return { success: true, message: 'Danmaku list is empty', danmaku: [] }
			}
		} catch (error) {
			console.error('ERROR', 'Get danmaku list failed: query failed:', error, getDanmakuByKvidRequest)
			return { success: false, message: 'Get danmaku list failed: query failed' }
		}
	} catch (error) {
		console.error('ERROR', 'Get danmaku list failed: unknown error:', error, getDanmakuByKvidRequest)
		return { success: false, message: 'Get danmaku list failed: unknown error' }
	}
}

/**
 * Validate danmaku payload
 * @param emitDanmakuRequest Danmaku payload
 * @returns true if valid
 */
const checkEmitDanmakuRequest = (emitDanmakuRequest: EmitDanmakuRequestDto): boolean => {
	const hexColorRegex = /^([0-9A-F]{3}([0-9A-F]{1})?|[0-9A-F]{6}([0-9A-F]{2})?)$/i
	if (!emitDanmakuRequest.color || !(hexColorRegex.test(emitDanmakuRequest.color))) {
		console.error('ERROR', 'Emit danmaku failed: invalid color', emitDanmakuRequest)
		return false
	}
	if (emitDanmakuRequest.enableRainbow === undefined || emitDanmakuRequest.enableRainbow === null) {
		console.error('ERROR', 'Emit danmaku failed: enableRainbow is empty or invalid', emitDanmakuRequest)
		return false
	}
	if (!emitDanmakuRequest.fontSize || !(['small', 'medium', 'large'].includes(emitDanmakuRequest.fontSize))) {
		console.error('ERROR', 'Emit danmaku failed: invalid fontSize', emitDanmakuRequest)
		return false
	}
	if (!emitDanmakuRequest.mode || !(['ltr', 'rtl', 'top', 'bottom'].includes(emitDanmakuRequest.mode))) {
		console.error('ERROR', 'Emit danmaku failed: invalid mode', emitDanmakuRequest)
		return false
	}
	if (!emitDanmakuRequest.text || emitDanmakuRequest.time === undefined || emitDanmakuRequest.time === null || !emitDanmakuRequest.videoId) {
		console.error('ERROR', 'Emit danmaku failed: required fields are empty or invalid', emitDanmakuRequest)
		return false
	}

	return true
}

/**
 * Validate get danmaku list request
 * @param getDanmakuByKvidRequest Query payload
 * @returns true if valid
 */
const checkGetDanmakuByKvidRequest = (getDanmakuByKvidRequest: GetDanmakuByKvidRequestDto): boolean => {
	// TODO: maybe add more validation to ensure the video exists
	return (getDanmakuByKvidRequest.videoId !== undefined && getDanmakuByKvidRequest.videoId !== null)
}
