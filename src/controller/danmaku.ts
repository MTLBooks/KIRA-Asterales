import type { FastifyReply, FastifyRequest } from 'fastify'
import { emitDanmakuService, getDanmakuListByKvidService } from '../service/DanmakuService.js'
import type { EmitDanmakuRequestDto, GetDanmakuByKvidRequestDto } from './DanmakuControllerDto.js'

/**
 * Emit danmaku (requires uuid/token cookies; RBAC via preHandler)
 */
export async function emitDanmakuHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as EmitDanmakuRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await emitDanmakuService(body, uuid, token)
  return reply.send(result)
}

/**
 * Get danmaku list by KVID
 */
export async function getDanmakuListByKvidHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: GetDanmakuByKvidRequestDto = { videoId: q?.videoId ? Number(q.videoId) : -1 }
  const result = await getDanmakuListByKvidService(dto)
  return reply.send(result)
} 