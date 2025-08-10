import { InferSchemaType, PipelineStage } from 'mongoose'
import { CreateOrUpdateBrowsingHistoryRequestDto, CreateOrUpdateBrowsingHistoryResponseDto, GetUserBrowsingHistoryWithFilterRequestDto, GetUserBrowsingHistoryWithFilterResponseDto } from '../controller/BrowsingHistoryControllerDto.js'
import { selectDataByAggregateFromMongoDB, findOneAndUpdateData4MongoDB } from '../dbPool/DbClusterPool.js'
import { QueryType } from '../dbPool/DbClusterPoolTypes.js'
import { BrowsingHistorySchema } from '../dbPool/schema/BrowsingHistorySchema.js'
import { checkUserTokenByUuidService, checkUserTokenService, getUserUid } from './UserService.js'

/**
 * Create or update user browsing history
 * @param createBrowsingHistoryRequest Request payload
 * @param uid User ID
 * @param token User token
 * @returns Response
 */
export const createOrUpdateBrowsingHistoryService = async (createOrUpdateBrowsingHistoryRequest: CreateOrUpdateBrowsingHistoryRequestDto, cookieUuid: string, token: string): Promise<CreateOrUpdateBrowsingHistoryResponseDto> => {
	try {
		const { uuid, category, id, anchor } = createOrUpdateBrowsingHistoryRequest
		const nowDate = new Date().getTime()

		if (!checkCreateOrUpdateBrowsingHistoryRequest(createOrUpdateBrowsingHistoryRequest)) {
			console.error('ERROR', 'Create/update browsing history failed: invalid parameters')
			return { success: false, message: 'Create/update browsing history failed: invalid parameters' }
		}

		if (uuid !== cookieUuid) {
			console.error('ERROR', 'Create/update browsing history failed: target user and current user mismatch; not allowed to update others\' history')
			return { success: false, message: 'Create/update browsing history failed: target user and current user mismatch' }
		}

		if (!(await checkUserTokenByUuidService(cookieUuid, token)).success) {
			console.error('ERROR', 'Create/update browsing history failed: token verification failed')
			return { success: false, message: 'Create/update browsing history failed: token verification failed' }
		}

		const uid = await getUserUid(uuid) 
		if (uid === undefined || typeof uid !== 'number' || uid <= 0) {
			console.error('ERROR', 'Create/update browsing history failed: UID not found', { uuid })
			return { success: false, message: 'Create/update browsing history failed: UID not found' }
		}

		const { collectionName, schemaInstance } = BrowsingHistorySchema
		type BrowsingHistoryType = InferSchemaType<typeof schemaInstance>

		// Find existing doc
		const BrowsingHistoryWhere: QueryType<BrowsingHistoryType> = {
			UUID: uuid,
			uid,
			category,
			id,
		}

		// Upsert data
		const BrowsingHistoryData: BrowsingHistoryType = {
			UUID: uuid,
			uid,
			category,
			id,
			anchor,
			lastUpdateDateTime: nowDate,
			editDateTime: nowDate,
		}

		try {
			const insert2MongoDResult = await findOneAndUpdateData4MongoDB(BrowsingHistoryWhere, BrowsingHistoryData, schemaInstance, collectionName)
			const result = insert2MongoDResult.result
			if (insert2MongoDResult.success && result) {
				return { success: true, message: 'Create/update browsing history success', result: result as CreateOrUpdateBrowsingHistoryResponseDto['result'] }
			}
		} catch (error) {
			console.error('ERROR', 'Create/update browsing history failed: upsert error')
			return { success: false, message: 'Create/update browsing history failed: upsert error' }
		}
	} catch (error) {
		console.error('ERROR', 'Create/update browsing history failed: unknown error', error)
		return { success: false, message: 'Create/update browsing history failed: unknown error' }
	}
}

/**
 * Get all or filtered browsing history, sorted by last access time desc
 * @param getUserBrowsingHistoryWithFilterRequest Request payload
 * @param uid User ID
 * @param token User token
 * @returns Response
 */
