import { CreateNovelGenreRequestDto, CreateNovelGenreResponseDto, GetNovelGenreByIdRequestDto, GetNovelGenreByIdResponseDto, SearchNovelGenreRequestDto, SearchNovelGenreResponseDto } from '../controller/NovelGenreControllerDto.js'
import { checkUserTokenService } from './UserService.js'
import { getNextSequenceValueService } from './SequenceValueService.js'
import { NovelGenreSchema } from '../dbPool/schema/NovelGenreSchema.js'
import { InferSchemaType } from 'mongoose'
import { insertData2MongoDB, selectDataFromMongoDB } from '../dbPool/DbClusterPool.js'
import { QueryType, SelectType } from '../dbPool/DbClusterPoolTypes.js'

/**
 * Create novel genre
 */
export const createNovelGenreService = async (createNovelGenreRequest: CreateNovelGenreRequestDto, uid: number, token: string): Promise<CreateNovelGenreResponseDto> => {
	try {
		if (checkCreateNovelGenreRequest(createNovelGenreRequest)) {
			if ((await checkUserTokenService(uid, token)).success) {
				const { collectionName, schemaInstance } = NovelGenreSchema
				type NovelGenreDoc = InferSchemaType<typeof schemaInstance>

				const genreSeq = await getNextSequenceValueService('novel-genre', 1)
				const genreId = genreSeq.sequenceValue
				const now = Date.now()
				const genreNameList = createNovelGenreRequest.genreNameList

				if (genreId !== undefined && genreId !== null) {
					const genreData: NovelGenreDoc = { genreId, genreNameList: genreNameList as NovelGenreDoc['genreNameList'], editDateTime: now }
					const insertRes = await insertData2MongoDB(genreData, schemaInstance, collectionName)
					if (insertRes?.success)
						return { success: true, message: 'Create novel genre success', result: { genreId, genreNameList } }
					return { success: false, message: 'Create novel genre failed: insert failed' }
				} else {
					return { success: false, message: 'Create novel genre failed: generated id is null' }
				}
			} else {
				return { success: false, message: 'Create novel genre failed: user not verified' }
			}
		} else {
			return { success: false, message: 'Create novel genre failed: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Create novel genre failed:', error)
		return { success: false, message: 'Create novel genre failed: unknown error' }
	}
}

/** Search novel genre by keyword */
export const searchNovelGenreService = async (searchNovelGenreRequest: SearchNovelGenreRequestDto): Promise<SearchNovelGenreResponseDto> => {
	try {
		if (checkSearchNovelGenreRequest(searchNovelGenreRequest)) {
			const { collectionName, schemaInstance } = NovelGenreSchema
			type Doc = InferSchemaType<typeof schemaInstance>
			const regex = new RegExp(searchNovelGenreRequest.genreNameSearchKey, 'i')
			const where: QueryType<Doc> = { 'genreNameList.genreName.name': { $regex: regex } }
			const select: SelectType<Doc> = { genreId: 1, genreNameList: 1 }
			const res = await selectDataFromMongoDB<Doc>(where, select, schemaInstance, collectionName)
			const result = res?.result as unknown as SearchNovelGenreResponseDto['result']
			if (res.success)
				return { success: true, message: result?.length ? 'Search novel genre success' : 'Empty', result: result ?? [] }
			return { success: false, message: 'Search novel genre failed: query failed' }
		} else {
			return { success: false, message: 'Search novel genre failed: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Search novel genre failed:', error)
		return { success: false, message: 'Search novel genre failed: unknown error' }
	}
}

/** Get novel genres by ids */
export const getNovelGenreByIdService = async (getNovelGenreByIdRequest: GetNovelGenreByIdRequestDto): Promise<GetNovelGenreByIdResponseDto> => {
	try {
		if (checkGetNovelGenreByIdRequest(getNovelGenreByIdRequest)) {
			const { collectionName, schemaInstance } = NovelGenreSchema
			type Doc = InferSchemaType<typeof schemaInstance>
			const where: QueryType<Doc> = { genreId: { $in: getNovelGenreByIdRequest.genreId } }
			const select: SelectType<Doc> = { genreId: 1, genreNameList: 1 }
			const res = await selectDataFromMongoDB<Doc>(where, select, schemaInstance, collectionName)
			const result = res?.result as unknown as SearchNovelGenreResponseDto['result']
			if (res.success)
				return { success: true, message: result?.length ? 'Get novel genre success' : 'Empty', result: result ?? [] }
			return { success: false, message: 'Get novel genre failed: query failed' }
		} else {
			return { success: false, message: 'Get novel genre failed: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Get novel genre failed:', error)
		return { success: false, message: 'Get novel genre failed: unknown error' }
	}
}

// Validation helpers
const checkCreateNovelGenreRequest = (req: CreateNovelGenreRequestDto) => {
	const allOk = req?.genreNameList?.every(g => g && g.lang && g.genreName?.length > 0 && g.genreName.every(n => !!n.name))
	return !!req && req.genreNameList?.length > 0 && allOk
}
const checkSearchNovelGenreRequest = (req: SearchNovelGenreRequestDto) => !!req.genreNameSearchKey
const checkGetNovelGenreByIdRequest = (req: GetNovelGenreByIdRequestDto) => !!req && req.genreId && req.genreId.length > 0 