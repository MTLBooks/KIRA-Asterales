import type { FastifyReply, FastifyRequest } from 'fastify'
import { createOrUpdateBrowsingHistoryService, getUserBrowsingHistoryWithFilterService } from '../service/BrowsingHistoryService.js'
import type { CreateOrUpdateBrowsingHistoryRequestDto, GetUserBrowsingHistoryWithFilterRequestDto } from './BrowsingHistoryControllerDto.js'

/**
 * Create or update user browsing history (requires uuid/token cookies)
 */
export async function createOrUpdateUserBrowsingHistoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as CreateOrUpdateBrowsingHistoryRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await createOrUpdateBrowsingHistoryService(body, uuid, token)
  return reply.send(result)
}

/**
 * Get user browsing history (optionally filtered by video title)
 */
export async function getUserBrowsingHistoryWithFilterHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: GetUserBrowsingHistoryWithFilterRequestDto = { videoTitle: q?.videoTitle }
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await getUserBrowsingHistoryWithFilterService(dto, uid, token)
  return reply.send(result)
} 