import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  createNovelGenreService,
  searchNovelGenreService,
  getNovelGenreByIdService,
} from '../service/NovelGenreService.js'
import type {
  CreateNovelGenreRequestDto,
  SearchNovelGenreRequestDto,
  GetNovelGenreByIdRequestDto,
} from './NovelGenreControllerDto.js'

/**
 * Create a novel genre (requires uid/token cookies)
 */
export async function createNovelGenreHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as CreateNovelGenreRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await createNovelGenreService(body, uid, token)
  return reply.send(result)
}

/**
 * Search novel genres by name
 */
export async function searchNovelGenreHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: SearchNovelGenreRequestDto = { genreNameSearchKey: String(q?.genreName ?? '') }
  const result = await searchNovelGenreService(dto)
  return reply.send(result)
}

/**
 * Get novel genres by IDs
 */
export async function getNovelGenreByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as GetNovelGenreByIdRequestDto
  const result = await getNovelGenreByIdService(body)
  return reply.send(result)
} 