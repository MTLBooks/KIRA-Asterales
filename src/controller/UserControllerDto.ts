/**
 * User registration request
 */
export type UserRegistrationRequestDto = {
	/** Email */
	email: string;
	/** Email verification code */
	verificationCode: string;
	/** Password hashed once on the client with Bcrypt */
	passwordHash: string;
	/** Password hint */
	passwordHint?: string;
	/** Invitation code used during registration */
	invitationCode?: string;
	/** Username */
	username: string;
	/** Nickname */
	userNickname?: string;
}

/**
 * User registration response
 */
export type UserRegistrationResponseDto = {
	/** Execution result */
	success: boolean;
	/** User UUID */
	UUID?: string;
	/** User UID */
	uid?: number;
	/** Token on success; falsy when failed */
	token?: string;
	/** Extra message */
	message?: string;
}

/**
 * User login request
 */
export type UserLoginRequestDto = {
	/** Email */
	email: string;
	/** Password hashed once on client */
	passwordHash: string;
	/** One-time code (TOTP) entered by user */
	clientOtp?: string;
	/** Email verification code */
	verificationCode?: string;
}

/**
 * User login response
 */
export type UserLoginResponseDto = {
	/** Execution result */
	success: boolean;
	/** Email */
	email?: string;
	/** UUID */
	UUID?: string;
	/** UID */
	uid?: number;
	/** Token on success; falsy when failed */
	token?: string;
	/** Password hint */
	passwordHint?: string;
	/** Extra message */
	message?: string;
	/** Cooling down (rate limit) */
	isCoolingDown?: boolean;
	/** Authenticator type */
	authenticatorType?: 'email' | 'totp' | 'none';
}

/**
 * Check if user exists by UID request
 */
export type UserExistsCheckByUIDRequestDto = {
	/** User UID */
	uid: number;
}

/**
 * Check if user exists by UID response
 */
export type UserExistsCheckByUIDResponseDto = {
	/** Execution result */
	success: boolean;
	/** Whether exists (pessimistic: true when exists or error) */
	exists: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Check if email exists request
 */
export type UserEmailExistsCheckRequestDto = {
	/** Email */
	email: string;
}

/**
 * Check if email exists response
 */
export type UserEmailExistsCheckResponseDto = {
	/** Execution result */
	success: boolean;
	/** Whether exists (pessimistic: true when exists or error) */
	exists: boolean; // WARN: Returns true when user exists or query fails, to avoid duplicate registrations.
	/** Extra message */
	message?: string;
}

/**
 * Update user email request
 */
export type UpdateUserEmailRequestDto = {
	/** UID */
	uid: number;
	/** Old email */
	oldEmail: string;
	/** New email */
	newEmail: string;
	/** Password hashed once */
	passwordHash: string;
	/** Email verification code */
	verificationCode: string;
}

/**
 * Update user email response
 */
export type UpdateUserEmailResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Data before hashing password server-side
 */
export type BeforeHashPasswordDataType = {
	/** Email */
	email: string;
	/** Password hashed once on client */
	passwordHash: string;
}

/**
 * User personal label
 */
export type UserLabel = {
	/** Label ID */
	id: number;
	/** Label name */
	labelName: string;
}

/**
 * Linked accounts of user
 */
export type UserLinkedAccounts = {
	/** Platform, e.g. "X" */
	platformId: string;
	/** Unique identifier on the platform */
	accountUniqueId: string;
}

/**
 * Linked websites of user
 */
export type UserWebsite = {
	/** Website name, e.g. "My homepage" */
	websiteName: string;
	/** Website URL */
	websiteUrl: string;
}

/**
 * Update or create user info request
 */
export type UpdateOrCreateUserInfoRequestDto = {
	/** Username */
	username?: string;
	/** Nickname */
	userNickname?: string;
	/** Avatar URL */
	avatar?: string;
	/** Banner image URL */
	userBannerImage?: string;
	/** Signature */
	signature?: string;
	/** Gender: male, female, or custom (string) */
	gender?: string;
	/** Personal labels */
	label?: UserLabel[];
	/** Birthday timestamp */
	userBirthday?: number;
	/** Profile markdown */
	userProfileMarkdown?: string;
	/** Linked accounts */
	userLinkedAccounts?: UserLinkedAccounts[];
	/** Linked website */
	userWebsite?: UserWebsite;
}

/**
 * Update or create user info response
 */
export type UpdateOrCreateUserInfoResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Result */
	result?: {} & UpdateOrCreateUserInfoRequestDto;
}

