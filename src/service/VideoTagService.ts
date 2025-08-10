import { CreateVideoTagRequestDto, CreateVideoTagResponseDto, GetVideoTagByTagIdRequestDto, GetVideoTagByTagIdResponseDto, SearchVideoTagRequestDto, SearchVideoTagResponseDto } from '../controller/VideoTagControllerDto.js'
import { checkUserTokenService } from './UserService.js'
import { getNextSequenceValueService } from './SequenceValueService.js'
import { VideoTagSchema } from '../dbPool/schema/VideoTagSchema.js'
import { InferSchemaType } from 'mongoose'
import { insertData2MongoDB, selectDataFromMongoDB } from '../dbPool/DbClusterPool.js'
import { QueryType, SelectType } from '../dbPool/DbClusterPoolTypes.js'

/**
 * Create video TAG
 * @param createVideoTagRequest Request payload (TAG data)
 * @param uid User ID
 * @param token User token
 * @returns Create TAG response
 */
export const createVideoTagService = async (createVideoTagRequest: CreateVideoTagRequestDto, uid: number, token: string): Promise<CreateVideoTagResponseDto> => {
	try {
		if (checkCreateVideoTagRequest(createVideoTagRequest)) {
			if ((await checkUserTokenService(uid, token)).success) {
				try {
					const { collectionName, schemaInstance } = VideoTagSchema
					type videoTagListType = InferSchemaType<typeof schemaInstance>

					const videoTagIdNextSequenceValueResult = await getNextSequenceValueService('video-tag', 1)
					const tagId = videoTagIdNextSequenceValueResult.sequenceValue
					const nowDate = new Date().getTime()
					const tagNameList = createVideoTagRequest.tagNameList

					if (tagId !== undefined && tagId !== null) {
						// Prepare data for MongoDB
						const videoTagListData: videoTagListType = {
							tagId,
							tagNameList: tagNameList as videoTagListType['tagNameList'], // TODO: Mongoose issue: #12420
							editDateTime: nowDate,
						}
						const insert2MongoDBResult = await insertData2MongoDB(videoTagListData, schemaInstance, collectionName)
						if (insert2MongoDBResult?.success) {
							return { success: true, message: 'Create video TAG success', result: { tagId, tagNameList } }
						} else {
							console.error('ERROR', 'Create video TAG failed: insert to MongoDB failed')
							return { success: false, message: 'Create video TAG failed: insert failed' }
						}
					} else {
						console.error('ERROR', 'Create video TAG failed: generated TAG id is null')
						return { success: false, message: 'Create video TAG failed: generated TAG id is null' }
					}
				} catch (error) {
					console.error('ERROR', 'Create video TAG failed: error when getting next sequence value')
					return { success: false, message: 'Create video TAG failed: error when getting TAG id' }
				}
			} else {
				console.error('ERROR', 'Create video TAG failed: invalid user')
				return { success: false, message: 'Create video TAG failed: user not logged in or not verified' }
			}
		} else {
			console.error('ERROR', 'Create video TAG failed: invalid parameters')
			return { success: false, message: 'Create video TAG failed: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Create video TAG failed: unknown error', error)
		return { success: false, message: 'Create video TAG failed: unknown error' }
	}
}

/**
 * Fuzzy search video TAGs in database
 * @param searchVideoTagRequest Request payload
 * @returns Matched TAG list
 */
export const searchVideoTagService = async (searchVideoTagRequest: SearchVideoTagRequestDto): Promise<SearchVideoTagResponseDto> => {
	try {
		if (checkSearchVideoTagRequest(searchVideoTagRequest)) {
			const { collectionName, schemaInstance } = VideoTagSchema
			type VideoTag = InferSchemaType<typeof schemaInstance>

			const regex = new RegExp(searchVideoTagRequest.tagNameSearchKey, 'i') // case-insensitive
			const where: QueryType<VideoTag> = {
				'tagNameList.tagName.name': { $regex: regex },
			}
			const select: SelectType<VideoTag> = {
				tagId: 1,
				tagNameList: 1,
			}

			try {
				const searchVideoTagResult = await selectDataFromMongoDB<VideoTag>(where, select, schemaInstance, collectionName)
				const result = searchVideoTagResult?.result as unknown as SearchVideoTagResponseDto['result']
				if (searchVideoTagResult.success) {
					if (result?.length > 0) {
						return { success: true, message: 'Search video TAG success', result }
					} else {
						return { success: true, message: 'Search video TAG result is empty', result: [] }
					}
				} else {
					console.error('ERROR', 'Search video TAG failed: MongoDB query failed')
					return { success: false, message: 'Search video TAG failed: query failed' }
				}
			} catch (error) {
				console.error('ERROR', 'Search video TAG failed: MongoDB query error', error)
				return { success: false, message: 'Search video TAG failed: query error' }
			}
		} else {
			console.error('ERROR', 'Search video TAG failed: invalid parameters')
			return { success: false, message: 'Search video TAG failed: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Search video TAG failed: unknown error', error)
		return { success: false, message: 'Search video TAG failed: unknown error' }
	}
}

/**
 * Get video TAGs by TAG IDs
 * @param getVideoTagByTagIdRequest Request payload
 * @returns Response
 */
export const getVideoTagByTagIdService = async (getVideoTagByTagIdRequest: GetVideoTagByTagIdRequestDto): Promise<GetVideoTagByTagIdResponseDto> => {
	try {
		if (checkGetVideoTagByTagIdRequest(getVideoTagByTagIdRequest)) {
			const { collectionName, schemaInstance } = VideoTagSchema
			type VideoTag = InferSchemaType<typeof schemaInstance>

			const where: QueryType<VideoTag> = {
				tagId: { $in: getVideoTagByTagIdRequest.tagId },
			}
			const select: SelectType<VideoTag> = {
				tagId: 1,
				tagNameList: 1,
			}

			try {
				const searchVideoTagResult = await selectDataFromMongoDB<VideoTag>(where, select, schemaInstance, collectionName)
				const result = searchVideoTagResult?.result as unknown as SearchVideoTagResponseDto['result']
				if (searchVideoTagResult.success) {
					if (result?.length > 0) {
						return { success: true, message: 'Get video TAG success', result }
					} else {
						return { success: true, message: 'Get video TAG result is empty', result: [] }
					}
				} else {
					console.error('ERROR', 'Get video TAG failed: MongoDB query failed')
					return { success: false, message: 'Get video TAG failed: query failed' }
				}
			} catch (error) {
				console.error('ERROR', 'Get video TAG failed: MongoDB query error', error)
				return { success: false, message: 'Get video TAG failed: query error' }
			}
		} else {
			console.error('ERROR', 'Get video TAG failed: invalid parameters')
			return { success: false, message: 'Get video TAG failed: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Get video TAG failed: unknown error', error)
		return { success: false, message: 'Get video TAG failed: unknown error' }
	}
}

/**
 * Validate create video TAG request
 * @param createVideoTagRequest Request
 * @returns true if valid
 */
const checkCreateVideoTagRequest = (createVideoTagRequest: CreateVideoTagRequestDto): boolean => {
	const isAllTagItemNotNull = createVideoTagRequest?.tagNameList?.every(tag => tag && tag.lang && tag.tagName?.length > 0 && tag.tagName.every(tagName => !!tagName.name))
	return (
		createVideoTagRequest && createVideoTagRequest?.tagNameList?.length > 0
		&& isAllTagItemNotNull
	)
}

/**
 * Validate search TAG request
 * @param searchVideoTagRequest Request
 * @returns true if valid
 */
const checkSearchVideoTagRequest = (searchVideoTagRequest: SearchVideoTagRequestDto): boolean => {
	return !!searchVideoTagRequest.tagNameSearchKey
}

/**
 * Validate get by TAG IDs request
 * @param getVideoTagByTagIdRequest Request
 * @returns true if valid
 */
const checkGetVideoTagByTagIdRequest = (getVideoTagByTagIdRequest: GetVideoTagByTagIdRequestDto): boolean => {
	return !!getVideoTagByTagIdRequest && getVideoTagByTagIdRequest.tagId && getVideoTagByTagIdRequest.tagId.length > 0
}
