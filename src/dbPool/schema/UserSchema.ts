import { Schema } from 'mongoose'

/**
 * User Security Authentication Collection
 */
class UserAuthSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** User's UUID, associated with user security collection UUID - non-null - unique */
		UUID: { type: String, required: true, unique: true },
		/** User's UID - non-null */
		uid: { type: Number, required: true, unique: true },
		/** User's email - non-null */
		email: { type: String, required: true, unique: true },
		/** User's email in lowercase - non-null */
		emailLowerCase: { type: String, required: true, unique: true },
		/** Password hashed twice with Bcrypt - non-null */
		passwordHashHash: { type: String, required: true },
		/** User's identity token - non-null */
		token: { type: String, required: true },
		/** Password hint */
		passwordHint: String, // TODO: How to ensure password hint security?
		// /** User's role */
		// role: { type: String, required: true },
		/** User's roles */
		roles: { type: [String], required: true },
		/** User's enabled 2FA type - non-null */ /* Can be email, totp or none (indicating not enabled) */
		authenticatorType: { type: String, required: true },
		/** System field - creation time - non-null */
		userCreateDateTime: { type: Number, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'user-auth'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const UserAuthSchema = new UserAuthSchemaFactory()

/**
 * User's personal labels
 */
const UserLabelSchema = {
	/** Label ID - non-null */
	id: { type: Number, required: true },
	/** Label name - non-null */
	labelName: { type: String, required: true },
}

/**
 * User's linked accounts
 */
const UserLinkedAccountsSchema = {
	/** Linked account platform - non-null - example: "X" */
	platformId: { type: String, required: true },
	/** Linked account unique identifier - non-null */
	accountUniqueId: { type: String, required: true },
}

/**
 * User's linked websites
 */
const UserWebsiteSchema = {
	/** Linked website name - non-null - example: "My Personal Homepage" */
	websiteName: { type: String, required: true },
	/** Linked website URL - non-null */
	websiteUrl: { type: String, required: true },
}

/**
 * User Information Collection
 */
class UserInfoSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** User's UUID, associated with user security collection UUID - non-null - unique */
		UUID: { type: String, required: true, unique: true },
		/** User's UID - non-null - unique */
		uid: { type: Number, required: true, unique: true },
		/** Username - unique */
		username: { type: String, unique: true },
		/** User nickname */
		userNickname: { type: String },
		/** User avatar link */
		avatar: { type: String },
		/** User background image link */
		userBannerImage: { type: String },
		/** User's personal signature */
		signature: { type: String },
		/** User's gender, male, female and custom (string) */
		gender: { type: String },
		/** User's personal labels */
		label: { type: [UserLabelSchema], required: false },
		/** User's birthday */
		userBirthday: { type: Number },
		/** User homepage Markdown */
		userProfileMarkdown: { type: String },
		/** User's linked accounts */
		userLinkedAccounts: { type: [UserLinkedAccountsSchema], required: false },
		/** User's linked websites */
		userWebsite: { type: UserWebsiteSchema },
		/** Whether user information was modified after last review approval, should be set to true when first creating user info and when updates occur, should be changed to false when admin approves */
		isUpdatedAfterReview: { type: Boolean, required: true },
		/** Edit operator */
		editOperatorUUID: { type: String },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
		/** System field - creation time - non-null */
		createDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'user-info'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const UserInfoSchema = new UserInfoSchemaFactory()

/**
 * User linked platform privacy visibility settings
 */
const UserLinkedAccountsVisibilitiesSettingSchema = {
	/** Linked platform ID - non-null - example: 'X', 'wechat', 'bilibili' */
	platformId: { type: String, required: true },
	/** Display method - non-null - allowed values: {public: public, following: followers only, private: hidden} */
	visibilitiesType: { type: String, required: true },
}

/**
 * User privacy data visibility settings
 */
const UserPrivaryVisibilitiesSettingSchema = {
	/** User privacy data item ID - non-null - example: 'birthday', 'follow', 'fans' */
	privaryId: { type: String, required: true },
	/** Display method - non-null - allowed values: {public: public, following: followers only, private: hidden} */
	visibilitiesType: { type: String, required: true },
}

/**
 * User Personal Settings Collection
 */
class UserSettingsSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** User's UUID, associated with user security collection UUID - non-null - unique */
		UUID: { type: String, required: true, unique: true },
		/** User's UID - non-null - unique */
		uid: { type: Number, required: true, unique: true },
		/** Whether to enable Cookie - boolean */
		enableCookie: { type: Boolean },
		/** Theme appearance settings (theme type) - optional values: {light: light, dark: dark, system: follow system} */
		themeType: { type: String },
		/** Theme color - string, color string */
		themeColor: { type: String },
		/** User custom theme color - string, HAX color string, without hash symbol */
		themeColorCustom: { type: String },
		/** Wallpaper (background image URL) - string */
		wallpaper: { type: String },
		/** Whether to enable colored navigation bar - boolean */
		coloredSideBar: { type: Boolean },
		/** Throttling mode - string, {standard: standard, limit: throttling mode, preview: preload} */
		dataSaverMode: { type: String },
		/** Disable search recommendations - boolean */
		noSearchRecommendations: { type: Boolean },
		/** Disable related video recommendations - boolean */
		noRelatedVideos: { type: Boolean },
		/** Disable search history - boolean */
		noRecentSearch: { type: Boolean },
		/** Disable video history - boolean */
		noViewHistory: { type: Boolean },
		/** Whether to open videos in new window - boolean */
		openInNewWindow: { type: Boolean },
		/** Display language - string */
		currentLocale: { type: String },
		/** User timezone - string */
		timezone: { type: String },
		/** User unit system - string, scale system or division value, imperial or US system etc. */
		unitSystemType: { type: String },
		/** Whether entered developer mode - boolean */
		devMode: { type: Boolean },
		/** Experimental: Enable dynamic background - boolean */
		showCssDoodle: { type: Boolean },
		/** Experimental: Enable sharp mode - boolean */
		sharpAppearanceMode: { type: Boolean },
		/** Experimental: Enable flat mode - boolean */
		flatAppearanceMode: { type: Boolean },
		/** User linked website privacy settings */
		userWebsitePrivacySetting: { type: String },
		/** User privacy data visibility settings */
		userPrivaryVisibilitiesSetting: { type: [UserPrivaryVisibilitiesSettingSchema] },
		/** User linked platform privacy visibility settings */
		userLinkedAccountsVisibilitiesSetting: { type: [UserLinkedAccountsVisibilitiesSettingSchema] },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
		/** System field - creation time - non-null */
		createDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name // WARN Don't use plural forms of words, Mongoose will add automatically! */
	collectionName = 'user-setting'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const UserSettingsSchema = new UserSettingsSchemaFactory()

/**
 * User registration email verification code
 */
class UserVerificationCodeSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** User's email - non-null - unique */
		emailLowerCase: { type: String, required: true, unique: true },
		/** User's verification code - non-null */
		verificationCode: { type: String, required: true },
		/** User's verification code expiration time - non-null */
		overtimeAt: { type: Number, required: true, unique: true },
		/** User's request count today, used to prevent abuse - non-null */
		attemptsTimes: { type: Number, required: true },
		/** User's last verification code request time, used to prevent abuse - non-null */
		lastRequestDateTime: { type: Number, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'user-verification-code'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const UserVerificationCodeSchema = new UserVerificationCodeSchemaFactory()

/**
 * User invitation code
 */
class UserInvitationCodeSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** User UUID who generated invitation code, associated with user security collection UUID - non-null */
		creatorUUID: { type: String, required: true },
		/** User who generated invitation code - non-null */
		creatorUid: { type: Number, required: true },
		/** Invitation code - non-null - unique */
		invitationCode: { type: String, required: true, unique: true },
		/** Invitation code generation time - non-null */
		generationDateTime: { type: Number, required: true },
		/** Invitation code marked as pending use - non-null */
		isPending: { type: Boolean, required: true },
		/** Invitation code marked as unusable - non-null */
		disabled: { type: Boolean, required: true },
		/** User UUID who used this invitation code */
		assigneeUUID: { type: String },
		/** User who used this invitation code */
		assignee: { type: Number },
		/** Time when invitation code was used */
		usedDateTime: { type: Number },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
		/** System field - creation time - non-null */
		createDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'user-invitation-code'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const UserInvitationCodeSchema = new UserInvitationCodeSchemaFactory()

/**
 * User email change verification code
 */
class UserChangeEmailVerificationCodeSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** User's email - non-null - unique */
		emailLowerCase: { type: String, required: true, unique: true },
		/** User's verification code - non-null */
		verificationCode: { type: String, required: true },
		/** User's verification code expiration time - non-null */
		overtimeAt: { type: Number, required: true, unique: true },
		/** User's request count today, used to prevent abuse - non-null */
		attemptsTimes: { type: Number, required: true },
		/** User's last verification code request time, used to prevent abuse - non-null */
		lastRequestDateTime: { type: Number, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'user-change-email-verification-code'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const UserChangeEmailVerificationCodeSchema = new UserChangeEmailVerificationCodeSchemaFactory()

/**
 * User password change email verification code
 */
class UserChangePasswordVerificationCodeSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** User's UUID, associated with user security collection UUID - non-null */
		UUID: { type: String, required: true },
		/** User ID - non-null */
		uid: { type: Number, required: true },
		/** User's email - non-null - unique */
		emailLowerCase: { type: String, required: true, unique: true },
		/** User's verification code - non-null */
		verificationCode: { type: String, required: true },
		/** User's verification code expiration time - non-null */
		overtimeAt: { type: Number, required: true, unique: true },
		/** User's request count today, used to prevent abuse - non-null */
		attemptsTimes: { type: Number, required: true },
		/** User's last verification code request time, used to prevent abuse - non-null */
		lastRequestDateTime: { type: Number, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'user-change-password-verification-code'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const UserChangePasswordVerificationCodeSchema = new UserChangePasswordVerificationCodeSchemaFactory()

/**
 * User TOTP authenticator
 */
class UserTotpAuthenticatorSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** User's UUID, associated with user security collection UUID - non-null */
		UUID: { type: String, required: true },
		/** Whether TOTP authenticator is enabled - non-null - default: false */
		enabled: { type: Boolean, required: true, default: false },
		/** Authenticator secret */
		secret: { type: String },
		/** Recovery code */
		recoveryCodeHash: { type: String },
		/** Backup codes */
		backupCodeHash: { type: [String] },
		/** QR code */
		otpAuth: { type: String, unique: true },
		/** Attempt count */
		attempts: { type: Number },
		/** Last login attempt time */
		lastAttemptTime: { type: Number },
		/** System field - creation time - non-null */
		createDateTime: { type: Number, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'user-totp-authenticator'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)

	// Constructor
	constructor() {
		// Add unique index for UUID and secret combination
		this.schemaInstance.index({ UUID: 1, secret: 1 }, { unique: true });
	}
}
export const UserTotpAuthenticatorSchema = new UserTotpAuthenticatorSchemaFactory()

/**
 * User Email authenticator
 */
class UserEmailAuthenticatorSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** User's UUID, associated with user security collection UUID - non-null */
		UUID: { type: String, required: true },
		/** User's Email */
		emailLowerCase: { type: String, required: true },
		/** Whether Email authenticator is enabled - non-null - default: false */
		enabled: { type: Boolean, required: true, default: false },
		/** System field - creation time - non-null */
		createDateTime: { type: Number, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'user-email-authenticator'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)

	// Constructor
	constructor() {
		// Add unique index for UUID and email combination
		this.schemaInstance.index({ UUID: 1, email: 1 }, { unique: true });
	}
}
export const UserEmailAuthenticatorSchema = new UserEmailAuthenticatorSchemaFactory()

/**
 * User Email authenticator verification code
 */
class UserEmailAuthenticatorVerificationCodeSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** User's UUID, associated with user security collection UUID - non-null */
		UUID: { type: String, required: true },
		/** User ID - non-null */
		uid: { type: Number, required: true },
		/** User's email - non-null - unique */
		emailLowerCase: { type: String, required: true, unique: true },
		/** User's verification code - non-null */
		verificationCode: { type: String, required: true },
		/** User's verification code expiration time - non-null */
		overtimeAt: { type: Number, required: true, unique: true },
		/** User's request count today, used to prevent abuse - non-null */
		attemptsTimes: { type: Number, required: true },
		/** User's last verification code request time, used to prevent abuse - non-null */
		lastRequestDateTime: { type: Number, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'user-email-authenticator-verification-code'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const UserEmailAuthenticatorVerificationCodeSchema = new UserEmailAuthenticatorVerificationCodeSchemaFactory()