/**
 * Get self info request
 */
export type GetSelfUserInfoRequestDto = {
	/** UID */
	uid: number;
	/** Token */
	token: string;
}

/**
 * Get self info by UUID request
 */
export type GetSelfUserInfoByUuidRequestDto = {
	/** UUID */
	uuid: string;
	/** Token */
	token: string;
}

/**
 * Get self info response
 */
export type GetSelfUserInfoResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Result */
	result?: (
		{
			/** UID */
			uid?: number;
			/** UUID */
			uuid?: string;
			/** Email */
			email?: string;
			/** Account creation time */
			userCreateDateTime?: number;
			/** Roles */
			roles?: string[];
			/** 2FA type */
			typeOf2FA?: string;
			/** Invitation code used */
			invitationCode?: string;
		}
		& UpdateOrCreateUserInfoRequestDto
	);
}

/**
 * Get self info by UUID response
 */
export type GetSelfUserInfoByUuidResponseDto = {} & GetSelfUserInfoResponseDto

/**
 * Get user info by UID request
 */
export type GetUserInfoByUidRequestDto = {
	/** Target UID */
	uid: number;
}

/**
 * Block state
 */
type BlockState = { isBlockedByOther: boolean, isBlocked: boolean; isHidden: boolean }

/**
 * Get user info by UID response
 */
export type GetUserInfoByUidResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Result */
	result?: {
		/** Username */
		username?: string;
		/** Nickname */
		userNickname?: string;
		/** Avatar URL */
		avatar?: string;
		/** Banner image URL */
		userBannerImage?: string;
		/** Signature */
		signature?: string;
		/** Gender */
		gender?: string;
		/** Labels */
		label?: UserLabel[];
		/** Account creation time */
		userCreateDateTime?: number;
		/** Roles */
		roles?: string[];
		/** Whether following */
		isFollowing: boolean;
		/**
		 * Whether the queried user is self.
		 * If true, it usually means a bad request because there is a dedicated API to get self info.
		 */
		isSlef: boolean;
	};
} & BlockState

/**
 * Check user by UID and token response
 */
export type CheckUserTokenResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Whether user is valid */
	userTokenOk?: boolean;
}

/**
 * User logout response
 */
export type UserLogoutResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Get pre-signed URL for uploading avatar; valid for 60 seconds
 */
export type GetUserAvatarUploadSignedUrlResponseDto = {
	/** Execution result */
	success: boolean;
	/** Pre-signed URL */
	userAvatarUploadSignedUrl?: string;
	/** File name */
	userAvatarFilename?: string;
	/** Extra message */
	message?: string;
}

/**
 * User privacy visibility setting item
 */
type UserPrivaryVisibilitiesSettingDto = {
	/** Privacy item ID - required - e.g. 'birthday', 'follow', 'fans' */
	privaryId: string;
	/** Visibility - required - allowed values: {public, following, private} */
	visibilitiesType: 'public' | 'following' | 'private';
}

/**
 * Linked accounts visibility settings
 */
type UserLinkedAccountsVisibilitiesSettingDto = {
	/** Platform - required - e.g. "X" */
	platformId: string;
	/** Visibility - required - allowed values: {public, following, private} */
	visibilitiesType: 'public' | 'following' | 'private';
}

/**
 * Basic user settings
 */
