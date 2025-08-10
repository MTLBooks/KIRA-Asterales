import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  addNewUid2FeedGroupService,
  administratorApproveFeedGroupInfoChangeService,
  administratorDeleteFeedGroupService,
  createFeedGroupService,
  createOrEditFeedGroupInfoService,
  deleteFeedGroupService,
  followingUploaderService,
  getFeedContentService,
  getFeedGroupCoverUploadSignedUrlService,
  getFeedGroupListService,
  removeUidFromFeedGroupService,
  unfollowingUploaderService,
} from '../service/FeedService.js'
import type {
  AddNewUid2FeedGroupRequestDto,
  AdministratorApproveFeedGroupInfoChangeRequestDto,
  AdministratorDeleteFeedGroupRequestDto,
  CreateFeedGroupRequestDto,
  CreateOrEditFeedGroupInfoRequestDto,
  DeleteFeedGroupRequestDto,
  FollowingUploaderRequestDto,
  GetFeedContentRequestDto,
  RemoveUidFromFeedGroupRequestDto,
  UnfollowingUploaderRequestDto,
} from './FeedControllerDto.js'

/**
 * Follow uploader
 * - Cookies: uuid, token
 * - Body: FollowingUploaderRequestDto
 */
export async function followingUploaderHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as FollowingUploaderRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await followingUploaderService(body, uuid, token)
  return reply.send(result)
}

/**
 * Unfollow uploader
 * - Cookies: uuid, token
 * - Body: UnfollowingUploaderRequestDto
 */
export async function unfollowingUploaderHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as UnfollowingUploaderRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await unfollowingUploaderService(body, uuid, token)
  return reply.send(result)
}

/**
 * Create feed group
 * - Cookies: uuid, token
 * - Body: CreateFeedGroupRequestDto
 */
export async function createFeedGroupHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as CreateFeedGroupRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await createFeedGroupService(body, uuid, token)
  return reply.send(result)
}

/**
 * Add user to feed group
 * - Cookies: uuid, token
 * - Body: AddNewUid2FeedGroupRequestDto
 */
export async function addNewUid2FeedGroupHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as AddNewUid2FeedGroupRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await addNewUid2FeedGroupService(body, uuid, token)
  return reply.send(result)
}

/**
 * Remove user from feed group
 * - Cookies: uuid, token
 * - Body: RemoveUidFromFeedGroupRequestDto
 */
export async function removeUidFromFeedGroupHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as RemoveUidFromFeedGroupRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await removeUidFromFeedGroupService(body, uuid, token)
  return reply.send(result)
}

/**
 * Delete feed group
 * - Cookies: uuid, token
 * - Body: DeleteFeedGroupRequestDto
 */
export async function deleteFeedGroupHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as DeleteFeedGroupRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await deleteFeedGroupService(body, uuid, token)
  return reply.send(result)
}

/**
 * Get feed group cover pre-signed URL
 * - Cookies: uuid, token
 */
export async function getFeedGroupCoverUploadSignedUrlHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await getFeedGroupCoverUploadSignedUrlService(uuid, token)
  return reply.send(result)
}

/**
 * Create or edit feed group info
 * - Cookies: uuid, token
 * - Body: CreateOrEditFeedGroupInfoRequestDto
 */
export async function createOrEditFeedGroupInfoHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as CreateOrEditFeedGroupInfoRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await createOrEditFeedGroupInfoService(body, uuid, token)
  return reply.send(result)
}

/**
 * Admin approve feed group info change
 * - Cookies: uuid, token
 * - Body: AdministratorApproveFeedGroupInfoChangeRequestDto
 */
export async function administratorApproveFeedGroupInfoChangeHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as AdministratorApproveFeedGroupInfoChangeRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await administratorApproveFeedGroupInfoChangeService(body, uuid, token)
  return reply.send(result)
}

/**
 * Admin delete feed group
 * - Cookies: uuid, token
 * - Body: AdministratorDeleteFeedGroupRequestDto
 */
export async function administratorDeleteFeedGroupHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as AdministratorDeleteFeedGroupRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await administratorDeleteFeedGroupService(body, uuid, token)
  return reply.send(result)
}

/**
 * Get feed group list
 * - Cookies: uuid, token
 */
export async function getFeedGroupListHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await getFeedGroupListService(uuid, token)
  return reply.send(result)
}

/**
 * Get feed content
 * - Query -> GetFeedContentRequestDto
 * - Cookies: uuid, token
 */
export async function getFeedContentHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const body: GetFeedContentRequestDto = {
    feedGroupUuid: q?.feedGroupUuid,
    pagination: { page: Number(q?.page ?? 1), pageSize: Number(q?.pageSize ?? 30) },
  }
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await getFeedContentService(body, uuid, token)
  return reply.send(result)
} 