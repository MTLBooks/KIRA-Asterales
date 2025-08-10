import { InferSchemaType, PipelineStage } from "mongoose";
import safeRegex from 'safe-regex';
import { AddRegexRequestDto, AddRegexResponseDto, BlockKeywordRequestDto, BlockKeywordResponseDto, BlockTagRequestDto, BlockTagResponseDto, BlockUserByUidRequestDto, BlockUserByUidResponseDto, CheckContentIsBlockedRequestDto, CheckIsBlockedByOtherUserRequestDto, CheckIsBlockedByOtherUserResponseDto, CheckIsBlockedResponseDto, CheckTagIsBlockedRequestDto, CheckUserIsBlockedRequestDto, CheckUserIsBlockedResponseDto, GetBlockListRequestDto, GetBlockListResponseDto, HideUserByUidRequestDto, HideUserByUidResponseDto, RemoveRegexRequestDto, RemoveRegexResponseDto, ShowUserByUidRequestDto, ShowUserByUidResponseDto, UnblockKeywordRequestDto, UnblockKeywordResponseDto, UnblockTagRequestDto, UnblockTagResponseDto, UnblockUserByUidRequestDto, UnblockUserByUidResponseDto } from "../controller/BlockControllerDto.js";
import { checkUserExistsByUIDService, checkUserTokenByUuidService, getUserUid, getUserUuid } from "./UserService.js";
import { QueryType, SelectType } from "../dbPool/DbClusterPoolTypes.js";
import { abortAndEndSession, commitAndEndSession, createAndStartSession } from "../common/MongoDBSessionTool.js";
import { selectDataFromMongoDB, insertData2MongoDB, deleteDataFromMongoDB, selectDataByAggregateFromMongoDB } from "../dbPool/DbClusterPool.js";
import { BlockListSchema, UnblockListSchema } from "../dbPool/schema/BlockSchema.js";

const MAX_KEYWORD_LENGTH = 30; // Max keyword length
const MAX_REGEX_LENGTH = 30; // Max regex length

/**
 * Block user
 * @param blockUserByUidRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 */
export const blockUserByUidService = async (blockUserByUidRequest: BlockUserByUidRequestDto, uuid: string, token: string): Promise<BlockUserByUidResponseDto> => {
	try {
		if (!checkBlockUserByUidRequest(blockUserByUidRequest)) {
			return { success: false, message: 'Invalid block user request payload' }
		}

		const { blockUid } = blockUserByUidRequest
		if (!checkUserExistsByUIDService({ uid: blockUid })) {
			console.error('ERROR', 'Block user failed: user not found')
			return { success: false, message: 'Block user failed: user not found' }
		}

		const userUuid = await getUserUuid(blockUid)
		const operatorUid = await getUserUid(uuid)

		if (!userUuid || !operatorUid) {
			console.error('ERROR', 'Block user failed: user not found')
			return { success: false, message: 'Block user failed: user not found' }
		}

		if (userUuid === uuid) {
			console.error('ERROR', 'Block user failed: cannot block yourself')
			return { success: false, message: 'Block user failed: cannot block yourself' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Block user failed: invalid token')
			return { success: false, message: 'Block user failed: invalid token' }
		}

		if (await getBlocklistCount('block', uuid) > 500) {
			return { success: false, message: 'Block user failed: block list limit reached' } // TODO: add followers count check
		}

		const now = new Date().getTime()
		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		type BlockListSchemaType = InferSchemaType<typeof blockListSchemaInstance>
		const blockListWhere: QueryType<BlockListSchemaType> = {
			type: 'block',
			value: userUuid,
			operatorUUID: uuid,
		}
		const blockListSelect: SelectType<BlockListSchemaType> = {
			operatorUid: 1,
		}
		const blockListResult = await selectDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSelect, blockListSchemaInstance, blockListCollectionName)
		if (blockListResult.success && blockListResult.result && blockListResult.result.length > 0) {
			return { success: false, message: 'Block user failed: already blocked' }
		}

		const blockListData: BlockListSchemaType = {
			type: 'block',
			value: userUuid,
			operatorUid,
			operatorUUID: uuid,
			createDateTime: now,
		}

		const insertResult = await insertData2MongoDB<BlockListSchemaType>(blockListData, blockListSchemaInstance, blockListCollectionName)
		if (!insertResult.success) {
			console.error('ERROR', 'Block user failed: query failed')
			return { success: false, message: 'Block user failed: query failed' }
		}
		return { success: true, message: 'Block user success' }
	}
	catch (error) {
		console.error('ERROR', 'Block user failed: unknown error', error)
		return { success: false, message: 'Block user failed' }
	}
}

