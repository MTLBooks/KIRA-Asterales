import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  createVideoTagService,
  searchVideoTagService,
  getVideoTagByTagIdService,
} from '../service/VideoTagService.js'
import type {
  CreateVideoTagRequestDto,
  SearchVideoTagRequestDto,
  GetVideoTagByTagIdRequestDto,
} from './VideoTagControllerDto.js'

/**
 * Create a video tag (requires uid/token cookies)
 */
export async function createVideoTagHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as CreateVideoTagRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await createVideoTagService(body, uid, token)
  return reply.send(result)
}

/**
 * Search video tags by name (supports empty keyword)
 */
export async function searchVideoTagHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: SearchVideoTagRequestDto = { tagNameSearchKey: String(q?.tagName ?? '') }
  const result = await searchVideoTagService(dto)
  return reply.send(result)
}

/**
 * Get video tags by tag IDs
 */
export async function getVideoTagByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as GetVideoTagByTagIdRequestDto
  const result = await getVideoTagByTagIdService(body)
  return reply.send(result)
} 