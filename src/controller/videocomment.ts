import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  adminDeleteVideoCommentService,
  cancelVideoCommentDownvoteService,
  cancelVideoCommentUpvoteService,
  deleteSelfVideoCommentService,
  emitVideoCommentDownvoteService,
  emitVideoCommentService,
  emitVideoCommentUpvoteService,
  getVideoCommentListByKvidService,
} from '../service/VideoCommentService.js'
import type {
  AdminDeleteVideoCommentRequestDto,
  CancelVideoCommentDownvoteRequestDto,
  CancelVideoCommentUpvoteRequestDto,
  DeleteSelfVideoCommentRequestDto,
  EmitVideoCommentDownvoteRequestDto,
  EmitVideoCommentRequestDto,
  EmitVideoCommentUpvoteRequestDto,
  GetVideoCommentByKvidRequestDto,
} from './VideoCommentControllerDto.js'

/**
 * Emit a video comment (RBAC via preHandler; requires uuid/token cookies)
 */
export async function emitVideoCommentHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as EmitVideoCommentRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await emitVideoCommentService(body, uuid, token)
  return reply.send(result)
}

/**
 * Get video comment list by KVID
 */
export async function getVideoCommentListHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: GetVideoCommentByKvidRequestDto = {
    videoId: q?.videoId ? Number(q.videoId) : -1,
    pagination: {
      page: Number(q?.page ?? 1),
      pageSize: Number(q?.pageSize ?? Number.MAX_SAFE_INTEGER),
    },
  }
  const uuid = (request.cookies as any)?.uuid as string | undefined
  const token = (request.cookies as any)?.token as string | undefined
  const result = await getVideoCommentListByKvidService(dto, uuid, token)
  return reply.send(result)
}

/**
 * Upvote a video comment
 */
export async function emitVideoCommentUpvoteHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as EmitVideoCommentUpvoteRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await emitVideoCommentUpvoteService(body, uid, token)
  return reply.send(result)
}

/**
 * Downvote a video comment
 */
export async function emitVideoCommentDownvoteHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as EmitVideoCommentDownvoteRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await emitVideoCommentDownvoteService(body, uid, token)
  return reply.send(result)
}

/**
 * Cancel upvote
 */
export async function cancelVideoCommentUpvoteHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as CancelVideoCommentUpvoteRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await cancelVideoCommentUpvoteService(body, uid, token)
  return reply.send(result)
}

/**
 * Cancel downvote
 */
export async function cancelVideoCommentDownvoteHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as CancelVideoCommentDownvoteRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await cancelVideoCommentDownvoteService(body, uid, token)
  return reply.send(result)
}

/**
 * Delete own comment
 */
export async function deleteSelfVideoCommentHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as DeleteSelfVideoCommentRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await deleteSelfVideoCommentService(body, uid, token)
  return reply.send(result)
}

/**
 * Admin delete a comment (RBAC via preHandler)
 */
export async function adminDeleteVideoCommentHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as AdminDeleteVideoCommentRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await adminDeleteVideoCommentService(body, uid, token)
  return reply.send(result)
} 