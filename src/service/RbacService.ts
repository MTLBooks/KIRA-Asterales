import { InferSchemaType, PipelineStage, Query } from "mongoose";
import { AdminGetUserRolesByUidRequestDto, AdminGetUserRolesByUidResponseDto, AdminUpdateUserRoleRequestDto, AdminUpdateUserRoleResponseDto, CheckUserRbacParams, CheckUserRbacResult, CreateRbacApiPathRequestDto, CreateRbacApiPathResponseDto, CreateRbacRoleRequestDto, CreateRbacRoleResponseDto, DeleteRbacApiPathRequestDto, DeleteRbacApiPathResponseDto, DeleteRbacRoleRequestDto, DeleteRbacRoleResponseDto, GetRbacApiPathRequestDto, GetRbacApiPathResponseDto, GetRbacRoleRequestDto, GetRbacRoleResponseDto, UpdateApiPathPermissionsForRoleRequestDto, UpdateApiPathPermissionsForRoleResponseDto } from "../controller/RbacControllerDto.js";
import { checkUserTokenByUuidService, getUserUuid } from "./UserService.js";
import { deleteDataFromMongoDB, findOneAndUpdateData4MongoDB, insertData2MongoDB, selectDataByAggregateFromMongoDB, selectDataFromMongoDB } from "../dbPool/DbClusterPool.js";
import { UserAuthSchema, UserInfoSchema } from "../dbPool/schema/UserSchema.js";
import { RbacApiSchema, RbacRoleSchema } from "../dbPool/schema/RbacSchema.js";
import { v4 as uuidV4 } from 'uuid'
import { QueryType, SelectType, UpdateType } from "../dbPool/DbClusterPoolTypes.js";
import { abortAndEndSession, commitAndEndSession, createAndStartSession } from "../common/MongoDBSessionTool.js";
import { clearUndefinedItemInObject, isEmptyObject } from "../common/ObjectTool.js";

/**
 * Check user permission via RBAC
 * @param params Parameters for RBAC permission check
 * @returns RBAC check result
 */
export const checkUserByRbac = async (params: CheckUserRbacParams): Promise<CheckUserRbacResult> => {
	try {
		const apiPath = params.apiPath
		let uuid: string | undefined = undefined
		let uid: number | undefined = undefined
		if ('uuid' in params) uuid = params.uuid
		if ('uid' in params) uid = params.uid

		if (!uuid && uid === undefined) {
			console.error('ERROR', 'RBAC authorization failed: UUID or UID not provided')
			return { status: 500, message: `RBAC authorization failed: UUID or UID not provided` }
		}

		const match = { UUID: uuid, uid }
		const clearedMatch = clearUndefinedItemInObject(match)

		const checkUserRbacPipeline: PipelineStage[] = [
			// Match user
			{
				$match: clearedMatch,
			},
			// Join roles collection
			{
				$lookup: {
					from: "rbac-roles",
					localField: "roles",
					foreignField: "roleName",
					as: "rolesData"
				}
			},
			// Unwind rolesData (multiple roles)
			{ $unwind: "$rolesData" },
			// Unwind apiPathNamePermissions (multiple permissions)
			{ $unwind: "$rolesData.apiPathPermissions" },
			// Filter by matching API path
			{
				$match: {
					"rolesData.apiPathPermissions": apiPath
				}
			},
			// Project only needed fields
			{ $project: { UUID: 1 } }
		]

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>
		const checkUserRbacResult = await selectDataByAggregateFromMongoDB<UserAuth>(userAuthSchemaInstance, userAuthCollectionName, checkUserRbacPipeline)

		if (checkUserRbacResult && checkUserRbacResult.success && checkUserRbacResult.result && Array.isArray(checkUserRbacResult.result) && checkUserRbacResult.result.length > 0) {
			return { status: 200, message: `User ${uuid ? `UUID: ${uuid}` : `UID: ${uid}`} is allowed to access ${apiPath}` }
		} else {
			return { status: 403, message: `User ${uuid ? `UUID: ${uuid}` : `UID: ${uid}`} has no permission to access ${apiPath}, or the user does not exist` }
		}
	} catch (error) {
		console.error('ERROR', 'RBAC authorization error: unknown error', error)
		return { status: 500, message: 'RBAC authorization error: unknown error' }
	}
}