export type BasicUserSettingsDto = {
	/** Enable cookies */
	enableCookie?: boolean;
	/** Theme type: light, dark, or system */
	themeType?: 'light' | 'dark' | 'system';
	/** Theme color (string) */
	themeColor?: string;
	/** Custom theme color (HEX without '#') */
	themeColorCustom?: string;
	/** Wallpaper (background URL) */
	wallpaper?: string;
	/** Colored sidebar */
	coloredSideBar?: boolean;
	/** Data saver mode: standard, limit, preview */
	dataSaverMode?: 'standard' | 'limit' | 'preview';
	/** Disable search recommendations */
	noSearchRecommendations?: boolean;
	/** Disable related video recommendations */
	noRelatedVideos?: boolean;
	/** Disable recent search */
	noRecentSearch?: boolean;
	/** Disable view history */
	noViewHistory?: boolean;
	/** Open video in new window */
	openInNewWindow?: boolean;
	/** Display language */
	currentLocale?: string;
	/** Timezone */
	timezone?: string;
	/** Unit system */
	unitSystemType?: string;
	/** Developer mode */
	devMode?: boolean;
	/** Linked website privacy */
	userWebsitePrivacySetting?: 'public' | 'following' | 'private';
	/** Privacy visibility settings */
	userPrivaryVisibilitiesSetting?: UserPrivaryVisibilitiesSettingDto[];
	/** Linked accounts visibility settings */
	userLinkedAccountsVisibilitiesSetting?: UserLinkedAccountsVisibilitiesSettingDto[];
	// /** Experimental: sharp rectangle mode */
	// sharpAppearanceMode?: boolean;
	// /** Experimental: flat mode */
	// flatAppearanceMode?: boolean;
}

/**
 * Get user settings request
 */
export type GetUserSettingsRequestDto = {} & GetSelfUserInfoRequestDto

/**
 * Get user settings response
 */
export type GetUserSettingsResponseDto = {
	/** Execution result */
	success: boolean;
	/** User settings */
	userSettings?: { uid: number; editDateTime: number } & BasicUserSettingsDto;
	/** Extra message */
	message?: string;
}

/**
 * Update or create user settings request
 */
export type UpdateOrCreateUserSettingsRequestDto = {} & BasicUserSettingsDto

/**
 * Update or create user settings response
 */
export type UpdateOrCreateUserSettingsResponseDto = {
	/** Execution result */
	success: boolean;
	/** User settings */
	userSettings?: { uid: number; editDateTime: number } & BasicUserSettingsDto;
	/** Extra message */
	message?: string;
}

/**
 * Request to send registration email verification code
 */
export type RequestSendVerificationCodeRequestDto = {
	/** Email - required - unique */
	email: string;
	/** Client language */
	clientLanguage: string;
}

/**
 * Response of sending email verification code
 */
export type RequestSendVerificationCodeResponseDto = {
	/** Execution result */
	success: boolean;
	/** Whether timed out */
	isTimeout: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Invitation code entity
 */
type InvitationCode = {
	/** Creator UID - required */
	creatorUid: number;
	/** Creator UUID - required */
	creatorUUID: string;
	/** Invitation code - required */
	invitationCode: string;
	/** Generation time - required */
	generationDateTime: number;
	/** Marked as pending - required */
	isPending: boolean;
	/** Disabled - required */
	disabled: boolean;
	/** Assignee UID */
	assignee?: number;
	/** Used time */
	usedDateTime?: number;
}

/**
 * Create invitation code response
 */
export type CreateInvitationCodeResponseDto = {
	/** Execution result */
	success: boolean;
	/** Cooling down due to generation interval */
	isCoolingDown: boolean;
	/** Extra message */
	message?: string;
	/** Generated code */
	invitationCodeResult?: InvitationCode;
}

/**
 * Get my invitation codes response
 */
export type GetMyInvitationCodeResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Invitation code list */
	invitationCodeResult: InvitationCode[];
}

/**
 * Admin: get a user's invitation code by UID response
 */
export type AdminGetUserInvitationCodeResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Invitation codes used at registration */
	invitationCodeResult: InvitationCode[];
}

/**
 * Admin: get user by invitation code response
 */
export type AdminGetUserByInvitationCodeResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Query result */
	userInfoResult: {
		/** UID */
		uid?: number;
		/** UUID */
		uuid?: string;
	};
}

/**
 * Use invitation code request
 */
export type UseInvitationCodeDto = {
	/** The invitation code used */
	invitationCode: string;
	/** Registrant UID */
	registrantUid: number;
	/** Registrant UUID */
	registrantUUID: string;
}

/**
 * Use invitation code response
 */
export type UseInvitationCodeResultDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Check invitation code availability request
 */
export type CheckInvitationCodeRequestDto = {
	/** Invitation code */
	invitationCode: string;
}

/**
 * Check invitation code availability response
 */