/**
 * Hide user
 * @param blockTagRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const hideUserByUidService = async (hideUserByUidRequest: HideUserByUidRequestDto, uuid: string, token: string): Promise<HideUserByUidResponseDto> => {
	try {
		if (!checkHideUserByUidRequest(hideUserByUidRequest)) {
			return { success: false, message: 'Hide user failed: invalid payload' }
		}

		const { hideUid } = hideUserByUidRequest
		if (!checkUserExistsByUIDService({ uid: hideUid })) {
			console.error('ERROR', 'Hide user failed: user not found')
			return { success: false, message: 'Hide user failed: user not found' }
		}

		const userUuid = await getUserUuid(hideUid)
		const operatorUid = await getUserUid(uuid)

		if (!userUuid || !operatorUid) {
			console.error('ERROR', 'Hide user failed: user not found')
			return { success: false, message: 'Hide user failed: user not found' }
		}
		if (userUuid === uuid) {
			console.error('ERROR', 'Hide user failed: cannot hide yourself')
			return { success: false, message: 'Hide user failed: cannot hide yourself' }
		}
		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Hide user failed: invalid token')
			return { success: false, message: 'Hide user failed: invalid token' }
		}

		if (await getBlocklistCount('hide', uuid) > 500) {
			return { success: false, message: 'Hide user failed: hide list limit reached' } // TODO: add followers count check
		}

		const now = new Date().getTime()
		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		type BlockListSchemaType = InferSchemaType<typeof blockListSchemaInstance>
		const blockListWhere: QueryType<BlockListSchemaType> = {
			type: 'hide',
			value: userUuid,
			operatorUUID: uuid,
		}
		const blockListSelect: SelectType<BlockListSchemaType> = {
			operatorUid: 1,
		}
		const blockListResult = await selectDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSelect, blockListSchemaInstance, blockListCollectionName)
		if (blockListResult.success && blockListResult.result && blockListResult.result.length > 0) {
			return { success: false, message: 'Hide user failed: already hidden' }
		}

		const blockListData: BlockListSchemaType = {
			type: 'hide',
			value: userUuid,
			operatorUid,
			operatorUUID: uuid,
			createDateTime: now,
		}

		const insertResult = await insertData2MongoDB<BlockListSchemaType>(blockListData, blockListSchemaInstance, blockListCollectionName)
		if (!insertResult.success) {
			console.error('ERROR', 'Hide user failed: query failed')
			return { success: false, message: 'Hide user failed: query failed' }
		}
		return { success: true, message: 'Hide user success' }
	}
	catch (error) {
		console.error('ERROR', 'Hide user failed: unknown error', error)
		return { success: false, message: 'Hide user failed: unknown error' }
	}
}

/**
 * Block keyword
 * @param blockTagRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const blockKeywordService = async (blockKeywordRequest: BlockKeywordRequestDto, uuid: string, token: string): Promise<BlockKeywordResponseDto> => {
	try {
		if (!checkBlockKeywordRequest(blockKeywordRequest)) {
			return { success: false, message: 'Block keyword failed: invalid payload' }
		}

		const { blockKeyword } = blockKeywordRequest

		if (!safeRegex(blockKeyword)) {
			console.error('ERROR', 'Block keyword failed: unsafe keyword (unsafe regex)')
			return { success: false, message: 'Block keyword failed: unsafe keyword' }
		}

		const operatorUid = await getUserUid(uuid)

		if (!operatorUid) {
			console.error('ERROR', 'Block keyword failed: user not found')
			return { success: false, message: 'Block keyword failed: user not found' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Block keyword failed: invalid token')
			return { success: false, message: 'Block keyword failed: invalid token' }
		}

		if (await getBlocklistCount('keyword', uuid) > 200) {
			return { success: false, message: 'Block keyword failed: block list limit reached' }
		}

		const now = new Date().getTime()
		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		type BlockListSchemaType = InferSchemaType<typeof blockListSchemaInstance>
		const blockListWhere: QueryType<BlockListSchemaType> = {
			type: 'keyword',
			value: blockKeyword,
			operatorUUID: uuid,
		}
		const blockListSelect: SelectType<BlockListSchemaType> = {
			operatorUid: 1,
		}

		const blockListResult = await selectDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSelect, blockListSchemaInstance, blockListCollectionName)
		if (blockListResult.success && blockListResult.result && blockListResult.result.length > 0) {
			console.error('ERROR', 'Block keyword failed: already blocked')
			return { success: false, message: 'Block keyword failed: already blocked' }
		}

		const blockListData: BlockListSchemaType = {
			type: 'keyword',
			value: blockKeyword,
			operatorUid,
			operatorUUID: uuid,
			createDateTime: now,
		}

		const insertResult = await insertData2MongoDB<BlockListSchemaType>(blockListData, blockListSchemaInstance, blockListCollectionName)
		if (!insertResult.success) {
			return { success: false, message: 'Block keyword failed' }
		}
		return { success: true, message: 'Block keyword success' }
	}
	catch (error) {
		console.error('ERROR', 'Block keyword failed', error)
		return { success: false, message: 'Block keyword failed' }
	}
}

/**
 * Block tag
 * @param blockTagRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const blockTagService = async (blockTagRequest: BlockTagRequestDto, uuid: string, token: string): Promise<BlockTagResponseDto> => {
	try {
		if (!checkBlockTagRequest(blockTagRequest)) {
			return { success: false, message: 'Invalid block tag request payload' }
		}

		const tagId = blockTagRequest.tagId.toString()
		const operatorUid = await getUserUid(uuid)

		if (!operatorUid) {
			console.error('ERROR', 'Block tag failed: user not found')
			return { success: false, message: 'Block tag failed: user not found' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Block tag failed: invalid token')
			return { success: false, message: 'Block tag failed: invalid token' }
		}

		if (await getBlocklistCount('tag', uuid) > 100) {
			return { success: false, message: 'Block tag failed: block list limit reached' }
		}

		// TODO: check TAG existence

		const now = new Date().getTime()
		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		type BlockListSchemaType = InferSchemaType<typeof blockListSchemaInstance>
		const blockListWhere: QueryType<BlockListSchemaType> = {
			type: 'tag',
			value: tagId,
			operatorUUID: uuid,
		}
		const blockListSelect: SelectType<BlockListSchemaType> = {
			operatorUid: 1,
		}

		const blockListResult = await selectDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSelect, blockListSchemaInstance, blockListCollectionName)
		if (blockListResult.success && blockListResult.result && blockListResult.result.length > 0) {
			console.error('ERROR', 'Block tag failed: already blocked')
			return { success: false, message: 'Block tag failed: already blocked' }
		}

		const blockListData: BlockListSchemaType = {
			type: 'tag',
			value: tagId,
			operatorUid,
			operatorUUID: uuid,
			createDateTime: now,
		}

		const insertResult = await insertData2MongoDB<BlockListSchemaType>(blockListData, blockListSchemaInstance, blockListCollectionName)
		if (!insertResult.success) {
			console.error('ERROR', 'Block tag failed: query failed')
			return { success: false, message: 'Block tag failed: query failed' }
		}
		return { success: true, message: 'Block tag success' }
	}
	catch (error) {
		console.error('ERROR', 'Block tag failed: unknown error', error)
		return { success: false, message: 'Block tag failed: unknown error' }
	}
}

/**
 * Add regex
 * @param addRegexRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const addRegexService = async (addRegexRequest: AddRegexRequestDto, uuid: string, token: string): Promise<AddRegexResponseDto> => {
	try {
		if (!checkAddRegexRequest(addRegexRequest)) {
			return { success: false, message: 'Add regex failed: invalid payload', unsafeRegex: false }
		}

		const { blockRegex } = addRegexRequest

		if (!safeRegex(blockRegex)) {
			console.error('ERROR', 'Add regex failed: unsafe regex provided')
			return { success: false, message: 'Add regex failed: unsafe regex', unsafeRegex: true }
		}

		const operatorUid = await getUserUid(uuid)

		if (!operatorUid) {
			console.error('ERROR', 'Add regex failed: user not found')
			return { success: false, message: 'Add regex failed: user not found', unsafeRegex: false }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Add regex failed: invalid token')
			return { success: false, message: 'Add regex failed: invalid token', unsafeRegex: false }
		}

		if (await getBlocklistCount('regex', uuid) > 3) {
			return { success: false, message: 'Add regex failed: block list limit reached', unsafeRegex: false }
		}

		const now = new Date().getTime()
		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		type BlockListSchemaType = InferSchemaType<typeof blockListSchemaInstance>
		const blockListWhere: QueryType<BlockListSchemaType> = {
			type: 'regex',
			value: blockRegex,
			operatorUUID: uuid,
		}
		const blockListSelect: SelectType<BlockListSchemaType> = {
			operatorUid: 1,
		}

		const blockListResult = await selectDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSelect, blockListSchemaInstance, blockListCollectionName)
		if (blockListResult.success && blockListResult.result && blockListResult.result.length > 0) {
			return { success: false, message: 'Add regex failed: already exists', unsafeRegex: false }
		}

		const blockListData: BlockListSchemaType = {
			type: 'regex',
			value: blockRegex,
			operatorUid,
			operatorUUID: uuid,
			createDateTime: now,
		}

		const insertResult = await insertData2MongoDB<BlockListSchemaType>(blockListData, blockListSchemaInstance, blockListCollectionName)
		if (!insertResult.success) {
			return { success: false, message: 'Add regex failed', unsafeRegex: false }
		}

		return { success: true, message: 'Add regex success', unsafeRegex: false }
	}
	catch (error) {
		console.error('ERROR', 'Add regex failed', error)
		return { success: false, message: 'Add regex failed', unsafeRegex: false }
	}
}

/**
 * Unblock user
 * @param unblockUserByUidRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const unBlockUserService = async (unblockUserByUidRequest: UnblockUserByUidRequestDto, uuid: string, token: string): Promise<UnblockUserByUidResponseDto> => {
	try {
		if (!checkBlockUserByUidRequest(unblockUserByUidRequest)) {
			return { success: false, message: 'Unblock user failed: invalid payload' }
		}

		const { blockUid } = unblockUserByUidRequest
		if (!checkUserExistsByUIDService({ uid: blockUid })) {
			console.error('ERROR', 'Unblock user failed: user not found')
			return { success: false, message: 'Unblock user failed: user not found' }
		}
		const userUuid = await getUserUuid(blockUid)
		const operatorUid = await getUserUid(uuid)

		if (!userUuid || !operatorUid) {
			console.error('ERROR', 'Unblock user failed: user not found')
			return { success: false, message: 'Unblock user failed: user not found' }
		}
		if (userUuid === uuid) {
			console.error('ERROR', 'Unblock user failed: cannot unblock yourself')
			return { success: false, message: 'Unblock user failed: cannot unblock yourself' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Unblock user failed: invalid token')
			return { success: false, message: 'Unblock user failed: invalid token' }
		}

		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		type BlockListSchemaType = InferSchemaType<typeof blockListSchemaInstance>
		const blockListWhere: QueryType<BlockListSchemaType> = {
			type: 'block',
			value: userUuid,
			operatorUUID: uuid,
		}

		const blockListSelect: SelectType<BlockListSchemaType> = {
			type: 1,
			value: 1,
			operatorUid: 1,
			operatorUUID: 1,
		}

		// Start transaction
		const session = await createAndStartSession()

		const selectResult = await selectDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSelect, blockListSchemaInstance, blockListCollectionName, {session})
		if (!selectResult.success) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unblock user failed: query failed')
			return { success: false, message: 'Unblock user failed: query failed' }
		}
		if (selectResult.result.length === 0) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unblock user failed: user was not blocked')
			return { success: false, message: 'Unblock user failed: user was not blocked' }
		}

		const { collectionName: unblockUserCollectionName, schemaInstance: unblockUserSchemaInstance } = UnblockListSchema
		type UnblockListSchemaType = InferSchemaType<typeof unblockUserSchemaInstance>
		const unblockListData: UnblockListSchemaType = {
			...selectResult.result[0],
			_operatorUid_: operatorUid,
			_operatorUUID_: uuid,
			createDateTime: new Date().getTime(),
		}
		const insertResult = await insertData2MongoDB<UnblockListSchemaType>(unblockListData, unblockUserSchemaInstance, unblockUserCollectionName, {session})
		if (!insertResult) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unblock user failed: query failed')
			return { success: false, message: 'Unblock user failed: query failed' }
		}

		const deleteResult = await deleteDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSchemaInstance, blockListCollectionName, {session})
		if (!deleteResult) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unblock user failed: query failed')
			return { success: false, message: 'Unblock user failed: query failed' }
		}
		await commitAndEndSession(session)
		return { success: true, message: 'Unblock user success' }
	}
	catch (error) {
		console.error('ERROR', 'Unblock user failed: unknown error', error)
		return { success: false, message: 'Unblock user failed: unknown error' }
	}
}

/**
 * Show user
 * @param ShowUserByUidRequestDto Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const showUserService = async (showUserByUidRequest: ShowUserByUidRequestDto, uuid: string, token: string): Promise<ShowUserByUidResponseDto> => {
	try {
		if (!checkHideUserByUidRequest(showUserByUidRequest)) {
			return { success: false, message: 'Show user failed: invalid payload' }
		}

		const { hideUid } = showUserByUidRequest
		if (!checkUserExistsByUIDService({ uid: hideUid })) {
			console.error('ERROR', 'Show user failed: user not found')
			return { success: false, message: 'Show user failed: user not found' }
		}
		const userUuid = await getUserUuid(hideUid)
		const operatorUid = await getUserUid(uuid)

		if (!userUuid || !operatorUid) {
			console.error('ERROR', 'Show user failed: user not found')
			return { success: false, message: 'Show user failed: user not found' }
		}
		if (userUuid === uuid) {
			console.error('ERROR', 'Show user failed: cannot show yourself')
			return { success: false, message: 'Show user failed: cannot show yourself' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Show user failed: invalid token')
			return { success: false, message: 'Show user failed: invalid token' }
		}

		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		type BlockListSchemaType = InferSchemaType<typeof blockListSchemaInstance>
		const blockListWhere: QueryType<BlockListSchemaType> = {
			type: 'hide',
			value: userUuid,
			operatorUUID: uuid,
		}

		const blockListSelect: SelectType<BlockListSchemaType> = {
			type: 1,
			value: 1,
			operatorUid: 1,
			operatorUUID: 1,
		}

		// Start transaction
		const session = await createAndStartSession()

		const selectResult = await selectDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSelect, blockListSchemaInstance, blockListCollectionName, {session})
		if (!selectResult.success) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Show user failed: query failed')
			return { success: false, message: 'Show user failed: query failed' }
		}
		if (selectResult.result.length === 0) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Show user failed: user was not hidden')
			return { success: false, message: 'Show user failed: user was not hidden' }
		}

		const { collectionName: unblockUserCollectionName, schemaInstance: unblockUserSchemaInstance } = UnblockListSchema
		type UnblockListSchemaType = InferSchemaType<typeof unblockUserSchemaInstance>
		const unblockListData: UnblockListSchemaType = {
			...selectResult.result[0],
			_operatorUid_: operatorUid,
			_operatorUUID_: uuid,
			createDateTime: new Date().getTime(),
		}
		const insertResult = await insertData2MongoDB<UnblockListSchemaType>(unblockListData, unblockUserSchemaInstance, unblockUserCollectionName, {session})
		if (!insertResult) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Show user failed: query failed')
			return { success: false, message: 'Show user failed: query failed' }
		}

		const deleteResult = await deleteDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSchemaInstance, blockListCollectionName, {session})
		if (!deleteResult) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Show user failed: query failed')
			return { success: false, message: 'Show user failed: query failed' }
		}
		await commitAndEndSession(session)
		return { success: true, message: 'Show user success' }
	}
	catch (error) {
		console.error('ERROR', 'Show user failed: unknown error', error)
		return { success: false, message: 'Show user failed: unknown error' }
	}
}

/**
 * Unblock tag
 * @param unblockTagRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const unBlockTagService = async (unblockTagRequest: UnblockTagRequestDto, uuid: string, token: string): Promise<UnblockTagResponseDto> => {
	try {
		if (!checkBlockTagRequest(unblockTagRequest)) {
			return { success: false, message: 'Unblock tag failed: invalid payload' }
		}

		const tagId = unblockTagRequest.tagId.toString()
		const operatorUid = await getUserUid(uuid)

		if (!operatorUid) {
			console.error('ERROR', 'Unblock tag failed: user not found')
			return { success: false, message: 'Unblock tag failed: user not found' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Unblock tag failed: invalid token')
			return { success: false, message: 'Unblock tag failed: invalid token' }
		}

		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		type BlockListSchemaType = InferSchemaType<typeof blockListSchemaInstance>
		const blockListWhere: QueryType<BlockListSchemaType> = {
			type: 'tag',
			value: tagId,
			operatorUUID: uuid,
		}

		const blockListSelect: SelectType<BlockListSchemaType> = {
			type: 1,
			value: 1,
			operatorUid: 1,
			operatorUUID: 1,
		}

		// Start transaction
		const session = await createAndStartSession()

		const selectResult = await selectDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSelect, blockListSchemaInstance, blockListCollectionName, {session})
		if (!selectResult.success) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unblock tag failed: query failed')
			return { success: false, message: 'Unblock tag failed: query failed' }
		}
		if (selectResult.result.length === 0) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unblock tag failed: tag was not blocked')
			return { success: false, message: 'Unblock tag failed: tag was not blocked' }
		}

		const { collectionName: unblockUserCollectionName, schemaInstance: unblockUserSchemaInstance } = UnblockListSchema
		type UnblockListSchemaType = InferSchemaType<typeof unblockUserSchemaInstance>
		const unblockListData: UnblockListSchemaType = {
			...selectResult.result[0],
			_operatorUid_: operatorUid,
			_operatorUUID_: uuid,
			createDateTime: new Date().getTime(),
		}
		const insertResult = await insertData2MongoDB<UnblockListSchemaType>(unblockListData, unblockUserSchemaInstance, unblockUserCollectionName, {session})
		if (!insertResult) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unblock tag failed: query failed')
			return { success: false, message: 'Unblock tag failed: query failed' }
		}

		const deleteResult = await deleteDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSchemaInstance, blockListCollectionName, {session})
		if (!deleteResult) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unblock tag failed: query failed')
			return { success: false, message: 'Unblock tag failed: query failed' }
		}
		await commitAndEndSession(session)
		return { success: true, message: 'Unblock tag success' }
	}
	catch (error) {
		console.error('ERROR', 'Unblock tag failed: unknown error', error)
		return { success: false, message: 'Unblock tag failed: unknown error' }
	}
}

/**
 * Unblock keyword
 * @param unblockKeywordRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const unBlockKeywordService = async (unblockKeywordRequest: UnblockKeywordRequestDto, uuid: string, token: string): Promise<UnblockKeywordResponseDto> => {
	try {
		if (!checkBlockKeywordRequest(unblockKeywordRequest)) {
			return { success: false, message: 'Unblock keyword failed: invalid payload' }
		}

		const { blockKeyword: keyword } = unblockKeywordRequest
		const operatorUid = await getUserUid(uuid)

		if (!operatorUid) {
			console.error('ERROR', 'Unblock keyword failed: user not found')
			return { success: false, message: 'Unblock keyword failed: user not found' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Unblock keyword failed: invalid token')
			return { success: false, message: 'Unblock keyword failed: invalid token' }
		}

		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		type BlockListSchemaType = InferSchemaType<typeof blockListSchemaInstance>
		const blockListWhere: QueryType<BlockListSchemaType> = {
			type: 'keyword',
			value: keyword,
			operatorUUID: uuid,
		}

		const blockListSelect: SelectType<BlockListSchemaType> = {
			type: 1,
			value: 1,
			operatorUid: 1,
			operatorUUID: 1,
		}

		// Start transaction
		const session = await createAndStartSession()

		const selectResult = await selectDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSelect, blockListSchemaInstance, blockListCollectionName, {session})
		if (!selectResult.success) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unblock keyword failed: query failed')
			return { success: false, message: 'Unblock keyword failed: query failed' }
		}
		if (selectResult.result.length === 0) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unblock keyword failed: keyword was not blocked')
			return { success: false, message: 'Unblock keyword failed: keyword was not blocked' }
		}

		const { collectionName: unblockUserCollectionName, schemaInstance: unblockUserSchemaInstance } = UnblockListSchema
		type UnblockListSchemaType = InferSchemaType<typeof unblockUserSchemaInstance>
		const unblockListData: UnblockListSchemaType = {
			...selectResult.result[0],
			_operatorUid_: operatorUid,
			_operatorUUID_: uuid,
			createDateTime: new Date().getTime(),
		}
		const insertResult = await insertData2MongoDB<UnblockListSchemaType>(unblockListData, unblockUserSchemaInstance, unblockUserCollectionName, {session})
		if (!insertResult) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unblock keyword failed: query failed')
			return { success: false, message: 'Unblock keyword failed: query failed' }
		}

		const deleteResult = await deleteDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSchemaInstance, blockListCollectionName, {session})
		if (!deleteResult) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unblock keyword failed: query failed')
			return { success: false, message: 'Unblock keyword failed: query failed' }
		}
		await commitAndEndSession(session)
		return { success: true, message: 'Unblock keyword success' }
	}
	catch (error) {
		console.error('ERROR', 'Unblock keyword failed: unknown error', error)
		return { success: false, message: 'Unblock keyword failed: unknown error' }
	}
}

/**
 * Remove regex
 * @param removeRegexRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const removeRegexService = async (removeRegexRequest: RemoveRegexRequestDto, uuid: string, token: string): Promise<RemoveRegexResponseDto> => {
	try {
		if (!checkAddRegexRequest(removeRegexRequest)) {
			return { success: false, message: 'Remove regex failed: invalid payload' }
		}

		const { blockRegex: regex } = removeRegexRequest
		const operatorUid = await getUserUid(uuid)

		if (!operatorUid) {
			console.error('ERROR', 'Remove regex failed: user not found')
			return { success: false, message: 'Remove regex failed: user not found' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Remove regex failed: invalid token')
			return { success: false, message: 'Remove regex failed: invalid token' }
		}

		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		type BlockListSchemaType = InferSchemaType<typeof blockListSchemaInstance>
		const blockListWhere: QueryType<BlockListSchemaType> = {
			type: 'regex',
			value: regex,
			operatorUUID: uuid,
		}

		const blockListSelect: SelectType<BlockListSchemaType> = {
			type: 1,
			value: 1,
			operatorUid: 1,
			operatorUUID: 1,
		}

		// Start transaction
		const session = await createAndStartSession()

		const selectResult = await selectDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSelect, blockListSchemaInstance, blockListCollectionName, {session})
		if (!selectResult.success) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Remove regex failed: query failed')
			return { success: false, message: 'Remove regex failed: query failed' }
		}
		if (selectResult.result.length === 0) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Remove regex failed: regex was not blocked')
			return { success: false, message: 'Remove regex failed: regex was not blocked' }
		}

		const { collectionName: unblockUserCollectionName, schemaInstance: unblockUserSchemaInstance } = UnblockListSchema
		type UnblockListSchemaType = InferSchemaType<typeof unblockUserSchemaInstance>
		const unblockListData: UnblockListSchemaType = {
			...selectResult.result[0],
			_operatorUid_: operatorUid,
			_operatorUUID_: uuid,
			createDateTime: new Date().getTime(),
		}
		const insertResult = await insertData2MongoDB<UnblockListSchemaType>(unblockListData, unblockUserSchemaInstance, unblockUserCollectionName, {session})
		if (!insertResult) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Remove regex failed: query failed')
			return { success: false, message: 'Remove regex failed: query failed' }
		}

		const deleteResult = await deleteDataFromMongoDB<BlockListSchemaType>(blockListWhere, blockListSchemaInstance, blockListCollectionName, {session})
		if (!deleteResult) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Remove regex failed: query failed')
			return { success: false, message: 'Remove regex failed: query failed' }
		}
		await commitAndEndSession(session)
		return { success: true, message: 'Remove regex success' }
	}
	catch (error) {
		console.error('ERROR', 'Remove regex failed: unknown error', error)
		return { success: false, message: 'Remove regex failed: unknown error' }
	}
}

/**
 * Get block list
 * @param getBlockListRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const getBlockListService = async (getBlockListRequest: GetBlockListRequestDto, uuid?: string, token?: string): Promise<GetBlockListResponseDto> => {
	try {
		if (!checkGetBlockListRequest(getBlockListRequest)) {
			return { success: false, message: 'Get block list failed: invalid payload', blocklistCount: -1 }
		}

		if (!uuid || !token) {
			console.warn('WARN', 'WARNING', 'Get block list failed: user not logged in')
			return { success: false, message: 'Get block list failed: user not logged in', blocklistCount: -1 }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Get block list failed: invalid token')
			return { success: false, message: 'Get block list failed: invalid token', blocklistCount: -1 }
		}

		const { type } = getBlockListRequest
		if (!['hide', 'block', 'keyword', 'tag', 'regex'].includes(type)) {
			console.error('ERROR', 'Get block list failed: invalid block list type')
			return { success: false, message: 'Get block list failed: invalid block list type', blocklistCount: -1 }
		}

		let pageSize = undefined
		let skip = 0
		if (getBlockListRequest.pagination && getBlockListRequest.pagination.page > 0 && getBlockListRequest.pagination.pageSize > 0) {
			skip = (getBlockListRequest.pagination.page - 1) * getBlockListRequest.pagination.pageSize
			pageSize = getBlockListRequest.pagination.pageSize
		}

		let getBlocklistPipelineProject: PipelineStage[] = [
			{
				$project: {
					type: 1,
					value: 1,
					createDateTime: 1,
				}
			}
		]

		const shouldJoinUserInfo = ['hide', 'block'].includes(type) // Determine whether to join user info
		const shouldJoinTagInfo = type === 'tag' // Determine whether to join TAG info
		
		if (shouldJoinUserInfo) {
			getBlocklistPipelineProject = [
				{
					$lookup: {
						from: 'user-infos',
						localField: 'value',
						foreignField: 'UUID',
						as: 'user_info_data',
					}
				},
				{
					$unwind: {
						path: '$user_info_data',
						preserveNullAndEmptyArrays: true,
					}
				},
				{
					$project: {
						type: 1,
						value: 1,
						createDateTime: 1,
						uid: '$user_info_data.uid',
						username: '$user_info_data.username',
						userNickname: '$user_info_data.userNickname',
						avatar: '$user_info_data.avatar',
					}
				}
			]
		}

		if (shouldJoinTagInfo) {
			getBlocklistPipelineProject = [
				{
					$addFields: {
						tagIdInt: { $toInt: "$value" } // Convert string field to integer
					}
				},
				{
					$lookup: {
						from: 'video-tags',
						localField: 'tagIdInt',
						foreignField: 'tagId',
						as: 'tag_data',
					}
				},
				{
					$unwind: {
						path: '$tag_data',
						preserveNullAndEmptyArrays: true,
					}
				},
				{
					$project: {
						type: 1,
						value: 1,
						createDateTime: 1,
						tag: '$tag_data',
					}
				}
			]
		}

		const countBlocklistPipeline: PipelineStage[] = [
			{
				$match: {
					operatorUUID: uuid,
					type,
				},
			},
			{
				$count: 'totalCount',
			},
		]

		const getBlocklistPipelineMix: PipelineStage[] = [
			{
				$match: {
					operatorUUID: uuid,
					type,
				},
			},
			{ $sort: { 'createDateTime': -1 } },
			{ $skip: skip },
			...(pageSize ? [{ $limit: pageSize }] : []),
			...getBlocklistPipelineProject
		]
		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		const blocklistCountResult = await selectDataByAggregateFromMongoDB(blockListSchemaInstance, blockListCollectionName, countBlocklistPipeline)
		const blocklistResult = await selectDataByAggregateFromMongoDB(blockListSchemaInstance, blockListCollectionName, getBlocklistPipelineMix)

		if (!blocklistResult.success || !blocklistCountResult.success) {
			console.error('ERROR', 'Get block list failed: query failed')
			return { success: false, message: 'Get block list failed: query failed' }
		}

		return {
			success: true,
			message: blocklistCountResult.result?.[0]?.totalCount > 0 ? 'Get block list success' : 'Get block list success, length is zero',
			blocklistCount: blocklistCountResult.result?.[0]?.totalCount,
			result: blocklistResult.result,
		}

	} catch (error) {
		console.error('ERROR', 'Get block list failed: unknown error', error)
		return { success: false, message: 'Get block list failed: unknown error' }
	}
}

/** Blocklist types */
// type BlockListFilterCategory = 'block-uuid' | 'block-uid' | 'hide-uuid' | 'hide-uid' | 'keyword' | 'tag-id' | 'regex'
/** Blocklist types */
type BlockListFilterCategory = 'block-uuid' | 'hide-uuid' | 'keyword' | 'tag-id' | 'regex'
/** Configure which attributes use which blocklist type. The attr parameter MUST be a developer hardcoded safe field; NEVER user input. */
type BlockListAttrs = { attr: string, category: BlockListFilterCategory }[]
/** Additional fields for blocklist feature Project */
type AdditionalFieldsProject = {
	/** Whether blocked by other users */
	isBlockedByOther?: 1;
}
/** Return value: a constructed Mongoose Pipeline query */
type BlockListFilterResult = { success: boolean, filter: PipelineStage.Match[], additionalFields: AdditionalFieldsProject } 
/**
 * Build Mongoose Pipeline blocklist filter
 * @param attrs Attributes to filter and the filter method to use
 * @param uuid User UUID
 * @param token User Token
 * @returns Mongoose Pipeline blocklist filter
 */
