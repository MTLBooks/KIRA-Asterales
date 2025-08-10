/**
 * RBAC permission check parameters
 */
export type CheckUserRbacParams =
	| { uuid: string; apiPath: string }
	| { uid: number; apiPath: string };

/**
 * RBAC permission check result
 */
export type CheckUserRbacResult = {
	status: 200 | 403 | 500;
	message: string;
}

/**
 * RBAC API path
 */
type RbacApiPath = {
	/** API path UUID - required - unique */
	apiPathUuid: string;
	/** API path - required - unique */
	apiPath: string;
	/** API path type */
	apiPathType?: string;
	/** API path color, e.g. #66CCFFFF */
	apiPathColor?: string;
	/** API path description */
	apiPathDescription?: string;
	/** Creator UUID - required */
	creatorUuid: string;
	/** Last editor UUID - required */
	lastEditorUuid: string;
	/** Creation time - required */
	createDateTime: number;
	/** Last edit time - required */
	editDateTime: number;
}

/**
 * RBAC API path result
 */
type RbacApiPathResult = RbacApiPath & {
	/** Whether this path has been assigned at least once */
	isAssignedOnce: boolean;
}

/**
 * Create RBAC API path request
 */
export type CreateRbacApiPathRequestDto = {
	/** API path */
	apiPath: string;
	/** API path type */
	apiPathType?: string;
	/** API path color, e.g. #66CCFFFF */
	apiPathColor?: string;
	/** API path description */
	apiPathDescription?: string;
}

/**
 * Create RBAC API path response
 */
export type CreateRbacApiPathResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Created record on success */
	result?: RbacApiPathResult;
}

/**
 * Delete RBAC API path request
 */
export type DeleteRbacApiPathRequestDto = {
	/** API path */
	apiPath: string;
}

/**
 * Delete RBAC API path response
 */
export type DeleteRbacApiPathResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Whether this path is assigned to any role (cannot delete if true) */
	isAssigned: boolean;
}

/**
 * Get RBAC API path request
 */
export type GetRbacApiPathRequestDto = {
	/** Search criteria */
	search: {
		/** API path */
		apiPath?: string;
		/** API path type */
		apiPathType?: string;
		/** API path color, e.g. #66CCFFFF */
		apiPathColor?: string;
		/** API path description */
		apiPathDescription?: string;
	};
	/** Pagination */
	pagination: {
		/** Current page */
		page: number;
		/** Page size */
		pageSize: number;
	};
}

/**
 * Get RBAC API path response
 */
export type GetRbacApiPathResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Result list when success */
	result?: RbacApiPathResult[];
	/** Total count when success */
	count?: number;
}

/**
 * RBAC role
 */
type RbacRole = {
	/** Role UUID */
	roleUuid: string;
	/** Role name */
	roleName: string;
	/** Role type */
	roleType?: string;
	/** Role color, e.g. #66CCFFFF */
	roleColor?: string;
	/** Role description */
	roleDescription?: string;
	/** API path permissions of this role */
	apiPathPermissions: string[];
	/** Creator UUID - required */
	creatorUuid: string;
	/** Last editor UUID - required */
	lastEditorUuid: string;
	/** Creation time - required */
	createDateTime: number;
	/** Last edit time - required */
	editDateTime: number;
}

/**
 * Create RBAC role request
 */
export type CreateRbacRoleRequestDto = {
	/** Role name */
	roleName: string;
	/** Role type */
	roleType?: string;
	/** Role color, e.g. #66CCFFFF */
	roleColor?: string;
	/** Role description */
	roleDescription?: string;
}

/**
 * Create RBAC role response
 */
export type CreateRbacRoleResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Created record when success */
	result?: RbacRole;
}

/**
 * Delete RBAC role request
 */
export type DeleteRbacRoleRequestDto = {
	/** Role name */
	roleName: string;
}

/**
 * Delete RBAC role response
 */
export type DeleteRbacRoleResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Get RBAC role request
 */
export type GetRbacRoleRequestDto = {
	/** Search criteria */
	search: {
		/** Role name */
		roleName?: string;
		/** Role type */
		roleType?: string;
		/** Role color, e.g. #66CCFFFF */
		roleColor?: string;
		/** Role description */
		roleDescription?: string;
	};
	/** Pagination */
	pagination: {
		/** Current page */
		page: number;
		/** Page size */
		pageSize: number;
	};
}

/**
 * Get RBAC role response
 */
export type GetRbacRoleResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Result list */
	result?: (
		& RbacRole
		& { apiPathList: RbacApiPathResult[] }
	)[];
	/** Total count */
	count?: number;
}

/**
 * Update API path permissions for a role request
 */
export type UpdateApiPathPermissionsForRoleRequestDto = {
	/** Role name */
	roleName: string;
	/** API path permissions */
	apiPathPermissions: string[];
}

/**
 * Update API path permissions for a role response
 */
export type UpdateApiPathPermissionsForRoleResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Updated role when success */
	result?: RbacRole;
}

/**
 * Admin: get roles by UID request
 */
export type AdminGetUserRolesByUidRequestDto = {
	/** UID */
	uid: number;
}

/**
 * Admin: get roles by UID response
 */
export type AdminGetUserRolesByUidResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Result when success */
	result?: {
		/** UID */
		uid: number;
		/** UUID */
		uuid: string;
		/** Username */
		username: string;
		/** Nickname */
		userNickname: string;
		/** Avatar */
		avatar: string;
		/** Roles */
		roles: RbacRole[];
	};
}

/**
 * Admin updates user roles by UUID
 */
type AdminUpdateUserRoleByUUID = {
	/** Target user UUID. Provide UUID only (no UID). */
  uuid: string;
  uid: never;
	/** New roles */
  newRoles: string[];
};

/**
 * Admin updates user roles by UID
 */
type AdminUpdateUserRoleByUID = {
	/** Target user UID. Provide UID only (no UUID). */
  uid: number;
  uuid: never;
	/** New roles */
  newRoles: string[];
};

/**
 * Admin update user role request
 */
export type AdminUpdateUserRoleRequestDto = AdminUpdateUserRoleByUUID | AdminUpdateUserRoleByUID;

/**
 * Admin update user role response
 */
export type AdminUpdateUserRoleResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}