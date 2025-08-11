import type { FastifyInstance } from 'fastify'
import { uploadChapterHandler, getChapterByIdHandler, getChaptersByNovelIdHandler, deleteChapterHandler } from '../../controller/chapter.js'

export default async function registerChapterRoutes (fastify: FastifyInstance) {
  fastify.post('/chapter/upload', { preHandler: [fastify.rbacGuard('uid')] }, uploadChapterHandler)
  fastify.get('/chapter', {}, getChapterByIdHandler)
  fastify.get('/chapter/novel', {}, getChaptersByNovelIdHandler)
  fastify.delete('/chapter/delete', { preHandler: [fastify.rbacGuard('uid')] }, deleteChapterHandler)
} 