export const buildBlockListMongooseFilter = async (attrs: BlockListAttrs, uuid?: string, token?: string): Promise<BlockListFilterResult> => {
	// MEME: Is that a dog...?
	try {
		if (!uuid || !token) {
			return { success: false, filter: [], additionalFields: { } }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Build blocklist filter failed: invalid token')
			return { success: false, filter: [], additionalFields: { } }
		}

		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		type BlockListSchemaType = InferSchemaType<typeof blockListSchemaInstance>

		const getBlockListWhere: QueryType<BlockListSchemaType> = {
			operatorUUID: uuid,
		}
		
		const getBlockListSelect: SelectType<BlockListSchemaType> = {
			type: 1,
			value: 1,
			operatorUUID: 1,
		}
		
		const { result: blockListResult, success: blockListSuccess } = await selectDataFromMongoDB<BlockListSchemaType>(getBlockListWhere, getBlockListSelect, blockListSchemaInstance, blockListCollectionName)

		const isBlockListOk = blockListSuccess && blockListResult.length > 0

		const blockUuidList = []
		const hideUuidList = []
		const keywordList = []
		const tagIdList = []
		const regexList = []
		for (const block of blockListResult) {
			switch (block.type) {
				case 'block':
					blockUuidList.push(block.value)
					break
				case 'hide':
					hideUuidList.push(block.value)
					break
				case 'keyword':
					keywordList.push(block.value)
					break
				case 'tag':
					tagIdList.push(parseInt(block.value ?? '-1', 10))
					break
				case 'regex':
					regexList.push(block.value)
					break
			}
		}

		// If keyword exists, build a big regex
		let keywordReg: RegExp | null = null
		if (keywordList.length > 0) {
			keywordReg = new RegExp(keywordList.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'))
		}

		const additionalFields = { }
		const blockListMongooseFilter = []
		for (const { attr, category } of attrs) {
			if (!isBlockListOk) {
				switch (category) {
					case 'block-uuid': {
						blockListMongooseFilter.push(
							// 1. Associate BlockList collection to get the list of users blocked by the uploader (only type = 'user')
							{
								$lookup: {
									from: 'blocklists',
									let: { uuid: `$${attr}` },
									pipeline: [
										{
											$match: {
												$expr: { 
													$and: [
														{ $eq: ['$operatorUUID', '$$uuid'] },
														{ $eq: ['$type', 'block'] },
													],
												},
											},
										},
										{
											$project: {
												_id: 0,
												blockedUserUUID: '$value', // 'value' stores blocked user UUID
											},
										},
									],
									as: 'block_by_others_data',
								},
							},
							// 2. Filter: exclude videos where uploader blocked current user
							{
								$addFields: {
									isBlockedByOther: {
										$in: [ uuid, '$block_by_others_data.blockedUserUUID' ]
									},
								},
							},
						)
						additionalFields['isBlockedByOther'] = 1
						break;
					}
				}
				continue
			} else {
				switch (category) {
					case 'block-uuid': {
						if (blockUuidList.length > 0) {
							blockListMongooseFilter.push({ $match: { [attr]: { $nin: blockUuidList } } })
						}
						blockListMongooseFilter.push(
							// 1. Associate BlockList collection to get the list of users blocked by the uploader (only type = 'user')
							{
								$lookup: {
									from: 'blocklists',
									let: { uuid: `$${attr}` },
									pipeline: [
										{
											$match: {
												$expr: { 
													$and: [
														{ $eq: ['$operatorUUID', '$$uuid'] },
														{ $eq: ['$type', 'block'] },
													],
												},
											},
										},
										{
											$project: {
												_id: 0,
												blockedUserUUID: '$value', // 'value' stores blocked user UUID
											},
										},
									],
									as: 'block_by_others_data',
								},
							},
							// 2. Filter: exclude videos where uploader blocked current user
							{
								$addFields: {
									isBlockedByOther: {
										$in: [ uuid, '$block_by_others_data.blockedUserUUID' ]
									},
								},
							},
						)
						additionalFields['isBlockedByOther'] = 1
						break;
					}
					case 'hide-uuid': {
						if (hideUuidList.length > 0)
							blockListMongooseFilter.push({ $match: { [attr]: { $nin: hideUuidList } } })
						break;
					}
					case 'keyword': {
						if (keywordReg)
							blockListMongooseFilter.push({ $match: { [attr]: { $not: { $regex: keywordReg, $options: 'i' } } } })
						break;
					}
					case 'tag-id': {
						if (tagIdList.length > 0)
							blockListMongooseFilter.push({ $match: { [attr]: { $nin: tagIdList } } })
						break;
					}
					case 'regex': {
						if (regexList.length > 0)
							blockListMongooseFilter.push({ $match: { $nor: regexList.map(rx => ({ [attr]: { $regex: rx, $options: 'i' } })) } })
						break;
					}
				}
			}
		}

		return { success: true, filter: blockListMongooseFilter, additionalFields }
	} catch (error) {
		console.error('ERROR', 'Build blocklist filter failed: unknown error', error)
		return { success: false, filter: [], additionalFields: { } }
	}
}

/**
 * Check whether user is blocked or hidden
 * @param UUID user uuid
 * @param token user token
 * @param targetUid target user UID
 * @returns Response
 */
export const checkBlockUserService = async (checkIsBlockedRequest: CheckUserIsBlockedRequestDto, uuid: string, token: string): Promise<CheckUserIsBlockedResponseDto> => {
	try {
		let isBlocked = false
		let isHidden = false

		if (!checkCheckUserIsBlockedRequest(checkIsBlockedRequest)) {
			console.error('ERROR', 'Check whether user is blocked or hidden failed, invalid request payload')
			return { success: false, message: 'Check whether user is blocked or hidden failed, invalid request payload', isBlocked, isHidden }
		}

		const { uid } = checkIsBlockedRequest

		if (!checkUserExistsByUIDService({ uid })) {
			console.error('ERROR', 'Check whether user is blocked or hidden failed, user does not exist')
			return { success: false, message: 'Check whether user is blocked or hidden failed, user does not exist', isBlocked, isHidden }
		}

		const targetUuid = await getUserUuid(uid)
		if (!targetUuid) {
			console.error('ERROR', 'Check whether user is blocked or hidden failed, user UUID does not exist')
			return { success: false, message: 'Check whether user is blocked or hidden failed, user UUID does not exist', isBlocked, isHidden }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Check whether user is blocked or hidden failed, invalid user token')
			return { success: false, message: 'Check whether user is blocked or hidden failed, invalid user token', isBlocked, isHidden }
		}

		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		type BlockListSchemaType = InferSchemaType<typeof blockListSchemaInstance>
		const blockWhere: QueryType<BlockListSchemaType> = {
			type: 'block',
			value: targetUuid,
			operatorUUID: uuid,
		}
		const hideWhere: QueryType<BlockListSchemaType> = {
			type: 'hide',
			value: targetUuid,
			operatorUUID: uuid,
		}
		const userSelect: SelectType<BlockListSchemaType> = {
			value: 1,
		}

		const blockResult = await selectDataFromMongoDB<BlockListSchemaType>(blockWhere, userSelect, blockListSchemaInstance, blockListCollectionName)
		if (!blockResult.success) {
			console.error('ERROR', 'Check whether user is blocked or hidden failed, failed to query blocked data')
			return { success: false, message: 'Check whether user is blocked or hidden failed, failed to query blocked data', isBlocked, isHidden }
		}

		const hideResult = await selectDataFromMongoDB<BlockListSchemaType>(hideWhere, userSelect, blockListSchemaInstance, blockListCollectionName)
		if (!hideResult.success) {
			console.error('ERROR', 'Check whether user is blocked or hidden failed, failed to query hidden data')
			return { success: false, message: 'Check whether user is blocked or hidden failed, failed to query hidden data', isBlocked, isHidden }
		}

		if (blockResult.result && Array.isArray(blockResult.result) && blockResult.result?.length > 0) {
			isBlocked = true
		}

		if (hideResult.result && Array.isArray(hideResult.result) && hideResult.result?.length > 0) {
			isHidden = true
		}

		return { success: true, message: 'Check whether user is blocked or hidden completed', isBlocked, isHidden }

	} catch (error) {
		console.error('ERROR', 'Check whether user is blocked or hidden failed, unknown error', error)
		return { success: false, message: 'Check whether user is blocked or hidden failed, unknown error', isBlocked: false, isHidden: false }
	}
}

/**
 * Detect whether user is blocked by other users
 * @param UUID user uuid
 * @param token user token
 * @param targetUid target user UID
 * @returns Response
 */
export const checkIsBlockedByOtherUserService = async (checkIsBlockedByOtherRequest: CheckIsBlockedByOtherUserRequestDto, uuid: string, token: string): Promise<CheckIsBlockedByOtherUserResponseDto> => {
	try {
		if (!checkCheckIsBlockedByOtherUserRequest(checkIsBlockedByOtherRequest)) {
			console.error('ERROR', 'Check whether user is blocked by other users failed, invalid request payload')
			return { success: false, message: 'Check whether user is blocked by other users failed, invalid request payload', isBlocked: false }
		}
		const { targetUid } = checkIsBlockedByOtherRequest

		if (!checkUserExistsByUIDService({uid: targetUid})) {
			return { success: false, message: 'Check whether user is blocked by other users failed, user does not exist', isBlocked: false }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Check whether user is blocked by other users failed, invalid user token')
			return { success: false, message: 'Check whether user is blocked by other users failed, invalid user token', isBlocked: false }
		}
		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		type BlockListSchemaType = InferSchemaType<typeof blockListSchemaInstance>
		const blockWhere: QueryType<BlockListSchemaType> = {
			type: 'block',
			operatorUid: targetUid,
			value: uuid,
		}
		const blockSelect: SelectType<BlockListSchemaType> = {
			value: 1,
		}
		const blockResult = await selectDataFromMongoDB<BlockListSchemaType>(blockWhere, blockSelect, blockListSchemaInstance, blockListCollectionName)
		if (!blockResult.success) {
			console.error('ERROR', 'Check whether user is blocked by other users failed, failed to query data')
			return { success: false, message: 'Check whether user is blocked by other users failed, failed to query data', isBlocked: false }
		}

		if (blockResult.result && Array.isArray(blockResult.result) && blockResult.result.length > 0 ) {
			return { success: true, message: 'Check whether user is blocked by other users successful, blocked by other users', isBlocked: true }
		} else {
			return { success: true, message: 'Check whether user is blocked by other users successful, not blocked by other users', isBlocked: false }
		}

	} catch (error) {
		console.error('ERROR', 'Check whether user is blocked by other users failed, unknown error', error)
		return { success: false, message: 'Check whether user is blocked by other users failed, unknown error', isBlocked: false }
	}
}

/**
 * Get count of blocklist by type
 * @param blocklistType blocklist type
 * @param uuid blocklist creator UUID
 * @returns count of blocklist by type
 */
const getBlocklistCount = async (blocklistType: string, uuid: string): Promise<number> => {
	try {
		const { collectionName: blockListCollectionName, schemaInstance: blockListSchemaInstance } = BlockListSchema
		const countBlocklistPipeline: PipelineStage[] = [
			{
				$match: {
					operatorUUID: uuid,
					type: blocklistType,
				},
			},
			{
				$count: 'totalCount',
			},
		]
		const BlocklistCountResult = await selectDataByAggregateFromMongoDB(blockListSchemaInstance, blockListCollectionName, countBlocklistPipeline)
		if (!BlocklistCountResult.success) {
			console.error('ERROR', 'Failed to get blocklist count, query failed')
			return 0
		}
		return BlocklistCountResult.result?.[0]?.totalCount
	} catch (error) {
		console.error('ERROR', 'Failed to get blocklist count, unknown error', error)
		return 0
	}
}


/**
 * Check block user request payload
 * @param blockUserByUidRequest block user request payload
 * @returns true if valid, false if invalid
 */
const checkBlockUserByUidRequest = (blockUserByUidRequest: BlockUserByUidRequestDto): boolean => {
	if (!blockUserByUidRequest.blockUid) {
		console.error('ERROR', 'Block user request payload invalid')
		return false
	}
	return true
}

/**
 * Check hide user request payload
 * @param HideUserByUidRequest hide user request payload
 * @returns true if valid, false if invalid
 */
const checkHideUserByUidRequest = (hideUserByUidRequest: HideUserByUidRequestDto): boolean => {
	if (!hideUserByUidRequest.hideUid) {
		console.error('ERROR', 'Hide user request payload invalid')
		return false
	}
	return true
}

/**
 * Check block keyword request payload
 * @param blockKeywordRequest block keyword request payload
 * @returns true if valid, false if invalid
 */
const checkBlockKeywordRequest = (blockKeywordRequest: BlockKeywordRequestDto): boolean => {
	if (!blockKeywordRequest?.blockKeyword) {
			console.error('ERROR', 'Block keyword request payload invalid')
			return false
	}
	const keyword = blockKeywordRequest.blockKeyword
	const validKeywordRegex = /^[a-zA-Z0-9\u4e00-\u9fa5\s.,!?@#$%&*()_+-=[\]{}|;:'"`~<>]+$/
	if (
			keyword.trim().length === 0 || // Empty string or pure spaces
			keyword.length > MAX_KEYWORD_LENGTH || // Length exceeds limit
			!validKeywordRegex.test(keyword) // Contains illegal characters
	) {
			console.error('ERROR', 'Block keyword request payload invalid')
			return false
	}

	return true
}

/**
 * Check block tag request payload
 * @param blockTagRequest block tag request payload
 * @returns true if valid, false if invalid
 */
const checkBlockTagRequest = (blockTagRequest: BlockTagRequestDto): boolean => {
	if (!blockTagRequest.tagId) {
		console.error('ERROR', 'Block tag request payload invalid')
		return false
	}
	return true
}

/**
 * Check add regex request payload
 * @param addRegexRequest add regex request payload
 * @returns true if valid, false if invalid
 */
const checkAddRegexRequest = (addRegexRequest: AddRegexRequestDto): boolean => {
	if (!addRegexRequest?.blockRegex) {
			console.error('ERROR', 'Add regex request payload invalid')
			return false
	}
	const regex = addRegexRequest.blockRegex
	if (
			regex.trim().length === 0 || // Empty string or pure spaces
			regex.length > MAX_REGEX_LENGTH // Length exceeds limit
	) {
			return false
	}
	try {
			new RegExp(regex)
	} catch (e) {
			return false
	}
	return true
}

/**
 * Check get block list request payload
 * @param request get block list request payload
 * @returns true if valid, false if invalid
 */
const checkGetBlockListRequest = (GetBlockListRequest: GetBlockListRequestDto) => {
	return (
		GetBlockListRequest.type !== undefined && GetBlockListRequest.type !== null
	)
}

/**
 * Check content blocked request payload
 * @param CheckIsBlockedRequestDto content blocked request payload
 * @returns true if valid, false if invalid
 */
const checkCheckContentIsBlockedRequest = (checkIsBlockedRequest: CheckContentIsBlockedRequestDto): boolean => {
	if (!checkIsBlockedRequest?.content) {
			console.error('ERROR', 'Check content blocked request payload invalid')
			return false
	}
	const content = checkIsBlockedRequest.content
	if (
			content.trim().length === 0 || // Empty string or pure spaces
			content.length > 500 // Length exceeds limit
	) {
			return false
	}
	return true
}

/**
 * Check tag blocked request payload
 * @param CheckIsBlockedRequest content blocked request payload
 * @returns true if valid, false if invalid
 */
const checkCheckTagIsBlockedRequest = (checkIsBlockedRequest: CheckTagIsBlockedRequestDto): boolean => {
	return (
		checkIsBlockedRequest.tagId !== undefined && checkIsBlockedRequest.tagId !== null
	)
}

/**
 * Check user blocked request payload
 * @param CheckIsBlockedRequest content blocked request payload
 * @returns true if valid, false if invalid
 */
const checkCheckUserIsBlockedRequest = (checkIsBlockedRequest: CheckUserIsBlockedRequestDto): boolean => {
	return (
		checkIsBlockedRequest.uid !== undefined && checkIsBlockedRequest.uid !== null
	)
}

/**
 * Detect whether user is blocked by other users request payload
 * @param CheckIsBlockedByOtherUserRequestDto whether user is blocked by other users request payload
 * @returns true if valid, false if invalid
 */
const checkCheckIsBlockedByOtherUserRequest = (checkIsBlockedRequest: CheckIsBlockedByOtherUserRequestDto): boolean => {
	return (
		checkIsBlockedRequest.targetUid !== undefined && checkIsBlockedRequest.targetUid !== null
	)
}
