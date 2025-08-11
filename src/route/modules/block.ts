import type { FastifyInstance } from 'fastify'
import {
  blockUserByUidHandler,
  hideUserByUidHandler,
  blockKeywordHandler,
  blockTagHandler,
  addRegexHandler,
  unblockUserByUidHandler,
  showUserByUidHandler,
  unblockKeywordHandler,
  unblockTagHandler,
  removeRegexHandler,
  getBlockListHandler,
  getBlockedUserHandler,
} from '../../controller/block.js'

export default async function registerBlockRoutes (fastify: FastifyInstance) {
  fastify.post('/block/user', { preHandler: [fastify.rbacGuard('uuid')] }, blockUserByUidHandler)
  fastify.post('/block/hideuser', { preHandler: [fastify.rbacGuard('uuid')] }, hideUserByUidHandler)
  fastify.post('/block/tag', { preHandler: [fastify.rbacGuard('uuid')] }, blockTagHandler)
  fastify.post('/block/keyword', { preHandler: [fastify.rbacGuard('uuid')] }, blockKeywordHandler)
  fastify.post('/block/regex', { preHandler: [fastify.rbacGuard('uuid')] }, addRegexHandler)
  fastify.delete('/block/delete/user', { preHandler: [fastify.rbacGuard('uuid')] }, unblockUserByUidHandler)
  fastify.delete('/block/delete/hideuser', { preHandler: [fastify.rbacGuard('uuid')] }, showUserByUidHandler)
  fastify.delete('/block/delete/tag', { preHandler: [fastify.rbacGuard('uuid')] }, unblockTagHandler)
  fastify.delete('/block/delete/keyword', { preHandler: [fastify.rbacGuard('uuid')] }, unblockKeywordHandler)
  fastify.delete('/block/delete/regex', { preHandler: [fastify.rbacGuard('uuid')] }, removeRegexHandler)
  fastify.get('/block/list', { preHandler: [fastify.rbacGuard('uuid')] }, getBlockListHandler)
  fastify.get('/user/blocked/info', { preHandler: [fastify.rbacGuard('uuid')] }, getBlockedUserHandler)
} 