import type { FastifyReply, FastifyRequest } from 'fastify'
import { createFavoritesService, getFavoritesService } from '../service/FavoritesService.js'
import type { CreateFavoritesRequestDto } from './FavoritesControllerDto.js'

/**
 * Create favorites (requires uid/token cookies)
 */
export async function createFavoritesHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as CreateFavoritesRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await createFavoritesService(body, uid, token)
  return reply.send(result)
}

/**
 * Get current user's favorites (requires uid/token cookies)
 */
export async function getFavoritesHandler(request: FastifyRequest, reply: FastifyReply) {
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await getFavoritesService(uid, token)
  return reply.send(result)
} 