/**
 * Create RBAC API path
 * @param createRbacApiPathRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const createRbacApiPathService = async (createRbacApiPathRequest: CreateRbacApiPathRequestDto, uuid: string, token: string): Promise<CreateRbacApiPathResponseDto> => {
	try {
		if (!checkCreateRbacApiPathRequest(createRbacApiPathRequest)) {
			console.error('ERROR', 'Create RBAC API path failed: invalid parameters')
			return { success: false, message: 'Create RBAC API path failed: invalid parameters' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Create RBAC API path failed: token verification failed')
			return { success: false, message: 'Create RBAC API path failed: token verification failed' }
		}

		const { apiPath, apiPathType, apiPathColor, apiPathDescription } = createRbacApiPathRequest
		const apiPathUuid = uuidV4()
		const now = new Date().getTime()

		const { collectionName: rbacApiCollectionName, schemaInstance: rbacApiSchemaInstance } = RbacApiSchema
		type RbacApi = InferSchemaType<typeof rbacApiSchemaInstance>

		const rbacApiData: RbacApi = {
			apiPathUuid,
			apiPath,
			apiPathType,
			apiPathColor,
			apiPathDescription,
			creatorUuid: uuid,
			lastEditorUuid: uuid,
			createDateTime: now,
			editDateTime: now
		}

		const insertResult = await insertData2MongoDB<RbacApi>(rbacApiData, rbacApiSchemaInstance, rbacApiCollectionName)
		const insertResultData = insertResult?.result?.[0]

		if (!insertResult.success || !insertResultData) {
			console.error('ERROR', 'Create RBAC API path failed: insert failed')
			return { success: false, message: 'Create RBAC API path failed: insert failed' }
		}

		return {
			success: true,
			message: 'Create RBAC API path success',
			result: {
				apiPathUuid: insertResultData.apiPathUuid,
				apiPath: insertResultData.apiPath,
				apiPathType: insertResultData.apiPathType,
				apiPathColor: insertResultData.apiPathColor,
				apiPathDescription: insertResultData.apiPathDescription,
				creatorUuid: insertResultData.creatorUuid,
				lastEditorUuid: insertResultData.lastEditorUuid,
				createDateTime: insertResultData.createDateTime,
				editDateTime: insertResultData.editDateTime,
				isAssignedOnce: false
			}
		}
	} catch (error) {
		console.error('ERROR', 'Create RBAC API path error: unknown error', error)
		return { success: false, message: 'Create RBAC API path error: unknown error' }
	}
}

/**
 * Delete RBAC API path
 * @param deleteRbacApiPathRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const deleteRbacApiPathService = async (deleteRbacApiPathRequest: DeleteRbacApiPathRequestDto, uuid: string, token: string): Promise<DeleteRbacApiPathResponseDto> => {
	try {
		if (!checkDeleteRbacApiPathRequest(deleteRbacApiPathRequest)) {
			console.error('ERROR', 'Delete RBAC API path failed: invalid parameters')
			return { success: false, isAssigned: false, message: 'Delete RBAC API path failed: invalid parameters' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Delete RBAC API path failed: token verification failed')
			return { success: false, isAssigned: false, message: 'Delete RBAC API path failed: token verification failed' }
		}

		const { apiPath } = deleteRbacApiPathRequest

		const { collectionName: rbacRoleCollectionName, schemaInstance: rbacRoleSchemaInstance } = RbacRoleSchema
		type RbacRole = InferSchemaType<typeof rbacRoleSchemaInstance>

		const chackApiPathUnassignedWhere: QueryType<RbacRole> = {
			apiPathPermissions: { $in: [apiPath] }
		}
		const chackApiPathUnassignedSelect: SelectType<RbacRole> = {
			roleName: 1,
		}

		const session = await createAndStartSession()

		const chackApiPathUnassignedResult = await selectDataFromMongoDB<RbacRole>(chackApiPathUnassignedWhere, chackApiPathUnassignedSelect, rbacRoleSchemaInstance, rbacRoleCollectionName, { session })

		if (chackApiPathUnassignedResult.result?.length > 0) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Delete RBAC API path failed: the API path has been assigned to a role, please unassign it first')
			return { success: false, isAssigned: true, message: 'Delete RBAC API path failed: the API path has been assigned to a role, please unassign it first' }
		}

		const { collectionName: rbacApiCollectionName, schemaInstance: rbacApiSchemaInstance } = RbacApiSchema
		type RbacApi = InferSchemaType<typeof rbacApiSchemaInstance>

		const deleteRbacApiWhere: QueryType<RbacApi> = {
			apiPath,
		}

		const deleteRbacApiResult = await deleteDataFromMongoDB(deleteRbacApiWhere, rbacApiSchemaInstance, rbacApiCollectionName, { session })

		if (!deleteRbacApiResult.success) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Delete RBAC API path failed: deletion failed')
			return { success: false, isAssigned: false, message: 'Delete RBAC API path failed: deletion failed' }
		}

		await commitAndEndSession(session)
		return { success: true, isAssigned: false, message: 'Delete RBAC API path success' }
	} catch (error) {
		console.error('ERROR', 'Create RBAC API path error: unknown error', error)
		return { success: false, isAssigned: false, message: 'Create RBAC API path error: unknown error' }
	}
}

/**
 * Get RBAC API paths
 * @param getRbacApiPathRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const getRbacApiPathService = async (getRbacApiPathRequest: GetRbacApiPathRequestDto, uuid: string, token: string): Promise<GetRbacApiPathResponseDto> => {
	try {
		if (!checkGetRbacApiPathRequest(getRbacApiPathRequest)) {
			console.error('ERROR', 'Get RBAC API path failed: invalid parameters')
			return { success: false, message: 'Get RBAC API path failed: invalid parameters' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Get RBAC API path failed: token verification failed')
			return { success: false, message: 'Get RBAC API path failed: token verification failed' }
		}

		const { search, pagination } = getRbacApiPathRequest
		const clearedSearch = clearUndefinedItemInObject(search)

		let skip = 0
		let pageSize = undefined
		if (pagination && pagination.page > 0 && pagination.pageSize > 0) {
			skip = (pagination.page - 1) * pagination.pageSize
			pageSize = pagination.pageSize
		}

		const countRbacApiPathPipeline: PipelineStage[] = [
			...(!isEmptyObject(clearedSearch) ? [{
				$match: {
					$and: Object.entries(clearedSearch).map(([key, value]) => ({
						[key]: { $regex: value, $options: "i" } // fuzzy search
					}))
				},
			}] : []),
			{
				$count: 'totalCount', // total documents
			},
		]

		const getRbacApiPathPipeline: PipelineStage[] = [
			...(!isEmptyObject(clearedSearch) ? [{
				$match: {
					$and: Object.entries(clearedSearch).map(([key, value]) => ({
						[key]: { $regex: value, $options: "i" } // fuzzy search
					}))
				},
			}] : []),
			{
				$lookup: {
					from: "rbac-roles",
					localField: "apiPath",
					foreignField: "apiPathPermissions",
					as: "matchedDocs"
				}
			},
			{
				$addFields: {
					isAssignedOnce: { $gt: [{ $size: "$matchedDocs" }, 0] } // true if any matches
				}
			},
			{
				$project: {
					matchedDocs: 0 // remove temp field to keep original structure
				}
			},
			{ $skip: skip }, // pagination skip
			{ $limit: pageSize }, // pagination limit
		]

		const { collectionName: rbacApiCollectionName, schemaInstance: rbacApiSchemaInstance } = RbacApiSchema
		type RbacApi = InferSchemaType<typeof rbacApiSchemaInstance>

		const rbacApiPathCountPromise = selectDataByAggregateFromMongoDB(rbacApiSchemaInstance, rbacApiCollectionName, countRbacApiPathPipeline)
		const rbacApiPathDataPromise = selectDataByAggregateFromMongoDB<RbacApi & { isAssignedOnce: boolean }>(rbacApiSchemaInstance, rbacApiCollectionName, getRbacApiPathPipeline)

		const [ rbacApiPathCountResult, rbacApiPathDataResult ] = await Promise.all([rbacApiPathCountPromise, rbacApiPathDataPromise])
		const count = rbacApiPathCountResult.result?.[0]?.totalCount
		const result = rbacApiPathDataResult.result

		if (!rbacApiPathCountResult.success || !rbacApiPathDataResult.success
			|| typeof count !== 'number' || count < 0
			|| ( Array.isArray(result) && !result )
		) {
			console.error('ERROR', 'Get RBAC API path failed: query failed')
			return { success: false, message: 'Get RBAC API path failed: query failed' }
		}

		if (count === 0) {
			return { success: true, message: 'No RBAC API path found', count: 0, result: [] }
		} else {
			return { success: true, message: 'Get RBAC API path success', count, result }
		}
	} catch (error) {
		console.error('ERROR', 'Get RBAC API path error: unknown error', error)
		return { success: false, message: 'Get RBAC API path error: unknown error' }
	}
}

/**
 * Create RBAC role
 * @param createRbacRoleRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const createRbacRoleService = async (createRbacRoleRequest: CreateRbacRoleRequestDto, uuid: string, token: string): Promise<CreateRbacRoleResponseDto> => {
	try {
		if (!checkCreateRbacRoleRequest(createRbacRoleRequest)) {
			console.error('ERROR', 'Create RBAC role failed: invalid parameters')
			return { success: false, message: 'Create RBAC role failed: invalid parameters' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Create RBAC role failed: token verification failed')
			return { success: false, message: 'Create RBAC role failed: token verification failed' }
		}

		const { roleName, roleType, roleColor, roleDescription } = createRbacRoleRequest
		const roleUuid = uuidV4()
		const now = new Date().getTime()

		const { collectionName: rbacRoleCollectionName, schemaInstance: rbacRoleSchemaInstance } = RbacRoleSchema
		type RbacRole = InferSchemaType<typeof rbacRoleSchemaInstance>

		const rbacRoleData: RbacRole = {
			roleUuid,
			roleName,
			apiPathPermissions: [],
			roleType,
			roleColor,
			roleDescription,
			creatorUuid: uuid,
			lastEditorUuid: uuid,
			createDateTime: now,
			editDateTime: now
		}

		const insertResult = await insertData2MongoDB<RbacRole>(rbacRoleData, rbacRoleSchemaInstance, rbacRoleCollectionName)
		const insertResultData = insertResult?.result?.[0]

		if (!insertResult.success || !insertResultData) {
			console.error('ERROR', 'Create RBAC role failed: insert failed')
			return { success: false, message: 'Create RBAC role failed: insert failed' }
		}

		return { success: true, message: 'Create RBAC role success', result: insertResultData }
	} catch (error) {
		console.error('ERROR', 'Create RBAC role error: unknown error', error)
		return { success: false, message: 'Create RBAC role error: unknown error' }
	}
}

/**
 * Delete RBAC role
 * @param deleteRbacRoleRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const deleteRbacRoleService = async (deleteRbacRoleRequest: DeleteRbacRoleRequestDto, uuid: string, token: string): Promise<DeleteRbacRoleResponseDto> => {
	try {
		if (!checkDeleteRbacRoleRequest(deleteRbacRoleRequest)) {
			console.error('ERROR', 'Delete RBAC role failed: invalid parameters')
			return { success: false, message: 'Delete RBAC role failed: invalid parameters' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Delete RBAC role failed: token verification failed')
			return { success: false, message: 'Delete RBAC role failed: token verification failed' }
		}

		const { roleName } = deleteRbacRoleRequest

		const { collectionName: rbacRoleCollectionName, schemaInstance: rbacRoleSchemaInstance } = RbacRoleSchema
		type RbacRole = InferSchemaType<typeof rbacRoleSchemaInstance>

		const deleteRbacRoleWhere: QueryType<RbacRole> = {
			roleName,
		}

		const deleteResult = await deleteDataFromMongoDB(deleteRbacRoleWhere, rbacRoleSchemaInstance, rbacRoleCollectionName)

		if (!deleteResult.success) {
			console.error('ERROR', 'Delete RBAC role failed: deletion failed')
			return { success: false, message: 'Delete RBAC role failed: deletion failed' }
		}

		return { success: true, message: 'Delete RBAC role success' }
	} catch (error) {
		console.error('ERROR', 'Delete RBAC role error: unknown error', error)
		return { success: false, message: 'Delete RBAC role error: unknown error' }
	}
}

/**
 * Get RBAC roles
 * @param getRbacRoleRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const getRbacRoleService = async (getRbacRoleRequest: GetRbacRoleRequestDto, uuid: string, token: string): Promise<GetRbacRoleResponseDto> => {
	try {
		if (!checkGetRbacRoleRequest(getRbacRoleRequest)) {
			console.error('ERROR', 'Get RBAC role failed: invalid parameters')
			return { success: false, message: 'Get RBAC role failed: invalid parameters' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Get RBAC role failed: token verification failed')
			return { success: false, message: 'Get RBAC role failed: token verification failed' }
		}

		const { search, pagination } = getRbacRoleRequest
		const clearedSearch = clearUndefinedItemInObject(search)

		let skip = 0
		let pageSize = undefined
		if (pagination && pagination.page > 0 && pagination.pageSize > 0) {
			skip = (pagination.page - 1) * pagination.pageSize
			pageSize = pagination.pageSize
		}

		const countRbacRolePipeline: PipelineStage[] = [
			...(!isEmptyObject(clearedSearch) ? [{
				$match: {
					$and: Object.entries(clearedSearch).map(([key, value]) => ({
						[key]: { $regex: value, $options: "i" } // fuzzy search
					}))
				},
			}] : []),
			{
				$count: 'totalCount', // total documents
			},
		]

		const getRbacRolePipeline: PipelineStage[] = [
			...(!isEmptyObject(clearedSearch) ? [{
				$match: {
					$and: Object.entries(clearedSearch).map(([key, value]) => ({
						[key]: { $regex: value, $options: "i" } // fuzzy search
					}))
				},
			}] : []),
			{
				$lookup: {
					from: "rbac-api-lists",
					localField: "apiPathPermissions",
					foreignField: "apiPath",
					as: "apiPathList"
				}
			},
			{
				$addFields: {
					apiPathList: "$apiPathList"
				}
			},
			{ $skip: skip }, // pagination skip
			{ $limit: pageSize }, // pagination limit
		]

		const { collectionName: rbacRoleCollectionName, schemaInstance: rbacRoleSchemaInstance } = RbacRoleSchema
		type RbacRole = InferSchemaType<typeof rbacRoleSchemaInstance>

		const rbacRoleCountPromise = selectDataByAggregateFromMongoDB(rbacRoleSchemaInstance, rbacRoleCollectionName, countRbacRolePipeline)
		const rbacRoleDataPromise = selectDataByAggregateFromMongoDB<RbacRole & { apiPathList: GetRbacRoleResponseDto['result'][number]['apiPathList'] }>(rbacRoleSchemaInstance, rbacRoleCollectionName, getRbacRolePipeline)

		const [ rbacRoleCountResult, rbacRoleDataResult ] = await Promise.all([rbacRoleCountPromise, rbacRoleDataPromise])
		const count = rbacRoleCountResult.result?.[0]?.totalCount
		const result = rbacRoleDataResult.result

		if (!rbacRoleCountResult.success || !rbacRoleDataResult.success
			|| typeof count !== 'number' || count < 0
			|| ( Array.isArray(result) && !result )
		) {
			console.error('ERROR', 'Get RBAC role failed: query failed')
			return { success: false, message: 'Get RBAC role failed: query failed' }
		}

		if (count === 0) {
			return { success: true, message: 'No RBAC role found', count: 0, result: [] }
		} else {
			return { success: true, message: 'Get RBAC API path success', count, result }
		}

	} catch (error) {
		console.error('ERROR', 'Get RBAC role error: unknown error', error)
		return { success: false, message: 'Get RBAC role error: unknown error' }
	}
}

/**
 * Update API path permissions for a role
 * @param updateApiPathPermissionsForRoleRequest Request payload
 * @param uuid User UUID
 * @param token User Token
 * @returns Response
 */
