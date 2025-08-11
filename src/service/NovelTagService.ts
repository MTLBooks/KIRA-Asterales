import { CreateNovelTagRequestDto, CreateNovelTagResponseDto, GetNovelTagByTagIdRequestDto, GetNovelTagByTagIdResponseDto, SearchNovelTagRequestDto, SearchNovelTagResponseDto } from '../controller/NovelTagControllerDto.js'
import { checkUserTokenService } from './UserService.js'
import { getNextSequenceValueService } from './SequenceValueService.js'
import { NovelTagSchema } from '../dbPool/schema/NovelTagSchema.js'
import { InferSchemaType } from 'mongoose'
import { insertData2MongoDB, selectDataFromMongoDB } from '../dbPool/DbClusterPool.js'
import { QueryType, SelectType } from '../dbPool/DbClusterPoolTypes.js'

/**
 * Create novel TAG
 */
export const createNovelTagService = async (createNovelTagRequest: CreateNovelTagRequestDto, uid: number, token: string): Promise<CreateNovelTagResponseDto> => {
	try {
		if (checkCreateNovelTagRequest(createNovelTagRequest)) {
			if ((await checkUserTokenService(uid, token)).success) {
				try {
					const { collectionName, schemaInstance } = NovelTagSchema
					type NovelTagDoc = InferSchemaType<typeof schemaInstance>

					const tagIdNextSeq = await getNextSequenceValueService('novel-tag', 1)
					const tagId = tagIdNextSeq.sequenceValue
					const nowDate = Date.now()
					const tagNameList = createNovelTagRequest.tagNameList

					if (tagId !== undefined && tagId !== null) {
						const novelTagData: NovelTagDoc = {
							tagId,
							tagNameList: tagNameList as NovelTagDoc['tagNameList'],
							editDateTime: nowDate,
						}
						const insertResult = await insertData2MongoDB(novelTagData, schemaInstance, collectionName)
						if (insertResult?.success) {
							return { success: true, message: 'Create novel TAG success', result: { tagId, tagNameList } }
						} else {
							return { success: false, message: 'Create novel TAG failed: insert failed' }
						}
					} else {
						return { success: false, message: 'Create novel TAG failed: generated TAG id is null' }
					}
				} catch (error) {
					console.error('ERROR', 'Create novel TAG failed:', error)
					return { success: false, message: 'Create novel TAG failed: exception' }
				}
			} else {
				return { success: false, message: 'Create novel TAG failed: user not verified' }
			}
		} else {
			return { success: false, message: 'Create novel TAG failed: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Create novel TAG failed: unknown error', error)
		return { success: false, message: 'Create novel TAG failed: unknown error' }
	}
}

/**
 * Fuzzy search novel TAGs
 */
export const searchNovelTagService = async (searchNovelTagRequest: SearchNovelTagRequestDto): Promise<SearchNovelTagResponseDto> => {
	try {
		if (checkSearchNovelTagRequest(searchNovelTagRequest)) {
			const { collectionName, schemaInstance } = NovelTagSchema
			type NovelTagDoc = InferSchemaType<typeof schemaInstance>

			const regex = new RegExp(searchNovelTagRequest.tagNameSearchKey, 'i')
			const where: QueryType<NovelTagDoc> = {
				'tagNameList.tagName.name': { $regex: regex },
			}
			const select: SelectType<NovelTagDoc> = { tagId: 1, tagNameList: 1 }
			const searchResult = await selectDataFromMongoDB<NovelTagDoc>(where, select, schemaInstance, collectionName)
			const result = searchResult?.result as unknown as SearchNovelTagResponseDto['result']
			if (searchResult.success) {
				return { success: true, message: result?.length ? 'Search novel TAG success' : 'Search novel TAG result is empty', result: result ?? [] }
			} else {
				return { success: false, message: 'Search novel TAG failed: query failed' }
			}
		} else {
			return { success: false, message: 'Search novel TAG failed: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Search novel TAG failed: unknown error', error)
		return { success: false, message: 'Search novel TAG failed: unknown error' }
	}
}

/**
 * Get novel TAGs by TAG IDs
 */
export const getNovelTagByTagIdService = async (getNovelTagByTagIdRequest: GetNovelTagByTagIdRequestDto): Promise<GetNovelTagByTagIdResponseDto> => {
	try {
		if (checkGetNovelTagByTagIdRequest(getNovelTagByTagIdRequest)) {
			const { collectionName, schemaInstance } = NovelTagSchema
			type NovelTagDoc = InferSchemaType<typeof schemaInstance>

			const where: QueryType<NovelTagDoc> = { tagId: { $in: getNovelTagByTagIdRequest.tagId } }
			const select: SelectType<NovelTagDoc> = { tagId: 1, tagNameList: 1 }
			const searchResult = await selectDataFromMongoDB<NovelTagDoc>(where, select, schemaInstance, collectionName)
			const result = searchResult?.result as unknown as SearchNovelTagResponseDto['result']
			if (searchResult.success) {
				return { success: true, message: result?.length ? 'Get novel TAG success' : 'Get novel TAG result is empty', result: result ?? [] }
			} else {
				return { success: false, message: 'Get novel TAG failed: query failed' }
			}
		} else {
			return { success: false, message: 'Get novel TAG failed: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Get novel TAG failed: unknown error', error)
		return { success: false, message: 'Get novel TAG failed: unknown error' }
	}
}

// ----------------- validation helpers -----------------
const checkCreateNovelTagRequest = (req: CreateNovelTagRequestDto): boolean => {
	const isAllTagItemNotNull = req?.tagNameList?.every(tag => tag && tag.lang && tag.tagName?.length > 0 && tag.tagName.every(t => !!t.name))
	return !!req && req.tagNameList?.length > 0 && isAllTagItemNotNull
}

const checkSearchNovelTagRequest = (req: SearchNovelTagRequestDto): boolean => !!req.tagNameSearchKey

const checkGetNovelTagByTagIdRequest = (req: GetNovelTagByTagIdRequestDto): boolean => !!req && !!req.tagId && req.tagId.length > 0 