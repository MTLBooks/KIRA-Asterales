import type { FastifyInstance } from 'fastify'
import { helloWorldHandler } from '../controller/hello.js'
import { userLoginHandler, getSelfUserInfoHandler, adminGetUserInfoHandler, userRegistrationHandler } from '../controller/user.js'
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
} from '../controller/video.js'
import {
    createVideoTagHandler,
    searchVideoTagHandler,
    getVideoTagByIdHandler,
} from '../controller/videotag.js'


import { getStgEnvBackEndSecretHandler } from '../controller/secret.js'

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
} from '../controller/block.js'


import { emitDanmakuHandler, getDanmakuListByKvidHandler } from '../controller/danmaku.js'
import {
    emitVideoCommentHandler,
    getVideoCommentListHandler,
    emitVideoCommentUpvoteHandler,
    emitVideoCommentDownvoteHandler,
    cancelVideoCommentUpvoteHandler,
    cancelVideoCommentDownvoteHandler,
    deleteSelfVideoCommentHandler,
    adminDeleteVideoCommentHandler,
} from '../controller/videocomment.js'

import { createFavoritesHandler, getFavoritesHandler } from '../controller/favorites.js'
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
} from '../controller/feed.js'

import {
    createOrUpdateUserBrowsingHistoryHandler,
    getUserBrowsingHistoryWithFilterHandler,
} from '../controller/history.js'

import {
    createRbacApiPathHandler,
    deleteRbacApiPathHandler,
    getRbacApiPathHandler,
    createRbacRoleHandler,
    deleteRbacRoleHandler,
    getRbacRoleHandler,
    updateApiPathPermissionsForRoleHandler,
    adminUpdateUserRoleHandler,
    adminGetUserRolesByUidHandler,
} from '../controller/rbac.js'

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
} from '../controller/user2fa.js'

import {
    requestSendVerificationCodeHandler,
    createInvitationCodeHandler,
    getMyInvitationCodeHandler,
    checkInvitationCodeHandler,
    adminGetUserByInvitationCodeHandler,
    updateUserEmailHandler,
    updateOrCreateUserInfoHandler,
    getUserInfoByUidHandler,
    userEmailExistsCheckHandler,
    checkUserTokenHandler,
    getUserAvatarUploadSignedUrlHandler,
    getUserSettingsHandler,
    updateOrCreateUserSettingsHandler,
    requestSendChangeEmailVerificationCodeHandler,
    requestSendChangePasswordVerificationCodeHandler,
    checkUsernameHandler,
    userExistsCheckByUIDHandler,
    adminEditUserInfoHandler as adminEditUserInfoHandlerNative,
    approveUserInfoHandler as approveUserInfoHandlerNative,
    adminClearUserInfoHandler as adminClearUserInfoHandlerNative,
} from '../controller/user-extra.js'

