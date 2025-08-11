import type { FastifyInstance } from 'fastify'
import {
  createRbacApiPathHandler,
  deleteRbacApiPathHandler,
  getRbacApiPathHandler,
  createRbacRoleHandler,
  deleteRbacRoleHandler,
  getRbacRoleHandler,
  updateApiPathPermissionsForRoleHandler,
  adminUpdateUserRoleHandler,
  adminGetUserRolesByUidHandler,
} from '../../controller/rbac.js'

export default async function registerRbacRoutes (fastify: FastifyInstance) {
  fastify.post('/rbac/createRbacApiPath', { preHandler: [fastify.rbacGuard('uuid')] }, createRbacApiPathHandler)
  fastify.delete('/rbac/deleteRbacApiPath', { preHandler: [fastify.rbacGuard('uuid')] }, deleteRbacApiPathHandler)
  fastify.get('/rbac/getRbacApiPath', { preHandler: [fastify.rbacGuard('uuid')] }, getRbacApiPathHandler)
  fastify.post('/rbac/createRbacRole', { preHandler: [fastify.rbacGuard('uuid')] }, createRbacRoleHandler)
  fastify.delete('/rbac/deleteRbacRole', { preHandler: [fastify.rbacGuard('uuid')] }, deleteRbacRoleHandler)
  fastify.get('/rbac/getRbacRole', { preHandler: [fastify.rbacGuard('uuid')] }, getRbacRoleHandler)
  fastify.post('/rbac/updateApiPathPermissionsForRole', { preHandler: [fastify.rbacGuard('uuid')] }, updateApiPathPermissionsForRoleHandler)
  fastify.post('/rbac/adminUpdateUserRole', { preHandler: [fastify.rbacGuard('uuid')] }, adminUpdateUserRoleHandler)
  fastify.get('/rbac/adminGetUserRolesByUid', { preHandler: [fastify.rbacGuard('uuid')] }, adminGetUserRolesByUidHandler)
} 