export const updateApiPathPermissionsForRoleService = async (updateApiPathPermissionsForRoleRequest: UpdateApiPathPermissionsForRoleRequestDto, uuid: string, token: string): Promise<UpdateApiPathPermissionsForRoleResponseDto> => {
	try {
		if (!checkUpdateApiPathPermissionsForRoleRequest(updateApiPathPermissionsForRoleRequest)) {
			console.error('ERROR', 'Update role API path permissions failed: invalid parameters')
			return { success: false, message: 'Update role API path permissions failed: invalid parameters' }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Update role API path permissions failed: token verification failed')
			return { success: false, message: 'Update role API path permissions failed: token verification failed' }
		}

		const { roleName, apiPathPermissions } = updateApiPathPermissionsForRoleRequest
		const uniqueApiPathPermissions = [...new Set(apiPathPermissions)]

		const { collectionName: rbacApiCollectionName, schemaInstance: rbacApiSchemaInstance } = RbacApiSchema
		type RbacApiList = InferSchemaType<typeof rbacApiSchemaInstance>

		const checkApiPathPermissionsCountWhere: QueryType<RbacApiList> = {
			apiPath: { $in: uniqueApiPathPermissions },
		}

		const checkApiPathPermissionsCountSelect: SelectType<RbacApiList> = {
			apiPath: 1,
		}

		const session = await createAndStartSession()

		const checkApiPathPermissionsCountResult = await selectDataFromMongoDB<RbacApiList>(checkApiPathPermissionsCountWhere, checkApiPathPermissionsCountSelect, rbacApiSchemaInstance, rbacApiCollectionName, { session })

		if (!checkApiPathPermissionsCountResult.success) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Update role API path permissions failed: check API path failed')
			return { success: false, message: 'Update role API path permissions failed: check API path failed' }
		}

		if (checkApiPathPermissionsCountResult.result.length !== uniqueApiPathPermissions.length) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Update role API path permissions failed: some paths do not exist')
			return { success: false, message: 'Update role API path permissions failed: some paths do not exist' }
		}

		const { collectionName: rbacRoleCollectionName, schemaInstance: rbacRoleSchemaInstance } = RbacRoleSchema
		type RbacRole = InferSchemaType<typeof rbacRoleSchemaInstance>

		const updateApiPathPermissions4RoleWhere: QueryType<RbacRole> = {
			roleName,
		}

		const now = new Date().getTime()
		const updateApiPathPermissions4RoleData: UpdateType<RbacRole> = {
			lastEditorUuid: uuid,
			apiPathPermissions: uniqueApiPathPermissions as RbacRole['apiPathPermissions'], // TODO: Mongoose issue: #12420
			editDateTime: now,
		}

		const updateApiPathPermissions4Role = await findOneAndUpdateData4MongoDB<RbacRole>(updateApiPathPermissions4RoleWhere, updateApiPathPermissions4RoleData, rbacRoleSchemaInstance, rbacRoleCollectionName)

		if (!updateApiPathPermissions4Role.success) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Update role API path permissions failed: update failed')
			return { success: false, message: 'Update role API path permissions failed: update failed' }
		}

		return { success: true, message: 'Update role API path permissions success', result: updateApiPathPermissions4Role.result }
	} catch (error) {
		console.error('ERROR', 'Update role API path permissions error: unknown error', error)
		return { success: false, message: 'Update role API path permissions error: unknown error' }
	}
}

