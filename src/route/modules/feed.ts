import type { FastifyInstance } from 'fastify'
import {
  followingUploaderHandler,
  unfollowingUploaderHandler,
  createFeedGroupHandler,
  addNewUid2FeedGroupHandler,
  removeUidFromFeedGroupHandler,
  deleteFeedGroupHandler,
  getFeedGroupCoverUploadSignedUrlHandler,
  createOrEditFeedGroupInfoHandler,
  administratorApproveFeedGroupInfoChangeHandler,
  administratorDeleteFeedGroupHandler,
  getFeedGroupListHandler,
  getFeedContentHandler,
} from '../../controller/feed.js'

export default async function registerFeedRoutes (fastify: FastifyInstance) {
  fastify.post('/feed/following', { preHandler: [fastify.rbacGuard('uuid')] }, followingUploaderHandler)
  fastify.post('/feed/unfollowing', { preHandler: [fastify.rbacGuard('uuid')] }, unfollowingUploaderHandler)
  fastify.post('/feed/createFeedGroup', { preHandler: [fastify.rbacGuard('uuid')] }, createFeedGroupHandler)
  fastify.post('/feed/addNewUid2FeedGroup', { preHandler: [fastify.rbacGuard('uuid')] }, addNewUid2FeedGroupHandler)
  fastify.post('/feed/removeUidFromFeedGroup', { preHandler: [fastify.rbacGuard('uuid')] }, removeUidFromFeedGroupHandler)
  fastify.delete('/feed/deleteFeedGroup', { preHandler: [fastify.rbacGuard('uuid')] }, deleteFeedGroupHandler)
  fastify.get('/feed/getFeedGroupCoverUploadSignedUrl', { preHandler: [fastify.rbacGuard('uuid')] }, getFeedGroupCoverUploadSignedUrlHandler)
  fastify.post('/feed/createOrEditFeedGroupInfo', { preHandler: [fastify.rbacGuard('uuid')] }, createOrEditFeedGroupInfoHandler)
  fastify.post('/feed/administratorApproveFeedGroupInfoChange', { preHandler: [fastify.rbacGuard('uuid')] }, administratorApproveFeedGroupInfoChangeHandler)
  fastify.delete('/feed/administratorDeleteFeedGroup', { preHandler: [fastify.rbacGuard('uuid')] }, administratorDeleteFeedGroupHandler)
  fastify.get('/feed/getFeedGroupList', { preHandler: [fastify.rbacGuard('uuid')] }, getFeedGroupListHandler)
  fastify.get('/feed/getFeedContent', { preHandler: [fastify.rbacGuard('uuid')] }, getFeedContentHandler)
} 