import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  createUserTotpAuthenticatorService,
  confirmUserTotpAuthenticatorService,
  deleteTotpAuthenticatorByTotpVerificationCodeService,
  createUserEmailAuthenticatorService,
  sendUserEmailAuthenticatorService,
  sendDeleteUserEmailAuthenticatorService,
  deleteUserEmailAuthenticatorService,
  checkUserHave2FAByEmailService,
  checkUserHave2FAByUUIDService,
} from '../service/UserService.js'
import type {
  ConfirmUserTotpAuthenticatorRequestDto,
  DeleteTotpAuthenticatorByTotpVerificationCodeRequestDto,
  SendUserEmailAuthenticatorVerificationCodeRequestDto,
} from './UserControllerDto.js'

/**
 * Create TOTP authenticator for current user
 * - Reads uuid/token from cookies
 * - Returns same response DTO as original service
 */
export async function createUserTotpAuthenticatorHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await createUserTotpAuthenticatorService(uuid, token)
  return reply.send(result)
}

/**
 * Confirm TOTP authenticator with verification code
 * - Reads uuid/token from cookies
 * - Body: ConfirmUserTotpAuthenticatorRequestDto
 */
export async function confirmUserTotpAuthenticatorHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const body = request.body as ConfirmUserTotpAuthenticatorRequestDto
  const result = await confirmUserTotpAuthenticatorService(body, uuid, token)
  return reply.send(result)
}

/**
 * Delete TOTP authenticator using TOTP verification code
 * - Reads uuid/token from cookies
 * - Body: DeleteTotpAuthenticatorByTotpVerificationCodeRequestDto
 */
export async function deleteTotpAuthenticatorByTotpVerificationCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const body = request.body as DeleteTotpAuthenticatorByTotpVerificationCodeRequestDto
  const result = await deleteTotpAuthenticatorByTotpVerificationCodeService(body, uuid, token)
  return reply.send(result)
}

/**
 * Create Email authenticator for current user
 * - Reads uuid/token from cookies
 */
export async function createUserEmailAuthenticatorHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await createUserEmailAuthenticatorService(uuid, token)
  return reply.send(result)
}

/**
 * Send verification code to set up Email authenticator
 * - Body: SendUserEmailAuthenticatorVerificationCodeRequestDto
 */
export async function sendUserEmailAuthenticatorHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as SendUserEmailAuthenticatorVerificationCodeRequestDto
  const result = await sendUserEmailAuthenticatorService(body)
  return reply.send(result)
}

/**
 * Send Email verification code to delete Email authenticator
 * - Reads uuid/token from cookies
 * - Body: { clientLanguage: string }
 */
export async function sendDeleteUserEmailAuthenticatorHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const body = request.body as { clientLanguage: string }
  const result = await sendDeleteUserEmailAuthenticatorService(body as any, uuid, token)
  return reply.send(result)
}

/**
 * Delete Email authenticator
 * - Reads uuid/token from cookies
 * - Body: { passwordHash: string, verificationCode: string }
 */
export async function deleteUserEmailAuthenticatorHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const body = request.body as { passwordHash: string, verificationCode: string }
  const result = await deleteUserEmailAuthenticatorService(body as any, uuid, token)
  return reply.send(result)
}

/**
 * Check whether a user (by email) has any 2FA enabled
 * - Query: email
 */
export async function checkUserHave2FAByEmailHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const result = await checkUserHave2FAByEmailService({ email: String(q?.email ?? '') })
  return reply.send(result)
}

/**
 * Check whether current user (by uuid cookie) has any 2FA enabled
 * - Reads uuid/token from cookies
 */
export async function checkUserHave2FAByUUIDHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid as string
  const token = (request.cookies as any)?.token as string
  const result = await checkUserHave2FAByUUIDService(uuid, token)
  return reply.send(result)
} 