/**
 * Admin update user roles
 * @param adminUpdateUserRoleRequest Request payload
 * @param adminUuid Admin UUID
 * @param adminToken Admin Token
 * @returns Response
 */
export const adminUpdateUserRoleService = async (adminUpdateUserRoleRequest: AdminUpdateUserRoleRequestDto, adminUuid: string, adminToken: string): Promise<AdminUpdateUserRoleResponseDto> => {
	try {
		if (!checkAdminUpdateUserRoleRequest(adminUpdateUserRoleRequest)) {
			console.error('ERROR', 'Admin update user roles failed: invalid parameters')
			return { success: false, message: 'Admin update user roles failed: invalid parameters' }
		}

		if (!(await checkUserTokenByUuidService(adminUuid, adminToken)).success) {
			console.error('ERROR', 'Admin update user roles failed: token verification failed')
			return { success: false, message: 'Admin update user roles failed: token verification failed' }
		}

		const { uid, newRoles } = adminUpdateUserRoleRequest
		let { uuid } = adminUpdateUserRoleRequest
		const uniqueNewRoels = [...new Set(newRoles)]

		if (uid && !uuid) {
			uuid = await getUserUuid(uid) || ''
		}

		if (!uuid) {
			console.error('ERROR', 'Admin update user roles failed: user UUID not found')
			return { success: false, message: 'Admin update user roles failed: user UUID not found' }
		}

		const { collectionName: rbacRoleCollectionName, schemaInstance: rbacRoleSchemaInstance } = RbacRoleSchema
		type RbacRole = InferSchemaType<typeof rbacRoleSchemaInstance>

		const checkNewRoelsCountWhere: QueryType<RbacRole> = {
			roleName: { $in: uniqueNewRoels },
		}

		const checkNewRoelsCountSelect: SelectType<RbacRole> = {
			roleName: 1,
		}

		const session = await createAndStartSession()

		const checkNewRoelsCountResult = await selectDataFromMongoDB<RbacRole>(checkNewRoelsCountWhere, checkNewRoelsCountSelect, rbacRoleSchemaInstance, rbacRoleCollectionName, { session })

		if (!checkNewRoelsCountResult.success) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Admin update user roles failed: check role failed')
			return { success: false, message: 'Admin update user roles failed: check role failed' }
		}

		if (checkNewRoelsCountResult.result.length !== uniqueNewRoels.length) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Admin update user roles failed: some roles do not exist')
			return { success: false, message: 'Admin update user roles failed: some roles do not exist' }
		}

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>

		const updateApiPathPermissions4RoleWhere: QueryType<UserAuth> = {
			UUID: uuid,
		}

		const now = new Date().getTime()
		const updateApiPathPermissions4RoleData: UpdateType<UserAuth> = {
			roles: uniqueNewRoels as UserAuth['roles'], // TODO: Mongoose issue: #12420
			editDateTime: now,
		}

		const updateRoles4UserResult = await findOneAndUpdateData4MongoDB<UserAuth>(updateApiPathPermissions4RoleWhere, updateApiPathPermissions4RoleData, userAuthSchemaInstance, userAuthCollectionName)

		if (!updateRoles4UserResult.success) {
			await abortAndEndSession(session)
			console.error('ERROR', 'Admin update user roles failed: update failed')
			return { success: false, message: 'Admin update user roles failed: update failed' }
		}

		return { success: true, message: 'Admin update user roles success' }
	} catch (error) {
		console.error('ERROR', 'Admin update user roles error: unknown error', error)
		return { success: false, message: 'Admin update user roles error: unknown error' }
	}
}

