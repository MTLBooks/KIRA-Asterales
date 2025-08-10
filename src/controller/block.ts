import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  addRegexService,
  blockKeywordService,
  blockTagService,
  blockUserByUidService,
  getBlockListService,
  hideUserByUidService,
  removeRegexService,
  showUserService,
  unBlockKeywordService,
  unBlockTagService,
  unBlockUserService,
} from '../service/BlockService.js'
import type {
  AddRegexRequestDto,
  BlockKeywordRequestDto,
  BlockTagRequestDto,
  BlockUserByUidRequestDto,
  GetBlockListRequestDto,
  HideUserByUidRequestDto,
  RemoveRegexRequestDto,
  ShowUserByUidRequestDto,
  UnblockKeywordRequestDto,
  UnblockTagRequestDto,
  UnblockUserByUidRequestDto,
} from './BlockControllerDto.js'
import { getBlockedUserService } from '../service/UserService.js'
import type { GetBlockedUserRequestDto } from './UserControllerDto.js'

/**
 * Block user by uid
 * - Cookies: uuid, token
 * - Body: BlockUserByUidRequestDto
 */
export async function blockUserByUidHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as BlockUserByUidRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await blockUserByUidService(body, uuid, token)
  return reply.send(result)
}

/**
 * Hide user by uid (self side)
 * - Cookies: uuid, token
 * - Body: HideUserByUidRequestDto
 */
export async function hideUserByUidHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as HideUserByUidRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await hideUserByUidService(body, uuid, token)
  return reply.send(result)
}

/**
 * Block keyword
 * - Cookies: uuid, token
 * - Body: BlockKeywordRequestDto
 */
export async function blockKeywordHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as BlockKeywordRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await blockKeywordService(body, uuid, token)
  return reply.send(result)
}

/**
 * Block tag
 * - Cookies: uuid, token
 * - Body: BlockTagRequestDto
 */
export async function blockTagHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as BlockTagRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await blockTagService(body, uuid, token)
  return reply.send(result)
}

/**
 * Add block regex
 * - Cookies: uuid, token
 * - Body: AddRegexRequestDto
 */
export async function addRegexHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as AddRegexRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await addRegexService(body, uuid, token)
  return reply.send(result)
}

/**
 * Unblock user by uid
 * - Cookies: uuid, token
 * - Body: UnblockUserByUidRequestDto
 */
export async function unblockUserByUidHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as UnblockUserByUidRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await unBlockUserService(body, uuid, token)
  return reply.send(result)
}

/**
 * Show user by uid (undo hide)
 * - Cookies: uuid, token
 * - Body: ShowUserByUidRequestDto
 */
export async function showUserByUidHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as ShowUserByUidRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await showUserService(body, uuid, token)
  return reply.send(result)
}

/**
 * Unblock keyword
 * - Cookies: uuid, token
 * - Body: UnblockKeywordRequestDto
 */
export async function unblockKeywordHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as UnblockKeywordRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await unBlockKeywordService(body, uuid, token)
  return reply.send(result)
}

/**
 * Unblock tag
 * - Cookies: uuid, token
 * - Body: UnblockTagRequestDto
 */
export async function unblockTagHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as UnblockTagRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await unBlockTagService(body, uuid, token)
  return reply.send(result)
}

/**
 * Remove block regex
 * - Cookies: uuid, token
 * - Body: RemoveRegexRequestDto
 */
export async function removeRegexHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as RemoveRegexRequestDto
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await removeRegexService(body, uuid, token)
  return reply.send(result)
}

/**
 * Get block list
 * - Query: type, page, pageSize
 * - Cookies: uuid, token
 */
export async function getBlockListHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: GetBlockListRequestDto = {
    type: String(q?.type ?? ''),
    pagination: { page: Number(q?.page ?? 1), pageSize: Number(q?.pageSize ?? Number.MAX_SAFE_INTEGER) },
  }
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await getBlockListService(dto, uuid, token)
  return reply.send(result)
}

/**
 * Get all blocked users (admin-only)
 * - Query: sortBy, sortOrder, uid, page, pageSize
 * - Cookies: uuid, token
 */
export async function getBlockedUserHandler(request: FastifyRequest, reply: FastifyReply) {
  const adminUUID = (request.cookies as any)?.uuid as string
  const adminToken = (request.cookies as any)?.token as string
  const q = request.query as any

  const sortBy = (q?.sortBy as string) ?? 'uid'
  const sortOrder = (q?.sortOrder as string) ?? 'ascend'
  const uid = Number(q?.uid ?? -1)
  const page = Number.parseInt(String(q?.page ?? '1'), 10)
  const pageSizeParsed = Number.parseInt(String(q?.pageSize ?? ''), 10)
  const pageSize = Number.isFinite(pageSizeParsed) ? pageSizeParsed : Number.MAX_SAFE_INTEGER

  const dto: GetBlockedUserRequestDto = {
    sortBy,
    sortOrder,
    uid,
    pagination: { page, pageSize },
  }

  const result = await getBlockedUserService(adminUUID, adminToken, dto)
  return reply.send(result)
} 