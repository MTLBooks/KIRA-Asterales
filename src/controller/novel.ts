import type { FastifyRequest, FastifyReply } from 'fastify'
import { Client } from '@elastic/elasticsearch'
import { uploadNovelService, getNovelByIdService, searchNovelByKeywordService, deleteNovelService } from '../service/NovelService.js'
import type { UploadNovelRequestDto, GetNovelByIdRequestDto, SearchNovelByKeywordRequestDto, DeleteNovelRequestDto } from './NovelControllerDto.js'
import { getThumbNovelService, checkNovelExistByIdService, getNovelByUidService, searchNovelByTagIdService, getNovelCoverUploadSignedUrlService, getPendingReviewNovelService, approvePendingReviewNovelService } from '../service/NovelService.js'

export async function uploadNovelHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as UploadNovelRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const es = (request as any).elasticsearchClient as Client | undefined
  const result = await uploadNovelService(body, uid, token, es)
  return reply.send(result)
}

export async function getNovelByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: GetNovelByIdRequestDto = { novelId: Number(q.novelId) }
  const result = await getNovelByIdService(dto)
  return reply.send(result)
}

export async function searchNovelByKeywordHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: SearchNovelByKeywordRequestDto = { keyword: String(q.keyword ?? '') }
  const es = (request as any).elasticsearchClient as Client
  const result = await searchNovelByKeywordService(dto, es)
  return reply.send(result)
}

export async function deleteNovelHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as DeleteNovelRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const es = (request as any).elasticsearchClient as Client
  const result = await deleteNovelService(body, uid, token, es)
  return reply.send(result)
}

export async function getThumbNovelHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await getThumbNovelService()
  return reply.send(result)
}

export async function checkNovelExistHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  // use stub service
  const result = await checkNovelExistByIdService()
  return reply.send(result)
}

export async function getNovelByUidHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const result = await getNovelByUidService()
  return reply.send(result)
}

export async function searchNovelByTagHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as any
  const result = await searchNovelByTagIdService()
  return reply.send(result)
}

export async function getNovelCoverSignedUrlHandler(request: FastifyRequest, reply: FastifyReply) {
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await getNovelCoverUploadSignedUrlService()
  return reply.send(result)
}

export async function getPendingReviewNovelHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await getPendingReviewNovelService()
  return reply.send(result)
}

export async function approvePendingReviewNovelHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await approvePendingReviewNovelService()
  return reply.send(result)
} 