/**
 * Admin get user roles by UID
 * @param adminGetUserRolesByUidRequest Request payload
 * @param adminUuid Admin UUID
 * @param adminToken Admin Token
 * @returns Response
 */
export const adminGetUserRolesByUidService = async (adminGetUserRolesByUidRequest: AdminGetUserRolesByUidRequestDto, adminUuid: string, adminToken: string): Promise<AdminGetUserRolesByUidResponseDto> => {
	try {
		if (!checkAdminGetUserRolesByUidRequest(adminGetUserRolesByUidRequest)) {
			console.error('ERROR', 'Get user roles by UID failed: invalid parameters')
			return { success: false, message: 'Get user roles by UID failed: invalid parameters' }
		}

		if (!(await checkUserTokenByUuidService(adminUuid, adminToken)).success) {
			console.error('ERROR', 'Get user roles by UID failed: token verification failed')
			return { success: false, message: 'Get user roles by UID failed: token verification failed' }
		}

		const { uid } = adminGetUserRolesByUidRequest

		const adminGetUserRolesPipeline: PipelineStage[] = [
			{
				$match: {
					uid,
				}
			},
			{
				$lookup: {
					from: "rbac-roles",
					localField: "roles",
					foreignField: "roleName",
					as: "userRole"
				}
			},
			{
				$lookup: {
					from: "user-infos",
					localField: "UUID",
					foreignField: "UUID",
					as: "userInfo"
				}
			},
			{
				$unwind: '$userInfo',
			},
			{
				$project: {
					uid: 1,
					uuid: '$UUID',
					username: '$userInfo.username',
					userNickname: '$userInfo.userNickname',
					avatar: '$userInfo.avatar',
					roles: '$userRole',
				}
			},
		]

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>

		const { schemaInstance: userInfoSchemaInstance } = UserInfoSchema
		type UserInfo = InferSchemaType<typeof userInfoSchemaInstance>

		const { schemaInstance: rbacRoleSchemaInstance } = RbacRoleSchema
		type RbacRole = InferSchemaType<typeof rbacRoleSchemaInstance>


		const adminGerUserRolesResult = await selectDataByAggregateFromMongoDB<{
			uid: UserAuth['uid'];
			uuid: UserAuth['UUID'];
			username: UserInfo['username'];
			userNickname: UserInfo['userNickname'];
			avatar: UserInfo['avatar'];
			roles: RbacRole[];
		}>(userAuthSchemaInstance, userAuthCollectionName, adminGetUserRolesPipeline)
		const adminGerUserRolesData = adminGerUserRolesResult.result?.[0]

		if (!adminGerUserRolesResult.success || !adminGerUserRolesData) {
			console.error('ERROR', 'Get user roles by UID failed: query failed')
			return { success: false, message: 'Get user roles by UID failed: query failed' }
		}

		return { success: true, message: 'Get user roles by UID success', result: adminGerUserRolesData }
	} catch (error) {
		console.error('ERROR', 'Get user roles by UID error: unknown error', error)
		return { success: false, message: 'Get user roles by UID error: unknown error' }
	}
}

