import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  RequestSendVerificationCodeService,
  createInvitationCodeService,
  getMyInvitationCodeService,
  checkInvitationCodeService,
  adminGetUserByInvitationCodeService,
  updateUserEmailService,
  updateOrCreateUserInfoService,
  getUserInfoByUidService,
  userEmailExistsCheckService,
  checkUserTokenService,
  getUserAvatarUploadSignedUrlService,
  getUserSettingsService,
  updateOrCreateUserSettingsService,
  checkUsernameService,
  adminEditUserInfoService,
  approveUserInfoService,
  adminClearUserInfoService,
} from '../service/UserService.js'
import type {
  RequestSendVerificationCodeRequestDto,
  CheckInvitationCodeRequestDto,
  UpdateUserEmailRequestDto,
  UpdateOrCreateUserInfoRequestDto,
  GetUserInfoByUidRequestDto,
  UserEmailExistsCheckRequestDto,
  RequestSendChangeEmailVerificationCodeRequestDto,
  RequestSendChangePasswordVerificationCodeRequestDto,
  CheckUsernameRequestDto,
  AdminEditUserInfoRequestDto,
  ApproveUserInfoRequestDto,
  AdminClearUserInfoRequestDto,
} from './UserControllerDto.js'

/**
 * Request sending registration verification code
 * - Body: RequestSendVerificationCodeRequestDto
 */
export async function requestSendVerificationCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as RequestSendVerificationCodeRequestDto
  const result = await RequestSendVerificationCodeService(body)
  return reply.send(result)
}

/**
 * Create invitation code (requires uid/token cookies)
 */
export async function createInvitationCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await createInvitationCodeService(uid, token)
  return reply.send(result)
}

/**
 * Get my invitation codes (requires uid/token cookies)
 */
export async function getMyInvitationCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await getMyInvitationCodeService(uid, token)
  return reply.send(result)
}

/**
 * Check if invitation code is available
 * - Body: CheckInvitationCodeRequestDto
 */
export async function checkInvitationCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as CheckInvitationCodeRequestDto
  const result = await checkInvitationCodeService(body)
  return reply.send(result)
}

/**
 * Admin: get user info by invitation code
 * - Query: invitationCode
 * - Requires admin uuid/token cookies
 */
export async function adminGetUserByInvitationCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const adminUuid = (request.cookies as any)?.uuid as string
  const adminToken = (request.cookies as any)?.token as string
  const result = await adminGetUserByInvitationCodeService(String(q?.invitationCode ?? ''), adminUuid, adminToken)
  return reply.send(result)
}

/**
 * Update user email
 * - Body: UpdateUserEmailRequestDto
 * - Requires uid/token cookies
 */
export async function updateUserEmailHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as UpdateUserEmailRequestDto
  const cookieUid = Number((request.cookies as any)?.uid)
  const cookieToken = (request.cookies as any)?.token as string
  const result = await updateUserEmailService(body, cookieUid, cookieToken)
  return reply.send(result)
}

/**
 * Create or update user info
 * - Body: UpdateOrCreateUserInfoRequestDto
 * - Requires uid/token cookies
 */
export async function updateOrCreateUserInfoHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as UpdateOrCreateUserInfoRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await updateOrCreateUserInfoService(body, uid, token)
  return reply.send(result)
}

/**
 * Get user info by uid
 * - Query: uid (number)
 * - Optionally uses selector uuid/token from cookies
 */
export async function getUserInfoByUidHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: GetUserInfoByUidRequestDto = { uid: Number(q?.uid) }
  const uuid = (request.cookies as any)?.uuid as string | undefined
  const token = (request.cookies as any)?.token as string | undefined
  const result = await getUserInfoByUidService(dto, uuid, token)
  return reply.send(result)
}

/**
 * Check if email exists
 * - Query: email
 */
export async function userEmailExistsCheckHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: UserEmailExistsCheckRequestDto = { email: String(q?.email ?? '') }
  const result = await userEmailExistsCheckService(dto)
  return reply.send(result)
}

/**
 * Check user token validity
 * - Query: uid, token
 */
export async function checkUserTokenHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const uid = Number(q?.uid)
  const token = String(q?.token ?? '')
  const result = await checkUserTokenService(uid, token)
  return reply.send(result)
}

/**
 * Get avatar upload signed URL
 * - Requires uid/token cookies
 */
export async function getUserAvatarUploadSignedUrlHandler(request: FastifyRequest, reply: FastifyReply) {
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await getUserAvatarUploadSignedUrlService(uid, token)
  return reply.send(result)
}

/**
 * Get user settings
 * - Requires uid/token cookies
 */
export async function getUserSettingsHandler(request: FastifyRequest, reply: FastifyReply) {
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await getUserSettingsService(uid, token)
  return reply.send(result)
}

/**
 * Update or create user settings
 * - Requires uid/token cookies
 */
export async function updateOrCreateUserSettingsHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as any
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await updateOrCreateUserSettingsService(body, uid, token)
  return reply.send(result)
}

/**
 * Send change-email verification code
 * - Body: RequestSendChangeEmailVerificationCodeRequestDto
 * - Requires uid/token cookies
 */
export async function requestSendChangeEmailVerificationCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as RequestSendChangeEmailVerificationCodeRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await (await import('../service/UserService.js')).requestSendChangeEmailVerificationCodeService(body, uid, token)
  return reply.send(result)
}

/**
 * Send change-password verification code
 * - Body: RequestSendChangePasswordVerificationCodeRequestDto
 * - Requires uid/token cookies
 */
export async function requestSendChangePasswordVerificationCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as RequestSendChangePasswordVerificationCodeRequestDto
  const uid = Number((request.cookies as any)?.uid)
  const token = (request.cookies as any)?.token as string
  const result = await (await import('../service/UserService.js')).requestSendChangePasswordVerificationCodeService(body, uid, token)
  return reply.send(result)
}

/**
 * Check username availability
 * - Query: username
 */
export async function checkUsernameHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const dto: CheckUsernameRequestDto = { username: String(q?.username ?? '') }
  const result = await checkUsernameService(dto)
  return reply.send(result)
}

/**
 * Admin edit user info
 * - Body: AdminEditUserInfoRequestDto
 * - Requires admin uuid/token cookies
 */
export async function adminEditUserInfoHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as AdminEditUserInfoRequestDto
  const adminUuid = (request.cookies as any)?.uuid as string
  const adminToken = (request.cookies as any)?.token as string
  const result = await adminEditUserInfoService(body, adminUuid, adminToken)
  return reply.send(result)
}

/**
 * Admin approve user info
 * - Body: ApproveUserInfoRequestDto
 * - Requires admin uuid/token cookies
 */
export async function approveUserInfoHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as ApproveUserInfoRequestDto
  const adminUuid = (request.cookies as any)?.uuid as string
  const adminToken = (request.cookies as any)?.token as string
  const result = await approveUserInfoService(body, adminUuid, adminToken)
  return reply.send(result)
}

/**
 * Admin clear user info
 * - Body: AdminClearUserInfoRequestDto
 * - Requires admin uuid/token cookies
 */
export async function adminClearUserInfoHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as AdminClearUserInfoRequestDto
  const adminUuid = (request.cookies as any)?.uuid as string
  const adminToken = (request.cookies as any)?.token as string
  const result = await adminClearUserInfoService(body, adminUuid, adminToken)
  return reply.send(result)
} 