import { InferSchemaType, PipelineStage } from "mongoose";
import { AddNewUid2FeedGroupRequestDto, AddNewUid2FeedGroupResponseDto, AdministratorApproveFeedGroupInfoChangeRequestDto, AdministratorApproveFeedGroupInfoChangeResponseDto, AdministratorDeleteFeedGroupRequestDto, AdministratorDeleteFeedGroupResponseDto, CreateFeedGroupRequestDto, CreateFeedGroupResponseDto, CreateOrEditFeedGroupInfoRequestDto, CreateOrEditFeedGroupInfoResponseDto, DeleteFeedGroupRequestDto, DeleteFeedGroupResponseDto, FOLLOWING_TYPE, FollowingUploaderRequestDto, FollowingUploaderResponseDto, GetFeedContentRequestDto, GetFeedContentResponseDto, GetFeedGroupCoverUploadSignedUrlResponseDto, GetFeedGroupListResponseDto, RemoveUidFromFeedGroupRequestDto, RemoveUidFromFeedGroupResponseDto, UnfollowingUploaderRequestDto, UnfollowingUploaderResponseDto} from "../controller/FeedControllerDto.js";
import { FeedGroupSchema, FollowingSchema, UnfollowingSchema } from "../dbPool/schema/FeedSchema.js";
import { checkUserExistsByUuidService, checkUserTokenByUuidService, getUserUuid } from "./UserService.js";
import { QueryType, SelectType, UpdateType } from "../dbPool/DbClusterPoolTypes.js";
import { deleteDataFromMongoDB, findOneAndUpdateData4MongoDB, insertData2MongoDB, selectDataByAggregateFromMongoDB, selectDataFromMongoDB } from "../dbPool/DbClusterPool.js";
import { abortAndEndSession, commitAndEndSession, createAndStartSession } from "../common/MongoDBSessionTool.js";
import { CheckUserExistsByUuidRequestDto } from "../controller/UserControllerDto.js";
import { v4 as uuidV4 } from 'uuid'
import { generateSecureRandomString } from "../common/RandomTool.js";
import { createCloudflareImageUploadSignedUrl } from "../cloudflare/index.js";
import { VideoSchema } from "../dbPool/schema/VideoSchema.js";

/**
 * Follow an uploader
 * @param followingUploaderRequest Request payload
 * @param uuid User UUID
 * @param token User token
 * @returns Response
 */
export const followingUploaderService = async (followingUploaderRequest: FollowingUploaderRequestDto, uuid: string, token: string): Promise<FollowingUploaderResponseDto> => {
	try {
		if (!checkFollowingUploaderRequest(followingUploaderRequest)) {
			console.error('ERROR', 'Follow user failed: invalid parameters.')
			return { success: false, message: 'Follow user failed: invalid parameters.' }
		}

		const now = new Date().getTime()
		const followerUuid = uuid
		const { followingUid } = followingUploaderRequest

		const followingUuid = await getUserUuid(followingUid) as string

		if (followerUuid === followingUuid) {
			console.error('ERROR', 'Follow user failed: cannot follow yourself.')
			return { success: false, message: 'Follow user failed: cannot follow yourself.' }
		}

		if (!(await checkUserTokenByUuidService(followerUuid, token)).success) {
			console.error('ERROR', 'Follow user failed: invalid user.')
			return { success: false, message: 'Follow user failed: invalid user' }
		}

		const checkFollowingUuidResult = await checkUserExistsByUuidService({ uuid: followingUuid })
		if (!checkFollowingUuidResult.success || (checkFollowingUuidResult.success && !checkFollowingUuidResult.exists)) {
			console.error('ERROR', 'Follow user failed: target user not found.')
			return { success: false, message: 'Follow user failed: target user not found.' }
		}

		const { collectionName: followingCollectionName, schemaInstance: followingSchemaInstance } = FollowingSchema
		type Following = InferSchemaType<typeof followingSchemaInstance>

		const getFollowingDataWhere: QueryType<Following> = {
			followerUuid,
			followingUuid,
		}

		const getFollowingDataSelect: SelectType<Following> = {
			followerUuid: 1,
			followingUuid: 1,
		}

		const session = await createAndStartSession()

		const getFollowingData = await selectDataFromMongoDB<Following>(getFollowingDataWhere, getFollowingDataSelect, followingSchemaInstance, followingCollectionName, { session })
		const getFollowingDataResult = getFollowingData.result
		if (getFollowingDataResult.length > 0) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Follow user failed: already following.')
			return { success: false, message: 'Follow user failed: already following.' }
		}

		const followingData: Following = {
			followerUuid,
			followingUuid,
			followingType: FOLLOWING_TYPE.normal,
			isFavorite: false,
			followingEditDateTime: now,
			followingCreateTime: now,
		}

		const insertFollowingDataResult = await insertData2MongoDB<Following>(followingData, followingSchemaInstance, followingCollectionName, { session })

		if (!insertFollowingDataResult.success) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Follow user failed: insert failed.')
			return { success: false, message: 'Follow user failed: insert failed.' }
		}

		await commitAndEndSession(session)
		return { success: true, message: 'Follow user success!' }
	} catch (error) {
		console.error('ERROR', 'Follow user error: unknown reason.', error)
		return { success: false, message: 'Follow user error: unknown reason.' }
	}
}

/**
 * Unfollow an uploader
 * @param followingUploaderRequest Request payload
 * @param uuid User UUID
 * @param token User token
 * @returns Response
 */
