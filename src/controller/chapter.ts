import type { FastifyRequest, FastifyReply } from 'fastify'
import {
  uploadChapterService,
  getChapterByIdService,
  getChaptersByNovelIdService,
  deleteChapterService,
} from '../service/ChapterService.js'
import type {
  UploadChapterRequestDto,
  GetChapterByIdRequestDto,
  GetChaptersByNovelIdRequestDto,
  DeleteChapterRequestDto,
} from './ChapterControllerDto.js'

export async function uploadChapterHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as UploadChapterRequestDto
  const result = await uploadChapterService(body)
  return reply.send(result)
}

export async function getChapterByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: GetChapterByIdRequestDto = { chapterId: Number(q.chapterId) }
  const result = await getChapterByIdService(dto)
  return reply.send(result)
}

export async function getChaptersByNovelIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: GetChaptersByNovelIdRequestDto = { novelId: Number(q.novelId) }
  const result = await getChaptersByNovelIdService(dto)
  return reply.send(result)
}

export async function deleteChapterHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as DeleteChapterRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const result = await deleteChapterService(body, uid)
  return reply.send(result)
} 