export type CheckInvitationCodeResponseDto = {
	/** Execution result */
	success: boolean;
	/** Whether the code is available */
	isAvailableInvitationCode: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Request to send change email verification code
 */
export type RequestSendChangeEmailVerificationCodeRequestDto = {
	/** Client language */
	clientLanguage: string;
	/** New email */
	newEmail: string;
}

/**
 * Response to sending change email verification code
 */
export type RequestSendChangeEmailVerificationCodeResponseDto = {
	/** Execution result */
	success: boolean;
	/** Cooling down */
	isCoolingDown: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Request to send change password verification code
 */
export type RequestSendChangePasswordVerificationCodeRequestDto = {
	/** Client language */
	clientLanguage: string;
}

/**
 * Response to sending change password verification code
 */
export type RequestSendChangePasswordVerificationCodeResponseDto = {
	/** Execution result */
	success: boolean;
	/** Cooling down */
	isCoolingDown: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Update user password request
 */
export type UpdateUserPasswordRequestDto = {
	/** Old password hash */
	oldPasswordHash: string;
	/** New password hash */
	newPasswordHash: string;
	/** Email verification code */
	verificationCode: string;
}

/**
 * Update user password response
 */
export type UpdateUserPasswordResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Check username availability request
 */
export type CheckUsernameRequestDto = {
	/** Username */
	username: string;
}

/**
 * Check username availability response
 */
export type CheckUsernameResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Is available */
	isAvailableUsername: boolean;
}

/**
 * Admin get blocked users request
 */
export type GetBlockedUserRequestDto = {
	/** Sort by */
	sortBy: string;
	/** Sort order */
	sortOrder: string;
	/** Filter UID */
	uid?: number;
	/** Pagination */
	pagination: {
		/** Current page */
		page: number;
		/** Page size */
		pageSize: number;
	};
};

/**
 * Admin get blocked users response
 */
export type GetBlockedUserResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Result: blocked users */
	result?: (
		GetUserInfoByUidResponseDto["result"] & {
			uid: number;
			UUID: string;
		}
	)[];
	/** Total count */
	totalCount: number;
}

/**
 * Admin get user info request
 */
export type AdminGetUserInfoRequestDto = {
	/** Only show users who updated info after last review */
	isOnlyShowUserInfoUpdatedAfterReview: boolean;
	/** Sort by */
	sortBy: string;
	/** Sort order */
	sortOrder: string;
	/** Filter UID */
	uid?: number;
	/** Pagination */
	pagination: {
		/** Current page */
		page: number;
		/** Page size */
		pageSize: number;
	};
}

/**
 * Admin get user info response
 */
export type AdminGetUserInfoResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Result */
	result?: (
		GetSelfUserInfoResponseDto["result"] & {
			uid: number;
			UUID: string;
			avatar: string;
			userBannerImage: string;
			editDateTime: number;
			editOperatorUUID: string;
			isUpdatedAfterReview: boolean;
		}
	)[];
	/** Total count */
	totalCount: number;
}

/**
 * Admin approve user info request
 */
export type ApproveUserInfoRequestDto = {
	/** User UUID */
	UUID: string;
}

/**
 * Admin approve user info response
 */
export type ApproveUserInfoResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Admin clear user info request
 */
export type AdminClearUserInfoRequestDto = {
	/** UID */
	uid: number;
}

/**
 * Admin clear user info response
 */
export type AdminClearUserInfoResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Admin edit user info request
 */
export type AdminEditUserInfoRequestDto = {
	/** UID */
	uid: number;
	/** Info to edit */
	userInfo?: {
		/** Username */
		username?: string;
		/** Nickname */
		userNickname?: string;
		/** Avatar URL */
		avatar?: string;
		/** Banner image URL */
		userBannerImage?: string;
		/** Signature */
		signature?: string;
		/** Gender */
		gender?: string;
		/** Birthday */
		userBirthday?: number;
		/** Profile markdown */
		userProfileMarkdown?: string;
		/** Review status */
		isUpdatedAfterReview?: boolean;
	}
}

/**
 * Admin edit user info response
 */
export type AdminEditUserInfoResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Delete TOTP authenticator by verification code request
 */
export type DeleteTotpAuthenticatorByTotpVerificationCodeRequestDto = {
	/** TOTP verification code from device */
	clientOtp: string;
	/** Password hashed once */
	passwordHash: string;
}

