import { InferSchemaType } from 'mongoose'
import { UploadChapterRequestDto, UploadChapterResponseDto, GetChapterByIdRequestDto, GetChapterByIdResponseDto, GetChaptersByNovelIdRequestDto, GetChaptersByNovelIdResponseDto, DeleteChapterRequestDto, DeleteChapterResponseDto } from '../controller/ChapterControllerDto.js'
import { ChapterSchema, RemovedChapterSchema } from '../dbPool/schema/ChapterSchema.js'
import { insertData2MongoDB, selectDataFromMongoDB, deleteDataFromMongoDB, DbPoolOptions } from '../dbPool/DbClusterPool.js'
import { QueryType, SelectType } from '../dbPool/DbClusterPoolTypes.js'
import { getNextSequenceValueService } from './SequenceValueService.js'

/**
 * Upload or update a chapter
 * - If chapterId exists in request we treat as update, else create new
 */
export const uploadChapterService = async (request: UploadChapterRequestDto): Promise<UploadChapterResponseDto> => {
  try {
    const { collectionName, schemaInstance } = ChapterSchema
    type Chapter = InferSchemaType<typeof schemaInstance>

    let chapterId = (request as any).chapterId as number | undefined
    const now = Date.now()

    if (!chapterId) {
      const seq = await getNextSequenceValueService('chapter', 1)
      chapterId = seq.sequenceValue
    }

    if (chapterId === null || chapterId === undefined) {
      return { success: false, message: 'Generate chapterId failed' }
    }

    const chapterData: Chapter = {
      chapterId,
      novelId: request.novelId,
      chapterNumber: request.chapterNumber,
      chapterTitle: request.chapterTitle,
      content: request.content,
      watchedCount: 0,
      commentCount: 0,
      upvoteCount: 0,
      downvoteCount: 0,
      createDateTime: now,
      editDateTime: now,
    } as unknown as Chapter

    const result = await insertData2MongoDB(chapterData, schemaInstance, collectionName, { upsert: true } as DbPoolOptions)
    if (result?.success) {
      return { success: true, chapterId }
    }
    return { success: false, message: 'Insert failed' }
  } catch (error) {
    console.error('ERROR', 'uploadChapterService', error)
    return { success: false, message: 'Unknown error' }
  }
}

/** Get chapter by id */
export const getChapterByIdService = async (dto: GetChapterByIdRequestDto): Promise<GetChapterByIdResponseDto> => {
  try {
    const { collectionName, schemaInstance } = ChapterSchema
    type Chapter = InferSchemaType<typeof schemaInstance>
    const where: QueryType<Chapter> = { chapterId: dto.chapterId }
    const select: SelectType<Chapter> = {}
    const queryRes = await selectDataFromMongoDB<Chapter>(where, select, schemaInstance, collectionName)
    if (queryRes.success && queryRes.result?.length) {
      return { success: true, chapter: queryRes.result[0] as any }
    }
    return { success: true, message: 'Not found', chapter: undefined }
  } catch (error) {
    console.error('ERROR', 'getChapterByIdService', error)
    return { success: false, message: 'Unknown error' }
  }
}

/** List chapters of a novel */
export const getChaptersByNovelIdService = async (dto: GetChaptersByNovelIdRequestDto): Promise<GetChaptersByNovelIdResponseDto> => {
  try {
    const { collectionName, schemaInstance } = ChapterSchema
    type Chapter = InferSchemaType<typeof schemaInstance>
    const where: QueryType<Chapter> = { novelId: dto.novelId }
    const select: SelectType<Chapter> = { chapterId: 1, chapterNumber: 1, chapterTitle: 1 }
    const queryRes = await selectDataFromMongoDB<Chapter>(where, select, schemaInstance, collectionName)
    if (queryRes.success) {
      return { success: true, chapters: queryRes.result as any[] }
    }
    return { success: false, message: 'Query failed', chapters: [] }
  } catch (error) {
    console.error('ERROR', 'getChaptersByNovelIdService', error)
    return { success: false, message: 'Unknown error', chapters: [] }
  }
}

/** Delete chapter (soft delete to removed collection) */
export const deleteChapterService = async (dto: DeleteChapterRequestDto, operatorUid: number): Promise<DeleteChapterResponseDto> => {
  try {
    const { collectionName, schemaInstance } = ChapterSchema
    const { collectionName: removedCollection, schemaInstance: removedSchema } = RemovedChapterSchema
    type Chapter = InferSchemaType<typeof schemaInstance>
    const where: QueryType<Chapter> = { chapterId: dto.chapterId }
    const select: SelectType<Chapter> = {}
    const chapterRes = await selectDataFromMongoDB<Chapter>(where, select, schemaInstance, collectionName)
    if (!chapterRes.success || !chapterRes.result?.length) {
      return { success: false, message: 'Chapter not found' }
    }
    const chapter = chapterRes.result[0] as any
    chapter._operatorUid_ = operatorUid
    const insertRemoved = await insertData2MongoDB(chapter, removedSchema, removedCollection)
    if (!insertRemoved.success) {
      return { success: false, message: 'Backup failed' }
    }
    const deleteRes = await deleteDataFromMongoDB(where, schemaInstance, collectionName)
    if (deleteRes.success) return { success: true }
    return { success: false, message: 'Delete failed' }
  } catch (error) {
    console.error('ERROR', 'deleteChapterService', error)
    return { success: false, message: 'Unknown error' }
  }
} 