export const getUserBrowsingHistoryWithFilterService = async (getUserBrowsingHistoryWithFilterRequest: GetUserBrowsingHistoryWithFilterRequestDto, uid: number, token: string): Promise<GetUserBrowsingHistoryWithFilterResponseDto> => {
	try {
		if (checkGetUserBrowsingHistoryWithFilterRequest(getUserBrowsingHistoryWithFilterRequest)) {
			if ((await checkUserTokenService(uid, token)).success) {
				const { collectionName, schemaInstance } = BrowsingHistorySchema

				// TODO: The following aggregate only supports video history search
				const videoHistoryAggregateProps: PipelineStage[] = [
					{
						$match: {
							category: 'video',
							uid,
						},
					},
					{
						$addFields: {
							id_number: { $toInt: '$id' }, // convert video_id to number
						},
					},
					{
						$lookup: {
							from: 'videos',
							localField: 'id_number',
							foreignField: 'videoId',
							as: 'video_info',
						},
					},
					{
						$unwind: '$video_info',
					},
					{
						$match: {
							'video_info.title': { $regex: getUserBrowsingHistoryWithFilterRequest.videoTitle ?? '', $options: 'i' }, // fuzzy search, case-insensitive
						},
					},
					{
						$lookup: {
							from: 'user-infos',
							localField: 'video_info.uploaderId', // assume author id exists on videos collection
							foreignField: 'uid',
							as: 'uploader_info',
						},
					},
					{
						$unwind: '$uploader_info',
					},
					{
						$sort: {
							lastUpdateDateTime: -1, // sort by lastUpdateDateTime desc
						},
					},
					{
						$project: {
							uid: 1,
							category: 1,
							id: '$id_number',
							anchor: 1,
							videoId: '$video_info.videoId',
							title: '$video_info.title',
							image: '$video_info.image',
							uploadDate: '$video_info.uploadDate',
							watchedCount: '$video_info.watchedCount',
							uploader: '$uploader_info.username',
							uploaderId: '$uploader_info.uid',
							duration: '$video_info.duration',
							description: '$video_info.description',
							lastUpdateDateTime: '$lastUpdateDateTime',
						},
					},
				]

				try {
					const result = await selectDataByAggregateFromMongoDB(schemaInstance, collectionName, videoHistoryAggregateProps)
					const browsingHistory = result.result
					if (result.success && browsingHistory) {
						if (browsingHistory.length > 0) {
							return { success: true, message: 'Get user browsing history success', result: browsingHistory }
						} else {
							return { success: true, message: 'Browsing history is empty', result: [] }
						}
					} else {
						console.error('ERROR', 'Get user browsing history failed: no data')
						return { success: false, message: 'Get user browsing history failed: no data' }
					}
				} catch (error) {
					console.error('ERROR', 'Get user browsing history failed: query failed')
					return { success: false, message: 'Get user browsing history failed: query failed' }
				}
			} else {
				console.error('ERROR', 'Get user browsing history failed: token verification failed')
				return { success: false, message: 'Get user browsing history failed: token verification failed' }
			}
		} else {
			console.error('ERROR', 'Get user browsing history failed: invalid parameters')
			return { success: false, message: 'Get user browsing history failed: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Get user browsing history failed: unknown error', error)
		return { success: false, message: 'Get user browsing history failed: unknown error' }
	}
}

/**
 * Validate create browsing history request
 * @param createBrowsingHistoryRequest Request payload
 * @returns true if valid
 */
const checkCreateOrUpdateBrowsingHistoryRequest = (createOrUpdateBrowsingHistoryRequest: CreateOrUpdateBrowsingHistoryRequestDto): boolean => {
	return (
		!! createOrUpdateBrowsingHistoryRequest.uuid
		&& (createOrUpdateBrowsingHistoryRequest.category === 'video' || createOrUpdateBrowsingHistoryRequest.category === 'photo' || createOrUpdateBrowsingHistoryRequest.category === 'comment')
		&& !!createOrUpdateBrowsingHistoryRequest.id
	)
}

/**
 * Validate get browsing history request
 * @param getUserBrowsingHistoryWithFilterRequest Request payload
 * @returns true if valid
 */
const checkGetUserBrowsingHistoryWithFilterRequest = (getUserBrowsingHistoryWithFilterRequest: GetUserBrowsingHistoryWithFilterRequestDto): boolean => {
	if (getUserBrowsingHistoryWithFilterRequest.videoTitle && getUserBrowsingHistoryWithFilterRequest.videoTitle.length > 200) { // video title too long
		return false
	} else {
		return true
	}
}