export default async function registerRoutes(fastify: FastifyInstance) {
    // Hello/test
    fastify.get('/', {}, helloWorldHandler)
    fastify.get('/02/koa/hello', {}, helloWorldHandler)

    // User (native Fastify handlers)
    fastify.post('/user/login', {}, userLoginHandler)
    fastify.post('/user/self', {}, getSelfUserInfoHandler)
    fastify.get('/user/adminGetUserInfo', { preHandler: [fastify.rbacGuard('uuid')] }, adminGetUserInfoHandler)

    // User (remaining via adapter)
    fastify.post('/user/registering', {}, userRegistrationHandler)
    fastify.post('/user/createTotpAuthenticator', { preHandler: [fastify.rbacGuard('uuid')] }, createUserTotpAuthenticatorHandler)
    fastify.post('/user/confirmUserTotpAuthenticator', { preHandler: [fastify.rbacGuard('uuid')] }, confirmUserTotpAuthenticatorHandler)
    fastify.delete('/user/deleteTotpAuthenticatorByTotpVerificationCodeController', { preHandler: [fastify.rbacGuard('uuid')] }, deleteTotpAuthenticatorByTotpVerificationCodeHandler)
    fastify.post('/user/createEmailAuthenticator', { preHandler: [fastify.rbacGuard('uuid')] }, createUserEmailAuthenticatorHandler)
    fastify.post('/user/sendUserEmailAuthenticator', {}, sendUserEmailAuthenticatorHandler)
    fastify.post('/user/sendDeleteUserEmailAuthenticator', { preHandler: [fastify.rbacGuard('uuid')] }, sendDeleteUserEmailAuthenticatorHandler)
    fastify.delete('/user/deleteUserEmailAuthenticator', { preHandler: [fastify.rbacGuard('uuid')] }, deleteUserEmailAuthenticatorHandler)
    fastify.get('/user/checkUserHave2FAByEmail', {}, checkUserHave2FAByEmailHandler)
    fastify.get('/user/checkUserHave2FAByUUID', { preHandler: [fastify.rbacGuard('uuid')] }, checkUserHave2FAByUUIDHandler)

    // User (native replacements for remaining endpoints)
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
    fastify.post('/user/requestSendVerificationCode', {}, requestSendVerificationCodeHandler)
    fastify.post('/user/createInvitationCode', { preHandler: [fastify.rbacGuard('uid')] }, createInvitationCodeHandler)
    fastify.get('/user/myInvitationCode', { preHandler: [fastify.rbacGuard('uid')] }, getMyInvitationCodeHandler)
    fastify.post('/user/checkInvitationCode', {}, checkInvitationCodeHandler)
    fastify.get('/user/getUserByInvitationCode', { preHandler: [fastify.rbacGuard('uuid')] }, adminGetUserByInvitationCodeHandler)
    fastify.post('/user/requestSendChangeEmailVerificationCode', { preHandler: [fastify.rbacGuard('uid')] }, requestSendChangeEmailVerificationCodeHandler)
    fastify.post('/user/requestSendChangePasswordVerificationCode', { preHandler: [fastify.rbacGuard('uid')] }, requestSendChangePasswordVerificationCodeHandler)
    fastify.post('/user/update/password', {}, (req, rep) => rep.code(501).send({ success: false, message: 'Not implemented in migration' }))
    fastify.get('/user/checkUsername', {}, checkUsernameHandler)
    fastify.get('/user/blocked/info', { preHandler: [fastify.rbacGuard('uuid')] }, getBlockedUserHandler)
    fastify.post('/user/adminEditUserInfo', { preHandler: [fastify.rbacGuard('uuid')] }, adminEditUserInfoHandlerNative)
    fastify.post('/user/approveUserInfo', { preHandler: [fastify.rbacGuard('uuid')] }, approveUserInfoHandlerNative)
    fastify.post('/user/adminClearUserInfo', { preHandler: [fastify.rbacGuard('uuid')] }, adminClearUserInfoHandlerNative)

    // Block (native Fastify)
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

    // Video (native Fastify handlers)
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

    // Danmaku (native Fastify)
    fastify.post('/video/danmaku/emit', { preHandler: [fastify.rbacGuard('uuid')] }, emitDanmakuHandler)
    fastify.get('/video/danmaku', {}, getDanmakuListByKvidHandler)

    // Video Comment (native Fastify)
    fastify.post('/video/comment/emit', { preHandler: [fastify.rbacGuard('uuid')] }, emitVideoCommentHandler)
    fastify.get('/video/comment', {}, getVideoCommentListHandler)
    fastify.post('/video/comment/upvote', { preHandler: [fastify.rbacGuard('uid')] }, emitVideoCommentUpvoteHandler)
    fastify.post('/video/comment/downvote', { preHandler: [fastify.rbacGuard('uid')] }, emitVideoCommentDownvoteHandler)
    fastify.delete('/video/comment/upvote/cancel', { preHandler: [fastify.rbacGuard('uid')] }, cancelVideoCommentUpvoteHandler)
    fastify.delete('/video/comment/downvote/cancel', { preHandler: [fastify.rbacGuard('uid')] }, cancelVideoCommentDownvoteHandler)
    fastify.delete('/video/comment/deleteSelfComment', { preHandler: [fastify.rbacGuard('uid')] }, deleteSelfVideoCommentHandler)
    fastify.delete('/video/comment/adminDeleteComment', { preHandler: [fastify.rbacGuard('uid')] }, adminDeleteVideoCommentHandler)

    // Video Tag (native Fastify handlers)
    fastify.post('/video/tag/create', { preHandler: [fastify.rbacGuard('uid')] }, createVideoTagHandler)
    fastify.get('/video/tag/search', {}, searchVideoTagHandler)
    fastify.post('/video/tag/get', {}, getVideoTagByIdHandler)

    // History (native Fastify)
    fastify.post('/history/merge', { preHandler: [fastify.rbacGuard('uuid')] }, createOrUpdateUserBrowsingHistoryHandler)
    fastify.get('/history/filter', { preHandler: [fastify.rbacGuard('uid')] }, getUserBrowsingHistoryWithFilterHandler)

    // Favorites (native Fastify)
    fastify.post('/favorites/create', { preHandler: [fastify.rbacGuard('uid')] }, createFavoritesHandler)
    fastify.get('/favorites', { preHandler: [fastify.rbacGuard('uid')] }, getFavoritesHandler)

    // Feed (native Fastify)
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

    // RBAC (native Fastify)
    fastify.post('/rbac/createRbacApiPath', { preHandler: [fastify.rbacGuard('uuid')] }, createRbacApiPathHandler)
    fastify.delete('/rbac/deleteRbacApiPath', { preHandler: [fastify.rbacGuard('uuid')] }, deleteRbacApiPathHandler)
    fastify.get('/rbac/getRbacApiPath', { preHandler: [fastify.rbacGuard('uuid')] }, getRbacApiPathHandler)
    fastify.post('/rbac/createRbacRole', { preHandler: [fastify.rbacGuard('uuid')] }, createRbacRoleHandler)
    fastify.delete('/rbac/deleteRbacRole', { preHandler: [fastify.rbacGuard('uuid')] }, deleteRbacRoleHandler)
    fastify.get('/rbac/getRbacRole', { preHandler: [fastify.rbacGuard('uuid')] }, getRbacRoleHandler)
    fastify.post('/rbac/updateApiPathPermissionsForRole', { preHandler: [fastify.rbacGuard('uuid')] }, updateApiPathPermissionsForRoleHandler)
    fastify.post('/rbac/adminUpdateUserRole', { preHandler: [fastify.rbacGuard('uuid')] }, adminUpdateUserRoleHandler)
    fastify.get('/rbac/adminGetUserRolesByUid', { preHandler: [fastify.rbacGuard('uuid')] }, adminGetUserRolesByUidHandler)

    // Secret (native Fastify)
    fastify.get('/secret/getStgEnvBackEndSecret', { preHandler: [fastify.rbacGuard('uuid')] }, getStgEnvBackEndSecretHandler)
} 