export const unfollowingUploaderService = async (unfollowingUploaderRequest: UnfollowingUploaderRequestDto, uuid: string, token: string): Promise<UnfollowingUploaderResponseDto> => {
	try {
		if (!checkUnfollowingUploaderRequest(unfollowingUploaderRequest)) {
			console.error('ERROR', 'Unfollow user failed: invalid parameters.')
			return { success: false, message: 'Unfollow user failed: invalid parameters.' }
		}

		const now = new Date().getTime()
		const followerUuid = uuid
		const { unfollowingUid } = unfollowingUploaderRequest

		const unfollowingUuid = await getUserUuid(unfollowingUid) as string

		if (followerUuid === unfollowingUuid) {
			console.error('ERROR', 'Unfollow user failed: cannot unfollow yourself.')
			return { success: false, message: 'Unfollow user failed: cannot unfollow yourself.' }
		}

		if (!(await checkUserTokenByUuidService(followerUuid, token)).success) {
			console.error('ERROR', 'Unfollow user failed: invalid user.')
			return { success: false, message: 'Unfollow user failed: invalid user' }
		}

		const checkFollowingUuidResult = await checkUserExistsByUuidService({ uuid: unfollowingUuid })
		if (!checkFollowingUuidResult.success || (checkFollowingUuidResult.success && !checkFollowingUuidResult.exists)) {
			console.error('ERROR', 'Unfollow user failed: target user not found.')
			return { success: false, message: 'Unfollow user failed: target user not found.' }
		}

		const { collectionName: followingCollectionName, schemaInstance: followingSchemaInstance } = FollowingSchema
		const { collectionName: unfollowingCollectionName, schemaInstance: unfollowingSchemaInstance } = UnfollowingSchema
		type Following = InferSchemaType<typeof followingSchemaInstance>
		type Unfollowing = InferSchemaType<typeof unfollowingSchemaInstance>

		const followingWhere: QueryType<Following> = {
			followerUuid,
			followingUuid: unfollowingUuid,
		}
		const followingSelect: SelectType<Following> = {
			followerUuid: 1,
			followingUuid: 1,
			followingType: 1,
			isFavorite: 1,
			followingEditDateTime: 1,
			followingCreateTime: 1,
		}

		const session = await createAndStartSession()

		const selectUnfollowingDataResult = await selectDataFromMongoDB<Following>(followingWhere, followingSelect, followingSchemaInstance, followingCollectionName, { session })
		const selectUnfollowingData = selectUnfollowingDataResult.result?.[0]

		if (!selectUnfollowingDataResult.success || selectUnfollowingDataResult.result.length !== 1 || !selectUnfollowingData) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unfollow user failed: read follow record failed.')
			return { success: false, message: 'Unfollow user failed: read follow record failed.' }
		}

		const unfollowingData: Unfollowing = {
			...selectUnfollowingData,
			unfollowingReasonType: 'normal',
			unfollowingDateTime: now,
			unfollowingEditDateTime: now,
			unfollowingCreateTime: now,
		}

		const insertUnfollowingDataResult = await insertData2MongoDB<Unfollowing>(unfollowingData, unfollowingSchemaInstance, unfollowingCollectionName, { session })

		if (!insertUnfollowingDataResult.success) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unfollow user failed: record write failed.')
			return { success: false, message: 'Unfollow user failed: record write failed.' }
		}

		const deleteFollowingDataResult = await deleteDataFromMongoDB<Following>(followingWhere, followingSchemaInstance, followingCollectionName, { session })

		if (!deleteFollowingDataResult.success) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Unfollow user failed: delete follow record failed.')
			return { success: false, message: 'Unfollow user failed: delete follow record failed.' }
		}

		await commitAndEndSession(session)
		return { success: true, message: 'Unfollow user success!' }
	} catch (error) {
		console.error('ERROR', 'Unfollow user error: unknown reason.', error)
		return { success: false, message: 'Unfollow user error: unknown reason.' }
	}
}

/**
 * Create feed group
 * @param createFeedGroupRequest Request payload
 * @param uuid User UUID
 * @param token User token
 * @returns Response
 */
