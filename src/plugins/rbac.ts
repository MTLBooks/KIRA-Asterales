import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify'
import { checkUserByRbac } from '../service/RbacService.js'

/**
 * RBAC guard plugin for Fastify
 * - Use fastify.rbacGuard('uuid'|'uid') in route preHandler to enforce permissions
 * - Reads credentials from cookies (uuid/uid)
 * - Uses routeOptions.url (or request.url) as apiPath identifier
 */
export default fp(async function rbacPlugin(fastify: FastifyInstance) {
  fastify.decorate('rbacGuard', (subject: 'uuid' | 'uid') => async (request: FastifyRequest, reply: FastifyReply) => {
    if (process.env.RBAC_DISABLE === 'true') return // bypass in dev

    const uuid = (request.cookies as any)?.uuid as string | undefined
    const uidRaw = (request.cookies as any)?.uid as string | undefined
    const uid = uidRaw ? Number(uidRaw) : undefined
    const apiPath = (request.routeOptions?.url as string) || request.url

    const params = subject === 'uuid' ? { uuid, apiPath } : { uid, apiPath }
    const result = await checkUserByRbac(params as any)
    if (result.status !== 200) return reply.code(403).send(result.message)
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    rbacGuard: (subject: 'uuid' | 'uid') => (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => void | Promise<void>
  }
} 