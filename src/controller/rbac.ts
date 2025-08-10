import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  createRbacApiPathService,
  deleteRbacApiPathService,
  getRbacApiPathService,
  createRbacRoleService,
  deleteRbacRoleService,
  getRbacRoleService,
  updateApiPathPermissionsForRoleService,
  adminUpdateUserRoleService,
  adminGetUserRolesByUidService,
} from '../service/RbacService.js'
import type {
  AdminGetUserRolesByUidRequestDto,
  AdminUpdateUserRoleRequestDto,
  CreateRbacApiPathRequestDto,
  CreateRbacRoleRequestDto,
  DeleteRbacApiPathRequestDto,
  DeleteRbacRoleRequestDto,
  GetRbacApiPathRequestDto,
  GetRbacRoleRequestDto,
  UpdateApiPathPermissionsForRoleRequestDto,
} from './RbacControllerDto.js'

/**
 * Create an API path rule (admin)
 * - Cookies: uuid, token
 * - Body: CreateRbacApiPathRequestDto
 */
export async function createRbacApiPathHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid ?? ''
  const token = (request.cookies as any)?.token ?? ''
  const body = request.body as CreateRbacApiPathRequestDto
  const result = await createRbacApiPathService(body, uuid, token)
  return reply.send(result)
}

/**
 * Delete an API path rule (admin)
 * - Cookies: uuid, token
 * - Body: DeleteRbacApiPathRequestDto
 */
export async function deleteRbacApiPathHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid ?? ''
  const token = (request.cookies as any)?.token ?? ''
  const body = request.body as DeleteRbacApiPathRequestDto
  const result = await deleteRbacApiPathService(body, uuid, token)
  return reply.send(result)
}

/**
 * Query API path rules (admin)
 * - Cookies: uuid, token
 * - Query -> GetRbacApiPathRequestDto
 */
export async function getRbacApiPathHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const body: GetRbacApiPathRequestDto = {
    search: {
      apiPath: q?.apiPath,
      apiPathType: q?.apiPathType,
      apiPathColor: q?.apiPathColor,
      apiPathDescription: q?.apiPathDescription,
    },
    pagination: { page: Number(q?.page), pageSize: Number(q?.pageSize) },
  }
  const uuid = (request.cookies as any)?.uuid ?? ''
  const token = (request.cookies as any)?.token ?? ''
  const result = await getRbacApiPathService(body, uuid, token)
  return reply.send(result)
}

/**
 * Create a role (admin)
 * - Cookies: uuid, token
 * - Body: CreateRbacRoleRequestDto
 */
export async function createRbacRoleHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid ?? ''
  const token = (request.cookies as any)?.token ?? ''
  const body = request.body as CreateRbacRoleRequestDto
  const result = await createRbacRoleService(body, uuid, token)
  return reply.send(result)
}

/**
 * Delete a role (admin)
 * - Cookies: uuid, token
 * - Body: DeleteRbacRoleRequestDto
 */
export async function deleteRbacRoleHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid ?? ''
  const token = (request.cookies as any)?.token ?? ''
  const body = request.body as DeleteRbacRoleRequestDto
  const result = await deleteRbacRoleService(body, uuid, token)
  return reply.send(result)
}

/**
 * Query roles (admin)
 * - Cookies: uuid, token
 * - Query -> GetRbacRoleRequestDto
 */
export async function getRbacRoleHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const body: GetRbacRoleRequestDto = {
    search: {
      roleName: q?.roleName,
      roleType: q?.roleType,
      roleColor: q?.roleColor,
      roleDescription: q?.roleDescription,
    },
    pagination: { page: Number(q?.page), pageSize: Number(q?.pageSize) },
  }
  const uuid = (request.cookies as any)?.uuid ?? ''
  const token = (request.cookies as any)?.token ?? ''
  const result = await getRbacRoleService(body, uuid, token)
  return reply.send(result)
}

/**
 * Update API path permissions for a role (admin)
 * - Cookies: uuid, token
 * - Body: UpdateApiPathPermissionsForRoleRequestDto
 */
export async function updateApiPathPermissionsForRoleHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid ?? ''
  const token = (request.cookies as any)?.token ?? ''
  const body = request.body as UpdateApiPathPermissionsForRoleRequestDto
  const result = await updateApiPathPermissionsForRoleService(body, uuid, token)
  return reply.send(result)
}

/**
 * Admin update a user's roles
 * - Cookies: uuid, token
 * - Body: AdminUpdateUserRoleRequestDto
 */
export async function adminUpdateUserRoleHandler(request: FastifyRequest, reply: FastifyReply) {
  const adminUuid = (request.cookies as any)?.uuid ?? ''
  const adminToken = (request.cookies as any)?.token ?? ''
  const body = request.body as AdminUpdateUserRoleRequestDto
  const result = await adminUpdateUserRoleService(body, adminUuid, adminToken)
  return reply.send(result)
}

/**
 * Admin get roles by uid
 * - Cookies: uuid, token
 * - Query: uid
 */
export async function adminGetUserRolesByUidHandler(request: FastifyRequest, reply: FastifyReply) {
  const adminUuid = (request.cookies as any)?.uuid ?? ''
  const adminToken = (request.cookies as any)?.token ?? ''
  const q = request.query as any
  const body: AdminGetUserRolesByUidRequestDto = { uid: Number(q?.uid) }
  const result = await adminGetUserRolesByUidService(body, adminUuid, adminToken)
  return reply.send(result)
} 