export const createFeedGroupService = async (createFeedGroupRequest: CreateFeedGroupRequestDto, uuid: string, token: string): Promise<CreateFeedGroupResponseDto> => {
	try {
		if (!checkCreateFeedGroupRequest(createFeedGroupRequest)) {
			console.error('ERROR', 'Create feed group failed: invalid parameters.')
			return { success: false, tooManyUidInOnce: false, message: 'Create feed group failed: invalid parameters.' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Create feed group failed: invalid user.')
			return { success: false, tooManyUidInOnce: false, message: 'Create feed group failed: invalid user' }
		}

		const { feedGroupName, withUidList: uidList, withCustomCoverUrl } = createFeedGroupRequest
		const uuidList = []
		if (uidList && Array.isArray(uidList) && uidList.length > 0) {
			if (uidList.length > 50) {
				console.error('ERROR', 'Create feed group failed: too many UIDs added at once')
				return { success: false, tooManyUidInOnce: true, message: 'Create feed group failed: too many UIDs added at once' }
			}

			let isCorrectUuidList = true
			uidList.forEach(async uid => {
				const uuid = await getUserUuid(uid) as string
				const checkUserExistsByUuidRequest: CheckUserExistsByUuidRequestDto = {
					uuid,
				}
				const uuidExistsResult = await checkUserExistsByUuidService(checkUserExistsByUuidRequest)
				if (!uuidExistsResult.success || !uuidExistsResult.exists) {
					isCorrectUuidList = false
				}

				uuidList.push(uuid)
			})

			if (!isCorrectUuidList) {
				console.error('ERROR', 'Create feed group failed: invalid UUID list')
				return { success: false, tooManyUidInOnce: false, message: 'Create feed group failed: invalid UUID list' }
			}
		}

		const now = new Date().getTime()
		const feedGroupUuid = uuidV4()

		const { collectionName: feedGroupCollectionName, schemaInstance: feedGroupSchemaInstance } = FeedGroupSchema
		type FeedGroup = InferSchemaType<typeof feedGroupSchemaInstance>

		const feedGroupData: FeedGroup = {
			feedGroupUuid,
			feedGroupName,
			feedGroupCreatorUuid: uuid,
			uuidList: [...new Set<string>(uuidList)],
			customCover: withCustomCoverUrl,
			isUpdatedAfterReview: true,
			createDateTime: now,
			editDateTime: now,
		}

		const insertFeedGroupDataResult = await insertData2MongoDB<FeedGroup>(feedGroupData, feedGroupSchemaInstance, feedGroupCollectionName)

		if (!insertFeedGroupDataResult.success) {
			console.error('ERROR', 'Create feed group failed: insert failed.')
			return { success: false, tooManyUidInOnce: false, message: 'Create feed group failed: insert failed' }
		}

		return { success: true, tooManyUidInOnce: false, message: 'Create feed group success.' }
	} catch (error) {
		console.error('ERROR', 'Create feed group error: unknown reason.', error)
		return { success: false, tooManyUidInOnce: false, message: 'Create feed group error: unknown reason.' }
	}
}

/**
 * Add new UID to a feed group
 * @param addNewUser2FeedGroupRequest Request payload
 * @param uuid User UUID
 * @param token User token
 * @returns Response
 */
export const addNewUid2FeedGroupService = async (addNewUser2FeedGroupRequest: AddNewUid2FeedGroupRequestDto, uuid: string, token: string): Promise<AddNewUid2FeedGroupResponseDto> => {
	try {
		if (!checkAddNewUser2FeedGroupRequest(addNewUser2FeedGroupRequest)) {
			console.error('ERROR', 'Add new UID to feed group failed: invalid parameters.')
			return { success: false, tooManyUidInOnce: false, isOverload: false, message: 'Add new UID to feed group failed: invalid parameters.' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Add new UID to feed group failed: invalid user.')
			return { success: false, tooManyUidInOnce: false, isOverload: false, message: 'Add new UID to feed group failed: invalid user' }
		}

		const { feedGroupUuid, uidList } = addNewUser2FeedGroupRequest

		const uuidList = []
		if (uidList && Array.isArray(uidList) && uidList.length > 0) {
			if (uidList.length > 50) {
				console.error('ERROR', 'Add new UID to feed group failed: too many UIDs added at once')
				return { success: false, tooManyUidInOnce: true, isOverload: false, message: 'Add new UID to feed group failed: too many UIDs added at once' }
			}

			let isCorrectUuidList = true
			uidList.forEach(async uid => {
				const uuid = await getUserUuid(uid) as string
				const checkUserExistsByUuidRequest: CheckUserExistsByUuidRequestDto = {
					uuid,
				}
				const uuidExistsResult = await checkUserExistsByUuidService(checkUserExistsByUuidRequest)
				if (!uuidExistsResult.success || !uuidExistsResult.exists) {
					isCorrectUuidList = false
				}

				uuidList.push(uuid)
			})

			if (!isCorrectUuidList) {
				console.error('ERROR', 'Add new UID to feed group failed: invalid UUID list')
				return { success: false, tooManyUidInOnce: false, isOverload: false, message: 'Add new UID to feed group failed: invalid UUID list' }
			}
		}

		const { collectionName: feedGroupCollectionName, schemaInstance: feedGroupSchemaInstance } = FeedGroupSchema
		type FeedGroup = InferSchemaType<typeof feedGroupSchemaInstance>

		const getFeedGroupSelect: SelectType<FeedGroup> = {
			feedGroupUuid: 1,
			uuidList: 1,
		}
		const feedGroupWhere: QueryType<FeedGroup> = {
			feedGroupUuid,
			feedGroupCreatorUuid: uuid, // Ensure it's the feed group created by the current user
		}

		const session = await createAndStartSession()

		const getFeedGroupDataResult = await selectDataFromMongoDB<FeedGroup>(feedGroupWhere, getFeedGroupSelect, feedGroupSchemaInstance, feedGroupCollectionName, { session })
		const getFeedGroupData = getFeedGroupDataResult.result?.[0]

		if (!getFeedGroupDataResult.success || !getFeedGroupData.feedGroupUuid) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Add new UID to feed group failed: feed group not found or not created by current user')
			return { success: false, tooManyUidInOnce: false, isOverload: false, message: 'Add new UID to feed group failed: feed group not found or not created by current user' }
		}

		const newUuidList = [...new Set<string>(uuidList.concat(getFeedGroupData.uuidList ?? []))]

		if (newUuidList.length > 10000) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Add new UID to feed group failed: too many users in feed group')
			return { success: false, tooManyUidInOnce: false, isOverload: true, message: 'Add new UID to feed group failed: too many users in feed group' }
		}

		const now = new Date().getTime()
		const updateFeedGroupData: UpdateType<FeedGroup> = {
			uuidList: newUuidList,
			editDateTime: now,
		}

		const findOneAndUpdateFeedGroupDataResult = await findOneAndUpdateData4MongoDB<FeedGroup>(feedGroupWhere, updateFeedGroupData, feedGroupSchemaInstance, feedGroupCollectionName, { session })
		const findOneAndUpdateFeedGroupData = findOneAndUpdateFeedGroupDataResult.result?.[0]

		if (!findOneAndUpdateFeedGroupDataResult.success || !findOneAndUpdateFeedGroupData) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Add new UID to feed group failed: update failed')
			return { success: false, tooManyUidInOnce: false, isOverload: false, message: 'Add new UID to feed group failed: update failed' }
		}

		await commitAndEndSession(session)
		return { success: true, tooManyUidInOnce: false, isOverload: false, message: 'Add new UID to feed group success', feedGroupResult: findOneAndUpdateFeedGroupData }
	} catch (error) {
		console.error('ERROR', 'Add new UID to feed group error: unknown reason.', error)
		return { success: false, tooManyUidInOnce: false, isOverload: false, message: 'Add new UID to feed group error: unknown reason.' }
	}
}