/**
 * Delete TOTP authenticator by verification code response
 */
export type DeleteTotpAuthenticatorByTotpVerificationCodeResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Cooling down */
	isCoolingDown?: boolean;
}

/**
 * Create TOTP authenticator response
 */
export type CreateUserTotpAuthenticatorResponseDto = {
	/** Execution result */
	success: boolean;
	/** Authenticator already exists */
	isExists: boolean;
	/** Existing authenticator type when exists */
	existsAuthenticatorType?: 'email' | 'totp';
	/** TOTP authenticator info */
	result?: {
		/** otpauth uri (for QR) */
		otpAuth?: string;
	};
	/** Extra message */
	message?: string;
}

/**
 * Create Email authenticator response
 */
export type CreateUserEmailAuthenticatorResponseDto = {
	/** Execution result */
	success: boolean;
	/** Authenticator already exists */
	isExists: boolean;
	/** Existing authenticator type when exists */
	existsAuthenticatorType?: 'email' | 'totp';
	/** Email authenticator info */
	result?: {
		/** Email */
		email?: string;
		/** Lowercased email */
		emailLowerCase?: string;
	};
	/** Extra message */
	message?: string;
}

/**
 * Confirm binding TOTP device request
 */
export type ConfirmUserTotpAuthenticatorRequestDto = {
	/** TOTP code generated by device */
	clientOtp: string;
	/** otpauth uri */
	otpAuth: string;
}

/**
 * Confirm binding TOTP device response
 */
export type ConfirmUserTotpAuthenticatorResponseDto = {
	/** Execution result */
	success: boolean;
	/** Result */
	result?: {
		/** Backup codes */
		backupCode?: string[];
		/** Recovery code */
		recoveryCode?: string;
	};
	/** Extra message */
	message?: string;
}

/**
 * Send Email authenticator verification code request
 */
export type SendUserEmailAuthenticatorVerificationCodeRequestDto = {
	/** Email */
	email: string;
	/** Password hashed once on client */
	passwordHash: string;
	/** Client language */
	clientLanguage: string;
}

/**
 * Send Email authenticator verification code response
 */
export type SendUserEmailAuthenticatorVerificationCodeResponseDto = {
	/** Execution result */
	success: boolean;
	/** Cooling down */
	isCoolingDown: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Send delete Email authenticator verification email request
 */
export type SendDeleteUserEmailAuthenticatorVerificationCodeRequestDto = {
	/** Client language */
	clientLanguage: string;
}

/**
 * Send delete Email authenticator verification email response
 */
export type SendDeleteUserEmailAuthenticatorVerificationCodeResponseDto = {} & SendUserEmailAuthenticatorVerificationCodeResponseDto

/**
 * Check Email authenticator verification code request
 */
export type CheckEmailAuthenticatorVerificationCodeRequestDto = {
	/** Email */
	email: string;
	/** Email verification code */
	verificationCode: string;
}

/**
 * Check Email authenticator verification code response
 */
export type CheckEmailAuthenticatorVerificationCodeResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Delete Email 2FA request
 */
export type DeleteUserEmailAuthenticatorRequestDto = {
	/** Password hashed once */
	passwordHash: string;
	/** Email verification code */
	verificationCode: string;
}

/**
 * Delete Email 2FA response
 */
export type DeleteUserEmailAuthenticatorResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
}

/**
 * Check if 2FA is enabled request
 */
export type CheckUserHave2FARequestDto = {
	/** Email */
	email: string;
}

/**
 * Check if 2FA is enabled response
 */
export type CheckUserHave2FAResponseDto = {
	/** Execution result */
	success: boolean;
	/** Has any 2FA */
	have2FA: boolean;
	/** 2FA type when exists */
	type?: 'email' | 'totp';
	/** Creation time when type is totp */
	totpCreationDateTime?: number;
	/** Extra message */
	message?: string;
}

/**
 * Check user exists by UUID request
 */
export type CheckUserExistsByUuidRequestDto = {
	/** UUID */
	uuid: string;
}

/**
 * Check user exists by UUID response
 */
export type CheckUserExistsByUuidResponseDto = {
	/** Execution result */
	success: boolean;
	/** Whether exists */
	exists: boolean;
	/** Extra message */
	message?: string;
}
