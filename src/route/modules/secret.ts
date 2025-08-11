import type { FastifyInstance } from 'fastify'
import { getStgEnvBackEndSecretHandler } from '../../controller/secret.js'

export default async function registerSecretRoutes (fastify: FastifyInstance) {
  fastify.get('/secret/getStgEnvBackEndSecret', { preHandler: [fastify.rbacGuard('uuid')] }, getStgEnvBackEndSecretHandler)
} 