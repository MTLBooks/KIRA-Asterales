import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  createNovelTagService,
  searchNovelTagService,
  getNovelTagByTagIdService,
} from '../service/NovelTagService.js'
import type {
  CreateNovelTagRequestDto,
  SearchNovelTagRequestDto,
  GetNovelTagByTagIdRequestDto,
} from './NovelTagControllerDto.js'

/**
 * Create a novel tag (requires uid/token cookies)
 */
export async function createNovelTagHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as CreateNovelTagRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await createNovelTagService(body, uid, token)
  return reply.send(result)
}

/**
 * Search novel tags by name (supports empty keyword)
 */
export async function searchNovelTagHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: SearchNovelTagRequestDto = { tagNameSearchKey: String(q?.tagName ?? '') }
  const result = await searchNovelTagService(dto)
  return reply.send(result)
}

/**
 * Get novel tags by tag IDs
 */
export async function getNovelTagByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as GetNovelTagByTagIdRequestDto
  const result = await getNovelTagByTagIdService(body)
  return reply.send(result)
} 