import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Client } from '@elastic/elasticsearch'
import {
  updateVideoService,
  getThumbVideoService,
  checkVideoExistByKvidService,
  getVideoByKvidService,
  getVideoByUidRequestService,
  searchVideoByKeywordService,
  getVideoFileTusEndpointService,
  getVideoCoverUploadSignedUrlService,
  searchVideoByVideoTagIdService,
  deleteVideoByKvidService,
  getPendingReviewVideoService,
  approvePendingReviewVideoService,
} from '../service/VideoService.js'
import type {
  UploadVideoRequestDto,
  CheckVideoExistRequestDto,
  GetVideoByKvidRequestDto,
  GetVideoByUidRequestDto,
  SearchVideoByKeywordRequestDto,
  GetVideoFileTusEndpointRequestDto,
  SearchVideoByVideoTagIdRequestDto,
  DeleteVideoRequestDto,
  ApprovePendingReviewVideoRequestDto,
} from './VideoControllerDto.js'

/**
 * Upload or update a video
 * - Requires uid/token cookies
 * - Uses Elasticsearch client if available
 */
export async function uploadVideoHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as UploadVideoRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const es = (request as any).elasticsearchClient as Client | undefined
  const result = await updateVideoService(body, uid, token, es)
  return reply.send(result)
}

/**
 * Get homepage thumb videos
 * - Optionally uses uuid/token cookies to record browsing history elsewhere
 */
export async function getThumbVideoHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid as string | undefined
  const token = (request.cookies as any)?.token as string | undefined
  const result = await getThumbVideoService(uuid, token)
  return reply.send(result)
}

/**
 * Check video exists by KVID
 */
export async function checkVideoExistHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: CheckVideoExistRequestDto = { videoId: Number(q.videoId) }
  const result = await checkVideoExistByKvidService(dto)
  return reply.send(result)
}

/**
 * Get video by KVID (optionally records history if cookies are present)
 */
export async function getVideoByKvidHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: GetVideoByKvidRequestDto = { videoId: Number(q.videoId) }
  const uuid = (request.cookies as any)?.uuid as string | undefined
  const token = (request.cookies as any)?.token as string | undefined
  const result = await getVideoByKvidService(dto, uuid, token)
  return reply.send(result)
}

/**
 * Get videos uploaded by a UID
 */
export async function getVideoByUidHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: GetVideoByUidRequestDto = { uid: Number(q.uid) }
  const uuid = (request.cookies as any)?.uuid as string | undefined
  const token = (request.cookies as any)?.token as string | undefined
  const result = await getVideoByUidRequestService(dto, uuid, token)
  return reply.send(result)
}

/**
 * Search videos by keyword (Elasticsearch)
 */
export async function searchVideoByKeywordHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: SearchVideoByKeywordRequestDto = { keyword: String(q.keyword ?? '') }
  const es = (request as any).elasticsearchClient as Client | undefined
  const result = await searchVideoByKeywordService(dto, es)
  return reply.send(result)
}

/**
 * Get TUS upload endpoint (requires admin/user cookie)
 */
export async function getVideoTusEndpointHandler(request: FastifyRequest, reply: FastifyReply) {
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const body = request.body as GetVideoFileTusEndpointRequestDto
  const endpoint = await getVideoFileTusEndpointService(uid, token, body)
  return reply.send(endpoint)
}

/**
 * Get video cover upload signed URL (requires cookies)
 */
export async function getVideoCoverSignedUrlHandler(request: FastifyRequest, reply: FastifyReply) {
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await getVideoCoverUploadSignedUrlService(uid, token)
  return reply.send(result)
}

/**
 * Search videos by tag IDs
 */
export async function searchVideoByTagHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as SearchVideoByVideoTagIdRequestDto
  const result = await searchVideoByVideoTagIdService(body)
  return reply.send(result)
}

/**
 * Delete a video by KVID (admin only)
 */
export async function deleteVideoByKvidHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as DeleteVideoRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const es = (request as any).elasticsearchClient as Client | undefined
  const result = await deleteVideoByKvidService(body, uid, token, es!)
  return reply.send(result)
}

/**
 * Get pending review list (admin only)
 */
export async function getPendingReviewVideoHandler(request: FastifyRequest, reply: FastifyReply) {
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await getPendingReviewVideoService(uid, token)
  return reply.send(result)
}

/**
 * Approve a pending review video (admin only)
 */
export async function approvePendingReviewVideoHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as ApprovePendingReviewVideoRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await approvePendingReviewVideoService(body, uid, token)
  return reply.send(result)
} 