/**
 * Remove UID from a feed group
 * @param removeUidFromFeedGroupRequest Request payload
 * @param uuid User UUID
 * @param token User token
 * @returns Response
 */
export const removeUidFromFeedGroupService = async (removeUidFromFeedGroupRequest: RemoveUidFromFeedGroupRequestDto, uuid: string, token: string): Promise<RemoveUidFromFeedGroupResponseDto> => {
	try {
		if (!checkRemoveUidFromFeedGroupRequest(removeUidFromFeedGroupRequest)) {
			console.error('ERROR', 'Remove UID from feed group failed: invalid parameters.')
			return { success: false, tooManyUidInOnce: false, message: 'Remove UID from feed group failed: invalid parameters.' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Remove UID from feed group failed: invalid user.')
			return { success: false, tooManyUidInOnce: false, message: 'Remove UID from feed group failed: invalid user' }
		}

		const { feedGroupUuid, uidList } = removeUidFromFeedGroupRequest

		const uuidList = []
		if (uidList && Array.isArray(uidList) && uidList.length > 0) {
			if (uidList.length > 50) {
				console.error('ERROR', 'Remove UID from feed group failed: too many UIDs removed at once')
				return { success: false, tooManyUidInOnce: true, message: 'Remove UID from feed group failed: too many UIDs removed at once' }
			}

			let isCorrectUuidList = true
			uidList.forEach(async uid => {
				const uuid = await getUserUuid(uid) as string
				const checkUserExistsByUuidRequest: CheckUserExistsByUuidRequestDto = {
					uuid,
				}
				const uuidExistsResult = await checkUserExistsByUuidService(checkUserExistsByUuidRequest)
				if (!uuidExistsResult.success || !uuidExistsResult.exists) {
					isCorrectUuidList = false
				}

				uuidList.push(uuid)
			})

			if (!isCorrectUuidList) {
				console.error('ERROR', 'Remove UID from feed group failed: invalid UUID list')
				return { success: false, tooManyUidInOnce: false, message: 'Remove UID from feed group failed: invalid UUID list' }
			}
		}

		const { collectionName: feedGroupCollectionName, schemaInstance: feedGroupSchemaInstance } = FeedGroupSchema
		type FeedGroup = InferSchemaType<typeof feedGroupSchemaInstance>

		const getFeedGroupSelect: SelectType<FeedGroup> = {
			feedGroupUuid: 1,
			uuidList: 1,
		}
		const feedGroupWhere: QueryType<FeedGroup> = {
			feedGroupUuid,
			feedGroupCreatorUuid: uuid, // Ensure it's the feed group created by the current user
		}

		const session = await createAndStartSession()

		const getFeedGroupDataResult = await selectDataFromMongoDB<FeedGroup>(feedGroupWhere, getFeedGroupSelect, feedGroupSchemaInstance, feedGroupCollectionName, { session })
		const getFeedGroupData = getFeedGroupDataResult.result?.[0]

		if (!getFeedGroupDataResult.success || !getFeedGroupData.feedGroupUuid) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Remove UID from feed group failed: feed group not found or not created by current user')
			return { success: false, tooManyUidInOnce: false, message: 'Remove UID from feed group failed: feed group not found or not created by current user' }
		}

		const oldUuidList = [...new Set<string>(getFeedGroupData.uuidList ?? [])]
		const shouldRemoveUuidList = [...new Set<string>(uuidList)]
		const differenceUuidList = oldUuidList.filter(uuid => !shouldRemoveUuidList.includes(uuid))
		const now = new Date().getTime()
		const updateFeedGroupData: UpdateType<FeedGroup> = {
			uuidList: differenceUuidList,
			editDateTime: now,
		}

		const findOneAndUpdateFeedGroupDataResult = await findOneAndUpdateData4MongoDB<FeedGroup>(feedGroupWhere, updateFeedGroupData, feedGroupSchemaInstance, feedGroupCollectionName, { session })
		const findOneAndUpdateFeedGroupData = findOneAndUpdateFeedGroupDataResult.result?.[0]

		if (!findOneAndUpdateFeedGroupDataResult.success || !findOneAndUpdateFeedGroupData) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Remove UID from feed group failed: update failed')
			return { success: false, tooManyUidInOnce: false, message: 'Remove UID from feed group failed: update failed' }
		}

		await commitAndEndSession(session)
		return { success: true, tooManyUidInOnce: false, message: 'Remove UID from feed group success', feedGroupResult: findOneAndUpdateFeedGroupData }
	} catch (error) {
		console.error('ERROR', 'Remove UID from feed group error: unknown reason.', error)
		return { success: false, tooManyUidInOnce: false, message: 'Remove UID from feed group error: unknown reason.' }
	}
}

/**
 * Delete feed group
 * @param deleteFeedGroupRequest Request payload
 * @param uuid User UUID
 * @param token User token
 * @returns Response
 */