/**
 * Validate create RBAC API path request
 * @param createRbacApiPathRequest Request payload
 * @returns true if valid
 */
const checkCreateRbacApiPathRequest = (createRbacApiPathRequest: CreateRbacApiPathRequestDto): boolean => {
	return (
		!!createRbacApiPathRequest.apiPath
		&& createRbacApiPathRequest.apiPathColor ? /^#([0-9A-Fa-f]{8})$/.test(createRbacApiPathRequest.apiPathColor) : true // if color provided, must be 8-char HEX like #66CCFFFF
	)
}

/**
 * Validate delete RBAC API path request
 * @param deleteRbacApiPathRequest Request payload
 * @returns true if valid
 */
const checkDeleteRbacApiPathRequest = (deleteRbacApiPathRequest: DeleteRbacApiPathRequestDto): boolean => {
	return ( !!deleteRbacApiPathRequest.apiPath )
}

/**
 * Validate get RBAC API path request
 * @param getRbacApiPathRequest Request payload
 * @returns true if valid
 */
const checkGetRbacApiPathRequest = (getRbacApiPathRequest: GetRbacApiPathRequestDto): boolean => {
	return true // nothing to validate
}

/**
 * Validate create RBAC role request
 * @param createRbacApiPathRequest Request payload
 * @returns true if valid
 */
