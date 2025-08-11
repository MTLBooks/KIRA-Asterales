import { Client } from '@elastic/elasticsearch'
import { InferSchemaType } from 'mongoose'
import { UploadNovelRequestDto, UploadNovelResponseDto, GetNovelByIdRequestDto, GetNovelByIdResponseDto, SearchNovelByKeywordRequestDto, SearchNovelByKeywordResponseDto, DeleteNovelRequestDto, DeleteNovelResponseDto, ThumbNovelResponseDto } from '../controller/NovelControllerDto.js'
import { NovelSchema, RemovedNovelSchema } from '../dbPool/schema/NovelSchema.js'
import { getNextSequenceValueService } from './SequenceValueService.js'
import { checkUserTokenService } from './UserService.js'
import { insertData2MongoDB, selectDataFromMongoDB, deleteDataFromMongoDB } from '../dbPool/DbClusterPool.js'
import { QueryType, SelectType } from '../dbPool/DbClusterPoolTypes.js'
import { insertData2ElasticsearchCluster, deleteDataFromElasticsearchCluster, searchDataFromElasticsearchCluster } from '../elasticsearchPool/ElasticsearchClusterPool.js'
import { NovelDocument } from '../elasticsearchPool/template/NovelDocument.js'
import { EsSchema2TsType } from '../elasticsearchPool/ElasticsearchClusterPoolTypes.js'

/** Upload or update a novel */
export const uploadNovelService = async (req: UploadNovelRequestDto, uid: number, token: string, es?: Client): Promise<UploadNovelResponseDto> => {
  if (!(await checkUserTokenService(uid, token)).success) return { success: false, message: 'User not verified' }
  try {
    const { collectionName, schemaInstance } = NovelSchema
    type Novel = InferSchemaType<typeof schemaInstance>

    const seq = await getNextSequenceValueService('novel', 1)
    const novelId = seq.sequenceValue
    if (novelId === undefined || novelId === null) return { success: false, message: 'Sequence failed' }
    const now = Date.now()

    const novelData: Novel = {
      novelId,
      title: req.title,
      slug: req.slug,
      image: req.image,
      uploadDate: now,
      watchedCount: 0,
      upvoteCount: 0,
      downvoteCount: 0,
      uploaderUUID: '', // can be filled after uuid lookup
      uploaderId: req.uploaderId,
      duration: req.duration,
      description: req.description,
      copyright: req.copyright,
      originalAuthor: req.originalAuthor,
      originalLink: req.originalLink,
      pushToFeed: req.pushToFeed,
      ensureOriginal: req.ensureOriginal,
      novelTagList: req.novelTagList as any,
      novelGenreList: req.novelGenreList as any,
      pendingReview: true,
      editDateTime: now,
    } as unknown as Novel

    const mongoRes = await insertData2MongoDB(novelData, schemaInstance, collectionName)
    if (!mongoRes.success) return { success: false, message: 'Mongo insert failed' }

    if (es) {
      const { indexName, schema: esSchema } = NovelDocument
      const esData: EsSchema2TsType<typeof esSchema> = {
        title: req.title,
        description: req.description,
        novelId,
        novelTagList: req.novelTagList as any,
        novelGenreList: req.novelGenreList as any,
      }
      await insertData2ElasticsearchCluster(es, indexName, esSchema, esData, true)
    }

    return { success: true, novelId }
  } catch (e) {
    console.error('uploadNovelService', e)
    return { success: false, message: 'Unknown error' }
  }
}

/** Get novel by id */
export const getNovelByIdService = async (dto: GetNovelByIdRequestDto): Promise<GetNovelByIdResponseDto> => {
  const { collectionName, schemaInstance } = NovelSchema
  type Novel = InferSchemaType<typeof schemaInstance>
  const where: QueryType<Novel> = { novelId: dto.novelId }
  const select: SelectType<Novel> = {}
  const res = await selectDataFromMongoDB<Novel>(where, select, schemaInstance, collectionName)
  if (res.success && res.result?.length) return { success: true, novel: res.result[0] as any, isBlockedByOther: false, isBlocked: false, isHidden: false }
  return { success: false, message: 'Not found', isBlocked: false, isBlockedByOther: false, isHidden: false }
}

/** Keyword search in Elasticsearch */
export const searchNovelByKeywordService = async (dto: SearchNovelByKeywordRequestDto, es: Client): Promise<SearchNovelByKeywordResponseDto> => {
  const { indexName, schema: esSchema } = NovelDocument
  const keyword = dto.keyword.trim()
  if (!keyword) return { success: true, novelsCount: 0, novels: [] }
  const esRes = await searchDataFromElasticsearchCluster(es, indexName, esSchema, {
    multi_match: { query: keyword, fields: ['title', 'description'] },
  })
  const docs = esRes?.result ?? []
  const novels = docs.map(d => ({ novelId: (d as any).novelId, title: (d as any).title })) as ThumbNovelResponseDto['novels']
  return { success: true, novelsCount: novels.length, novels }
}

/** Delete novel (soft) */
export const deleteNovelService = async (dto: DeleteNovelRequestDto, adminUid: number, adminToken: string, es: Client): Promise<DeleteNovelResponseDto> => {
  if (!(await checkUserTokenService(adminUid, adminToken)).success) return { success: false, message: 'Auth failed' }
  const { collectionName, schemaInstance } = NovelSchema
  const { collectionName: removedCol, schemaInstance: removedSchema } = RemovedNovelSchema
  type Novel = InferSchemaType<typeof schemaInstance>
  const where: QueryType<Novel> = { novelId: dto.novelId }
  const sel: SelectType<Novel> = {}
  const query = await selectDataFromMongoDB<Novel>(where, sel, schemaInstance, collectionName)
  if (!query.success || !query.result?.length) return { success: false, message: 'Not found' }
  const data = { ...query.result[0], _operatorUid_: adminUid }
  await insertData2MongoDB(data, removedSchema, removedCol)
  await deleteDataFromMongoDB(where, schemaInstance, collectionName)
  const { indexName } = NovelDocument
  await deleteDataFromElasticsearchCluster(es, indexName, { novelId: dto.novelId })
  return { success: true }
} 

// --- Stub utility methods to satisfy routing ---
export const getThumbNovelService = async (): Promise<ThumbNovelResponseDto> => ({ success: false, novelsCount: 0, novels: [], message: 'Not implemented' })
export const checkNovelExistByIdService = async (): Promise<{ success:boolean; exist:boolean; message?:string}> => ({ success:false, exist:false, message:'Not implemented' })
export const getNovelCoverUploadSignedUrlService = async (): Promise<{ success:boolean; message:string}> => ({ success:false, message:'Not implemented'})
export const getNovelByUidService = async (): Promise<ThumbNovelResponseDto> => ({ success:false, novelsCount:0, novels:[], message:'Not implemented'})
export const searchNovelByTagIdService = async (): Promise<ThumbNovelResponseDto> => ({ success:false, novelsCount:0, novels:[], message:'Not implemented'})
export const getPendingReviewNovelService = async (): Promise<ThumbNovelResponseDto> => ({ success:false, novelsCount:0, novels:[], message:'Not implemented'})
export const approvePendingReviewNovelService = async (): Promise<{success:boolean; message?:string}> => ({ success:false, message:'Not implemented'}) 