import type { FastifyInstance } from 'fastify'
import {
  userLoginHandler,
  getSelfUserInfoHandler,
  adminGetUserInfoHandler,
  userRegistrationHandler,
} from '../../controller/user.js'

import {
  userEmailExistsCheckHandler,
  userExistsCheckByUIDHandler,
  updateUserEmailHandler,
  updateOrCreateUserInfoHandler,
  getUserInfoByUidHandler,
  checkUserTokenHandler,
  getUserAvatarUploadSignedUrlHandler,
  getUserSettingsHandler,
  updateOrCreateUserSettingsHandler,
  requestSendVerificationCodeHandler,
  createInvitationCodeHandler,
  getMyInvitationCodeHandler,
  checkInvitationCodeHandler,
  adminGetUserByInvitationCodeHandler,
  requestSendChangeEmailVerificationCodeHandler,
  requestSendChangePasswordVerificationCodeHandler,
  checkUsernameHandler,
  adminEditUserInfoHandler as adminEditUserInfoHandlerNative,
  approveUserInfoHandler as approveUserInfoHandlerNative,
  adminClearUserInfoHandler as adminClearUserInfoHandlerNative,
} from '../../controller/user-extra.js'

import {
  createUserTotpAuthenticatorHandler,
  confirmUserTotpAuthenticatorHandler,
  deleteTotpAuthenticatorByTotpVerificationCodeHandler,
  createUserEmailAuthenticatorHandler,
  sendUserEmailAuthenticatorHandler,
  sendDeleteUserEmailAuthenticatorHandler,
  deleteUserEmailAuthenticatorHandler,
  checkUserHave2FAByEmailHandler,
  checkUserHave2FAByUUIDHandler,
} from '../../controller/user2fa.js'

import { getBlockedUserHandler } from '../../controller/block.js'

export default async function registerUserRoutes (fastify: FastifyInstance) {
  // Basic auth & info
  fastify.post('/user/login', {}, userLoginHandler)
  fastify.post('/user/self', {}, getSelfUserInfoHandler)
  fastify.get('/user/adminGetUserInfo', { preHandler: [fastify.rbacGuard('uuid')] }, adminGetUserInfoHandler)
  fastify.post('/user/registering', {}, userRegistrationHandler)

  // 2FA
  fastify.post('/user/createTotpAuthenticator', { preHandler: [fastify.rbacGuard('uuid')] }, createUserTotpAuthenticatorHandler)
  fastify.post('/user/confirmUserTotpAuthenticator', { preHandler: [fastify.rbacGuard('uuid')] }, confirmUserTotpAuthenticatorHandler)
  fastify.delete('/user/deleteTotpAuthenticatorByTotpVerificationCodeController', { preHandler: [fastify.rbacGuard('uuid')] }, deleteTotpAuthenticatorByTotpVerificationCodeHandler)
  fastify.post('/user/createEmailAuthenticator', { preHandler: [fastify.rbacGuard('uuid')] }, createUserEmailAuthenticatorHandler)
  fastify.post('/user/sendUserEmailAuthenticator', {}, sendUserEmailAuthenticatorHandler)
  fastify.post('/user/sendDeleteUserEmailAuthenticator', { preHandler: [fastify.rbacGuard('uuid')] }, sendDeleteUserEmailAuthenticatorHandler)
  fastify.delete('/user/deleteUserEmailAuthenticator', { preHandler: [fastify.rbacGuard('uuid')] }, deleteUserEmailAuthenticatorHandler)
  fastify.get('/user/checkUserHave2FAByEmail', {}, checkUserHave2FAByEmailHandler)
  fastify.get('/user/checkUserHave2FAByUUID', { preHandler: [fastify.rbacGuard('uuid')] }, checkUserHave2FAByUUIDHandler)

  // Profile / settings
  fastify.get('/user/existsCheck', {}, userEmailExistsCheckHandler)
  fastify.get('/user/exists', {}, userExistsCheckByUIDHandler)
  fastify.post('/user/update/email', { preHandler: [fastify.rbacGuard('uid')] }, updateUserEmailHandler)
  fastify.post('/user/update/info', { preHandler: [fastify.rbacGuard('uuid')] }, updateOrCreateUserInfoHandler)
  fastify.get('/user/info', {}, getUserInfoByUidHandler)
  fastify.get('/user/check', {}, checkUserTokenHandler)
  fastify.get('/user/logout', {}, (req, rep) => rep.send({ success: true }))
  fastify.get('/user/avatar/preUpload', { preHandler: [fastify.rbacGuard('uid')] }, getUserAvatarUploadSignedUrlHandler)
  fastify.post('/user/settings', { preHandler: [fastify.rbacGuard('uid')] }, getUserSettingsHandler)
  fastify.post('/user/settings/update', { preHandler: [fastify.rbacGuard('uid')] }, updateOrCreateUserSettingsHandler)

  // Invitation & verification codes
  fastify.post('/user/requestSendVerificationCode', {}, requestSendVerificationCodeHandler)
  fastify.post('/user/createInvitationCode', { preHandler: [fastify.rbacGuard('uid')] }, createInvitationCodeHandler)
  fastify.get('/user/myInvitationCode', { preHandler: [fastify.rbacGuard('uid')] }, getMyInvitationCodeHandler)
  fastify.post('/user/checkInvitationCode', {}, checkInvitationCodeHandler)
  fastify.get('/user/getUserByInvitationCode', { preHandler: [fastify.rbacGuard('uuid')] }, adminGetUserByInvitationCodeHandler)
  fastify.post('/user/requestSendChangeEmailVerificationCode', { preHandler: [fastify.rbacGuard('uid')] }, requestSendChangeEmailVerificationCodeHandler)
  fastify.post('/user/requestSendChangePasswordVerificationCode', { preHandler: [fastify.rbacGuard('uid')] }, requestSendChangePasswordVerificationCodeHandler)
  fastify.post('/user/update/password', {}, (req, rep) => rep.code(501).send({ success: false, message: 'Not implemented in migration' }))
  fastify.get('/user/checkUsername', {}, checkUsernameHandler)

  // Blocked info listing handled in block module

  // Admin edits
  fastify.post('/user/adminEditUserInfo', { preHandler: [fastify.rbacGuard('uuid')] }, adminEditUserInfoHandlerNative)
  fastify.post('/user/approveUserInfo', { preHandler: [fastify.rbacGuard('uuid')] }, approveUserInfoHandlerNative)
  fastify.post('/user/adminClearUserInfo', { preHandler: [fastify.rbacGuard('uuid')] }, adminClearUserInfoHandlerNative)
} 