export const deleteFeedGroupService = async (deleteFeedGroupRequest: DeleteFeedGroupRequestDto, uuid: string, token: string): Promise<DeleteFeedGroupResponseDto> => {
	try {
		if (!checkDeleteFeedGroupRequest(deleteFeedGroupRequest)) {
			console.error('ERROR', 'Delete feed group failed: invalid parameters')
			return { success: false, message: 'Delete feed group failed: invalid parameters' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Delete feed group failed: invalid user')
			return { success: false, message: 'Delete feed group failed: invalid user' }
		}

		const { feedGroupUuid } = deleteFeedGroupRequest
		const { collectionName: feedGroupCollectionName, schemaInstance: feedGroupSchemaInstance } = FeedGroupSchema
		type FeedGroup = InferSchemaType<typeof feedGroupSchemaInstance>

		const deleteFeedGroupWhere: QueryType<FeedGroup> = {
			feedGroupUuid,
			feedGroupCreatorUuid: uuid, // Ensure it's the feed group created by the current user
		}

		const deleteFeedGroupResult = await deleteDataFromMongoDB<FeedGroup>(deleteFeedGroupWhere, feedGroupSchemaInstance, feedGroupCollectionName)

		if (!deleteFeedGroupResult.success) {
			console.error('ERROR', 'Delete feed group failed: delete failed')
			return { success: false, message: 'Delete feed group failed: delete failed' }
		}

		return { success: true, message: 'Delete feed group success' }
	} catch (error) {
		console.error('ERROR', 'Delete feed group error: unknown reason', error)
		return { success: false, message: 'Delete feed group error: unknown reason' }
	}
}

/**
 * Get pre-signed URL for uploading feed group cover image
 * @param uuid User UUID
 * @param token User token
 * @returns GetFeedGroupCoverUploadSignedUrlResponseDto Response
 */
export const getFeedGroupCoverUploadSignedUrlService = async (uuid: string, token: string): Promise<GetFeedGroupCoverUploadSignedUrlResponseDto> => {
	try {
		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Get pre-signed URL for uploading feed group cover image failed: user verification failed')
			return { success: false, message: 'Get pre-signed URL for uploading feed group cover image failed: user verification failed' }
		}
		const now = new Date().getTime()
		const fileName = `feed-group-cover-${uuid}-${generateSecureRandomString(32)}-${now}`
		try {
			const signedUrl = await createCloudflareImageUploadSignedUrl(fileName, 660)
			if (signedUrl) {
				return { success: true, message: 'Get pre-signed URL for uploading feed group cover image success', result: { fileName, signedUrl } }
			}
		} catch (error) {
			console.error('ERROR', 'Get pre-signed URL for uploading feed group cover image failed: request failed', error)
			return { success: false, message: 'Get pre-signed URL for uploading feed group cover image failed: request failed' }
		}
	} catch (error) {
		console.error('ERROR', 'Get pre-signed URL for uploading feed group cover image error: ', error)
		return { success: false, message: 'Get pre-signed URL for uploading feed group cover image error: unknown reason' }
	}
}

/**
 * Create or update feed group info
 * Updating the name or avatar URL of a feed group is this interface
 *
 * @param createOrEditFeedGroupInfoRequest Request payload
 * @param uuid User UUID
 * @param token User token
 * @returns Response
 */
