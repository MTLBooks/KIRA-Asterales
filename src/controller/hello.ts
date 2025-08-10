import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Hello endpoint
 * - Query: something
 * - Returns a friendly greeting string
 */
export async function helloWorldHandler(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as any
  const something = q?.something
  const body = something === 'Beautiful' ? 'Hello Beautiful World' : 'Hello World'
  return reply.send(body)
} 