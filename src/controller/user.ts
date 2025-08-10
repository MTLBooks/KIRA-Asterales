import type { FastifyReply, FastifyRequest } from 'fastify'
import { getCorrectCookieDomain } from '../common/UrlTool.js'
import {
    userLoginService,
    getSelfUserInfoService,
    adminGetUserInfoService,
} from '../service/UserService.js'
import type {
    UserLoginRequestDto,
    GetSelfUserInfoRequestDto,
    AdminGetUserInfoRequestDto,
} from './UserControllerDto.js'

/**
 * User login
 * - Parses body as UserLoginRequestDto
 * - Sets cookies on success (token, email, uid, uuid)
 * - Returns the same response as original controller
 */
export async function userLoginHandler(request: FastifyRequest, reply: FastifyReply) {
    const data = request.body as Partial<UserLoginRequestDto>
    const userLoginRequest: UserLoginRequestDto = {
        email: data?.email!,
        passwordHash: data?.passwordHash!,
        clientOtp: data?.clientOtp,
        verificationCode: data?.verificationCode,
    }
    const userLoginResult = await userLoginService(userLoginRequest)

    const cookieOption = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict' as const,
        maxAge: 1000 * 60 * 60 * 24 * 365,
        domain: getCorrectCookieDomain(),
        path: '/',
    }
    if (userLoginResult?.token) reply.setCookie('token', userLoginResult.token, cookieOption)
    if (userLoginResult?.email) reply.setCookie('email', userLoginResult.email, cookieOption)
    if (userLoginResult?.uid !== undefined) reply.setCookie('uid', String(userLoginResult.uid), cookieOption)
    if (userLoginResult?.UUID) reply.setCookie('uuid', String(userLoginResult.UUID), cookieOption)

    return reply.send(userLoginResult)
}

/**
 * Get current user info (by cookie or request body)
 * - Accepts GetSelfUserInfoRequestDto in body as in original controller
 * - Returns exactly the same DTO as original controller
 */
export async function getSelfUserInfoHandler(request: FastifyRequest, reply: FastifyReply) {
    const raw = request.body as Partial<GetSelfUserInfoRequestDto>
    const getSelfUserInfoRequest: GetSelfUserInfoRequestDto = {
        uid: raw?.uid ?? Number((request.cookies as any)?.uid),
        token: raw?.token ?? (request.cookies as any)?.token,
    } as GetSelfUserInfoRequestDto

    const result = await getSelfUserInfoService(getSelfUserInfoRequest)
    return reply.send(result)
}

/**
 * Admin: get user info list
 * - Uses query parameters as in original Koa route
 * - Expects admin UUID/token from cookies
 * - Protected by RBAC guard in route layer
 */
export async function adminGetUserInfoHandler(request: FastifyRequest, reply: FastifyReply) {
    const q = request.query as any
    const adminGetUserInfoRequest: AdminGetUserInfoRequestDto = {
        isOnlyShowUserInfoUpdatedAfterReview: q?.isOnlyShowUserInfoUpdatedAfterReview === 'true' || q?.isOnlyShowUserInfoUpdatedAfterReview === true,
        sortBy: q?.sortBy,
        sortOrder: q?.sortOrder,
        uid: q?.uid !== undefined ? Number(q.uid) : undefined,
        pagination: {
            page: Number(q?.page ?? 1),
            pageSize: Number(q?.pageSize ?? 20),
        },
    }

    const adminUUID = (request.cookies as any)?.uuid ?? ''
    const adminToken = (request.cookies as any)?.token ?? ''
    const result = await adminGetUserInfoService(adminGetUserInfoRequest, adminUUID, adminToken)
    return reply.send(result)
}

/**
 * User registration
 * - Body: UserRegistrationRequestDto (same as original controller)
 * - Returns the same response as original Koa implementation
 */
export async function userRegistrationHandler(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as any
    try {
        const result = await (await import('../service/UserService.js')).userRegistrationService(body)
        return reply.send(result)
    } catch (error) {
        request.log.error({ err: error }, 'User registration failed')
        return reply.send({ success: false, message: 'User registration failed' })
    }
}