export const createOrEditFeedGroupInfoService = async (createOrEditFeedGroupInfoRequest: CreateOrEditFeedGroupInfoRequestDto, uuid: string, token: string): Promise<CreateOrEditFeedGroupInfoResponseDto> => {
	try {
		if (!checkCreateOrEditFeedGroupInfoRequest(createOrEditFeedGroupInfoRequest)) {
			console.error('ERROR', 'Create or update feed group info failed: invalid parameters')
			return { success: false, message: 'Create or update feed group info failed: invalid parameters' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Create or update feed group info failed: invalid user')
			return { success: false, message: 'Create or update feed group info failed: invalid user' }
		}

		const { feedGroupUuid, feedGroupName, feedGroupCustomCoverUrl } = createOrEditFeedGroupInfoRequest
		const { collectionName: feedGroupCollectionName, schemaInstance: feedGroupSchemaInstance } = FeedGroupSchema
		type FeedGroup = InferSchemaType<typeof feedGroupSchemaInstance>

		const now = new Date().getTime()

		const updateFeedGroupWhere: QueryType<FeedGroup> = {
			feedGroupUuid,
			feedGroupCreatorUuid: uuid, // Ensure it's the feed group created by the current user
		}
		const updateFeedGroupData: UpdateType<FeedGroup> = {
			feedGroupName,
			customCover: feedGroupCustomCoverUrl,
			isUpdatedAfterReview: true,
			editDateTime: now,
		}

		const findOneAndUpdateFeedGroupDataResult = await findOneAndUpdateData4MongoDB<FeedGroup>(updateFeedGroupWhere, updateFeedGroupData, feedGroupSchemaInstance, feedGroupCollectionName)

		if (!findOneAndUpdateFeedGroupDataResult.success || !findOneAndUpdateFeedGroupDataResult.result) {
			console.error('ERROR', 'Create or update feed group info failed: update failed')
			return { success: false, message: 'Create or update feed group info failed: update failed' }
		}

		return { success: false, message: 'Create or update feed group info success', feedGroupResult: findOneAndUpdateFeedGroupDataResult.result }
	} catch (error) {
		console.error('ERROR', 'Create or update feed group info error: unknown reason', error)
		return { success: false, message: 'Create or update feed group info error: unknown reason' }
	}
}

/**
 * // WARN: Only for administrators
 * Administrator approves feed group info update
 * @param administratorApproveFeedGroupInfoChangeRequest Request payload
 * @param administratorUuid Administrator UUID
 * @param administratorToken Administrator token
 * @returns Response
 */
export const administratorApproveFeedGroupInfoChangeService = async (administratorApproveFeedGroupInfoChangeRequest: AdministratorApproveFeedGroupInfoChangeRequestDto, administratorUuid: string, administratorToken: string): Promise<AdministratorApproveFeedGroupInfoChangeResponseDto> => {
	try {
		if (!checkAdministratorApproveFeedGroupInfoChangeRequest(administratorApproveFeedGroupInfoChangeRequest)) {
			console.error('ERROR', 'Administrator approves feed group info update failed: invalid parameters')
			return { success: false, message: 'Administrator approves feed group info update failed: invalid parameters' }
		}

		if (!(await checkUserTokenByUuidService(administratorUuid, administratorToken)).success) {
			console.error('ERROR', 'Administrator approves feed group info update failed: invalid user')
			return { success: false, message: 'Administrator approves feed group info update failed: invalid user' }
		}

		const { feedGroupUuid } = administratorApproveFeedGroupInfoChangeRequest
		const { collectionName: feedGroupCollectionName, schemaInstance: feedGroupSchemaInstance } = FeedGroupSchema
		type FeedGroup = InferSchemaType<typeof feedGroupSchemaInstance>

		const now = new Date().getTime()

		const updateFeedGroupWhere: QueryType<FeedGroup> = {
			feedGroupUuid,
		}
		const updateFeedGroupData: UpdateType<FeedGroup> = {
			isUpdatedAfterReview: false,
			editDateTime: now,
		}

		const findOneAndUpdateFeedGroupDataResult = await findOneAndUpdateData4MongoDB<FeedGroup>(updateFeedGroupWhere, updateFeedGroupData, feedGroupSchemaInstance, feedGroupCollectionName)

		if (!findOneAndUpdateFeedGroupDataResult.success || !findOneAndUpdateFeedGroupDataResult.result) {
			console.error('ERROR', 'Administrator approves feed group info update failed: update failed')
			return { success: false, message: 'Administrator approves feed group info update failed: update failed' }
		}

		return { success: false, message: 'Administrator approves feed group info update success' }
	} catch (error) {
		console.error('ERROR', 'Administrator approves feed group info update error: ', error)
		return { success: false, message: 'Administrator approves feed group info update error: unknown reason' }
	}
}

/**
 * // WARN: Only for administrators
 * Administrator deletes feed group
 * @param administratorDeleteFeedGroupRequest Request payload
 * @param administratorUuid Administrator UUID
 * @param administratorToken Administrator token
 * @returns Response
 */
export const administratorDeleteFeedGroupService = async (administratorDeleteFeedGroupRequest: AdministratorDeleteFeedGroupRequestDto, administratorUuid: string, administratorToken: string): Promise<AdministratorDeleteFeedGroupResponseDto> => {
	try {
		if (!checkAdministratorDeleteFeedGroupRequest(administratorDeleteFeedGroupRequest)) {
			console.error('ERROR', 'Administrator delete feed group failed: invalid parameters')
			return { success: false, message: 'Administrator delete feed group failed: invalid parameters' }
		}

		if (!(await checkUserTokenByUuidService(administratorUuid, administratorToken)).success) {
			console.error('ERROR', 'Administrator delete feed group failed: invalid user')
			return { success: false, message: 'Administrator delete feed group failed: invalid user' }
		}

		const { feedGroupUuid } = administratorDeleteFeedGroupRequest
		const { collectionName: feedGroupCollectionName, schemaInstance: feedGroupSchemaInstance } = FeedGroupSchema
		type FeedGroup = InferSchemaType<typeof feedGroupSchemaInstance>

		const deleteFeedGroupWhere: QueryType<FeedGroup> = {
			feedGroupUuid,
		}

		const administratorDeleteFeedGroupResult = await deleteDataFromMongoDB<FeedGroup>(deleteFeedGroupWhere, feedGroupSchemaInstance, feedGroupCollectionName)

		if (!administratorDeleteFeedGroupResult.success) {
			console.error('ERROR', 'Administrator delete feed group failed: update failed')
			return { success: false, message: 'Administrator delete feed group failed: update failed' }
		}

		return { success: false, message: 'Administrator approves feed group info update success' }
	} catch (error) {
		console.error('ERROR', 'Administrator delete feed group error: ', error)
		return { success: false, message: 'Administrator delete feed group error: unknown reason' }
	}
}

/**
 * Get feed group
 * @param uuid User UUID
 * @param token User token
 * @returns Response
 */
export const getFeedGroupListService = async (uuid: string, token: string): Promise<GetFeedGroupListResponseDto> => {
	try {
		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Get feed group failed: invalid user')
			return { success: false, message: 'Get feed group failed: invalid user' }
		}

		const { collectionName: feedGroupCollectionName, schemaInstance: feedGroupSchemaInstance } = FeedGroupSchema
		type FeedGroup = InferSchemaType<typeof feedGroupSchemaInstance>

		const getFeedGroupWhere: QueryType<FeedGroup> = {
			feedGroupCreatorUuid: uuid,
		}

		const getFeedGroupSelect: SelectType<FeedGroup> = {
			feedGroupUuid: 1, // Feed group UUID
			feedGroupName: 1, // Feed group name
			feedGroupCreatorUuid: 1, // Feed group creator UUID
			uuidList: 1, // Users in feed group
			customCover: 1, // Custom cover for feed group
			editDateTime: 1, // System-specific field - last edit time
			createDateTime: 1, // System-specific field - creation time
		}

		const getFeedGroupResult = await selectDataFromMongoDB<FeedGroup>(getFeedGroupWhere, getFeedGroupSelect, feedGroupSchemaInstance, feedGroupCollectionName)

		if (!getFeedGroupResult.success || !getFeedGroupResult.result) {
			console.error('ERROR', 'Get feed group failed: query failed')
			return { success: false, message: 'Get feed group failed: query failed' }
		}

		return { success: true, message: 'Get feed group success', result: getFeedGroupResult.result }
	} catch (error) {
		console.error('ERROR', 'Get feed group error: ', error)
		return { success: false, message: 'Get feed group error: unknown reason' }
	}
}

