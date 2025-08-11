import type { FastifyInstance } from 'fastify'
import { createFavoritesHandler, getFavoritesHandler } from '../../controller/favorites.js'

export default async function registerFavoritesRoutes (fastify: FastifyInstance) {
  fastify.post('/favorites/create', { preHandler: [fastify.rbacGuard('uid')] }, createFavoritesHandler)
  fastify.get('/favorites', { preHandler: [fastify.rbacGuard('uid')] }, getFavoritesHandler)
} 