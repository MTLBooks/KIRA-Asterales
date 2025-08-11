import type { FastifyInstance } from 'fastify'
import { createOrUpdateUserBrowsingHistoryHandler, getUserBrowsingHistoryWithFilterHandler } from '../../controller/history.js'

export default async function registerHistoryRoutes (fastify: FastifyInstance) {
  fastify.post('/history/merge', { preHandler: [fastify.rbacGuard('uuid')] }, createOrUpdateUserBrowsingHistoryHandler)
  fastify.get('/history/filter', { preHandler: [fastify.rbacGuard('uid')] }, getUserBrowsingHistoryWithFilterHandler)
} 