/**
 * Get feed content
 * @param getFeedContentRequest Request payload
 * @param uuid User UUID
 * @param token User token
 * @returns Response
 */
export const getFeedContentService = async (getFeedContentRequest: GetFeedContentRequestDto, uuid: string, token: string): Promise<GetFeedContentResponseDto> => {
	try {
		if (!checkGetFeedContentRequest(getFeedContentRequest)) {
			console.error('ERROR', 'Get feed content failed: invalid parameters')
			return { success: false, message: 'Get feed content failed: invalid parameters', isLonely: false }
		}

		if (!(await checkUserTokenByUuidService(uuid, uuid)).success) {
			console.error('ERROR', 'Get feed content failed: invalid user')
			return { success: false, message: 'Get feed content failed: invalid user', isLonely: false }
		}

		const { feedGroupUuid, pagination } = getFeedContentRequest

		const uuidList = []
		if (feedGroupUuid) {
			const { collectionName: feedGroupCollectionName, schemaInstance: feedGroupSchemaInstance } = FeedGroupSchema
			type FeedGroup = InferSchemaType<typeof feedGroupSchemaInstance>

			const getFeedGroupUuidListWhere: QueryType<FeedGroup> = {
				feedGroupUuid,
			}

			const getFeedGroupUuidListSelect: SelectType<FeedGroup> = {
				uuidList: 1, // Users in feed group
			}

			const getFeedGroupUserListResult = await selectDataFromMongoDB<FeedGroup>(getFeedGroupUuidListWhere, getFeedGroupUuidListSelect, feedGroupSchemaInstance, feedGroupCollectionName)
			const uuidListResult = getFeedGroupUserListResult.result?.[0]?.uuidList

			if (!getFeedGroupUserListResult.success) {
				console.error('ERROR', 'Get feed content failed: query users in feed group failed')
				return { success: false, message: 'Get feed content failed: query users in feed group failed', isLonely: { noUserInFeedGroup: true } }
			}

			if (Array.isArray(uuidListResult) && uuidList.length <= 0) {
				console.warn('WARN', 'WARNING', 'You have no users in the selected feed group')
				return { success: true, message: 'You have no users in the selected feed group', isLonely: { noUserInFeedGroup: true }, result: { count: 0, content: [] } }
			}

			uuidList.push(uuidListResult)
		} else {
			const { collectionName: followingCollectionName, schemaInstance: followingSchemaInstance } = FollowingSchema
			type Following = InferSchemaType<typeof followingSchemaInstance>

			const getFollowingUuidListWhere: QueryType<Following> = {
				followerUuid: uuid,
			}

			const getFollowingUuidListSelect: SelectType<Following> = {
				followingUuid: 1,
			}

			const getFollowingUserListResult = await selectDataFromMongoDB<Following>(getFollowingUuidListWhere, getFollowingUuidListSelect, followingSchemaInstance, followingCollectionName)
			const uuidListResult = getFollowingUserListResult.result?.map(followingResult => followingResult.followingUuid)

			if (!getFollowingUserListResult.success) {
				console.error('ERROR', 'Get feed content failed: query users followed failed')
				return { success: false, message: 'Get feed content failed: query users followed failed', isLonely: { noFollowing: true } }
			}

			if (Array.isArray(uuidListResult) && uuidList.length <= 0) {
				console.warn('WARN', 'WARNING', 'You have not followed any users')
				return { success: true, message: 'You have not followed any users', isLonely: { noFollowing: true }, result: { count: 0, content: [] } }
			}

			uuidList.push(uuidListResult)
		}

		// Match video basic pipeline based on uuid
		const feedContentMatchPipeline: PipelineStage[] = [
			{
				$match: {
					uploaderUUID: { $in: uuidList },
				},
			},
		]

		// Pipeline to get total number of dynamic videos
		const countFeedContentBasePipeline: PipelineStage[] = [
			{
				$count: 'totalCount', // Count total documents
			}
		]

		let skip = 0
		let pageSize = undefined
		if (pagination && pagination.page > 0 && pagination.pageSize > 0) {
			skip = (pagination.page - 1) * pagination.pageSize
			pageSize = pagination.pageSize
		}

		// Pipeline to match video info
		const getFeedContentBasePipeline: PipelineStage[] = [
			{
				$lookup: {
					from: 'user-infos',
					localField: 'uploaderUUID',
					foreignField: 'UUID',
					as: 'uploader_info',
				},
			},
			{ $skip: skip }, // Skip specified number of documents
			{ $limit: pageSize }, // Limit the number of returned documents
			{
				$unwind: '$uploader_info',
			},
			{
				$sort: {
					uploadDate: -1, // Sort by uploadDate in descending order
				},
			},
			{
				$project: {
					videoId: 1,
					title: 1,
					image: 1,
					uploadDate: 1,
					watchedCount: 1,
					uploaderId: 1, // Uploader UID
					duration: 1,
					description: 1,
					editDateTime: 1,
					uploader: '$uploader_info.username', // Uploader's name
					uploaderNickname: '$uploader_info.userNickname', // Uploader's nickname
				}
			}
		]

		const countFeedContentPipeline = feedContentMatchPipeline.concat(countFeedContentBasePipeline)
		const getFeedContentPipeline = feedContentMatchPipeline.concat(getFeedContentBasePipeline)

		const { collectionName: videoCollectionName, schemaInstance: videoSchemaInstance } = VideoSchema
		type ThumbVideo = InferSchemaType<typeof videoSchemaInstance>

		const feedContentCountPromise = selectDataByAggregateFromMongoDB(videoSchemaInstance, videoCollectionName, countFeedContentPipeline)
		const feedContentDataPromise = selectDataByAggregateFromMongoDB<ThumbVideo>(videoSchemaInstance, videoCollectionName, getFeedContentPipeline)

		const [ feedContentCountResult, feedContentDataResult ] = await Promise.all([feedContentCountPromise, feedContentDataPromise])
		const count = feedContentCountResult.result?.[0]?.totalCount
		const content = feedContentDataResult.result

		if ( !feedContentCountResult.success || !feedContentDataResult.success
			|| typeof count !== 'number' || count < 0
			|| ( Array.isArray(content) && !content )
		) {
			console.error('ERROR', 'Get feed content failed: query video data failed')
			return { success: false, message: 'Get feed content failed: query video data failed', isLonely: false }
		}

		return {
			success: true,
			message: count > 0 ? 'Get feed content success' : 'Get feed content success, length is zero',
			isLonely: false,
			result: {
				count,
				content,
			},
		}
	} catch (error) {
		console.error('ERROR', 'Get feed content error: ', error)
		return { success: false, message: 'Get feed content error: unknown reason', isLonely: false }
	}
}

