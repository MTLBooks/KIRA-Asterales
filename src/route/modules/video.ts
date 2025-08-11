import type { FastifyInstance } from 'fastify'

// Core video handlers
import {
  uploadVideoHandler,
  getThumbVideoHandler,
  checkVideoExistHandler,
  getVideoByKvidHandler,
  getVideoByUidHandler,
  searchVideoByKeywordHandler,
  getVideoTusEndpointHandler,
  getVideoCoverSignedUrlHandler,
  searchVideoByTagHandler,
  deleteVideoByKvidHandler,
  getPendingReviewVideoHandler,
  approvePendingReviewVideoHandler,
} from '../../controller/video.js'

// Danmaku
import { emitDanmakuHandler, getDanmakuListByKvidHandler } from '../../controller/danmaku.js'

// Video Comment
import {
  emitVideoCommentHandler,
  getVideoCommentListHandler,
  emitVideoCommentUpvoteHandler,
  emitVideoCommentDownvoteHandler,
  cancelVideoCommentUpvoteHandler,
  cancelVideoCommentDownvoteHandler,
  deleteSelfVideoCommentHandler,
  adminDeleteVideoCommentHandler,
} from '../../controller/videocomment.js'

// Video Tag
import {
  createVideoTagHandler,
  searchVideoTagHandler,
  getVideoTagByIdHandler,
} from '../../controller/videotag.js'

export default async function registerVideoRoutes (fastify: FastifyInstance) {
  // Video core
  fastify.post('/video/upload', { preHandler: [fastify.rbacGuard('uid')] }, uploadVideoHandler)
  fastify.get('/video/home', {}, getThumbVideoHandler)
  fastify.get('/video/exists', {}, checkVideoExistHandler)
  fastify.get('/video', {}, getVideoByKvidHandler)
  fastify.get('/video/user', {}, getVideoByUidHandler)
  fastify.get('/video/search', {}, searchVideoByKeywordHandler)
  fastify.post('/video/search/tag', {}, searchVideoByTagHandler)
  fastify.post('/video/tus', { preHandler: [fastify.rbacGuard('uid')] }, getVideoTusEndpointHandler)
  fastify.get('/video/cover/preUpload', { preHandler: [fastify.rbacGuard('uid')] }, getVideoCoverSignedUrlHandler)
  fastify.delete('/video/delete', { preHandler: [fastify.rbacGuard('uid')] }, deleteVideoByKvidHandler)
  fastify.get('/video/pending', { preHandler: [fastify.rbacGuard('uid')] }, getPendingReviewVideoHandler)
  fastify.post('/video/pending/approved', { preHandler: [fastify.rbacGuard('uid')] }, approvePendingReviewVideoHandler)

  // Danmaku
  fastify.post('/video/danmaku/emit', { preHandler: [fastify.rbacGuard('uuid')] }, emitDanmakuHandler)
  fastify.get('/video/danmaku', {}, getDanmakuListByKvidHandler)

  // Video Comment
  fastify.post('/video/comment/emit', { preHandler: [fastify.rbacGuard('uuid')] }, emitVideoCommentHandler)
  fastify.get('/video/comment', {}, getVideoCommentListHandler)
  fastify.post('/video/comment/upvote', { preHandler: [fastify.rbacGuard('uid')] }, emitVideoCommentUpvoteHandler)
  fastify.post('/video/comment/downvote', { preHandler: [fastify.rbacGuard('uid')] }, emitVideoCommentDownvoteHandler)
  fastify.delete('/video/comment/upvote/cancel', { preHandler: [fastify.rbacGuard('uid')] }, cancelVideoCommentUpvoteHandler)
  fastify.delete('/video/comment/downvote/cancel', { preHandler: [fastify.rbacGuard('uid')] }, cancelVideoCommentDownvoteHandler)
  fastify.delete('/video/comment/deleteSelfComment', { preHandler: [fastify.rbacGuard('uid')] }, deleteSelfVideoCommentHandler)
  fastify.delete('/video/comment/adminDeleteComment', { preHandler: [fastify.rbacGuard('uid')] }, adminDeleteVideoCommentHandler)

  // Video Tag
  fastify.post('/video/tag/create', { preHandler: [fastify.rbacGuard('uid')] }, createVideoTagHandler)
  fastify.get('/video/tag/search', {}, searchVideoTagHandler)
  fastify.post('/video/tag/get', {}, getVideoTagByIdHandler)
} 