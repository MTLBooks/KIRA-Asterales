import type { FastifyReply, FastifyRequest } from 'fastify'
import { getStgEnvBackEndSecretService } from '../service/ConsoleSecretService.js'

/**
 * Get staging environment backend secrets (RBAC via preHandler)
 */
export async function getStgEnvBackEndSecretHandler(request: FastifyRequest, reply: FastifyReply) {
  const uuid = (request.cookies as any)?.uuid ?? ''
  const token = (request.cookies as any)?.token ?? ''
  const result = await getStgEnvBackEndSecretService(uuid, token)
  return reply.send(result)
} 