/**
 * Validate request payload for following an uploader
 * @param followingUploaderRequest Request payload
 * @returns true if valid, false if invalid
 */
const checkFollowingUploaderRequest = (followingUploaderRequest: FollowingUploaderRequestDto): boolean => {
	return ( followingUploaderRequest.followingUid !== undefined && followingUploaderRequest.followingUid !== null && followingUploaderRequest.followingUid > 0 )
}

/**
 * Validate request payload for unfollowing an uploader
 * @param followingUploaderRequest Request payload
 * @returns true if valid, false if invalid
 */
const checkUnfollowingUploaderRequest = (unfollowingUploaderRequest: UnfollowingUploaderRequestDto): boolean => {
	return ( unfollowingUploaderRequest.unfollowingUid !== undefined && unfollowingUploaderRequest.unfollowingUid !== null && unfollowingUploaderRequest.unfollowingUid > 0 )
}

/**
 * Validate request payload for creating a feed group
 * @param createFeedGroupRequest Request payload
 * @returns true if valid, false if invalid
 */
const checkCreateFeedGroupRequest = (createFeedGroupRequest: CreateFeedGroupRequestDto): boolean => {
	return ( !!createFeedGroupRequest.feedGroupName )
}

/**
 * Validate request payload for adding new UID to a feed group
 * @param addNewUser2FeedGroupRequest Request payload
 * @returns true if valid, false if invalid
 */
const checkAddNewUser2FeedGroupRequest = (addNewUser2FeedGroupRequest: AddNewUid2FeedGroupRequestDto): boolean => {
	return (
		!!addNewUser2FeedGroupRequest.feedGroupUuid
		&& !!addNewUser2FeedGroupRequest.uidList && addNewUser2FeedGroupRequest.uidList.every(uid => uid !== undefined && uid !== null && uid > 0)
	)
}

/**
 * Validate request payload for removing UID from a feed group
 * @param removeUidFromFeedGroupRequest Request payload
 * @returns true if valid, false if invalid
 */
const checkRemoveUidFromFeedGroupRequest = (removeUidFromFeedGroupRequest: RemoveUidFromFeedGroupRequestDto): boolean => {
	return (
		!!removeUidFromFeedGroupRequest.feedGroupUuid
		&& !!removeUidFromFeedGroupRequest.uidList && removeUidFromFeedGroupRequest.uidList.every(uid => uid !== undefined && uid !== null && uid > 0)
	)
}

/**
 * Validate request payload for deleting a feed group
 * @param deleteFeedGroupRequest Request payload
 * @returns true if valid, false if invalid
 */
const checkDeleteFeedGroupRequest = (deleteFeedGroupRequest: DeleteFeedGroupRequestDto): boolean => {
	return ( !!deleteFeedGroupRequest.feedGroupUuid )
}

/**
 * Validate request payload for creating or updating feed group info
 * @param createOrEditFeedGroupInfoRequest Request payload
 * @returns true if valid, false if invalid
 */
const checkCreateOrEditFeedGroupInfoRequest = (createOrEditFeedGroupInfoRequest: CreateOrEditFeedGroupInfoRequestDto): boolean => {
	return ( !!createOrEditFeedGroupInfoRequest.feedGroupUuid )
}

/**
 * Validate request payload for administrator approving feed group info update
 * @param administratorApproveFeedGroupInfoChangeRequest Request payload
 * @returns true if valid, false if invalid
 */
const checkAdministratorApproveFeedGroupInfoChangeRequest = (administratorApproveFeedGroupInfoChangeRequest: AdministratorApproveFeedGroupInfoChangeRequestDto): boolean => {
	return ( !!administratorApproveFeedGroupInfoChangeRequest.feedGroupUuid )
}

/**
 * Validate request payload for administrator approving feed group info update
 * @param administratorDeleteFeedGroupRequest Request payload
 * @returns true if valid, false if invalid
 */
const checkAdministratorDeleteFeedGroupRequest = (administratorDeleteFeedGroupRequest: AdministratorDeleteFeedGroupRequestDto): boolean => {
	return ( !!administratorDeleteFeedGroupRequest.feedGroupUuid )
}

/**
 * Validate request payload for getting feed content
 * @param getFeedContentRequest Request payload
 * @returns true if valid, false if invalid
 */
const checkGetFeedContentRequest = (getFeedContentRequest: GetFeedContentRequestDto): boolean => {
	return (
		!!getFeedContentRequest.pagination
		&& getFeedContentRequest.pagination.page >= 0 && getFeedContentRequest.pagination.pageSize > 0 && getFeedContentRequest.pagination.pageSize <= 200
	);
}