const checkCreateRbacRoleRequest = (createRbacRoleRequest: CreateRbacRoleRequestDto): boolean => {
	return (
		!!createRbacRoleRequest.roleName
		&& createRbacRoleRequest.roleColor ? /^#([0-9A-Fa-f]{8})$/.test(createRbacRoleRequest.roleColor) : true // if color provided, must be 8-char HEX like #66CCFFFF
	)
}

/**
 * Validate delete RBAC role request
 * @param createRbacApiPathRequest Request payload
 * @returns true if valid
 */
const checkDeleteRbacRoleRequest = (deleteRbacRoleRequest: DeleteRbacRoleRequestDto): boolean => {
	return ( !!deleteRbacRoleRequest.roleName )
}

/**
 * Validate get RBAC role request
 * @param getRbacRoleRequest Request payload
 * @returns true if valid
 */
const checkGetRbacRoleRequest = (getRbacRoleRequest: GetRbacRoleRequestDto): boolean => {
	return true // nothing to validate
}

/**
 * Validate update API path permissions for role request
 * @param updateApiPathPermissionsForRoleRequest Request payload
 * @returns true if valid
 */
const checkUpdateApiPathPermissionsForRoleRequest = (updateApiPathPermissionsForRoleRequest: UpdateApiPathPermissionsForRoleRequestDto): boolean => {
	return (
		!!updateApiPathPermissionsForRoleRequest.roleName
		&& !!updateApiPathPermissionsForRoleRequest.apiPathPermissions && Array.isArray(updateApiPathPermissionsForRoleRequest.apiPathPermissions)
		&& updateApiPathPermissionsForRoleRequest.apiPathPermissions.every(apiPath => !!apiPath)
	)
}

/**
 * Validate admin update user role request
 * @param adminUpdateUserRoleRequest Request payload
 * @returns true if valid
 */
const checkAdminUpdateUserRoleRequest = (adminUpdateUserRoleRequest: AdminUpdateUserRoleRequestDto): boolean => {
	return (
		(!!adminUpdateUserRoleRequest.uuid || (adminUpdateUserRoleRequest.uid !== undefined && adminUpdateUserRoleRequest !== null)) // uuid or uid must be provided
		&& !!adminUpdateUserRoleRequest.newRoles && Array.isArray(adminUpdateUserRoleRequest.newRoles)
		&& adminUpdateUserRoleRequest.newRoles.every(role => !!role)
	)
}

/**
 * Validate admin get user roles by UID request
 * @param adminGetUserRolesByUidRequest Request payload
 * @returns true if valid
 */
const checkAdminGetUserRolesByUidRequest = (adminGetUserRolesByUidRequest: AdminGetUserRolesByUidRequestDto): boolean => {
	return ( adminGetUserRolesByUidRequest.uid !== undefined && adminGetUserRolesByUidRequest.uid !== null )
}
