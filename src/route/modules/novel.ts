import type { FastifyInstance } from 'fastify'
import { uploadNovelHandler, getNovelByIdHandler, searchNovelByKeywordHandler, deleteNovelHandler } from '../../controller/novel.js'
import { createNovelTagHandler, searchNovelTagHandler, getNovelTagByIdHandler } from '../../controller/noveltag.js'
import { createNovelGenreHandler, searchNovelGenreHandler, getNovelGenreByIdHandler } from '../../controller/novelgenre.js'
import { getThumbNovelHandler, checkNovelExistHandler, getNovelByUidHandler, searchNovelByTagHandler, getNovelCoverSignedUrlHandler, getPendingReviewNovelHandler, approvePendingReviewNovelHandler } from '../../controller/novel.js'
import {
  emitNovelCommentHandler,
  getNovelCommentListHandler,
  emitNovelCommentUpvoteHandler,
  emitNovelCommentDownvoteHandler,
  cancelNovelCommentUpvoteHandler,
  cancelNovelCommentDownvoteHandler,
  deleteSelfNovelCommentHandler,
  adminDeleteNovelCommentHandler,
} from '../../controller/novelcomment.js'

export default async function registerNovelRoutes (fastify: FastifyInstance) {
  // Novel CRUD
  fastify.post('/novel/upload', { preHandler: [fastify.rbacGuard('uid')] }, uploadNovelHandler)
  fastify.get('/novel', {}, getNovelByIdHandler)
  fastify.get('/novel/search', {}, searchNovelByKeywordHandler)
  fastify.delete('/novel/delete', { preHandler: [fastify.rbacGuard('uid')] }, deleteNovelHandler)

  // Utility routes
  fastify.get('/novel/home', {}, getThumbNovelHandler)
  fastify.get('/novel/exists', {}, checkNovelExistHandler)
  fastify.get('/novel/user', {}, getNovelByUidHandler)
  fastify.post('/novel/search/tag', {}, searchNovelByTagHandler)
  fastify.get('/novel/cover/preUpload', { preHandler: [fastify.rbacGuard('uid')] }, getNovelCoverSignedUrlHandler)

  // Tag
  fastify.post('/novel/tag/create', { preHandler: [fastify.rbacGuard('uid')] }, createNovelTagHandler)
  fastify.get('/novel/tag/search', {}, searchNovelTagHandler)
  fastify.post('/novel/tag/get', {}, getNovelTagByIdHandler)

  // Genre
  fastify.post('/novel/genre/create', { preHandler: [fastify.rbacGuard('uid')] }, createNovelGenreHandler)
  fastify.get('/novel/genre/search', {}, searchNovelGenreHandler)
  fastify.post('/novel/genre/get', {}, getNovelGenreByIdHandler)

  // Comment (stub)
  fastify.post('/novel/comment/emit', { preHandler: [fastify.rbacGuard('uuid')] }, emitNovelCommentHandler)
  fastify.get('/novel/comment', {}, getNovelCommentListHandler)
  fastify.post('/novel/comment/upvote', { preHandler: [fastify.rbacGuard('uid')] }, emitNovelCommentUpvoteHandler)
  fastify.post('/novel/comment/downvote', { preHandler: [fastify.rbacGuard('uid')] }, emitNovelCommentDownvoteHandler)
  fastify.delete('/novel/comment/upvote/cancel', { preHandler: [fastify.rbacGuard('uid')] }, cancelNovelCommentUpvoteHandler)
  fastify.delete('/novel/comment/downvote/cancel', { preHandler: [fastify.rbacGuard('uid')] }, cancelNovelCommentDownvoteHandler)
  fastify.delete('/novel/comment/deleteSelfComment', { preHandler: [fastify.rbacGuard('uid')] }, deleteSelfNovelCommentHandler)
  fastify.delete('/novel/comment/adminDeleteComment', { preHandler: [fastify.rbacGuard('uid')] }, adminDeleteNovelCommentHandler)

  // Admin pending review (stub)
  fastify.get('/novel/pending', { preHandler: [fastify.rbacGuard('uid')] }, getPendingReviewNovelHandler)
  fastify.post('/novel/pending/approved', { preHandler: [fastify.rbacGuard('uid')] }, approvePendingReviewNovelHandler)
} 