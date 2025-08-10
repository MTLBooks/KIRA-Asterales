import mongoose, { InferSchemaType, PipelineStage, ClientSession, startSession } from 'mongoose'
import { createCloudflareImageUploadSignedUrl } from '../cloudflare/index.js'
import { isInvalidEmail, sendMail } from '../common/EmailTool.js'
import { comparePasswordSync, hashPasswordSync } from '../common/HashTool.js'
import { isEmptyObject } from '../common/ObjectTool.js'
import { validateNameField } from '../common/ValidTool.js'
import { generateRandomString, generateSecureRandomString, generateSecureVerificationNumberCode, generateSecureVerificationStringCode } from '../common/RandomTool.js'
import {
	AdminClearUserInfoRequestDto,
	AdminClearUserInfoResponseDto,
	AdminGetUserInfoRequestDto,
	AdminGetUserInfoResponseDto,
	ApproveUserInfoRequestDto,
	ApproveUserInfoResponseDto,
	CheckInvitationCodeRequestDto,
	CheckInvitationCodeResponseDto,
	CheckUsernameRequestDto,
	CheckUsernameResponseDto,
	CheckUserTokenResponseDto,
	CreateInvitationCodeResponseDto,
	DeleteTotpAuthenticatorByTotpVerificationCodeResponseDto,
	GetBlockedUserResponseDto,
	GetMyInvitationCodeResponseDto,
	GetSelfUserInfoRequestDto,
	GetSelfUserInfoResponseDto,
	CheckUserHave2FAResponseDto,
	GetUserAvatarUploadSignedUrlResponseDto,
	GetUserInfoByUidRequestDto,
	GetUserInfoByUidResponseDto,
	GetUserSettingsResponseDto,
	RequestSendChangeEmailVerificationCodeRequestDto,
	RequestSendChangeEmailVerificationCodeResponseDto,
	RequestSendChangePasswordVerificationCodeRequestDto,
	RequestSendChangePasswordVerificationCodeResponseDto,
	RequestSendVerificationCodeRequestDto,
	RequestSendVerificationCodeResponseDto,
	UpdateOrCreateUserInfoRequestDto,
	UpdateOrCreateUserInfoResponseDto,
	UpdateOrCreateUserSettingsRequestDto,
	UpdateOrCreateUserSettingsResponseDto,
	UpdateUserEmailRequestDto,
	UpdateUserEmailResponseDto,
	UpdateUserPasswordRequestDto,
	UpdateUserPasswordResponseDto,
	UseInvitationCodeDto,
	UseInvitationCodeResultDto,
	UserLoginRequestDto,
	UserLoginResponseDto,
	UserRegistrationRequestDto,
	UserRegistrationResponseDto,
	GetSelfUserInfoByUuidResponseDto,
	GetSelfUserInfoByUuidRequestDto,
	CreateUserTotpAuthenticatorResponseDto,
	DeleteTotpAuthenticatorByTotpVerificationCodeRequestDto,
	ConfirmUserTotpAuthenticatorRequestDto,
	ConfirmUserTotpAuthenticatorResponseDto,
	CheckUserHave2FARequestDto,
	CreateUserEmailAuthenticatorResponseDto,
	SendUserEmailAuthenticatorVerificationCodeRequestDto,
	SendUserEmailAuthenticatorVerificationCodeResponseDto,
	CheckEmailAuthenticatorVerificationCodeRequestDto,
	CheckEmailAuthenticatorVerificationCodeResponseDto,
	DeleteUserEmailAuthenticatorRequestDto,
	DeleteUserEmailAuthenticatorResponseDto,
	SendDeleteUserEmailAuthenticatorVerificationCodeRequestDto,
	SendDeleteUserEmailAuthenticatorVerificationCodeResponseDto,
	UserExistsCheckByUIDRequestDto,
	UserExistsCheckByUIDResponseDto,
	UserEmailExistsCheckRequestDto,
	UserEmailExistsCheckResponseDto,
	CheckUserExistsByUuidRequestDto,
	CheckUserExistsByUuidResponseDto,
	AdminEditUserInfoRequestDto,
	AdminEditUserInfoResponseDto,
	GetBlockedUserRequestDto,
	AdminGetUserInvitationCodeResponseDto,
	AdminGetUserByInvitationCodeResponseDto
} from '../controller/UserControllerDto.js'
import { findOneAndUpdateData4MongoDB, insertData2MongoDB, selectDataFromMongoDB, updateData4MongoDB, selectDataByAggregateFromMongoDB, deleteDataFromMongoDB } from '../dbPool/DbClusterPool.js'
import { DbPoolResultsType, QueryType, SelectType, UpdateType } from '../dbPool/DbClusterPoolTypes.js'
import { UserAuthSchema, UserTotpAuthenticatorSchema, UserChangeEmailVerificationCodeSchema, UserChangePasswordVerificationCodeSchema, UserInfoSchema, UserInvitationCodeSchema, UserSettingsSchema, UserVerificationCodeSchema, UserEmailAuthenticatorSchema, UserEmailAuthenticatorVerificationCodeSchema } from '../dbPool/schema/UserSchema.js'
import { getNextSequenceValueService } from './SequenceValueService.js'
import { authenticator } from 'otplib'
import { getI18nLanguagePack } from '../common/i18n.js'
import { abortAndEndSession, commitAndEndSession, createAndStartSession } from '../common/MongoDBSessionTool.js'
import { StorageClassAnalysisSchemaVersion } from '@aws-sdk/client-s3'
import { FollowingSchema } from '../dbPool/schema/FeedSchema.js'
import { checkBlockUserService, checkIsBlockedByOtherUserService } from './BlockService.js'

authenticator.options = { window: 1 } // Allow TOTP a grace window

/**
 * User registration
 * @param userRegistrationRequest Info needed for registration (username, password)
 * @returns UserRegistrationResponseDto Registration result; includes token on success
 */
export const userRegistrationService = async (userRegistrationRequest: UserRegistrationRequestDto): Promise<UserRegistrationResponseDto> => {
	try {
		if (checkUserRegistrationData(userRegistrationRequest)) {
			if (!(await checkInvitationCodeService({ invitationCode: userRegistrationRequest.invitationCode })).isAvailableInvitationCode) { // DELETEME used only in beta
				console.error('ERROR', 'User registration failed: invalid invitation code')
				return { success: false, message: 'User registration failed: invalid invitation code' }
			}
			const { email, passwordHash, passwordHint, verificationCode, username, userNickname } = userRegistrationRequest
			const emailLowerCase = email.toLowerCase()

			if (email && emailLowerCase && verificationCode) {
				// Start transaction
				const session = await mongoose.startSession()
				session.startTransaction()

				const now = new Date().getTime()
				const { collectionName, schemaInstance } = UserAuthSchema
				type UserAuth = InferSchemaType<typeof schemaInstance>

				const userAuthWhere: QueryType<UserAuth> = {
					emailLowerCase,
					username: { $regex: new RegExp(`\\b${username}\\b`, 'iu') },
				}
				const userAuthSelect: SelectType<UserAuth> = { emailLowerCase: 1 }
				try {
					const useAuthResult = await selectDataFromMongoDB<UserAuth>(userAuthWhere, userAuthSelect, schemaInstance, collectionName, { session })
					if (useAuthResult.result && useAuthResult.result.length >= 1) {
						if (session.inTransaction()) {
							await session.abortTransaction()
						}
						session.endSession()
						console.error('ERROR', 'User registration failed: duplicate email:', { email, emailLowerCase })
						return { success: false, message: 'User registration failed: duplicate email' }
					}
				} catch (error) {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.error('ERROR', 'User registration failed: exception when checking duplicate email:', error, { email, emailLowerCase })
					return { success: false, message: 'User registration failed: exception when checking duplicate email' }
				}

				const { collectionName: userVerificationCodeCollectionName, schemaInstance: userVerificationCodeSchemaInstance } = UserVerificationCodeSchema
				type UserVerificationCode = InferSchemaType<typeof userVerificationCodeSchemaInstance>
				const verificationCodeWhere: QueryType<UserVerificationCode> = {
					emailLowerCase,
					verificationCode,
					overtimeAt: { $gte: now },
				}

				const verificationCodeSelect: SelectType<UserVerificationCode> = {
					emailLowerCase: 1, // user email
				}

				try {
					const verificationCodeResult = await selectDataFromMongoDB<UserVerificationCode>(verificationCodeWhere, verificationCodeSelect, userVerificationCodeSchemaInstance, userVerificationCodeCollectionName, { session })
					if (!verificationCodeResult.success || verificationCodeResult.result?.length !== 1) {
						if (session.inTransaction()) {
							await session.abortTransaction()
						}
						session.endSession()
						console.error('ERROR', 'User registration failed: verification failed')
						return { success: false, message: 'User registration failed: verification failed' }
					}
				} catch (error) {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.error('ERROR', 'User registration failed: request verification failed')
					return { success: false, message: 'User registration failed: request verification failed' }
				}

				const passwordHashHash = hashPasswordSync(passwordHash)
				const token = generateSecureRandomString(64)
				const uid = (await getNextSequenceValueService('user', 1, 1, session)).sequenceValue
				const uuid = generateRandomString(24)

				const userAuthData: UserAuth = {
					UUID: uuid,
					uid,
					email,
					emailLowerCase,
					passwordHashHash,
					token,
					passwordHint,
					roles: ['user'], // newbie will always has a 'user' roles.
					authenticatorType: 'none', // New users do not enable 2FA by default
					userCreateDateTime: now,
					editDateTime: now,
				}

				const { collectionName: userInfoCollectionName, schemaInstance: userInfoSchemaInstance } = UserInfoSchema
				type UserInfo = InferSchemaType<typeof userInfoSchemaInstance>
				const userInfoData: UserInfo = {
					UUID: uuid,
					uid,
					username,
					userNickname,
					label: [] as UserInfo['label'], // TODO: Mongoose issue: #12420
					userLinkedAccounts: [] as UserInfo['userLinkedAccounts'], // TODO: Mongoose issue: #12420
					isUpdatedAfterReview: true,
					editDateTime: now,
					createDateTime: now,
				}


				const { collectionName: userSettingsCollectionName, schemaInstance: userSettingsSchemaInstance } = UserSettingsSchema
				type UserSettings = InferSchemaType<typeof userSettingsSchemaInstance>
				const userSettingsData: UserSettings = {
					UUID: uuid,
					uid,
					userPrivaryVisibilitiesSetting: [] as UserSettings['userPrivaryVisibilitiesSetting'], // TODO: Mongoose issue: #12420
					userLinkedAccountsVisibilitiesSetting: [] as UserSettings['userLinkedAccountsVisibilitiesSetting'], // TODO: Mongoose issue: #12420
					editDateTime: now,
					createDateTime: now,
				}

				try {
					const saveUserAuthResult = await insertData2MongoDB(userAuthData, schemaInstance, collectionName, { session })
					const saveUserInfoResult = await insertData2MongoDB(userInfoData, userInfoSchemaInstance, userInfoCollectionName, { session })
					const saveUserSettingsResult = await insertData2MongoDB(userSettingsData, userSettingsSchemaInstance, userSettingsCollectionName, { session })
					if (saveUserAuthResult.success && saveUserInfoResult.success && saveUserSettingsResult.success) {
						const invitationCode = userRegistrationRequest.invitationCode
						if (invitationCode) {
							const useInvitationCodeDto: UseInvitationCodeDto = {
								invitationCode,
								registrantUid: uid,
								registrantUUID: uuid,
							}
							try {
								const useInvitationCodeResult = await useInvitationCode(useInvitationCodeDto)
								if (!useInvitationCodeResult.success) {
									console.error('ERROR', 'Error using invitation code: failed to update inviter')
								}
							} catch (error) {
								console.error('ERROR', 'Error using invitation code: exception while updating inviter:', error)
							}
						}
						await session.commitTransaction()
						session.endSession()
						return { success: true, uid, token, UUID: uuid, message: 'User registration success' }
					} else {
						if (session.inTransaction()) {
							await session.abortTransaction()
						}
						session.endSession()
						console.error('ERROR', 'User registration failed: insert into MongoDB failed')
						return { success: false, message: 'User registration failed: save failed' }
					}
				} catch (error) {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.error('ERROR', 'User registration failed: exception when inserting into MongoDB:', error)
					return { success: false, message: 'User registration failed: cannot save user profile' }
				}
			} else {
				console.error('ERROR', 'User registration failed: email or emailLowerCase or verificationCode may be empty')
				return { success: false, message: 'User registration failed: generate account data failed' }
			}
		} else {
			console.error('ERROR', 'User registration failed: userRegistrationData non-empty validation failed')
			return { success: false, message: 'User registration failed: non-empty validation failed' }
		}
	} catch (error) {
		console.error('Exception in userRegistrationService', error)
		return { success: false, message: 'User registration failed: program terminated abnormally' }
	}
}

/**
 * User login
 * @param userLoginRequest Info needed for login (username, password)
 * @return UserLoginResponseDto Login result; includes token on success
 */
export const userLoginService = async (userLoginRequest: UserLoginRequestDto): Promise<UserLoginResponseDto> => {
	try {
		// 1. Validate request
		if (!checkUserLoginRequest(userLoginRequest)) {
			console.error('ERROR', 'User login error: payload validation failed')
			return { success: false, message: 'Payload validation failed' }
		}

		const { email, passwordHash, clientOtp } = userLoginRequest
		const emailLowerCase = email.toLowerCase()
		const { collectionName, schemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof schemaInstance>

		const userLoginWhere: QueryType<UserAuth> = { emailLowerCase }
		const userLoginSelect: SelectType<UserAuth> = {
			email: 1,
			UUID: 1,
			uid: 1,
			token: 1,
			passwordHint: 1,
			passwordHashHash: 1,
			authenticatorType: 1,
		}

		// 2. Get user security info
		const userAuthResult = await selectDataFromMongoDB<UserAuth>(userLoginWhere, userLoginSelect, schemaInstance, collectionName)
		if (!userAuthResult?.result || userAuthResult.result?.length !== 1) {
			console.error('ERROR', `Login error (query user): email:【${email}】, not registered or invalid info`)
			return { success: false, email, message: 'Not registered or invalid info' }
		}

		const userAuthData = userAuthResult.result[0]
		const { token, uid, UUID: uuid, authenticatorType } = userAuthData
		if (!token || uid === null || uid === undefined || !uuid) {
			console.error('ERROR', `Login failed: cannot get user security info`)
			return { success: false, message: 'Login failed: cannot get user security info' }
		}

		// 3. Check password
		const isCorrectPassword = comparePasswordSync(passwordHash, userAuthData.passwordHashHash)
		if (!isCorrectPassword) {
			return { success: false, email, passwordHint: userAuthData.passwordHint, message: 'Wrong password' }
		}

		// 4. Check 2FA status
		if (authenticatorType === 'totp') { // 4.1 TOTP
			const maxAttempts	 = 5 // max attempts
			const lockTime = 60 * 60 * 1000 // cooldown
			const now = new Date().getTime()

			if (!clientOtp) {
				console.error('Login failed: TOTP enabled but code not provided', authenticatorType )
				return { success: false, message:"Login failed: TOTP enabled but code not provided", authenticatorType }
			}

			const { collectionName: userTotpAuthenticatorCollectionName, schemaInstance: userTotpAuthenticatorSchemaInstance } = UserTotpAuthenticatorSchema
			type UserAuthenticator = InferSchemaType<typeof userTotpAuthenticatorSchemaInstance>
			const userTotpAuthenticatorWhere: QueryType<UserAuthenticator> = {
				UUID: uuid,
				enabled: true,
			}

			if (clientOtp.length > 6) { // Treat as using a TOTP recovery code to log in (on success, TOTP 2FA will be removed)
				const userTotpAuthenticatorSelect: SelectType<UserAuthenticator> = {
					recoveryCodeHash: 1,
				}

				const selectResult = await selectDataFromMongoDB<UserAuthenticator>(userTotpAuthenticatorWhere, userTotpAuthenticatorSelect, userTotpAuthenticatorSchemaInstance, userTotpAuthenticatorCollectionName)

				if (!selectResult.success || selectResult.result.length !== 1) {
					console.error('ERROR', 'Login failed: get verification data failed - 1')
					return { success: false, message: 'Login failed: get verification data failed - 1', authenticatorType }
				}

				const recoveryCodeHash = selectResult.result[0].recoveryCodeHash
				const isCorrectRecoveryCode = comparePasswordSync(clientOtp, recoveryCodeHash)

				if (!isCorrectRecoveryCode) {
					console.error('ERROR', 'Login failed: recovery code incorrect')
					return { success: false, message: 'Login failed: recovery code incorrect', authenticatorType }
				}

				const session = await mongoose.startSession()
				session.startTransaction()

				const deleteTotpAuthenticatorByRecoveryCodeData: DeleteTotpAuthenticatorByRecoveryCodeParametersDto = {
					email,
					recoveryCodeHash,
					session
				}
				const deleteResult = await deleteTotpAuthenticatorByRecoveryCode(deleteTotpAuthenticatorByRecoveryCodeData) // Delete TOTP 2FA when logged in via recovery code

				if (!deleteResult.success) {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.error('ERROR', 'Login failed: could not delete TOTP 2FA')
					return { success: false, message: 'Login failed: could not delete TOTP 2FA', authenticatorType }
				}

				await session.commitTransaction()
				session.endSession()
				return { success: true, email, uid, token, UUID: uuid, message: 'Login success with recovery code, your TOTP 2FA has been deleted', authenticatorType }
			} else { // Treat as TOTP or backup code; try TOTP first, then backup
				const userTotpAuthenticatorSelect: SelectType<UserAuthenticator> = {
					secret: 1,
					backupCodeHash: 1,
					lastAttemptTime: 1,
					attempts: 1,
				}

				const selectResult = await selectDataFromMongoDB<UserAuthenticator>(userTotpAuthenticatorWhere, userTotpAuthenticatorSelect, userTotpAuthenticatorSchemaInstance, userTotpAuthenticatorCollectionName)

				if (!selectResult.success || selectResult.result.length !== 1) {
					console.error('ERROR', 'Login failed: get verification data failed - 2')
					return { success: false, message: 'Login failed: get verification data failed - 2', authenticatorType }
				}

				let attempts = selectResult.result[0].attempts

				const totpSecret = selectResult.result[0].secret
				const listOfBackupCodeHash = selectResult.result[0].backupCodeHash

				// Rate limit
				if (selectResult.result[0].attempts >= maxAttempts) {
					const lastAttemptTime = new Date(selectResult.result[0].lastAttemptTime).getTime();
					if (now - lastAttemptTime < lockTime) {
						attempts += 1
						console.warn('WARN', 'WARNING', 'Login failed: max attempts reached, try later');
						return { success: false, message: 'Login failed: max attempts reached, try later', isCoolingDown: true, authenticatorType };
					} else {
						attempts = 0
					}

					// Start transaction
					const session = await mongoose.startSession()
					session.startTransaction()

					const userLoginByBackupCodeUpdate: UpdateType<UserAuthenticator> = {
						attempts: attempts,
						lastAttemptTime: now,
					}
					const updateAuthenticatorResult = await findOneAndUpdateData4MongoDB<UserAuthenticator>(userTotpAuthenticatorWhere, userLoginByBackupCodeUpdate, userTotpAuthenticatorSchemaInstance, userTotpAuthenticatorCollectionName, { session })

					if (!updateAuthenticatorResult.success) {
						if (session.inTransaction()) {
							await session.abortTransaction()
						}
						session.endSession()
						console.error('ERROR', 'Login failed: update last attempt time or attempts failed')
						return { success: false, message: 'Login failed: update last attempt time or attempts failed', isCoolingDown: true, authenticatorType }
					}
				}

				if (!authenticator.check(clientOtp, totpSecret)) {
					attempts += 1
					let useCorrectBackupCode = false // whether a correct backup code is used
					const newBackupCodeHash = []
					listOfBackupCodeHash.forEach( backupCodeHash => {
						const isCorrectBackupCode = comparePasswordSync(clientOtp, backupCodeHash)
						if (isCorrectBackupCode) {
							useCorrectBackupCode = true
						} else {
							newBackupCodeHash.push(backupCodeHash)
						}
					})

					if (!useCorrectBackupCode) {
						console.error('ERROR', 'Login failed: verification code or backup code incorrect');
						return { success: false, message: 'Login failed: verification code or backup code incorrect', authenticatorType };
					}
					const session = await mongoose.startSession()
					session.startTransaction()

					const userLoginByBackupCodeUpdate: UpdateType<UserAuthenticator> = {
						backupCodeHash: newBackupCodeHash,
						editDateTime: now,
						attempts,
						lastAttemptTime: now,
					}

					// After login with backup code, write back remaining unused backup codes (to prevent reuse)
					const updateAuthenticatorResult = await findOneAndUpdateData4MongoDB<UserAuthenticator>(userTotpAuthenticatorWhere, userLoginByBackupCodeUpdate, userTotpAuthenticatorSchemaInstance, userTotpAuthenticatorCollectionName, { session })

					if (!updateAuthenticatorResult.success) {
						if (session.inTransaction()) {
							await session.abortTransaction()
						}
						session.endSession()
						console.error('ERROR', 'Login failed: update backup code failed')
						return { success: false, message: 'Login failed: update backup code failed', authenticatorType }
					}

					await commitAndEndSession(session)
					return { success: true, email, uid, token, UUID: uuid, message: 'Login success with backup code', authenticatorType }
				} else {
					return { success: true, email, uid, token, UUID: uuid, message: 'Login success with TOTP code', authenticatorType }
				}
			}
		} else if (authenticatorType === 'email') {
			const { verificationCode } = userLoginRequest
			if (!verificationCode) {
				console.error('ERROR', 'Login failed: email verification enabled but code not provided')
				return { success: false, message: 'Login failed: email verification enabled but code not provided', authenticatorType }
			}

			if (verificationCode.length !== 6) {
				console.error('ERROR', 'Login failed: verification code length incorrect')
				return { success: false, message: 'Login failed: verification code length incorrect', authenticatorType }
			}

			const checkVerificationCodeData = {
				email: emailLowerCase,
				verificationCode: verificationCode
			}

			if (!(await checkEmailAuthenticatorVerificationCodeService(checkVerificationCodeData)).success) {
				console.error('ERROR', 'Login failed: verification code incorrect')
				return { success: false, message: 'Login failed: verification code incorrect', authenticatorType }
			}

			return { success: true, email, uid, token, UUID: uuid, message: 'Login success', authenticatorType }
		} else {
			return { success: true, email, uid, token, UUID: uuid, message: 'Login success', authenticatorType: 'none' }
		}
	} catch (error) {
		console.error('ERROR', 'User login error:', error)
		return { success: false, message: 'User login failed: program terminated abnormally' }
	}
}

/**
 * Check if a user email exists (check if an email is already registered)
 * @param checkUserExistsCheckRequest Check if user exists; need information (user email)
 * @return UserExistsCheckResponseDto Check result; if exists or query failed, exists: true
 */
export const userEmailExistsCheckService = async (userEmailExistsCheckRequest: UserEmailExistsCheckRequestDto): Promise<UserEmailExistsCheckResponseDto> => {
	try {
		if (checkUserEmailExistsCheckRequest(userEmailExistsCheckRequest)) {
			const { collectionName, schemaInstance } = UserAuthSchema
			type UserAuth = InferSchemaType<typeof schemaInstance>
			const where: QueryType<UserAuth> = {
				emailLowerCase: userEmailExistsCheckRequest.email.toLowerCase(),
			}
			const select: SelectType<UserAuth> = {
				emailLowerCase: 1,
			}

			let result: DbPoolResultsType<UserAuth>
			try {
				result = await selectDataFromMongoDB(where, select, schemaInstance, collectionName)
			} catch (error) {
				console.error('ERROR', 'Exception when checking if user email exists (query user):', error)
				return { success: false, exists: false, message: 'Exception when checking if user email exists' }
			}

			if (result && result.success && result.result) {
				if (result.result?.length > 0) {
					return { success: true, exists: true, message: 'User email already exists' }
				} else {
					return { success: true, exists: false, message: 'User email does not exist' }
				}
			} else {
				return { success: false, exists: false, message: 'Email query failed' }
			}
		} else {
			console.error('ERROR', 'Failed to check if user email exists: invalid parameters')
			return { success: false, exists: false, message: 'Failed to check if user email exists: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Exception when checking if user email exists:', error)
		return { success: false, exists: false, message: 'Exception when checking if user email exists' }
	}
}

/**
 * Update user email
 * @param updateUserEmailRequest Request parameters for updating user email
 * @param uid User ID
 * @param token User token
 * @returns Response for updating user email request
 */
export const updateUserEmailService = async (updateUserEmailRequest: UpdateUserEmailRequestDto, cookieUid: number, cookieToken: string): Promise<UpdateUserEmailResponseDto> => {
	try {
		// TODO: Send email to old email for verification
		if (await checkUserToken(cookieUid, cookieToken)) {
			if (checkUpdateUserEmailRequest(updateUserEmailRequest)) {
				const { uid, oldEmail, newEmail, passwordHash, verificationCode } = updateUserEmailRequest
				const now = new Date().getTime()

				if (cookieUid !== uid) {
					console.error('ERROR', 'Failed to update user email: UID in cookie does not match UID used for email update', { cookieUid, uid, oldEmail })
					return { success: false, message: 'Failed to update user email: incorrect user specified' }
				}

				const oldEmailLowerCase = oldEmail.toLowerCase()
				const newEmailLowerCase = newEmail.toLowerCase()

				// Start transaction
				const session = await mongoose.startSession()
				session.startTransaction()

				const { collectionName, schemaInstance } = UserAuthSchema
				type UserAuth = InferSchemaType<typeof schemaInstance>

				const userAuthWhere: QueryType<UserAuth> = { uid, emailLowerCase: oldEmailLowerCase, cookieToken } // Use uid, emailLowerCase, and token to ensure user is updating their own email, not someone else's
				const userAuthSelect: SelectType<UserAuth> = { passwordHashHash: 1, emailLowerCase: 1 }
				try {
					const userAuthResult = await selectDataFromMongoDB<UserAuth>(userAuthWhere, userAuthSelect, schemaInstance, collectionName, { session })
					const userAuthData = userAuthResult.result
					if (userAuthData) {
						if (userAuthData.length !== 1) { // Ensure only one user's email is updated
							if (session.inTransaction()) {
								await session.abortTransaction()
							}
							session.endSession()
							console.error('ERROR', 'Failed to update user email: matched zero or multiple users', { uid, oldEmail })
							return { success: false, message: 'Failed to update user email: unable to find correct user' }
						}

						const isCorrectPassword = comparePasswordSync(passwordHash, userAuthData[0].passwordHashHash) // Ensure password is correct when updating email
						if (!isCorrectPassword) {
							console.error('ERROR', 'Failed to update user email: incorrect user password', { uid, oldEmail })
							if (session.inTransaction()) {
								await session.abortTransaction()
							}
							session.endSession()
							return { success: false, message: 'Failed to update user email: incorrect user password' }
						}
					}
				} catch (error) {
					console.error('ERROR', 'Exception when checking user password for email update:', error, { uid, oldEmail })
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					return { success: false, message: 'User registration failed: failed to check user password' }
				}

				try {
					const { collectionName: userChangeEmailVerificationCodeCollectionName, schemaInstance: userChangeEmailVerificationCodeSchemaInstance } = UserChangeEmailVerificationCodeSchema
					type UserChangeEmailVerificationCode = InferSchemaType<typeof userChangeEmailVerificationCodeSchemaInstance>
					const verificationCodeWhere: QueryType<UserChangeEmailVerificationCode> = {
						emailLowerCase: oldEmailLowerCase,
						verificationCode,
						overtimeAt: { $gte: now },
					}

					const verificationCodeSelect: SelectType<UserChangeEmailVerificationCode> = {
						emailLowerCase: 1, // user email
					}

					const verificationCodeResult = await selectDataFromMongoDB<UserChangeEmailVerificationCode>(verificationCodeWhere, verificationCodeSelect, userChangeEmailVerificationCodeSchemaInstance, userChangeEmailVerificationCodeCollectionName, { session })
					if (!verificationCodeResult.success || verificationCodeResult.result?.length !== 1) {
						if (session.inTransaction()) {
							await session.abortTransaction()
						}
						session.endSession()
						console.error('ERROR', 'Failed to update email: verification failed')
						return { success: false, message: 'Failed to update email: verification failed' }
					}
				} catch (error) {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.error('ERROR', 'Failed to update email: request verification failed')
					return { success: false, message: 'Failed to update email: request verification failed' }
				}

				const updateUserEmailWhere: QueryType<UserAuth> = {
					uid,
				}
				const updateUserEmailUpdate: QueryType<UserAuth> = {
					email: newEmail,
					emailLowerCase: newEmailLowerCase,
					editDateTime: new Date().getTime(),
				}
				try {
					const updateResult = await updateData4MongoDB(updateUserEmailWhere, updateUserEmailUpdate, schemaInstance, collectionName)
					if (updateResult && updateResult.success && updateResult.result) {
						if (updateResult.result.matchedCount > 0 && updateResult.result.modifiedCount > 0) {
							await session.commitTransaction()
							session.endSession()
							return { success: true, message: 'User email updated successfully' }
						} else {
							console.error('ERROR', 'Update user email failed: update count was 0', { uid, oldEmail, newEmail })
							if (session.inTransaction()) {
								await session.abortTransaction()
							}
							session.endSession()
							return { success: false, message: 'Failed to update user email: unable to update user email' }
						}
					} else {
						console.error('ERROR', 'Update user email failed: update count was 0', { uid, oldEmail, newEmail })
						if (session.inTransaction()) {
							await session.abortTransaction()
						}
						session.endSession()
						return { success: false, message: 'Failed to update user email: unable to update user email' }
					}
				} catch (error) {
					console.error('ERROR', 'Exception when updating user email:', error, { uid, oldEmail, newEmail })
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					return { success: false, message: 'Failed to update user email: error when updating user identity' }
				}
			} else {
				console.error('ERROR', 'Failed to update user email: original data not retrieved')
				return { success: false, message: 'Failed to update user email: unable to retrieve original user data, data may be empty' }
			}
		} else {
			console.error('ERROR', 'Failed to update user email: invalid user')
			return { success: false, message: 'Failed to update user email: invalid user' }
		}
	} catch (error) {
		console.error('ERROR', 'Exception when updating user email:', error)
		return { success: false, message: 'Failed to update user email: unknown error' }
	}
}

/**
 * Update or create user information based on UID
 * @param updateUserInfoRequest Request parameters for updating or creating user information
 * @param uid User ID
 * @param token User token
 * @returns Result of updating or creating user information request
 */
export const updateOrCreateUserInfoService = async (updateOrCreateUserInfoRequest: UpdateOrCreateUserInfoRequestDto, uid: number, token: string): Promise<UpdateOrCreateUserInfoResponseDto> => {
	try {
		if (await checkUserToken(uid, token)) {
			if (checkUpdateOrCreateUserInfoRequest(updateOrCreateUserInfoRequest)) {
				const { collectionName, schemaInstance } = UserInfoSchema
				type UserInfo = InferSchemaType<typeof schemaInstance>
				const username = updateOrCreateUserInfoRequest.username

				if (username) {
					if (!validateNameField(username) || !validateNameField(updateOrCreateUserInfoRequest.userNickname)) {
						console.error('ERROR', 'Failed to update user information: invalid username or nickname, user UID:', uid)
						return { success: false, message: 'Failed to update user information: invalid username or nickname' }
					}

					const getUserInfoWhere: QueryType<UserInfo> = {
						username: { $regex: new RegExp(`\\b${updateOrCreateUserInfoRequest.username}\\b`, 'iu') },
					}
					const getUserInfoSelect: SelectType<UserInfo> = {
						uid: 1,
						username: 1,
					}
					const checkUsernameResult = await selectDataFromMongoDB<UserInfo>(getUserInfoWhere, getUserInfoSelect, schemaInstance, collectionName)

					let isSafeUsername = false
					if (checkUsernameResult.success) {
						if (checkUsernameResult.result.length === 0) {
							isSafeUsername = true
						}
						if (checkUsernameResult.result.length === 1) {
							if (checkUsernameResult.result[0].uid === uid) {
								isSafeUsername = true
							}
						}
					}

					if (!isSafeUsername) {
						console.error('ERROR', 'Failed to update user information: username already taken', { updateOrCreateUserInfoRequest, uid })
						return { success: false, message: 'Failed to update user information: username already taken' }
					}
				}

				const editOperatorUUID = await getUserUuid(uid)
				if (!editOperatorUUID) {
					console.error('ERROR', 'Failed to update or create user information: UUID does not exist', { updateOrCreateUserInfoRequest, uid })
					return { success: false, message: 'Failed to update or create user information: UUID does not exist' }
				}

				const updateUserInfoWhere: QueryType<UserInfo> = {
					uid,
				}
				const updateUserInfoUpdate: UpdateType<UserInfo> = {
					...updateOrCreateUserInfoRequest,
					label: updateOrCreateUserInfoRequest.label as UserInfo['label'], // TODO: Mongoose issue: #12420
					userLinkedAccounts: updateOrCreateUserInfoRequest.userLinkedAccounts as UserInfo['userLinkedAccounts'], // TODO: Mongoose issue: #12420
					isUpdatedAfterReview: true,
					editOperatorUUID,
					editDateTime: new Date().getTime(),
				}
				const updateResult = await findOneAndUpdateData4MongoDB(updateUserInfoWhere, updateUserInfoUpdate, schemaInstance, collectionName)
				if (updateResult && updateResult.success && updateResult.result) {
					return { success: true, message: 'User information updated successfully', result: updateResult.result }
				} else {
					console.error('ERROR', 'Failed to update user information: no user data returned', { updateOrCreateUserInfoRequest, uid })
					return { success: false, message: 'Failed to update user information: no user data returned' }
				}
			} else {
				console.error('ERROR', 'Failed to update user information: necessary data not found, or invalid platform type for associated account:', { updateOrCreateUserInfoRequest, uid })
				return { success: false, message: 'Failed to update user data: necessary data is empty or platform information error' }
			}
		} else {
			console.error('ERROR', 'Failed to update user data: invalid token verification, unauthorized user!', { updateOrCreateUserInfoRequest, uid })
			return { success: false, message: 'Failed to update user data: unauthorized user!' }
		}
	} catch (error) {
		console.error('ERROR', 'Exception when updating user information:', error)
		return { success: false, message: 'Failed to update user data: unknown error' }
	}
}

/**
 * Check if a user exists based on UID
 * @param UserExistsCheckByUIDRequestDto Request parameters for checking if user exists
 * @returns Result of checking if user exists request
 */
export const checkUserExistsByUIDService = async (userExistsCheckByUIDRequest: UserExistsCheckByUIDRequestDto): Promise<UserExistsCheckByUIDResponseDto> => {
	try {
		if (!!userExistsCheckByUIDRequest.uid) {
			const { uid } = userExistsCheckByUIDRequest
			const { collectionName, schemaInstance } = UserInfoSchema
			type UserInfo = InferSchemaType<typeof schemaInstance>
			const where: QueryType<UserInfo> = { uid }
			const select: SelectType<UserInfo> = { uid: 1 }
			const result = await selectDataFromMongoDB<UserInfo>(where, select, schemaInstance, collectionName)
			if (result.success) {
				if (result.result?.length === 1) {
					return { success: true, exists: true, message: 'User exists' }
				} else {
					return { success: true, exists: false, message: 'User does not exist' }
				}
			} else {
				console.error('ERROR', 'Failed to check if user exists: query failed')
				return { success: false, exists: false, message: 'Failed to check if user exists: query failed' }
			}
		} else {
			console.error('ERROR', 'Failed to check if user exists: invalid request parameters')
			return { success: false, exists: false, message: 'Failed to check if user exists: invalid request parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Exception when checking if user exists:', error)
		return { success: false, exists: false, message: 'Failed to check if user exists: unknown error' }
	}
}

/**
 * [Deprecated] Get current logged-in user information via uid
 * // DELETE ME: This API should be replaced as UUID becomes more widespread
 * @param getSelfUserInfoRequest Request parameters for getting current logged-in user information
 * @returns Current logged-in user information
 */
export const getSelfUserInfoService = async (getSelfUserInfoRequest: GetSelfUserInfoRequestDto): Promise<GetSelfUserInfoResponseDto> => {
	try {
		const { uid, token } = getSelfUserInfoRequest
		if (!uid || !token) {
			console.error('ERROR', 'Failed to get user information via UID: uid or token is empty')
			return { success: false, message: 'Failed to get user information via UID: necessary parameters are empty' }
		}

		const UUID = await getUserUuid(uid) // DELETE ME: This is UID compatibility code; as UUID becomes more widespread, uid will be gradually deprecated

		if (!await checkUserToken(uid, token)) {
			console.error('ERROR', 'Failed to get user information via UID: user token verification failed, unauthorized user!')
			return { success: false, message: 'Failed to get user information via UID: unauthorized user!' }
		}

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>

		const selfUserInfoPipeline: PipelineStage[] = [
			{
				$match: {
					UUID
				},
			},
			{
				$lookup: {
					from: 'user-infos',
					localField: 'UUID',
					foreignField: 'UUID',
					as: 'user_info_data'
				}
			},
			{
				$unwind: {
					path: '$user_info_data',
					preserveNullAndEmptyArrays: true // Keep users without user information
				},
			},
			{
				$lookup: {
					from: 'user-invitation-codes',
					localField: 'UUID',
					foreignField: 'assigneeUUID',
					as: 'invitation_codes_data'
				},
			},
			{
				$unwind: {
					path: '$invitation_codes_data',
					preserveNullAndEmptyArrays: true
				},
			},
			{
				$project: {
					email: 1, // User email
					userCreateDateTime: 1, // User creation date
					roles: 1, // User roles
					uid: 1, // User UID
					UUID: 1, // UUID
					authenticatorType: 1, // Type of 2FA
					userNickname: '$user_info_data.userNickname', // User nickname
					username: '$user_info_data.username', // User name
					label: '$user_info_data.label', // User label
					avatar: '$user_info_data.avatar', // User avatar
					userBannerImage: '$user_info_data.userBannerImage', // User background image
					signature: '$user_info_data.signature', // User signature
					gender: '$user_info_data.gender', // User gender
					invitationCode: '$invitation_codes_data.invitationCode', // User invitation code
				}
			}
		]

		try {
			const userSelfInfoResult = await selectDataByAggregateFromMongoDB<UserAuth>(userAuthSchemaInstance, userAuthCollectionName, selfUserInfoPipeline)
			if (userSelfInfoResult && userSelfInfoResult.success) {
				const userInfo = userSelfInfoResult?.result
				if (userInfo?.length === 0) {
					return { success: true, message: 'User has not provided user information', result: undefined }
				} else if (userInfo?.length === 1 && userInfo?.[0]) {
					return { success: true, message: 'User information retrieved successfully', result: { ...userInfo[0], email: userInfo[0].email, userCreateDateTime: userInfo[0].userCreateDateTime, roles: userInfo[0].roles } }
				} else {
					console.error('ERROR', 'Failed to get user information via UID: result length is not 1')
					return { success: false, message: 'Failed to get user information via UID: result exception' }
				}
			} else {
				console.error('ERROR', 'Failed to get user information via UUID: result is empty')
				return { success: false, message: 'Failed to get user information via UUID: result is empty' }
			}
		} catch (error) {
			console.error('ERROR', 'Exception when querying data for user information via UID:', error)
			return { success: false, message: 'Failed to get user information via UID: query error' }
		}
	} catch (error) {
		console.error('ERROR', 'Exception when checking if user exists via UID:', error)
		return { success: false, message: 'Failed to get user information via UID: unknown error' }
	}
}

/**
 * Get current logged-in user information via UUID
 * @param getSelfUserInfoRequest Request parameters for getting current logged-in user information via UUID
 * @returns Response for getting current logged-in user information via UUID request
 */
export const getSelfUserInfoByUuidService = async (getSelfUserInfoByUuidRequest: GetSelfUserInfoByUuidRequestDto): Promise<GetSelfUserInfoByUuidResponseDto> => {
	try {
		const { uuid, token } = getSelfUserInfoByUuidRequest
		if (!uuid || !token) {
			console.error('ERROR', 'Failed to get user information via UUID: uuid or token is empty')
			return { success: false, message: 'Failed to get user information via UUID: necessary parameters are empty' }
		}

		if (!await checkUserTokenByUUID(uuid, token)) {
			console.error('ERROR', 'Failed to get user information via UUID: user token verification failed, unauthorized user!')
			return { success: false, message: 'Failed to get user information via UUID: unauthorized user!' }
		}

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>

		const selfUserInfoPipeline: PipelineStage[] = [
			{
				$match: {
					UUID: uuid
				},
			},
			{
				$lookup: {
					from: 'user-infos',
					localField: 'UUID',
					foreignField: 'UUID',
					as: 'user_info_data'
				}
			},
			{
				$unwind: {
					path: '$user_info_data',
					preserveNullAndEmptyArrays: true // Keep users without user information
				},
			},
			{
				$lookup: {
					from: 'user-invitation-codes',
					localField: 'UUID',
					foreignField: 'assigneeUUID',
					as: 'invitation_codes_data'
				},
			},
			{
				$unwind: {
					path: '$invitation_codes_data',
					preserveNullAndEmptyArrays: true
				},
			},
			{
				$project: {
					email: 1, // User email
					userCreateDateTime: 1, // User creation date
					roles: 1, // User roles
					uid: 1, // User UID
					UUID: 1, // UUID
					authenticatorType: 1, // Type of 2FA
					userNickname: '$user_info_data.userNickname', // User nickname
					username: '$user_info_data.username', // User name
					label: '$user_info_data.label', // User label
					avatar: '$user_info_data.avatar', // User avatar
					userBannerImage: '$user_info_data.userBannerImage', // User background image
					signature: '$user_info_data.signature', // User signature
					gender: '$user_info_data.gender', // User gender
					invitationCode: '$invitation_codes_data.invitationCode', // User invitation code
				}
			}
		]

		try {
			const userSelfInfoResult = await selectDataByAggregateFromMongoDB<UserAuth>(userAuthSchemaInstance, userAuthCollectionName, selfUserInfoPipeline)
			if (userSelfInfoResult && userSelfInfoResult.success) {
				const userInfo = userSelfInfoResult?.result
				if (!userInfo || userInfo.length === 0) {
					return { success: true, message: 'User has not provided user information', result: undefined }
				} else if (userInfo?.length === 1 && userInfo?.[0]) {
					return { success: true, message: 'User information retrieved successfully', result: { ...userInfo[0], email: userInfo[0].email, userCreateDateTime: userInfo[0].userCreateDateTime, roles: userInfo[0].roles } }
				} else {
					console.error('ERROR', 'Failed to get user information via UUID: result length is not 1')
					return { success: false, message: 'Failed to get user information via UUID: result exception' }
				}
			} else {
				console.error('ERROR', 'Failed to get user information via UUID: result is empty')
				return { success: false, message: 'Failed to get user information via UUID: result is empty' }
			}
		} catch (error) {
			console.error('ERROR', 'Exception when querying data for user information via UUID:', error)
			return { success: false, message: 'Failed to get user information via UUID: query error' }
		}
	} catch (error) {
		console.error('ERROR', 'Exception when checking if user exists via UUID:', error)
		return { success: false, message: 'Failed to get user information via UUID: unknown error' }
	}
}

/**
 * Get user information via UID
 * @param getUserInfoByUidRequest Request payload for getting user information via UID
 * @param selectorUuid UUID of requester
 * @param selectorToken Token of requester
 * @returns Result of getting user information request
 */
export const getUserInfoByUidService = async (getUserInfoByUidRequest: GetUserInfoByUidRequestDto, selectorUuid?: string, selectorToken?: string): Promise<GetUserInfoByUidResponseDto> => {
	try {
		const { uid } = getUserInfoByUidRequest
		let isHidden = false
		let isBlockedByOther = false

		if (uid === null || uid === undefined) {
			console.error('ERROR', 'Failed to get user information: uid or token is empty')
			return { success: false, message: 'Failed to get user information: necessary parameters are empty', isBlockedByOther, isBlocked: false, isHidden }
		}

		const checkBlockUserResult = await checkBlockUserService({ uid }, selectorUuid, selectorToken)
		const checkIsBlockedByOtherUserResult = await checkIsBlockedByOtherUserService({ targetUid: uid }, selectorUuid, selectorToken)

		// 1. Check if target user is hidden from current user
		if (checkBlockUserResult.isHidden) {
			isHidden = true
		}

		// 2. Check if current user is blocked by target user
		if (checkIsBlockedByOtherUserResult.isBlocked) {
			isBlockedByOther = true
		}

		// 3. Check if current user is blocked by target user and vice versa
		if (checkBlockUserResult.isBlocked && checkIsBlockedByOtherUserResult.isBlocked) {
			return { success: true, message: 'Failed to get user information: you are both blocked by this user', isBlockedByOther, isBlocked: true, isHidden }
		}

		// 4. Check if target user is blocked by current user
		if (checkBlockUserResult.isBlocked) {
			return { success: true, message: 'Failed to get user information: you have blocked this user', isBlockedByOther, isBlocked: true, isHidden }
		}

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>
		const userAuthWhere: QueryType<UserAuth> = { uid }
		const userAuthSelect: SelectType<UserAuth> = {
			UUID: 1, // UUID
			userCreateDateTime: 1, // User creation date
			roles: 1, // User roles
		}

		const { collectionName: userInfoCollectionName, schemaInstance: userInfoSchemaInstance } = UserInfoSchema
		type UserInfo = InferSchemaType<typeof userInfoSchemaInstance>
		const getUserInfoWhere: QueryType<UserInfo> = { uid }
		const getUserInfoSelect: SelectType<UserInfo> = {
			label: 1, // User label
			username: 1, // User name
			userNickname: 1, // User nickname
			avatar: 1, // User avatar
			userBannerImage: 1, // User background image
			signature: 1, // User signature
			gender: 1, // User gender
		}

		try {
			const session = await createAndStartSession()
			const userAuthPromise = selectDataFromMongoDB<UserAuth>(userAuthWhere, userAuthSelect, userAuthSchemaInstance, userAuthCollectionName)
			const userInfoPromise = selectDataFromMongoDB(getUserInfoWhere, getUserInfoSelect, userInfoSchemaInstance, userInfoCollectionName)
			const [userAuthResult, userInfoResult] = await Promise.all([userAuthPromise, userInfoPromise])
			if (!userAuthResult || !userAuthResult.success || !userInfoResult || !userInfoResult.success) {
				await abortAndEndSession(session)
				console.error('ERROR', 'Failed to get user information: result is empty')
				return { success: false, message: 'Failed to get user information: result is empty', isBlockedByOther, isBlocked: false, isHidden }
			}
			const userAuth = userAuthResult?.result
			const uuid = userAuth?.[0]?.UUID
			const userInfo = userInfoResult?.result
			if (userInfo?.length !== 1 || !userInfo[0] || userAuth?.length !== 1 || !uuid) {
				await abortAndEndSession(session)
				console.error('ERROR', 'Failed to get user information: result length is not 1')
				return { success: false, message: 'Failed to get user information: result exception', isBlockedByOther, isBlocked: false, isHidden }
			}

			let isSelf = uuid === selectorUuid // Check if queried user is self
			let isFollowing = false; // Check if current user is following the queried user, default is not following
			if ( selectorUuid && selectorToken && !isSelf && await checkUserTokenByUUID(selectorUuid, selectorToken)) { // If uuid and token are provided, and user is not self, check if queried user is already followed
				const { collectionName: followingSchemaCollectionName, schemaInstance: followingSchemaInstance } = FollowingSchema
				type Following = InferSchemaType<typeof followingSchemaInstance>

				const followingWhere: QueryType<Following> = {
					followerUuid: selectorUuid,
					followingUuid: uuid,
				}
				const followingSelect: SelectType<Following> = {
					followerUuid: 1,
					followingUuid: 1,
					followingType: 1,
				}

				const selectFollowingDataResult = await selectDataFromMongoDB<Following>(followingWhere, followingSelect, followingSchemaInstance, followingSchemaCollectionName, { session })
				const followingResult = selectFollowingDataResult?.result
				if (selectFollowingDataResult.success && followingResult.length === 1) {
					isFollowing = true
				}
			}

			await commitAndEndSession(session)
			return {
				success: true,
				message: 'User information retrieved successfully',
				result: {
					...userInfo[0],
					userCreateDateTime: userAuth[0].userCreateDateTime,
					roles: userAuth[0].roles,
					isFollowing,
					isSelf,
				},
				isBlockedByOther,
				isBlocked: false,
				isHidden,
			}
		} catch (error) {
			console.error('ERROR', 'Exception when querying data for user information:', error)
			return { success: false, message: 'Failed to get user information: query error', isBlockedByOther, isBlocked: false, isHidden }
		}
	} catch (error) {
		console.error('ERROR', 'Exception when checking if user exists:', error)
		return { success: false, message: 'Failed to get user information: unknown error', isBlockedByOther: false, isBlocked: false, isHidden: false }
	}
}

/**
 * Update user avatar and get pre-signed URL for user to upload avatar, upload time limited to 60 seconds
 * @param uid User ID
 * @param token User token
 * @returns Result of getting pre-signed URL for user to upload avatar
 */
export const getUserAvatarUploadSignedUrlService = async (uid: number, token: string): Promise<GetUserAvatarUploadSignedUrlResponseDto> => {
	// TODO: Image upload logic needs to be rewritten; current method will replace the old avatar link in the database even if the image fails to upload, and the current image is not added to the review process
	try {
		if (await checkUserToken(uid, token)) {
			const now = new Date().getTime()
			const fileName = `avatar-${uid}-${generateSecureRandomString(32)}-${now}`
			const signedUrl = await createCloudflareImageUploadSignedUrl(fileName, 660)
			if (signedUrl && fileName) {
				return { success: true, message: 'Preparing to upload avatar', userAvatarUploadSignedUrl: signedUrl, userAvatarFilename: fileName }
			} else {
				// TODO: Image upload logic needs to be rewritten; current method will replace the old avatar link in the database even if the image fails to upload, and the current image is not added to the review process
				return { success: false, message: 'Upload failed: unable to generate image upload URL, please try uploading avatar again' }
			}
		} else {
			console.error('ERROR', 'Failed to get pre-signed URL for image upload: invalid user', { uid })
			return { success: false, message: 'Upload failed: unable to get upload permission' }
		}
	} catch (error) {
		console.error('ERROR', 'Failed to get pre-signed URL for image upload:', error, { uid })
	}
}

/**
 * Get user personal settings data
 * @param uid User ID
 * @param token User token
 * @returns User personal settings data
 */
export const getUserSettingsService = async (uid: number, token: string): Promise<GetUserSettingsResponseDto> => {
	try {
		if (await checkUserToken(uid, token)) {
			const { collectionName, schemaInstance } = UserSettingsSchema
			type UserSettings = InferSchemaType<typeof schemaInstance>
			const getUserSettingsWhere: QueryType<UserSettings> = {
				uid,
			}
			const getUserSettingsSelect: SelectType<UserSettings> = {
				uid: 1,
				enableCookie: 1,
				themeType: 1,
				themeColor: 1,
				themeColorCustom: 1,
				wallpaper: 1,
				coloredSideBar: 1,
				dataSaverMode: 1,
				noSearchRecommendations: 1,
				noRelatedVideos: 1,
				noRecentSearch: 1,
				noViewHistory: 1,
				openInNewWindow: 1,
				currentLocale: 1,
				timezone: 1,
				unitSystemType: 1,
				devMode: 1,
				showCssDoodle: 1,
				sharpAppearanceMode: 1,
				flatAppearanceMode: 1,
				userPrivaryVisibilitiesSetting: 1,
				userLinkedAccountsVisibilitiesSetting: 1,
				userWebsitePrivacySetting: 1,
				editDateTime: 1,
			}
			try {
				const userSettingsResult = await selectDataFromMongoDB(getUserSettingsWhere, getUserSettingsSelect, schemaInstance, collectionName)
				const userSettings = userSettingsResult?.result?.[0]
				if (userSettingsResult?.success && userSettings) {
					return { success: true, message: 'User settings retrieved successfully!', userSettings }
				} else {
					console.error('ERROR', 'Failed to get user personal settings: query successful but data retrieval failed or data is empty:', { uid })
					return { success: false, message: 'Failed to get user personal settings: query unsuccessful' }
				}
			} catch (error) {
				console.error('ERROR', 'Exception when querying data for user personal settings:', error, { uid })
				return { success: false, message: 'Failed to get user personal settings: query error' }
			}
		} else {
			console.error('ERROR', 'Failed to get user personal settings: user verification failed:', { uid })
			return { success: false, message: 'Failed to get user personal settings: user verification failed' }
		}
	} catch (error) {
		console.error('ERROR', 'Exception when getting user personal settings:', error)
		return { success: false, message: 'Failed to get user personal settings: unknown error' }
	}
}

/**
 * Update or create user settings based on UID
 * @param updateOrCreateUserSettingsRequest Request parameters for updating or creating user settings
 * @param uid User ID
 * @param token User token
 * @returns Result of updating or creating user settings request
 */
export const updateOrCreateUserSettingsService = async (updateOrCreateUserSettingsRequest: UpdateOrCreateUserSettingsRequestDto, uid: number, token: string): Promise<UpdateOrCreateUserSettingsResponseDto> => {
	try {
		const now = new Date().getTime();
		if (await checkUserToken(uid, token)) {
			const UUID = await getUserUuid(uid) // DELETE ME This is a temporary workaround; UUID should be stored in cookies
			if (!UUID) {
				console.error('ERROR', 'Failed to update or create user settings: UUID does not exist', { updateOrCreateUserSettingsRequest, uid })
				return { success: false, message: 'Failed to update or create user settings: UUID does not exist' }
			}

			if (checkUpdateOrCreateUserSettingsRequest(updateOrCreateUserSettingsRequest)) {
				const { collectionName, schemaInstance } = UserSettingsSchema
				type UserSettings = InferSchemaType<typeof schemaInstance>
				const updateOrCreateUserSettingsWhere: QueryType<UserSettings> = {
					uid,
				}
				const updateOrCreateUserSettingsUpdate: UpdateType<UserSettings> = {
					...updateOrCreateUserSettingsRequest,
					userPrivaryVisibilitiesSetting: updateOrCreateUserSettingsRequest.userPrivaryVisibilitiesSetting as UserSettings['userPrivaryVisibilitiesSetting'], // TODO: Mongoose issue: #12420
					userLinkedAccountsVisibilitiesSetting: updateOrCreateUserSettingsRequest.userLinkedAccountsVisibilitiesSetting as UserSettings['userLinkedAccountsVisibilitiesSetting'], // TODO: Mongoose issue: #12420
					editDateTime: now
				}
				const updateResult = await findOneAndUpdateData4MongoDB(updateOrCreateUserSettingsWhere, updateOrCreateUserSettingsUpdate, schemaInstance, collectionName)
				const userSettings = updateResult?.result?.[0]
				if (updateResult?.success) {
					return { success: true, message: 'User settings updated or created successfully', userSettings: userSettings || updateOrCreateUserSettingsUpdate }
				} else {
					console.error('ERROR', 'Failed to update or create user settings: no user settings data returned', { updateOrCreateUserSettingsRequest, uid })
					return { success: false, message: 'Failed to update or create user settings: no user settings data returned' }
				}
			} else {
				console.error('ERROR', 'Failed to update or create user settings: necessary data not found, or invalid platform type for associated account:', { updateOrCreateUserSettingsRequest, uid })
				return { success: false, message: 'Failed to update or create user settings: necessary data is empty or platform information error' }
			}
		} else {
			console.error('ERROR', 'Failed to update or create user settings: invalid token verification, unauthorized user!', { updateOrCreateUserSettingsRequest, uid })
			return { success: false, message: 'Failed to update or create user settings: unauthorized user!' }
		}
	} catch (error) {
		console.error('ERROR', 'Exception when updating or creating user settings:', error)
		return { success: false, message: 'Failed to update or create user settings: unknown error' }
	}
}

/**
 * User verification
 * @param uid User ID, empty will cause verification failure
 * @param token User ID corresponding token, empty will cause verification failure
 * @returns Verification result
 */
export const checkUserTokenService = async (uid: number, token: string): Promise<CheckUserTokenResponseDto> => {
	try {
		if (uid !== undefined && uid !== null && token) {
			const checkUserTokenResult = await checkUserToken(uid, token)
			if (checkUserTokenResult) {
				return { success: true, message: 'User verification successful', userTokenOk: true }
			} else {
				console.error('ERROR', `User verification failed! Unauthorized user! User UID: ${uid}`)
				return { success: false, message: 'User verification failed! Unauthorized user!', userTokenOk: false }
			}
		} else {
			console.error('ERROR', `User verification failed! User uid or token does not exist, User UID: ${uid}`)
			return { success: false, message: 'User verification failed!', userTokenOk: false }
		}
	} catch {
		console.error('ERROR', `Exception when checking user verification! User UID: ${uid}`)
		return { success: false, message: 'User verification failed!', userTokenOk: false }
	}
}

/**
 * Check user token by UUID
 * @param UUID User UUID
 * @param token User ID corresponding token, empty will cause verification failure
 * @returns Verification result
 */
export const checkUserTokenByUuidService = async (UUID: string, token: string): Promise<CheckUserTokenResponseDto> => {
	try {
		if (UUID !== undefined && UUID !== null && token) {
			const checkUserTokenResult = await checkUserTokenByUUID(UUID, token)
			if (checkUserTokenResult) {
				return { success: true, message: 'User verification successful', userTokenOk: true }
			} else {
				console.error('ERROR', `User verification failed! Unauthorized user! User UUID: ${UUID}`)
				return { success: false, message: 'User verification failed! Unauthorized user!', userTokenOk: false }
			}
		} else {
			console.error('ERROR', `User verification failed! User UUID or token does not exist, User UUID: ${UUID}`)
			return { success: false, message: 'User verification failed!', userTokenOk: false }
		}
	} catch {
		console.error('ERROR', `Exception when checking user verification! User UUID: ${UUID}`)
		return { success: false, message: 'User verification failed!', userTokenOk: false }
	}
}

/**
 * Request to send verification code
 * @param requestSendVerificationCodeRequest Request parameters for sending verification code
 * @returns Response for sending verification code request
 */
export const RequestSendVerificationCodeService = async (requestSendVerificationCodeRequest: RequestSendVerificationCodeRequestDto): Promise<RequestSendVerificationCodeResponseDto> => {
	try {
		if (checkRequestSendVerificationCodeRequest(requestSendVerificationCodeRequest)) {
			const { email, clientLanguage } = requestSendVerificationCodeRequest
			const emailLowerCase = email.toLowerCase()
			const nowTime = new Date().getTime()
			const todayStart = new Date()
			todayStart.setHours(0, 0, 0, 0)
			const { collectionName, schemaInstance } = UserVerificationCodeSchema
			type UserVerificationCode = InferSchemaType<typeof schemaInstance>
			const requestSendVerificationCodeWhere: QueryType<UserVerificationCode> = {
				emailLowerCase,
			}

			const requestSendVerificationCodeSelect: SelectType<UserVerificationCode> = {
				emailLowerCase: 1, // User email
				attemptsTimes: 1,
				lastRequestDateTime: 1, // Time of last request for verification code, used to prevent abuse
			}

			// Start transaction
			const session = await mongoose.startSession()
			session.startTransaction()

			try {
				const requestSendVerificationCodeResult = await selectDataFromMongoDB<UserVerificationCode>(requestSendVerificationCodeWhere, requestSendVerificationCodeSelect, schemaInstance, collectionName, { session })
				if (requestSendVerificationCodeResult.success) {
					const lastRequestDateTime = requestSendVerificationCodeResult.result?.[0]?.lastRequestDateTime ?? 0
					const attemptsTimes = requestSendVerificationCodeResult.result?.[0]?.attemptsTimes ?? 0
					if (requestSendVerificationCodeResult.result.length === 0 || lastRequestDateTime + 55000 < nowTime) { // Frontend 60 seconds, backend 55 seconds
						const lastRequestDate = new Date(lastRequestDateTime)
						if (requestSendVerificationCodeResult.result.length === 0 || todayStart > lastRequestDate || attemptsTimes < 5) { // ! Five chances per day
							const verificationCode = generateSecureVerificationNumberCode(6) // Generate six-digit random verification code
							let newAttemptsTimes = attemptsTimes + 1
							if (todayStart > lastRequestDate) {
								newAttemptsTimes = 0
							}

							const requestSendVerificationCodeUpdate: UserVerificationCode = {
								emailLowerCase,
								verificationCode,
								overtimeAt: nowTime + 1800000, // Current time plus 1800000 milliseconds (30 minutes) as new expiration time
								attemptsTimes: newAttemptsTimes,
								lastRequestDateTime: nowTime,
								editDateTime: nowTime,
							}
							const updateResult = await findOneAndUpdateData4MongoDB(requestSendVerificationCodeWhere, requestSendVerificationCodeUpdate, schemaInstance, collectionName, { session })
							if (updateResult.success) {
								try {
									const mail = getI18nLanguagePack(clientLanguage, "SendVerificationCode")
									const correctMailTitle = mail?.mailTitle
									const correctMailHTML = mail?.mailHtml?.replaceAll('{{verificationCode}}', verificationCode)

									const sendMailResult = await sendMail(email, correctMailTitle, { html: correctMailHTML })

									if (sendMailResult.success) {
										await session.commitTransaction()
										session.endSession()
										return { success: true, isTimeout: false, message: 'Verification code has been sent to the email you used for registration; please check your inbox. If you haven\'t received it, please check your spam folder or contact KIRAKIRA customer support.' }
									} else {
										if (session.inTransaction()) {
											await session.abortTransaction()
										}
										session.endSession()
										console.error('ERROR', 'Failed to send verification code: email sending failed')
										return { success: false, isTimeout: true, message: 'Failed to send verification code: email sending failed' }
									}
								} catch (error) {
									if (session.inTransaction()) {
										await session.abortTransaction()
									}
									session.endSession()
									console.error('ERROR', 'Failed to send verification code: error when sending email:', error)
									return { success: false, isTimeout: true, message: 'Failed to send verification code: error when sending email' }
								}
							} else {
								if (session.inTransaction()) {
									await session.abortTransaction()
								}
								session.endSession()
								console.error('ERROR', 'Failed to send verification code: failed to update or add user verification code')
								return { success: false, isTimeout: false, message: 'Failed to send verification code: failed to update or add user verification code' }
							}
						} else {
							if (session.inTransaction()) {
								await session.abortTransaction()
							}
							session.endSession()
							console.warn('WARN', 'WARNING', 'Failed to send verification code: exceeded daily repetition limit, please try again later')
							return { success: true, isTimeout: true, message: 'Failed to send verification code: exceeded daily repetition limit, please try again later' }
						}
					} else {
						if (session.inTransaction()) {
							await session.abortTransaction()
						}
						session.endSession()
						console.warn('WARN', 'WARNING', 'Failed to send verification code: not exceeded email timeout, please try again later')
						return { success: true, isTimeout: true, message: 'Failed to send verification code: not exceeded email timeout, please try again later' }
					}
				} else {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.error('ERROR', 'Failed to send verification code: failed to get verification code')
					return { success: false, isTimeout: false, message: 'Failed to send verification code: failed to get verification code' }
				}
			} catch (error) {
				if (session.inTransaction()) {
					await session.abortTransaction()
				}
				session.endSession()
				console.error('ERROR', 'Failed to send verification code: error when checking email timeout:', error)
				return { success: false, isTimeout: false, message: 'Failed to send verification code: error when checking email timeout' }
			}
		} else {
			console.error('ERROR', 'Failed to send verification code: invalid parameters')
			return { success: false, isTimeout: false, message: 'Failed to send verification code: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Failed to send verification code: unknown error', error)
		return { success: false, isTimeout: false, message: 'Failed to send verification code: unknown error' }
	}
}

/**
 * Generate invitation code
 * @param uid User requesting invitation code
 * @param token User token for generating invitation code
 * @returns Generated invitation code
 */
export const createInvitationCodeService = async (uid: number, token: string): Promise<CreateInvitationCodeResponseDto> => {
	try {
		if (await checkUserToken(uid, token)) {
			const UUID = await getUserUuid(uid) // DELETE ME This is a temporary workaround; UUID should be stored in cookies
			if (!UUID) {
				console.error('ERROR', 'Failed to generate invitation code: UUID does not exist', { uid })
				return { success: false, isCoolingDown: false, message: 'Failed to generate invitation code: UUID does not exist' }
			}

			const nowTime = new Date().getTime()
			const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000 // Convert seven days to milliseconds
			const { collectionName, schemaInstance } = UserInvitationCodeSchema
			type UserInvitationCode = InferSchemaType<typeof schemaInstance>
			const userInvitationCodeWhere: QueryType<UserInvitationCode> = {
				creatorUid: uid,
				generationDateTime: { $gt: nowTime - sevenDaysInMillis },
			}

			const userInvitationCodeSelect: SelectType<UserInvitationCode> = {
				creatorUid: 1,
			}

			try {
				const userInvitationCodeSelectResult = await selectDataFromMongoDB<UserInvitationCode>(userInvitationCodeWhere, userInvitationCodeSelect, schemaInstance, collectionName)

				// Check if user's last creation time is within seven days
				try {
					const getSelfUserInfoRequest: GetSelfUserInfoRequestDto = {
						uid,
						token,
					}
					const selfUserInfo = await getSelfUserInfoService(getSelfUserInfoRequest)
					if (!selfUserInfo.success || selfUserInfo.result.userCreateDateTime > nowTime - sevenDaysInMillis) {
						console.warn('WARN', 'WARNING', 'Failed to generate invitation code: not expired invitation code generation period, cooling down (first attempt)', { uid })
						return { success: true, isCoolingDown: true, message: 'Failed to generate invitation code: not expired invitation code generation period, cooling down (first attempt)' }
					}
				} catch (error) {
					console.warn('WARN', 'WARNING', 'Failed to generate invitation code: error when querying user information:', error, { uid })
					return { success: false, isCoolingDown: false, message: 'Failed to generate invitation code: error when querying user information' }
				}

				if (userInvitationCodeSelectResult.success && userInvitationCodeSelectResult.result?.length === 0) { // If no invitation code was found for the day, an invitation code can be generated.
					try {
						const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
						let finalInvitationCode = ''
						while (true) { // Continuously generate invitation codes until a unique one is generated
							const invitationCodePart1 = generateSecureVerificationStringCode(4, charset)
							const invitationCodePart2 = generateSecureVerificationStringCode(4, charset)
							const newInvitationCode = `KIRA-${invitationCodePart1}-${invitationCodePart2}`

							const userInvitationCodeDuplicationCheckWhere: QueryType<UserInvitationCode> = {
								invitationCode: newInvitationCode,
							}

							const userInvitationCodeDuplicationCheckSelect: SelectType<UserInvitationCode> = {
								creatorUid: 1,
							}

							const userInvitationCodeDuplicationCheckResult = await selectDataFromMongoDB<UserInvitationCode>(userInvitationCodeDuplicationCheckWhere, userInvitationCodeDuplicationCheckSelect, schemaInstance, collectionName)
							const noSame = userInvitationCodeDuplicationCheckResult.result?.length === 0
							if (noSame) {
								finalInvitationCode = newInvitationCode
								break
							}
						}

						if (finalInvitationCode) {
							const userInvitationCode: UserInvitationCode = {
								creatorUUID: UUID,
								creatorUid: uid,
								isPending: false,
								disabled: false,
								invitationCode: finalInvitationCode,
								generationDateTime: nowTime,
								editDateTime: nowTime,
								createDateTime: nowTime,
							}

							try {
								const insertResult = await insertData2MongoDB(userInvitationCode, schemaInstance, collectionName)
								if (insertResult.success) {
									return { success: true, isCoolingDown: false, message: 'Invitation code generated successfully', invitationCodeResult: userInvitationCode }
								} else {
									console.error('ERROR', 'Failed to store invitation code:', { uid })
									return { success: false, isCoolingDown: false, message: 'Failed to store invitation code' }
								}
							} catch (error) {
								console.error('ERROR', 'Failed to store invitation code:', error, { uid })
								return { success: false, isCoolingDown: false, message: 'Failed to store invitation code' }
							}
						} else {
							console.error('ERROR', 'Failed to generate unique new invitation code:', { uid })
							return { success: false, isCoolingDown: false, message: 'Failed to generate unique new invitation code' }
						}
					} catch (error) {
						console.error('ERROR', 'Failed to generate unique new invitation code:', error, { uid })
						return { success: false, isCoolingDown: false, message: 'Failed to generate unique new invitation code' }
					}
				} else {
					console.warn('WARN', 'WARNING', 'Failed to generate invitation code: not expired invitation code generation period, cooling down', { uid })
					return { success: true, isCoolingDown: true, message: 'Failed to generate invitation code: not expired invitation code generation period, cooling down' }
				}
			} catch (error) {
				console.error('ERROR', 'Failed to check if invitation code generation period has expired:', error, { uid })
				return { success: false, isCoolingDown: true, message: 'Failed to check if invitation code generation period has expired' }
			}
		} else {
			console.error('ERROR', 'Failed to generate invitation code: unauthorized user!', { uid })
			return { success: false, isCoolingDown: false, message: 'Failed to generate invitation code: unauthorized user!' }
		}
	} catch (error) {
		console.error('ERROR', 'Failed to generate invitation code: unknown error', error)
		return { success: false, isCoolingDown: false, message: 'Failed to generate invitation code: unknown error' }
	}
}

/**
 * Get list of own invitation codes
 * @param uid User UID
 * @param token User token
 * @returns Result of getting list of own invitation codes request
 */
export const getMyInvitationCodeService = async (uid: number, token: string): Promise<GetMyInvitationCodeResponseDto> => {
	try {
		if (await checkUserToken(uid, token)) {
			const { collectionName, schemaInstance } = UserInvitationCodeSchema
			type UserInvitationCode = InferSchemaType<typeof schemaInstance>
			const myInvitationCodeWhere: QueryType<UserInvitationCode> = {
				creatorUid: uid,
			}

			const myInvitationCodeSelect: SelectType<UserInvitationCode> = {
				creatorUid: 1,
				invitationCode: 1,
				generationDateTime: 1,
				isPending: 1,
				assignee: 1,
				usedDateTime: 1,
			}

			try {
				const myInvitationCodeResult = await selectDataFromMongoDB<UserInvitationCode>(myInvitationCodeWhere, myInvitationCodeSelect, schemaInstance, collectionName)
				if (myInvitationCodeResult.success) {
					if (myInvitationCodeResult.result?.length >= 0) {
						return { success: true, message: 'Invitation code list retrieved successfully', invitationCodeResult: myInvitationCodeResult.result }
					} else {
						return { success: true, message: 'Own invitation code list is empty', invitationCodeResult: [] }
					}
				} else {
					console.error('ERROR', 'Failed to retrieve own invitation codes:', { uid })
					return { success: false, message: 'Failed to retrieve own invitation codes!', invitationCodeResult: [] }
				}
			} catch (error) {
				console.error('ERROR', 'Failed to retrieve own invitation codes:', { uid, error })
				return { success: false, message: 'Failed to retrieve own invitation codes!', invitationCodeResult: [] }
			}
		} else {
			console.error('ERROR', 'Failed to retrieve own invitation codes: unauthorized user!', { uid })
			return { success: false, message: 'Failed to retrieve own invitation codes: unauthorized user!', invitationCodeResult: [] }
		}
	} catch (error) {
		console.error('ERROR', 'Failed to retrieve own invitation codes: unknown error', error)
		return { success: false, message: 'Failed to retrieve own invitation codes: unknown error', invitationCodeResult: [] }
	}
}

/**
 * Register using invitation code
 * @param userInvitationCodeDto Parameters for registering using invitation code
 * @returns Result of registering using invitation code
 */
const useInvitationCode = async (useInvitationCodeDto: UseInvitationCodeDto): Promise<UseInvitationCodeResultDto> => {
	try {
		if (checkUseInvitationCodeDto(useInvitationCodeDto)) {
			const nowTime = new Date().getTime()
			const { collectionName, schemaInstance } = UserInvitationCodeSchema
			type UserInvitationCode = InferSchemaType<typeof schemaInstance>

			const useInvitationCodeWhere: QueryType<UserInvitationCode> = {
				invitationCode: useInvitationCodeDto.invitationCode,
				assignee: undefined,
				disabled: false,
			}
			const useInvitationCodeUpdate: UpdateType<UserInvitationCode> = {
				assignee: useInvitationCodeDto.registrantUid,
				assigneeUUID: useInvitationCodeDto.registrantUUID,
				usedDateTime: nowTime,
				editDateTime: nowTime,
			}

			try {
				const updateResult = await findOneAndUpdateData4MongoDB(useInvitationCodeWhere, useInvitationCodeUpdate, schemaInstance, collectionName)
				if (updateResult.success) {
					return { success: true, message: 'Invitation code used for registration' }
				} else {
					console.error('ERROR', 'Failed to use invitation code for registration: failed to update inviter')
					return { success: false, message: 'Failed to use invitation code for registration: failed to update inviter' }
				}
			} catch (error) {
				console.error('ERROR', 'Failed to use invitation code for registration: exception while updating inviter:', error)
				return { success: false, message: 'Failed to use invitation code for registration: exception while updating inviter' }
			}
		} else {
			console.error('ERROR', 'Failed to use invitation code for registration: invalid parameters')
			return { success: false, message: 'Failed to use invitation code for registration: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Failed to use invitation code for registration: unknown error', error)
		return { success: false, message: 'Failed to use invitation code for registration: unknown error' }
	}
}

/**
 * Check if an invitation code is available
 * @param checkInvitationCodeRequestDto Request payload for checking if an invitation code is available
 * @returns Response for checking if an invitation code is available request
 */
export const checkInvitationCodeService = async (checkInvitationCodeRequestDto: CheckInvitationCodeRequestDto): Promise<CheckInvitationCodeResponseDto> => {
	try {
		if (checkCheckInvitationCodeRequestDto(checkInvitationCodeRequestDto)) {
			const { collectionName, schemaInstance } = UserInvitationCodeSchema
			type UserInvitationCode = InferSchemaType<typeof schemaInstance>
			const checkInvitationCodeWhere: QueryType<UserInvitationCode> = {
				invitationCode: checkInvitationCodeRequestDto.invitationCode,
				assignee: undefined,
				disabled: false,
			}

			const checkInvitationCodeSelect: SelectType<UserInvitationCode> = {
				invitationCode: 1,
			}

			try {
				const checkInvitationCodeResult = await selectDataFromMongoDB<UserInvitationCode>(checkInvitationCodeWhere, checkInvitationCodeSelect, schemaInstance, collectionName)
				if (checkInvitationCodeResult.success) {
					if (checkInvitationCodeResult.result?.length === 1) {
						return { success: true, isAvailableInvitationCode: true, message: 'Invitation code check passed' }
					} else {
						return { success: true, isAvailableInvitationCode: false, message: 'Invitation code check failed' }
					}
				} else {
					console.error('ERROR', 'Failed to check availability of invitation code: request failed')
					return { success: false, isAvailableInvitationCode: false, message: 'Failed to check availability of invitation code: request failed!' }
				}
			} catch (error) {
				console.error('ERROR', 'Failed to check availability of invitation code: request error', error)
				return { success: false, isAvailableInvitationCode: false, message: 'Failed to check availability of invitation code: request error!' }
			}
		} else {
			console.error('ERROR', 'Failed to check availability of invitation code: invalid parameters')
			return { success: false, isAvailableInvitationCode: false, message: 'Failed to check availability of invitation code: invalid parameters' }
		}
	} catch (error) {
		console.error('ERROR', 'Failed to check availability of invitation code: unknown error', error)
		return { success: false, isAvailableInvitationCode: false, message: 'Failed to check availability of invitation code: unknown error' }
	}
}

/**
 * Admin query user by invitation code
 * @param invitationCode Invitation code
 * @param AdminUUID Admin UUID
 * @param AdminToken Admin token
 */
export const adminGetUserByInvitationCodeService = async (invitationCode: string, AdminUUID: string, AdminToken: string): Promise<AdminGetUserByInvitationCodeResponseDto> => {
	try {
		if (!invitationCode || !AdminUUID || !AdminToken) {
			console.error('ERROR', 'Failed to query user by invitation code: invalid parameters')
			return { success: false, message: 'Failed to query user by invitation code: invalid parameters', userInfoResult: {} }
		}
		if (!(await checkUserTokenByUuidService(AdminUUID, AdminToken)).success) {
			console.error('ERROR', 'Failed to query user by invitation code: admin verification failed')
			return { success: false, message: 'Failed to query user by invitation code: admin verification failed', userInfoResult: {} }
		}

		const checkInvitationCode = await checkInvitationCodeService({ invitationCode })
		if (!checkInvitationCode.success || !!checkInvitationCode.isAvailableInvitationCode) {
			console.error('ERROR', 'Failed to query user by invitation code: invitation code not available', { invitationCode })
			return { success: false, message: 'Failed to query user by invitation code: invitation code not available', userInfoResult: {} }
		}

		const { collectionName, schemaInstance } = UserInvitationCodeSchema
		type UserInvitationCode = InferSchemaType<typeof schemaInstance>
		const userInvitationCodeWhere: QueryType<UserInvitationCode> = {
			invitationCode,
		}
		const userInvitationCodeSelect: SelectType<UserInvitationCode> = {
			assignee: 1,
			assigneeUUID: 1,
		}

		const userInvitationCodeResult = await selectDataFromMongoDB<UserInvitationCode>(userInvitationCodeWhere, userInvitationCodeSelect, schemaInstance, collectionName)
		const userInvitationCodeData = userInvitationCodeResult.result?.[0]
		if (!userInvitationCodeResult.success) {
			console.error('ERROR', 'Failed to query user by invitation code: query failed')
			return { success: false, message: 'Failed to query user by invitation code: query failed', userInfoResult: {} }
		}
		if (!userInvitationCodeData || !userInvitationCodeData.assignee || !userInvitationCodeData.assigneeUUID) {
			console.error('ERROR', 'Failed to query user by invitation code: user information not found', { invitationCode })
			return { success: false, message: 'Failed to query user by invitation code: user information not found', userInfoResult: {} }
		}
		return { success: true, message: 'Admin successfully queried user by invitation code', userInfoResult: { uid: userInvitationCodeData?.assignee, uuid: userInvitationCodeData?.assigneeUUID} }

	} catch (error) {
		console.error('ERROR', 'Failed to query user by invitation code: unknown error', error)
		return { success: false, message: 'Failed to query user by invitation code: unknown error', userInfoResult: {} }
	}
}

/**
 * Request to send verification code for changing email
 * @param requestSendChangeEmailVerificationCodeRequest Request payload for sending verification code for changing email
 * @param uid User UID
 * @param token User token
 * @returns Response for sending verification code for changing email request
 */
export const requestSendChangeEmailVerificationCodeService = async (requestSendChangeEmailVerificationCodeRequest: RequestSendChangeEmailVerificationCodeRequestDto, uid: number, token: string): Promise<RequestSendChangeEmailVerificationCodeResponseDto> => {
	try {
		if (await checkUserToken(uid, token)) {
			if (checkRequestSendChangeEmailVerificationCodeRequest(requestSendChangeEmailVerificationCodeRequest)) {
				const { clientLanguage, newEmail } = requestSendChangeEmailVerificationCodeRequest
				try {
					if (newEmail) {
						const emailLowerCase = newEmail.toLowerCase()
						const nowTime = new Date().getTime()
						const todayStart = new Date()
						todayStart.setHours(0, 0, 0, 0)
						const { collectionName, schemaInstance } = UserChangeEmailVerificationCodeSchema
						type UserVerificationCode = InferSchemaType<typeof schemaInstance>
						const requestSendVerificationCodeWhere: QueryType<UserVerificationCode> = {
							emailLowerCase,
						}

						const requestSendVerificationCodeSelect: SelectType<UserVerificationCode> = {
							emailLowerCase: 1, // user email
							attemptsTimes: 1,
							lastRequestDateTime: 1, // Time of last request for verification code, used to prevent abuse
						}

						// Start transaction
						const session = await mongoose.startSession()
						session.startTransaction()

						try {
							const requestSendVerificationCodeResult = await selectDataFromMongoDB<UserVerificationCode>(requestSendVerificationCodeWhere, requestSendVerificationCodeSelect, schemaInstance, collectionName, { session })
							if (requestSendVerificationCodeResult.success) {
								const lastRequestDateTime = requestSendVerificationCodeResult.result?.[0]?.lastRequestDateTime ?? 0
								const attemptsTimes = requestSendVerificationCodeResult.result?.[0]?.attemptsTimes ?? 0
								if (requestSendVerificationCodeResult.result.length === 0 || lastRequestDateTime + 55000 < nowTime) { // Frontend 60 seconds, backend 55 seconds
									const lastRequestDate = new Date(lastRequestDateTime)
									if (requestSendVerificationCodeResult.result.length === 0 || todayStart > lastRequestDate || attemptsTimes < 10) { // ! Ten chances per day
										const verificationCode = generateSecureVerificationNumberCode(6) // Generate six-digit random verification code
										let newAttemptsTimes = attemptsTimes + 1
										if (todayStart > lastRequestDate) {
											newAttemptsTimes = 0
										}

										const requestSendVerificationCodeUpdate: UserVerificationCode = {
											emailLowerCase,
											verificationCode,
											overtimeAt: nowTime + 1800000, // Current time plus 1800000 milliseconds (30 minutes) as new expiration time
											attemptsTimes: newAttemptsTimes,
											lastRequestDateTime: nowTime,
											editDateTime: nowTime,
										}
										const updateResult = await findOneAndUpdateData4MongoDB(requestSendVerificationCodeWhere, requestSendVerificationCodeUpdate, schemaInstance, collectionName, { session })
										if (updateResult.success) {
											try {
												const mail = getI18nLanguagePack(clientLanguage, "SendChangeEmailVerificationCode")
												const correctMailTitle = mail?.mailTitle
												const correctMailHTML = mail?.mailHtml?.replaceAll('{{verificationCode}}', verificationCode)

												const sendMailResult = await sendMail(newEmail, correctMailTitle, { html: correctMailHTML })

												if (sendMailResult.success) {
													await session.commitTransaction()
													session.endSession()
													return { success: true, isCoolingDown: false, message: 'Verification code for changing email has been sent to the email you used for registration; please check your inbox. If you haven\'t received it, please check your spam folder or contact KIRAKIRA customer support.' }
												} else {
													if (session.inTransaction()) {
														await session.abortTransaction()
													}
													session.endSession()
													console.error('ERROR', 'Failed to send verification code for changing email: email sending failed')
													return { success: false, isCoolingDown: true, message: 'Failed to send verification code for changing email: email sending failed' }
												}
											} catch (error) {
												if (session.inTransaction()) {
													await session.abortTransaction()
												}
												session.endSession()
												console.error('ERROR', 'Failed to send verification code for changing email: error when sending email:', error)
												return { success: false, isCoolingDown: true, message: 'Failed to send verification code for changing email: error when sending email' }
											}
										} else {
											if (session.inTransaction()) {
												await session.abortTransaction()
											}
											session.endSession()
											console.error('ERROR', 'Failed to send verification code for changing email: failed to update or add user verification code')
											return { success: false, isCoolingDown: false, message: 'Failed to send verification code for changing email: failed to update or add user verification code' }
										}
									} else {
										if (session.inTransaction()) {
											await session.abortTransaction()
										}
										session.endSession()
										console.warn('WARN', 'WARNING', 'Failed to send verification code for changing email: exceeded daily retry limit, please try again later')
										return { success: true, isCoolingDown: true, message: 'Failed to send verification code for changing email: exceeded daily retry limit, please try again later' }
									}
								} else {
									if (session.inTransaction()) {
										await session.abortTransaction()
									}
									session.endSession()
									console.warn('WARN', 'WARNING', 'Failed to send verification code for changing email: not exceeded email timeout, please try again later')
									return { success: true, isCoolingDown: true, message: 'Failed to send verification code for changing email: not exceeded email timeout, please try again later' }
								}
							} else {
								if (session.inTransaction()) {
									await session.abortTransaction()
								}
								session.endSession()
								console.error('ERROR', 'Failed to send verification code for changing email: failed to get verification code')
								return { success: false, isCoolingDown: false, message: 'Failed to send verification code for changing email: failed to get verification code' }
							}
						} catch (error) {
							if (session.inTransaction()) {
								await session.abortTransaction()
							}
							session.endSession()
							console.error('ERROR', 'Failed to send verification code for changing email: error when checking email timeout:', error)
							return { success: false, isCoolingDown: false, message: 'Failed to send verification code for changing email: error when checking email timeout' }
						}
					} else {
						console.error('ERROR', 'Failed to retrieve old email for changing email:', { uid })
						return { success: false, isCoolingDown: false, message: 'Failed to retrieve old email for changing email' }
					}
				} catch (error) {
					console.error('ERROR', 'Failed to retrieve old email for changing email:', error, { uid })
					return { success: false, isCoolingDown: false, message: 'Failed to retrieve old email for changing email' }
				}
			} else {
				console.error('ERROR', 'Failed to send verification code for changing email: invalid parameters!', { uid })
				return { success: false, isCoolingDown: false, message: 'Failed to send verification code for changing email: invalid parameters!' }
			}
		} else {
			console.error('ERROR', 'Failed to send verification code for changing email: unauthorized user!', { uid })
			return { success: false, isCoolingDown: false, message: 'Failed to send verification code for changing email: unauthorized user!' }
		}
	} catch (error) {
		console.error('ERROR', 'Failed to send verification code for changing email: unknown error', error)
		return { success: false, isCoolingDown: false, message: 'Failed to send verification code for changing email: unknown error' }
	}
}

/**
 * Request to send verification code for changing password
 * @param requestSendChangePasswordVerificationCodeRequest Request payload for sending verification code for changing password
 * @param uid User UID
 * @param token User token
 * @returns Response for sending verification code for changing password request
 */
export const requestSendChangePasswordVerificationCodeService = async (requestSendChangePasswordVerificationCodeRequest: RequestSendChangePasswordVerificationCodeRequestDto, uid: number, token: string): Promise<RequestSendChangePasswordVerificationCodeResponseDto> => {
	try {
		if (await checkUserToken(uid, token)) {
			const UUID = await getUserUuid(uid) // DELETE ME This is a temporary workaround; UUID should be stored in cookies
			if (!UUID) {
				console.error('ERROR', 'Failed to request verification code for changing password: UUID does not exist', { uid })
				return { success: false, isCoolingDown: false, message: 'Failed to request verification code for changing password: UUID does not exist' }
			}

			if (checkRequestSendChangePasswordVerificationCodeRequest(requestSendChangePasswordVerificationCodeRequest)) {
				const { clientLanguage } = requestSendChangePasswordVerificationCodeRequest
				try {
					const getSelfUserInfoRequest = {
						uid,
						token,
					}
					const selfUserInfoResult = await getSelfUserInfoService(getSelfUserInfoRequest)
					const email = selfUserInfoResult.result.email
					if (selfUserInfoResult.success && email) {
						const emailLowerCase = email.toLowerCase()
						const nowTime = new Date().getTime()
						const todayStart = new Date()
						todayStart.setHours(0, 0, 0, 0)
						const { collectionName, schemaInstance } = UserChangePasswordVerificationCodeSchema
						type UserChangePasswordVerificationCode = InferSchemaType<typeof schemaInstance>
						const requestSendVerificationCodeWhere: QueryType<UserChangePasswordVerificationCode> = {
							emailLowerCase,
						}

						const requestSendVerificationCodeSelect: SelectType<UserChangePasswordVerificationCode> = {
							emailLowerCase: 1, // User email
							attemptsTimes: 1,
							lastRequestDateTime: 1, // Time of last request for verification code, used to prevent abuse
						}

						// Start transaction
						const session = await mongoose.startSession()
						session.startTransaction()

						try {
							const requestSendVerificationCodeResult = await selectDataFromMongoDB<UserChangePasswordVerificationCode>(requestSendVerificationCodeWhere, requestSendVerificationCodeSelect, schemaInstance, collectionName, { session })
							if (requestSendVerificationCodeResult.success) {
								const lastRequestDateTime = requestSendVerificationCodeResult.result?.[0]?.lastRequestDateTime ?? 0
								const attemptsTimes = requestSendVerificationCodeResult.result?.[0]?.attemptsTimes ?? 0
								if (requestSendVerificationCodeResult.result.length === 0 || lastRequestDateTime + 55000 < nowTime) { // Frontend 60 seconds, backend 55 seconds
									const lastRequestDate = new Date(lastRequestDateTime)
									if (requestSendVerificationCodeResult.result.length === 0 || todayStart > lastRequestDate || attemptsTimes < 3) { // ! Three chances per day
										const verificationCode = generateSecureVerificationNumberCode(6) // Generate six-digit random verification code
										let newAttemptsTimes = attemptsTimes + 1
										if (todayStart > lastRequestDate) {
											newAttemptsTimes = 0
										}

										const requestSendVerificationCodeUpdate: UserChangePasswordVerificationCode = {
											UUID,
											uid,
											emailLowerCase,
											verificationCode,
											overtimeAt: nowTime + 1800000, // Current time plus 1800000 milliseconds (30 minutes) as new expiration time
											attemptsTimes: newAttemptsTimes,
											lastRequestDateTime: nowTime,
											editDateTime: nowTime,
										}
										const updateResult = await findOneAndUpdateData4MongoDB(requestSendVerificationCodeWhere, requestSendVerificationCodeUpdate, schemaInstance, collectionName, { session })
										if (updateResult.success) {
											try {
												const mail = getI18nLanguagePack(clientLanguage, "SendChangePasswordVerificationCode")
												const correctMailTitle = mail?.mailTitle
												const correctMailHTML = mail?.mailHtml?.replaceAll('{{verificationCode}}', verificationCode)

												const sendMailResult = await sendMail(email, correctMailTitle, { html: correctMailHTML })

												if (sendMailResult.success) {
													await session.commitTransaction()
													session.endSession()
													return { success: true, isCoolingDown: false, message: 'Verification code for changing password has been sent to the email you used for registration; please check your inbox. If you haven\'t received it, please check your spam folder or contact KIRAKIRA customer support.' }
												} else {
													if (session.inTransaction()) {
														await session.abortTransaction()
													}
													session.endSession()
													console.error('ERROR', 'Failed to send verification code for changing password: email sending failed')
													return { success: false, isCoolingDown: true, message: 'Failed to send verification code for changing password: email sending failed' }
												}
											} catch (error) {
												if (session.inTransaction()) {
													await session.abortTransaction()
												}
												session.endSession()
												console.error('ERROR', 'Failed to send verification code for changing password: error when sending email:', error)
												return { success: false, isCoolingDown: true, message: 'Failed to send verification code for changing password: error when sending email' }
											}
										} else {
											if (session.inTransaction()) {
												await session.abortTransaction()
											}
											session.endSession()
											console.error('ERROR', 'Failed to send verification code for changing password: failed to update or add user verification code')
											return { success: false, isCoolingDown: false, message: 'Failed to send verification code for changing password: failed to update or add user verification code' }
										}
									} else {
										if (session.inTransaction()) {
											await session.abortTransaction()
										}
										session.endSession()
										console.warn('WARN', 'WARNING', 'Failed to send verification code for changing password: exceeded daily retry limit, please try again later')
										return { success: true, isCoolingDown: true, message: 'Failed to send verification code for changing password: exceeded daily retry limit, please try again later' }
									}
								} else {
									if (session.inTransaction()) {
										await session.abortTransaction()
									}
									session.endSession()
									console.warn('WARN', 'WARNING', 'Failed to send verification code for changing password: not exceeded email timeout, please try again later')
									return { success: true, isCoolingDown: true, message: 'Failed to send verification code for changing password: not exceeded email timeout, please try again later' }
								}
							} else {
								if (session.inTransaction()) {
									await session.abortTransaction()
								}
								session.endSession()
								console.error('ERROR', 'Failed to send verification code for changing password: failed to get verification code')
								return { success: false, isCoolingDown: false, message: 'Failed to send verification code for changing password: failed to get verification code' }
							}
						} catch (error) {
							if (session.inTransaction()) {
								await session.abortTransaction()
							}
							session.endSession()
							console.error('ERROR', 'Failed to send verification code for changing password: error when checking email timeout:', error)
							return { success: false, isCoolingDown: false, message: 'Failed to send verification code for changing password: error when checking email timeout' }
						}
					} else {
						console.error('ERROR', 'Failed to retrieve old email for changing password:', { uid })
						return { success: false, isCoolingDown: false, message: 'Failed to retrieve old email for changing password' }
					}
				} catch (error) {
					console.error('ERROR', 'Failed to retrieve old email for changing password:', error, { uid })
					return { success: false, isCoolingDown: false, message: 'Failed to retrieve old email for changing password' }
				}
			} else {
				console.error('ERROR', 'Failed to send verification code for changing password: invalid parameters!', { uid })
				return { success: false, isCoolingDown: false, message: 'Failed to send verification code for changing password: invalid parameters!' }
			}
		} else {
			console.error('ERROR', 'Failed to send verification code for changing password: unauthorized user!', { uid })
			return { success: false, isCoolingDown: false, message: 'Failed to send verification code for changing password: unauthorized user!' }
		}
	} catch (error) {
		console.error('ERROR', 'Failed to send verification code for changing password: unknown error', error)
		return { success: false, isCoolingDown: false, message: 'Failed to send verification code for changing password: unknown error' }
	}
}

/**
 * Update password
 * @param updateUserPasswordRequest Request payload for updating password
 * @param uid User UID
 * @param token User token
 * @returns Response for updating password request
 */
export const changePasswordService = async (updateUserPasswordRequest: UpdateUserPasswordRequestDto, uid: number, token: string): Promise<UpdateUserPasswordResponseDto> => {
	try {
		if (checkUpdateUserPasswordRequest(updateUserPasswordRequest)) {
			if (await checkUserToken(uid, token)) {
				const { oldPasswordHash, newPasswordHash, verificationCode } = updateUserPasswordRequest
				const now = new Date().getTime()

				const { collectionName: userChangePasswordVerificationCodeCollectionName, schemaInstance: userChangePasswordVerificationCodeInstance } = UserChangePasswordVerificationCodeSchema
				type UserChangePasswordVerificationCode = InferSchemaType<typeof userChangePasswordVerificationCodeInstance>

				const userChangePasswordVerificationCodeWhere: QueryType<UserChangePasswordVerificationCode> = {
					uid,
					verificationCode,
					overtimeAt: { $gte: now },
				}
				const userChangePasswordVerificationCodeSelect: SelectType<UserChangePasswordVerificationCode> = {
					emailLowerCase: 1, // User email
				}

				// Start transaction
				const session = await mongoose.startSession()
				session.startTransaction()

				try {
					const verificationCodeResult = await selectDataFromMongoDB<UserChangePasswordVerificationCode>(userChangePasswordVerificationCodeWhere, userChangePasswordVerificationCodeSelect, userChangePasswordVerificationCodeInstance, userChangePasswordVerificationCodeCollectionName, { session })
					if (!verificationCodeResult.success || verificationCodeResult.result?.length !== 1) {
						if (session.inTransaction()) {
							await session.abortTransaction()
						}
						session.endSession()
						console.error('ERROR', 'Failed to update password: verification failed')
						return { success: false, message: 'Failed to update password: verification failed' }
					}
				} catch (error) {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.error('ERROR', 'Failed to update password: request verification failed')
					return { success: false, message: 'Failed to update password: request verification failed' }
				}

				const { collectionName, schemaInstance } = UserAuthSchema
				type UserAuth = InferSchemaType<typeof schemaInstance>

				const changePasswordWhere: QueryType<UserAuth> = { uid }
				const changePasswordSelect: SelectType<UserAuth> = {
					email: 1,
					uid: 1,
					passwordHashHash: 1,
				}

				try {
					const userAuthResult = await selectDataFromMongoDB<UserAuth>(changePasswordWhere, changePasswordSelect, schemaInstance, collectionName, { session })
					if (userAuthResult?.result && userAuthResult.result?.length === 1) {
						const userAuthInfo = userAuthResult.result[0]
						const isCorrectPassword = comparePasswordSync(oldPasswordHash, userAuthInfo.passwordHashHash)
						if (isCorrectPassword) {
							const newPasswordHashHash = hashPasswordSync(newPasswordHash)
							if (newPasswordHashHash) {
								const changePasswordUpdate: UpdateType<UserAuth> = {
									passwordHashHash: newPasswordHashHash,
									editDateTime: now,
								}
								try {
									const updateResult = await findOneAndUpdateData4MongoDB(changePasswordWhere, changePasswordUpdate, schemaInstance, collectionName, { session })
									if (updateResult.success) {
										await session.commitTransaction()
										session.endSession()
										return { success: true, message: 'Password updated!' }
									} else {
										if (session.inTransaction()) {
											await session.abortTransaction()
										}
										session.endSession()
										console.error('ERROR', 'Failed to update password: failed to update password', { uid })
										return { success: false, message: 'Failed to update password: failed to update password' }
									}
								} catch (error) {
									if (session.inTransaction()) {
										await session.abortTransaction()
									}
									session.endSession()
									console.error('ERROR', 'Failed to update password: error when updating password:', { uid, error })
									return { success: false, message: 'Failed to update password: error when updating password' }
								}
							} else {
								if (session.inTransaction()) {
									await session.abortTransaction()
								}
								session.endSession()
								console.error('ERROR', 'Failed to update password: failed to hash new password', { uid })
								return { success: false, message: 'Failed to update password: failed to hash new password' }
							}
						} else {
							if (session.inTransaction()) {
								await session.abortTransaction()
							}
							session.endSession()
							console.error('ERROR', 'Failed to update password: password verification failed', { uid })
							return { success: false, message: 'Failed to update password: password verification failed' }
						}
					} else {
						if (session.inTransaction()) {
							await session.abortTransaction()
						}
						session.endSession()
						console.error('ERROR', 'Failed to update password: password verification result is empty or not 1!', { uid })
						return { success: false, message: 'Failed to update password: password verification result is incorrect' }
					}
				} catch (error) {
					if (session.inTransaction()) {
						await session.abortTransaction()
					}
					session.endSession()
					console.error('ERROR', 'Failed to update password: error when checking password:', { uid, error })
					return { success: false, message: 'Failed to update password: error when checking password' }
				}
			} else {
				console.error('ERROR', 'Failed to update password: unauthorized user!', { uid })
				return { success: false, message: 'Failed to update password: unauthorized user!' }
			}
		} else {
			console.error('ERROR', 'Failed to update password: invalid parameters!', { uid })
			return { success: false, message: 'Failed to update password: invalid parameters!' }
		}
	} catch (error) {
		console.error('ERROR', 'Failed to update password: unknown error', error)
		return { success: false, message: 'Failed to update password: unknown error' }
	}
}

// /**
//  * // TODO: Planned to remove
//  * // DELETE ME This is a temporary workaround; in the future cookie will store UUID directly
//  * Verify whether a user is of a role by UID
//  * @param uid User ID; empty will cause validation to fail
//  * @param role User role
//  * @returns Validation result: true if user has this role, otherwise false
//  */
// export const checkUserRoleService = async (uid: number, role: string | string[]): Promise<boolean> => {
// 	// try {
// 	// 	if (UUID !== undefined && UUID !== null && role) {
// 	// 		const { collectionName, schemaInstance } = UserAuthSchema
// 	// 		type UserAuth = InferSchemaType<typeof schemaInstance>
// 	// 		let userTokenWhere: QueryType<UserAuth> = {
// 	// 			uid: -1,
// 	// 		}
// 	// 		if (typeof role === 'string') {
// 	// 			userTokenWhere = {
// 	// 				uid,
// 	// 				role,
// 	// 			}
// 	// 		} else {
// 	// 			userTokenWhere = {
// 	// 				uid,
// 	// 				role: { $in: role },
// 	// 			}
// 	// 		}
// 	// 		const userTokenSelect: SelectType<UserAuth> = {
// 	// 			uid: 1,
// 	// 		}

// 	// 		try {
// 	// 			const checkUserRoleResult = await selectDataFromMongoDB(userTokenWhere, userTokenSelect, schemaInstance, collectionName)
// 	// 			if (checkUserRoleResult && checkUserRoleResult.success) {
// 	// 				if (checkUserRoleResult.result?.length === 1) {
// 	// 					return true
// 	// 				} else {
// 	// 					console.error('ERROR', `Verification failed when checking user role: user information length is not 1, user uid: ${uid}`)
// 	// 					return false
// 	// 				}
// 	// 			} else {
// 	// 				console.error('ERROR', `Verification failed when checking user role: user information not found, user uid: ${uid}`)
// 	// 				return false
// 	// 			}
// 	// 		} catch (error) {
// 	// 			console.error('ERROR', `Verification failed when checking user role: error when checking user uid: ${uid}, error:`, error)
// 	// 			return false
// 	// 		}
// 	// 	} else {
// 	// 		console.error('ERROR', `Verification failed when checking user role: user uid or role does not exist, user UID: ${uid}`)
// 	// 		return false
// 	// 	}
// 	// } catch (error) {
// 	// 	console.error('ERROR', `Verification failed when checking user role: user UID: ${uid}`, error)
// 	// 	return false
// 	// }
// 	return role !== 'admin' && role !== 'blocked'
// }

/**
 * Check if a user is a certain role based on UUID
 * @param UUID User UUID, empty will cause verification failure
 * @param role User role
 * @returns Verification result; if user is this role, return true, otherwise return false
 */
// export const checkUserRoleByUUIDService = async (UUID: string, role: string | string[]): Promise<boolean> => {
// 	// try {
// 	// 	if (UUID !== undefined && UUID !== null && role) {
// 	// 		const { collectionName, schemaInstance } = UserAuthSchema
// 	// 		type UserAuth = InferSchemaType<typeof schemaInstance>
// 	// 		let userTokenWhere: QueryType<UserAuth> = {
// 	// 			uid: -1,
// 	// 		}
// 	// 		if (typeof role === 'string') {
// 	// 			userTokenWhere = {
// 	// 				UUID,
// 	// 				role,
// 	// 			}
// 	// 		} else {
// 	// 			userTokenWhere = {
// 	// 				UUID,
// 	// 				role: { $in: role },
// 	// 			}
// 	// 		}
// 	// 		const userTokenSelect: SelectType<UserAuth> = {
// 	// 			uid: 1,
// 	// 		}

// 	// 		try {
// 	// 			const checkUserRoleResult = await selectDataFromMongoDB(userTokenWhere, userTokenSelect, schemaInstance, collectionName)
// 	// 			if (checkUserRoleResult && checkUserRoleResult.success) {
// 	// 				if (checkUserRoleResult.result?.length === 1) {
// 	// 					return true
// 	// 				} else {
// 	// 					console.error('ERROR', `Verification failed when checking user role: user information length is not 1, user UUID: ${UUID}`)
// 	// 					return false
// 	// 				}
// 	// 			} else {
// 	// 				console.error('ERROR', `Verification failed when checking user role: user information not found, user UUID:${UUID}`)
// 	// 				return false
// 	// 			}
// 	// 		} catch (error) {
// 	// 			console.error('ERROR', `Verification failed when checking user role: error when checking user UUID:${UUID}, error:`, error)
// 	// 			return false
// 	// 		}
// 	// 	} else {
// 	// 		console.error('ERROR', `Verification failed when checking user role: user UUID or role does not exist, user UUID: ${UUID}`)
// 	// 		return false
// 	// 	}
// 	// } catch (error) {
// 	// 	console.error('ERROR', `Verification failed when checking user role: user UUID: ${UUID}`, error)
// 	// 	return false
// 	// }
// 	return role !== 'admin' && role !== 'blocked'
// }

/**
 * Check if a username is available
 * @param checkUsernameRequest Request payload for checking if a username is available
 * @returns Response for checking if a username is available request
 */
export const checkUsernameService = async (checkUsernameRequest: CheckUsernameRequestDto): Promise<CheckUsernameResponseDto> => {
	try {
		if (checkCheckUsernameRequest(checkUsernameRequest)) {
			const { username } = checkUsernameRequest
			const { collectionName, schemaInstance } = UserInfoSchema
			type UserInfo = InferSchemaType<typeof schemaInstance>
			const checkUsernameWhere: QueryType<UserInfo> = {
				username: { $regex: new RegExp(`\\b${username}\\b`, 'iu') },
			}
			const checkUsernameSelete: SelectType<UserInfo> = {
				uid: 1,
			}
			try {
				const checkUsername = await selectDataFromMongoDB(checkUsernameWhere, checkUsernameSelete, schemaInstance, collectionName)
				if (checkUsername.success) {
					if (checkUsername.result?.length === 0) {
						return { success: true, message: 'Username available', isAvailableUsername: true }
					} else {
						return { success: true, message: 'Username already taken', isAvailableUsername: false }
					}
				} else {
					console.error('ERROR', 'Failed to check username: failed to retrieve user data')
					return { success: false, message: 'Failed to check username: failed to retrieve user data', isAvailableUsername: false }
				}
			} catch (error) {
				console.error('ERROR', 'Failed to check username:', error, 'request user data failed')
				return { success: false, message: 'Failed to check username: failed to retrieve user data', isAvailableUsername: false }
			}
		} else {
			console.error('ERROR', 'Failed to check username: invalid parameters')
			return { success: false, message: 'Failed to check username: invalid parameters', isAvailableUsername: false }
		}
	} catch (error) {
		console.error('ERROR', 'Failed to check username:', error)
		return { success: false, message: 'Failed to check username: unknown error', isAvailableUsername: false }
	}
}

/**
 * Check if a user exists based on UUID
 * @param checkUserExistsByUuidRequest Request payload for checking if a user exists based on UUID
 * @returns Response for checking if a user exists based on UUID request
 */
export const checkUserExistsByUuidService = async (checkUserExistsByUuidRequest: CheckUserExistsByUuidRequestDto): Promise<CheckUserExistsByUuidResponseDto> => {
	try {
		if (!checkCheckUserExistsByUuidRequest(checkUserExistsByUuidRequest)) {
			console.error('ERROR', 'Failed to check if user exists: invalid parameters')
			return { success: false, exists: false, message: 'Failed to check if user exists: invalid parameters' }
		}

		const { uuid } = checkUserExistsByUuidRequest
		const { collectionName, schemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof schemaInstance>
		const where: QueryType<UserAuth> = {
			uuid,
		}
		const select: SelectType<UserAuth> = {
			UUID: 1,
		}

		let result: DbPoolResultsType<UserAuth>
		try {
			result = await selectDataFromMongoDB(where, select, schemaInstance, collectionName)
		} catch (error) {
			console.error('ERROR', 'Failed to check if user exists based on UUID:', error, 'query failed')
			return { success: false, exists: false, message: 'Failed to check if user exists based on UUID: query failed' }
		}

		if (result && result.success && result.result) {
			if (result.result?.length > 0) {
				return { success: true, exists: true, message: 'User already exists' }
			} else {
				return { success: true, exists: false, message: 'User does not exist' }
			}
		} else {
			return { success: false, exists: false, message: 'Query failed' }
		}
	} catch (error) {
		console.error('ERROR', 'Failed to check if user exists based on UUID:', error)
		return { success: false, exists: false, message: 'Failed to check if user exists based on UUID: unknown error' }
	}
}

/**
 * Get information about all blocked users
 * @param adminUid Admin UID
 * @param adminToken Admin token
 * @param GetBlockedUserRequest Request payload for getting blocked users
 * @returns Result of getting information about all blocked users request
 */
export const getBlockedUserService = async (adminUUID: string, adminToken: string, GetBlockedUserRequest: GetBlockedUserRequestDto): Promise<GetBlockedUserResponseDto> => {
	try {
		if (await checkUserTokenByUUID(adminUUID, adminToken)) {
			const { sortBy, sortOrder } = GetBlockedUserRequest
			if (!checkSortVariables(sortBy, sortOrder)) {
				console.error('ERROR', 'Failed to get information about all blocked users: invalid sorting parameters')
				return { success: false, message: 'Failed to get information about all blocked users: invalid sorting parameters', totalCount: 0 }
			}

			let pageSize = undefined
			let skip = 0
			if (GetBlockedUserRequest.pagination && GetBlockedUserRequest.pagination.page > 0 && GetBlockedUserRequest.pagination.pageSize > 0) {
				skip = (GetBlockedUserRequest.pagination.page - 1) * GetBlockedUserRequest.pagination.pageSize
				pageSize = GetBlockedUserRequest.pagination.pageSize
			}

			const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema

			const blockedUserCountPipeline: PipelineStage[] = [
				{
					$match: {
						roles: 'blocked',
					},
				},
				{
					$lookup: {
						from: 'user-infos', // WARN: Don't forget to add plural
						localField: 'UUID',
						foreignField: 'UUID',
						as: 'user_info_data',
					},
				},
				{
					$unwind: {
						path: '$user_info_data',
						preserveNullAndEmptyArrays: true, // Keep empty arrays and null values
					},
				},
			]

			const blockedUserPipeline: PipelineStage[] = [
				{
					$match: {
						roles: 'blocked',
					},
				},
				{
					$lookup: {
						from: 'user-infos', // WARN: Don't forget to add plural
						localField: 'UUID',
						foreignField: 'UUID',
						as: 'user_info_data',
					},
				},
				{
					$unwind: {
						path: '$user_info_data',
						preserveNullAndEmptyArrays: true, // Keep empty arrays and null values
					},
				},
				{ $sort: { [`user_info_data.${sortBy}`]: sortOrder === 'descend' ? -1 : 1 } },
				{ $skip: skip }, // Skip specified number of documents
				{ $limit: pageSize }, // Limit number of documents returned
			]

			const projectStep = {
				$project: {
					uid: 1,
					UUID: 1,
					userCreateDateTime: 1, // User creation date
					roles: 1, // User roles
					username: '$user_info_data.username', // User name
					userNickname: '$user_info_data.userNickname', // User nickname
					email: 1, // User email
					totalCount: 1, // Total number of documents
				},
			}
			blockedUserPipeline.push(projectStep)

			const countStep = {
				$count: 'totalCount', // Count total number of documents
			}
			blockedUserCountPipeline.push(countStep)

			try {
				const userCountResult = await selectDataByAggregateFromMongoDB(userAuthSchemaInstance, userAuthCollectionName, blockedUserCountPipeline)
				const userResult = await selectDataByAggregateFromMongoDB(userAuthSchemaInstance, userAuthCollectionName, blockedUserPipeline)
				if (!userResult.success) {
					console.error('ERROR', 'Failed to get information about all blocked users: query failed')
					return { success: false, message: 'Failed to get information about all blocked users: query failed', totalCount: 0 }
				}

				return { success: true, message: 'Information about all blocked users retrieved successfully', result: userResult.result, totalCount: userCountResult.result?.[0]?.totalCount ?? 0 }
			} catch (error) {
				console.error('ERROR', 'Failed to get information about all blocked users:', error)
				return { success: false, message: 'Failed to get information about all blocked users: query error', totalCount: 0 }
			}
		} else {
			console.error('ERROR', 'Failed to get information about all blocked users: user verification failed')
			return { success: false, message: 'Failed to get information about all blocked users: user verification failed', totalCount: 0 }
		}
	} catch (error) {
		console.error('ERROR', 'Failed to get information about all blocked users:', error)
		return { success: false, message: 'Failed to get information about all blocked users: unknown error', totalCount: 0 }
	}
}

/**
 * Admin get user information
 * @param adminGetUserInfoServiceRequest Request payload for admin getting user information
 * @param adminUUID Admin UUID
 * @param adminToken Admin token
 * @returns Result of admin getting user information request
 */
export const adminGetUserInfoService = async (adminGetUserInfoRequest: AdminGetUserInfoRequestDto, adminUUID: string, adminToken: string): Promise<AdminGetUserInfoResponseDto> => {
	try {
		if (!checkAdminGetUserInfoRequest(adminGetUserInfoRequest)) {
			console.error('ERROR', 'Failed to get user information: invalid request parameters')
			return { success: false, message: 'Failed to get user information: invalid request parameters', totalCount: 0 }
		}

		if (!await checkUserTokenByUUID(adminUUID, adminToken)) {
			console.error('ERROR', 'Failed to get user information: user verification failed')
			return { success: false, message: 'Failed to get user information: user verification failed', totalCount: 0 }
		}
		const { sortBy, sortOrder } = adminGetUserInfoRequest
		if (!checkSortVariables(sortBy, sortOrder)) {
			console.error('ERROR', 'Failed to get user information: invalid sorting parameters')
			return { success: false, message: 'Failed to get user information: invalid sorting parameters', totalCount: 0 }
		}

		let pageSize = undefined
		let skip = 0
		if (adminGetUserInfoRequest.pagination && adminGetUserInfoRequest.pagination.page > 0 && adminGetUserInfoRequest.pagination.pageSize > 0) {
			skip = (adminGetUserInfoRequest.pagination.page - 1) * adminGetUserInfoRequest.pagination.pageSize
			pageSize = adminGetUserInfoRequest.pagination.pageSize
		}

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		const adminGetUserInfoCountPipeline: PipelineStage[] = [
			{
				$lookup: {
					from: 'user-infos', // WARN: Don't forget to add plural
					localField: 'UUID',
					foreignField: 'UUID',
					as: 'user_info_data',
				},
			},
			{
				$unwind: {
					path: '$user_info_data',
					preserveNullAndEmptyArrays: true, // Keep empty arrays and null values
				},
			},
		]

		const adminGetUserInfoPipeline: PipelineStage[] = [
			{
				$lookup: {
					from: 'user-infos', // WARN: Don't forget to add plural
					localField: 'UUID',
					foreignField: 'UUID',
					as: 'user_info_data',
				},
			},
			{
				$unwind: {
					path: '$user_info_data',
					preserveNullAndEmptyArrays: true, // Keep empty arrays and null values
				},
			},
			{
				$lookup: {
					from: 'user-invitation-codes',
					localField: 'UUID',
					foreignField: 'assigneeUUID',
					as: 'invitation_codes_data'
				},
			},
			{
				$unwind: {
					path: '$invitation_codes_data',
					preserveNullAndEmptyArrays: true
				},
			},
			{ $sort: { [`user_info_data.${sortBy}`]: sortOrder === 'descend' ? -1 : 1}},
			{ $skip: skip }, // Skip specified number of documents
			{ $limit: pageSize }, // Limit number of documents returned
		]

		if (adminGetUserInfoRequest.isOnlyShowUserInfoUpdatedAfterReview) {
			const userInfoFilter = {
				$match: {
					'user_info_data.isUpdatedAfterReview': true,
				},
			}
			adminGetUserInfoCountPipeline.push(userInfoFilter)
			adminGetUserInfoPipeline.push(userInfoFilter)
		}

		if (adminGetUserInfoRequest.uid !== undefined && adminGetUserInfoRequest.uid !== null && adminGetUserInfoRequest.uid !== -1) {
			const userInfoFilter = {
				$match: {
					uid: adminGetUserInfoRequest.uid,
				},
			}
			adminGetUserInfoCountPipeline.push(userInfoFilter)
			adminGetUserInfoPipeline.push(userInfoFilter)
		}

		const projectStep = {
			$project: {
				uid: 1,
				UUID: 1,
				userCreateDateTime: 1, // User creation date
				roles: 1, // User roles
				email: 1, // User email
				username: '$user_info_data.username', // User name
				userNickname: '$user_info_data.userNickname', // User nickname
				avatar: '$user_info_data.avatar', // User avatar
				userBannerImage: '$user_info_data.userBannerImage', // User background image
				signature: '$user_info_data.signature', // User signature
				gender: '$user_info_data.gender', // User gender
				userBirthday: '$user_info_data.userBirthday', // User birthdate
				invitationCode: '$invitation_codes_data.invitationCode', // User invitation code
				isUpdatedAfterReview: '$user_info_data.isUpdatedAfterReview', // Whether reviewed
				editOperatorUUID: '$user_info_data.editOperatorUUID', // UUID of editor
				editDateTime: '$user_info_data.editDateTime', // Edit time
				totalCount: 1, // Total number of documents
			},
		}
		adminGetUserInfoPipeline.push(projectStep)

		const countStep = {
			$count: 'totalCount', // Count total number of documents
		}
		adminGetUserInfoCountPipeline.push(countStep)

		try {
			const userCountResult = await selectDataByAggregateFromMongoDB(userAuthSchemaInstance, userAuthCollectionName, adminGetUserInfoCountPipeline)
			const userResult = await selectDataByAggregateFromMongoDB(userAuthSchemaInstance, userAuthCollectionName, adminGetUserInfoPipeline)
			if (!userResult.success) {
				console.error('ERROR', 'Failed to get user information: query failed')
				return { success: false, message: 'Failed to get user information: query failed', totalCount: 0 }
			}

			return { success: true, message: 'Admin successfully retrieved user information', result: userResult.result, totalCount: userCountResult.result?.[0]?.totalCount ?? 0 }
		} catch (error) {
			console.error('ERROR', 'Failed to get user information:', error)
			return { success: false, message: 'Failed to get user information: query error', totalCount: 0 }
		}
	} catch (error) {
		console.error('ERROR', 'Failed to get user information:', error)
		return { success: false, message: 'Failed to get user information: unknown error', totalCount: 0 }
	}
}

/**
 * Admin approve user information
 * @param approveUserInfoRequest Request payload for admin approving user information
 * @param adminUUID Admin UUID
 * @param adminToken Admin token
 * @returns Result of admin approving user information request
 */
export const approveUserInfoService = async (approveUserInfoRequest: ApproveUserInfoRequestDto, adminUUID: string, adminToken: string): Promise<ApproveUserInfoResponseDto> => {
	try {
		if (!checkApproveUserInfoRequest(approveUserInfoRequest)) {
			console.error('ERROR', 'Failed to approve user information: invalid parameters')
			return { success: false, message: 'Failed to approve user information: invalid parameters' }
		}

		if (!await checkUserTokenByUUID(adminUUID, adminToken)) {
			console.error('ERROR', 'Failed to approve user information: user verification failed')
			return { success: false, message: 'Failed to approve user information: user verification failed' }
		}

		const UUID = approveUserInfoRequest.UUID
		const { collectionName, schemaInstance } = UserInfoSchema
		type UserInfo = InferSchemaType<typeof schemaInstance>
		const approveUserInfoWhere: QueryType<UserInfo> = {
			UUID,
		}
		const approveUserInfoUpdate: UpdateType<UserInfo> = {
			isUpdatedAfterReview: false,
			editDateTime: new Date().getTime(),
		}
		try {
			const updateResult = await findOneAndUpdateData4MongoDB(approveUserInfoWhere, approveUserInfoUpdate, schemaInstance, collectionName)
			if (!updateResult.success) {
				console.error('ERROR', 'Admin approve user info failed: database update failed')
				return { success: false, message: 'Admin approve user info failed: database update failed' }
			}

			return { success: true, message: 'Admin approve user info success' }
		} catch (error) {
			console.error('ERROR', 'Admin approve user info error: database update error', error)
			return { success: false, message: 'Admin approve user info error: database update error' }
		}
	} catch (error) {
		console.error('ERROR', 'Admin approve user info error: unknown error', error)
		return { success: false, message: 'Admin approve user info error: unknown error' }
	}
}

/**
 * Admin clears a user's profile info
 * @param approveUserInfoRequest Request payload
 * @param adminUUID Admin UUID
 * @param adminToken Admin Token
 * @returns Response
 */
export const adminClearUserInfoService = async (adminClearUserInfoRequest: AdminClearUserInfoRequestDto, adminUUID: string, adminToken: string): Promise<AdminClearUserInfoResponseDto> => {
	try {
		if (!checkAdminClearUserInfoRequest(adminClearUserInfoRequest)) {
			console.error('ERROR', "Admin clear user's info failed: invalid parameters")
			return { success: false, message: "Admin clear user's info failed: invalid parameters" }
		}

		if (!await checkUserTokenByUUID(adminUUID, adminToken)) {
			console.error('ERROR', "Admin clear user's info failed: user verification failed")
			return { success: false, message: "Admin clear user's info failed: user verification failed" }
		}

		const uid = adminClearUserInfoRequest.uid
		const UUID = await getUserUuid(uid)
		if (!UUID) {
			console.error('ERROR', "Admin clear user's info failed: UUID not found", { uid })
			return { success: false, message: "Admin clear user's info failed: UUID not found" }
		}
		let username: string
		while (true) {
			username = `${UUID}_${generateSecureRandomString(6)}`
			const checkResult = await checkUsernameService({ username })
			if (checkResult.success && checkResult.isAvailableUsername) {
				break
			}
		}

		const { collectionName, schemaInstance } = UserInfoSchema
		type UserInfo = InferSchemaType<typeof schemaInstance>

		const adminClearUserInfoWhere: QueryType<UserInfo> = {
			uid, // TODO: maybe can be removed
			UUID,
		}
		const adminClearUserInfoUpdate: UpdateType<UserInfo> = {
			username,
			userNickname: '[cleaned]',
			avatar: '',
			userBannerImage: '',
			signature: '',
			gender: '',
			label: [] as UserInfo['label'], // TODO: Mongoose issue: #12420
			userBirthday: -1,
			userProfileMarkdown: '',
			userLinkedAccounts: [] as UserInfo['userLinkedAccounts'], // TODO: Mongoose issue: #12420
			userWebsite: { websiteName: '', websiteUrl: '' },
			isUpdatedAfterReview: false, // After clearing info set to false directly
			editOperatorUUID: adminUUID,
			editDateTime: new Date().getTime(),
		}
		try {
			const updateResult = await findOneAndUpdateData4MongoDB(adminClearUserInfoWhere, adminClearUserInfoUpdate, schemaInstance, collectionName)
			if (!updateResult.success) {
				console.error('ERROR', "Admin clear user's info failed: database update failed")
				return { success: false, message: "Admin clear user's info failed: database update failed" }
			}

			return { success: true, message: "Admin clear user's info success" }
		} catch (error) {
			console.error('ERROR', "Admin clear user's info error: database update error", error)
			return { success: false, message: "Admin clear user's info error: database update error" }
		}
	} catch (error) {
		console.error('ERROR', "Admin clear user's info error: unknown error", error)
		return { success: false, message: "Admin clear user's info error: unknown error" }
	}
}

/**
 * Admin edits user info
 * @param AdminEditUserInfoRequestDto Request payload
 * @param adminUUID Admin UUID
 * @param adminToken Admin Token
 * @return Response
 */
export const adminEditUserInfoService = async (adminEditUserInfoRequest: AdminEditUserInfoRequestDto, adminUUID: string, adminToken: string): Promise<AdminEditUserInfoResponseDto> => {
	try {
		if (!checkAdminEditUserInfoRequest(adminEditUserInfoRequest)) {
			console.error('ERROR', 'Admin edit user info failed: invalid parameters')
			return { success: false, message: 'Admin edit user info failed: invalid parameters' }
		}

		const { uid } = adminEditUserInfoRequest
		const { username } = adminEditUserInfoRequest.userInfo
		const { collectionName: userInfoCollectionName, schemaInstance: userInfoSchemaInstance } = UserInfoSchema

		if (username) {
			const getUserInfoWhere: QueryType<UserInfo> = {
				username: { $regex: new RegExp(`\\b${username}\\b`, 'iu') },
			}
			const getUserInfoSelect: SelectType<UserInfo> = {
				uid: 1,
				username: 1,
			}
			const checkUsernameResult = await selectDataFromMongoDB<UserInfo>(getUserInfoWhere, getUserInfoSelect, userInfoSchemaInstance, userInfoCollectionName)

			let isSafeUsername = false
			if (checkUsernameResult.success) {
				if (checkUsernameResult.result.length === 0) {
					isSafeUsername = true
				}
				if (checkUsernameResult.result.length === 1) {
					if (checkUsernameResult.result[0].uid === uid) {
						isSafeUsername = true
					}
				}
			}

			if (!isSafeUsername) {
				console.error('ERROR', 'Update user info failed: duplicate username', { adminEditUserInfoRequest, uid })
				return { success: false, message: 'Update user info failed: duplicate username' }
			}
		}

		const UUID = await getUserUuid(uid)
		if (!UUID) {
			console.error('ERROR', 'Admin edit user info failed: UUID not found', { uid })
			return { success: false, message: 'Admin edit user info failed: UUID not found' }
		}

		if (!await checkUserTokenByUUID(adminUUID, adminToken)) {
			console.error('ERROR', 'Admin edit user info failed: user verification failed')
			return { success: false, message: 'Admin edit user info failed: user verification failed' }
		}

		type UserInfo = InferSchemaType<typeof userInfoSchemaInstance>
		const adminEditUserInfoWhere: QueryType<UserInfo> = {
			UUID,
		}
		const adminEditUserInfoUpdate: UpdateType<UserInfo> = {
			...adminEditUserInfoRequest.userInfo,
			editOperatorUUID: adminUUID,
			editDateTime: new Date().getTime(),
		}

		const updateUserInfoResult = await findOneAndUpdateData4MongoDB(adminEditUserInfoWhere, adminEditUserInfoUpdate, userInfoSchemaInstance, userInfoCollectionName)
		if (!updateUserInfoResult.success) {
			console.error('ERROR', 'Admin edit user info failed: database update failed')
			return { success: false, message: 'Admin edit user info failed: database update failed' }
		}
		return { success: true, message: 'Admin edit user info success' }

	} catch (error) {
		console.error('ERROR', 'Admin edit user info failed: unknown error', error)
		return { success: false, message: 'Admin edit user info failed: unknown error' }
	}
}

/**
 * Get UUID by UID
 * @param uid User UID
 * @returns UUID
 */
export const getUserUuid = async (uid: number): Promise<string | void> => {
	try {
		if (uid === undefined || uid === null || uid <= 0) {
			console.error('ERROR', 'Get UUID by UID failed, invalid UID')
			return
		}
		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaSchemaInstance>

		const getUuidWhere: QueryType<UserAuth> = {
			uid,
		}

		const getUuidSelect: SelectType<UserAuth> = {
			UUID: 1,
		}

		const getUuidResult = await selectDataFromMongoDB(getUuidWhere, getUuidSelect, userAuthSchemaSchemaInstance, userAuthCollectionName)
		if (getUuidResult.success && getUuidResult.result?.length === 1) {
			return getUuidResult.result[0].UUID
		} else {
			console.error('ERROR', 'Get UUID by UID failed, UUID not found or result length not equal to 1')
		}
	} catch (error) {
		console.error('ERROR', 'Exception while getting UUID by UID:', error)
		return
	}
}

/**
 * Get UID by UUID
 * @param uuid User UUID
 * @returns UID
 */
export const getUserUid = async (uuid: string): Promise<number | undefined> => {
	try {
		if (!uuid) {
			console.error('ERROR', 'Get UID by UUID failed, invalid UUID')
			return
		}
		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaSchemaInstance>

		const getUidWhere: QueryType<UserAuth> = {
			UUID: uuid,
		}

		const getUidSelect: SelectType<UserAuth> = {
			uid: 1,
		}

		const getUidResult = await selectDataFromMongoDB(getUidWhere, getUidSelect, userAuthSchemaSchemaInstance, userAuthCollectionName)
		if (getUidResult.success && getUidResult.result?.length === 1) {
			return getUidResult.result[0].uid
		} else {
			console.error('ERROR', 'Get UID by UUID failed, UID not found or result length not equal to 1')
		}
	} catch (error) {
		console.error('ERROR', 'Exception while getting UID by UUID:', error)
		return undefined
	}
}

/**
 * 检查用户 Token，检查 Token 和用户 uid 是否吻合，判断用户是否已注册
 * // DELETE ME 这是一个临时的解决方案，以后 Cookie 中直接存储 UUID
 * @param uid 用户 ID
 * @param token 用户 Token
 * @returns boolean 如果验证通过则为 true，不通过为 false
 */
const checkUserToken = async (uid: number, token: string): Promise<boolean> => {
	try {
		if (uid !== null && !Number.isNaN(uid) && uid !== undefined && token) {
			const { collectionName, schemaInstance } = UserAuthSchema
			type UserAuth = InferSchemaType<typeof schemaInstance>
			const userTokenWhere: QueryType<UserAuth> = {
				uid,
				token,
			}
			const userTokenSelect: SelectType<UserAuth> = {
				uid: 1,
			}
			try {
				const userInfo = await selectDataFromMongoDB(userTokenWhere, userTokenSelect, schemaInstance, collectionName)
				if (userInfo && userInfo.success) {
					if (userInfo.result?.length === 1) {
						return true
					} else {
						console.error('ERROR', `查询用户 Token 时，用户信息长度不为 1，用户uid：【${uid}】`)
						return false
					}
				} else {
					console.error('ERROR', `查询用户 Token 时未查询到用户信息，用户uid：【${uid}】，错误描述：${userInfo.message}，错误信息：${userInfo.error}`)
					return false
				}
			} catch (error) {
				console.error('ERROR', `查询用户 Token 时出错，用户uid：【${uid}】，错误信息：`, error)
				return false
			}
		} else {
			console.error('ERROR', `查询用户 Token 时出错，必要的参数 uid 或 token为空：【${uid}】`)
			return false
		}
	} catch (error) {
		console.error('ERROR', '查询用户 Token 时出错，未知错误：', error)
		return false
	}
}

/**
 * 检查用户 Token，检查 Token 和用户 uuid 是否吻合，判断用户是否已注册
 * @param UUID 用户 UUID
 * @param token 用户 Token
 * @returns boolean 如果验证通过则为 true，不通过为 false
 */
const checkUserTokenByUUID = async (UUID: string, token: string): Promise<boolean> => {
	try {
		if (UUID !== null && !Number.isNaN(UUID) && UUID !== undefined && token) {
			const { collectionName, schemaInstance } = UserAuthSchema
			type UserAuth = InferSchemaType<typeof schemaInstance>
			const userTokenWhere: QueryType<UserAuth> = {
				UUID,
				token,
			}
			const userTokenSelect: SelectType<UserAuth> = {
				uid: 1,
			}
			try {
				const userInfo = await selectDataFromMongoDB(userTokenWhere, userTokenSelect, schemaInstance, collectionName)
				if (userInfo && userInfo.success) {
					if (userInfo.result?.length === 1) {
						return true
					} else {
						console.error('ERROR', `查询用户 Token 时，用户信息长度不为 1，用户 UUID: ${UUID}`)
						return false
					}
				} else {
					console.error('ERROR', `查询用户 Token 时未查询到用户信息，用户 UUID: ${UUID}，错误描述：${userInfo.message}，错误信息：${userInfo.error}`)
					return false
				}
			} catch (error) {
				console.error('ERROR', `查询用户 Token 时出错，用户 UUID: ${UUID}，错误信息：`, error)
				return false
			}
		} else {
			console.error('ERROR', `查询用户 Token 时出错，必要的参数 uid 或 token为空 UUID: ${UUID}`)
			return false
		}
	} catch (error) {
		console.error('ERROR', '查询用户 Token 时出错，未知错误：', error)
		return false
	}
}

/** 通过恢复码删除用户 2FA 的参数 */
type DeleteTotpAuthenticatorByRecoveryCodeParametersDto = {
	/** 用户邮箱 */
	email: string,
	/** 恢复码 */
	recoveryCodeHash: string,
	/** 事务 */
	session?: mongoose.ClientSession,
}

/** 通过恢复码删除用户 2FA 的结果 */
type DeleteTotpAuthenticatorByRecoveryCodeResultDto = {} & DeleteTotpAuthenticatorByTotpVerificationCodeResponseDto

/**
 * 通过恢复码删除用户 2FA，只能在登录时使用
 * @param deleteTotpAuthenticatorByRecoveryCodeData 通过恢复码删除用户 2FA 的参数
 * @returns 通过恢复码删除用户 2FA 的结果
 */
const deleteTotpAuthenticatorByRecoveryCode = async (deleteTotpAuthenticatorByRecoveryCodeData: DeleteTotpAuthenticatorByRecoveryCodeParametersDto): Promise<DeleteTotpAuthenticatorByRecoveryCodeResultDto> => {
	try {
		if (!checkDeleteTotpAuthenticatorByRecoveryCodeData(deleteTotpAuthenticatorByRecoveryCodeData)) {
			console.error('ERROR', '通过恢复码删除用户 2FA 失败，参数不合法')
			return { success: false, message: '通过恢复码删除用户 2FA 失败，参数不合法' }
		}

		const { email, recoveryCodeHash, session } = deleteTotpAuthenticatorByRecoveryCodeData
		const emailLowerCase = email.toLowerCase()

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>
		const userAuthWhere: QueryType<UserAuth> = { emailLowerCase: emailLowerCase }
		const userAuthSelect: SelectType<UserAuth> = { UUID: 1 }
		const userInfo = await selectDataFromMongoDB<UserAuth>(userAuthWhere, userAuthSelect, userAuthSchemaInstance, userAuthCollectionName, { session })

		const uuid = userInfo?.result?.[0]?.UUID
		if (!uuid) {
			console.error('ERROR', '通过恢复码删除用户 2FA 失败，无法获取用户信息', { emailLowerCase })
			return { success: false, message: '通过恢复码删除用户 2FA 失败，无法获取用户信息' }
		}

		const { collectionName: userTotpAuthenticatorCollectionName, schemaInstance: userTotpAuthenticatorSchemaInstance } = UserTotpAuthenticatorSchema
		type UserTotpAuthenticator = InferSchemaType<typeof userTotpAuthenticatorSchemaInstance>
		const userTotpAuthenticatorWhere: QueryType<UserTotpAuthenticator> = { UUID: uuid, recoveryCodeHash }
		const deleteResult = await deleteDataFromMongoDB<UserTotpAuthenticator>(userTotpAuthenticatorWhere, userTotpAuthenticatorSchemaInstance, userTotpAuthenticatorCollectionName, { session })

		if (!deleteResult.success) {
			console.error('ERROR', '通过恢复码删除用户 2FA 失败，删除失败', { emailLowerCase })
			return { success: false, message: '通过恢复码删除用户 2FA 失败，删除失败' }
		}

		const resetResult = await resetUser2FATypeByUUID(uuid, session)

		if (!resetResult) {
			console.error('ERROR', '通过恢复码删除用户 2FA 失败，重置用户 2FA 数据失败', { emailLowerCase })
			return { success: false, message: '通过恢复码删除用户 2FA 失败，重置用户 2FA 数据失败' }
		}

		return { success: true, message: '用户的身份验证器已删除' }
	} catch (error) {
		console.error('ERROR', '通过恢复码删除用户 2FA失败', error)
		return { success: false, message: '通过恢复码删除用户 2FA 失败，发生未知错误' }
	}
}

/**
 * 已登录用户通过密码和 TOTP 验证码删除身份验证器
 * @param deleteTotpAuthenticatorByTotpVerificationCodeRequest 登录用户通过密码和 TOTP 验证码删除身份验证器的请求载荷
 * @param uuid 用户的 UUID
 * @param token 用户的 token
 * @returns 删除操作的结果
 */
export const deleteTotpAuthenticatorByTotpVerificationCodeService = async (deleteTotpAuthenticatorByTotpVerificationCodeRequest: DeleteTotpAuthenticatorByTotpVerificationCodeRequestDto, uuid: string, token: string): Promise<DeleteTotpAuthenticatorByTotpVerificationCodeResponseDto> => {
	try {
		if (!checkDeleteTotpAuthenticatorByTotpVerificationCodeRequest(deleteTotpAuthenticatorByTotpVerificationCodeRequest)) {
			console.error('ERROR', '已登录用户通过密码和 TOTP 验证码删除身份验证器失败，参数不合法')
			return { success: false, message: '已登录用户通过密码和 TOTP 验证码删除身份验证器验证器失败，参数不合法' }
		}

		if (!await checkUserTokenByUUID(uuid, token)) {
			console.error('ERROR', '已登录用户通过密码和 TOTP 验证码删除身份验证器失败，用户校验未通过')
			return { success: false, message: '已登录用户通过密码和 TOTP 验证码删除身份验证器验证器失败，用户校验未通过' }
		}

		const session = await mongoose.startSession()
		session.startTransaction()

		const now = new Date().getTime()
		const { clientOtp, passwordHash } = deleteTotpAuthenticatorByTotpVerificationCodeRequest
		const maxAttempts	 = 5
		const lockTime = 60 * 60 * 1000

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>

		const userLoginWhere: QueryType<UserAuth> = { UUID: uuid }
		const userLoginSelect: SelectType<UserAuth> = {
			passwordHashHash: 1,
		}

		const userAuthResult = await selectDataFromMongoDB<UserAuth>(userLoginWhere, userLoginSelect, userAuthSchemaInstance, userAuthCollectionName, { session })
		const passwordHashHash = userAuthResult.result?.[0]?.passwordHashHash
		if (!userAuthResult?.result || userAuthResult.result?.length !== 1) {
			console.error('ERROR', `已登录用户通过密码和 TOTP 验证码删除身份验证器失败，无法查询到用户安全信息`)
			return { success: false, message: '已登录用户通过密码和 TOTP 验证码删除身份验证器失败，无法查询到用户安全信息' }
		}

		const isCorrectPassword = comparePasswordSync(passwordHash, passwordHashHash)
		if (!isCorrectPassword) {
			console.error('ERROR', `已登录用户通过密码和 TOTP 验证码删除身份验证器失败，无法查询到用户安全信息`)
			return { success: false, message: '已登录用户通过密码和 TOTP 验证码删除身份验证器失败，用户密码不正确' }
		}

		const { collectionName: userTotpAuthenticatorCollectionName, schemaInstance: userTotpAuthenticatorSchemaInstance } = UserTotpAuthenticatorSchema
		type UserTotpAuthenticator = InferSchemaType<typeof userTotpAuthenticatorSchemaInstance>
		const deleteTotpAuthenticatorByTotpVerificationCodeWhere: QueryType<UserTotpAuthenticator> = {
			UUID: uuid,
			enabled: true,
		}
		const deleteTotpAuthenticatorByTotpVerificationCodeSelect: SelectType<UserTotpAuthenticator> = {
			secret: 1,
			backupCodeHash: 1,
			lastAttemptTime: 1,
			attempts: 1,
		}

		const selectResult = await selectDataFromMongoDB<UserTotpAuthenticator>(deleteTotpAuthenticatorByTotpVerificationCodeWhere, deleteTotpAuthenticatorByTotpVerificationCodeSelect, userTotpAuthenticatorSchemaInstance, userTotpAuthenticatorCollectionName, { session })
		if (!selectResult.success || selectResult.result.length !== 1) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('ERROR', '已登录用户通过密码和 TOTP 验证码删除身份验证器失败：删除失败，未找到匹配的数据')
			return { success: false, message: '已登录用户通过密码和 TOTP 验证码删除身份验证器失败：删除失败，未找到匹配的数据' }
		}

		let attempts = selectResult.result[0].attempts
		const totpSecret = selectResult.result[0].secret

		// 限制用户尝试删除的频率
		if (selectResult.result[0].attempts >= maxAttempts) {
			const lastAttemptTime = new Date(selectResult.result[0].lastAttemptTime).getTime();
			if (now - lastAttemptTime < lockTime) {
				attempts += 1

				if (session.inTransaction()) {
					await session.abortTransaction()
				}
				session.endSession()
				console.warn('WARN', 'WARNING', '已登录用户通过密码和 TOTP 验证码删除身份验证器失败，已达最大尝试次数，请稍后再试');
				return { success: false, message: '已登录用户通过密码和 TOTP 验证码删除身份验证器失败，已达最大尝试次数，请稍后再试', isCoolingDown: true }
			} else {
				attempts = 0
			}

			const deleteTotpAuthenticatorByTotpVerificationCodeUpdate: UpdateType<UserTotpAuthenticator> = {
				attempts: attempts,
				lastAttemptTime: now,
				editDateTime: now,
			}
			const updateAuthenticatorResult = await findOneAndUpdateData4MongoDB<UserTotpAuthenticator>(deleteTotpAuthenticatorByTotpVerificationCodeWhere, deleteTotpAuthenticatorByTotpVerificationCodeUpdate, userTotpAuthenticatorSchemaInstance, userTotpAuthenticatorCollectionName, { session })

			if (!updateAuthenticatorResult.success) {
				if (session.inTransaction()) {
					await session.abortTransaction()
				}
				session.endSession()
				console.error('ERROR', '已登录用户通过密码和 TOTP 验证码删除身份验证器失败，更新最后尝试时间或尝试次数失败');
				return { success: false, message: '已登录用户通过密码和 TOTP 验证码删除身份验证器失败，更新最后尝试时间或尝试次数失败', isCoolingDown: true }
			}
		}

		if (!authenticator.check(clientOtp, totpSecret)) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('ERROR', '已登录用户通过密码和邮 TOTP 证码删除身份验证器失败：删除失败，验证码错误')
			return { success: false, message: '已登录用户通过密码和 TOTP 验证码删除身份验证器失败：删除失败，验证码错误' }
		}

		// 调用删除函数
		const deleteResult = await deleteDataFromMongoDB(deleteTotpAuthenticatorByTotpVerificationCodeWhere, userTotpAuthenticatorSchemaInstance, userTotpAuthenticatorCollectionName, { session })
		const resetResult = await resetUser2FATypeByUUID(uuid, session)

		if (!deleteResult.success || deleteResult.result.deletedCount !== 1 || !resetResult) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('ERROR', '已登录用户通过密码和 TOTP 验证码删除身份验证器失败：删除失败，未找到匹配的数据或重置用户 2FA 数据失败')
			return { success: false, message: '已登录用户通过密码和 TOTP 验证码删除身份验证器失败：删除失败，未找到匹配的数据或重置用户 2FA 数据失败' }
		}

		await session.commitTransaction()
		session.endSession()
		return { success: true, message: '删除 TOTP 身份验证器成功' }
	} catch (error) {
		console.error('已登录用户通过密码和 TOTP 验证码删除身份验证器失败时出错，未知错误', error)
		return { success: false, message: '已登录用户通过密码和 TOTP 验证码删除身份验证器失败时出错，未知错误' }
	}
}

/**
 * 根据 UUID 重置 user-auth 表中用户的 authenticatorType 字段为 none，在 deleteTotpAuthenticatorByRecoveryCode, deleteTotpAuthenticatorByTotpVerificationCodeService 和 deleteUserEmailAuthenticatorService 中用到
 * @param uuid 用户的 UUID
 * @param session Mongoose Session
 * @returns boolean 执行是否成功
 */
const resetUser2FATypeByUUID = async (uuid: string, session: ClientSession): Promise<boolean> => {
	try {
		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>
		const userAuthWhere: QueryType<UserAuth> = { UUID: uuid }
		const userAuthUpdate: UpdateType<UserAuth> = { authenticatorType: 'none' }

		const updateResult = await updateData4MongoDB<UserAuth>(userAuthWhere, userAuthUpdate, userAuthSchemaInstance, userAuthCollectionName, { session })

		return !!updateResult.success
	} catch (error) {
		console.error('ERROR', '根据 UUID 重置 user-auth 表中用户的 authenticatorType 字段时出错，未知错误：', error)
		return false
	}
}

/**
 * 用户创建 TOTP 身份验证器服务
 * 开启邮箱验证的是另一个函数，这个只是开启 totp
 * 这里只是创建，然后还有一个确认创建的步骤。
 *
 * @param uuid 用户的 UUID
 * @param token 用户的 token
 * @returns 用户创建 TOTP 身份验证器的请求响应
 */
export const createUserTotpAuthenticatorService = async (uuid: string, token: string): Promise<CreateUserTotpAuthenticatorResponseDto> => {
	try {
		if (!await checkUserTokenByUUID(uuid, token)) {
			console.error('创建 TOTP 身份验证器失败，非法用户', { uuid })
			return { success: false, isExists: false, message: '创建 TOTP 身份验证器失败，非法用户' }
		}

		const session = await mongoose.startSession()
		session.startTransaction()

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>

		const createUserTotpAuthenticatorUserAuthWhere: QueryType<UserAuth> = { UUID: uuid }
		const createUserTotpAuthenticatorUserAuthSelect: SelectType<UserAuth> = {
			authenticatorType: 1,
			email: 1,
		}

		const userAuthResult = await selectDataFromMongoDB<UserAuth>(createUserTotpAuthenticatorUserAuthWhere, createUserTotpAuthenticatorUserAuthSelect, userAuthSchemaInstance, userAuthCollectionName, { session })

		if (!userAuthResult.success || !userAuthResult?.result || userAuthResult.result?.length !== 1) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('创建 TOTP 身份验证器失败，用户不存在', { uuid })
			return { success: false, isExists: false, message: '创建 TOTP 身份验证器失败，用户不存在' }
		}

		if (userAuthResult.result[0].authenticatorType === 'email') {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('创建 TOTP 身份验证器失败，已经开启 Email 2FA', { uuid })
			return { success: false, isExists: true, existsAuthenticatorType: 'email', message: '创建 TOTP 身份验证器失败，已经开启 Email 2FA' }
		}

		if (userAuthResult.result[0].authenticatorType === 'email') {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('创建 TOTP 身份验证器失败，已经开启 TOTP 2FA', { uuid })
			return { success: false, isExists: true, existsAuthenticatorType: 'totp', message: '创建 TOTP 身份验证器失败，已经开启 TOTP 2FA' }
		}

		const { collectionName: userTotpAuthenticatorCollectionName, schemaInstance: userTotpAuthenticatorSchemaInstance } = UserTotpAuthenticatorSchema
		type UserAuthenticator = InferSchemaType<typeof userTotpAuthenticatorSchemaInstance>
		const checkUserAuthenticatorWhere: QueryType<UserAuthenticator> = { UUID: uuid, enabled: true }
		const checkUserAuthenticatorSelect: SelectType<UserAuthenticator> = { enabled: 1, createDateTime: 1 }
		const checkUserAuthenticatorResult = await selectDataFromMongoDB(checkUserAuthenticatorWhere, checkUserAuthenticatorSelect, userTotpAuthenticatorSchemaInstance, userTotpAuthenticatorCollectionName, { session })

		if (!checkUserAuthenticatorResult.success || !checkUserAuthenticatorResult.result) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('创建 TOTP 身份验证器失败，验证器唯一检查失败', { uuid })
			return { success: false, isExists: false, message: '创建身份验证器失败，验证器唯一检查失败' }
		}

		if (checkUserAuthenticatorResult.result.length >= 1) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('创建 TOTP 身份验证器失败，数据库中已经存储了一个启用的 TOTP 2FA', { uuid })
			return { success: false, isExists: true, existsAuthenticatorType: 'totp', message: '创建 TOTP 身份验证器失败，数据库中已经存储了一个启用的身份验证器' }
		}

		const now = new Date().getTime()
		const secret = authenticator.generateSecret()
		const email = userAuthResult.result[0].email
		const otpAuth = authenticator.keyuri(email, 'KIRAKIRA☆DOUGA', secret)
		const attempts = 0

		// 准备要插入的身份验证器数据
		const userAuthenticatorData: UserAuthenticator = {
			UUID: uuid,
			enabled: false,
			secret,
			otpAuth,
			backupCodeHash: [],
			attempts,
			lastAttemptTime: now,
			createDateTime: now,
			editDateTime: now,
		}

		// 插入数据到数据库
		const saveTotpAuthenticatorResult = await insertData2MongoDB<UserAuthenticator>(userAuthenticatorData, userTotpAuthenticatorSchemaInstance, userTotpAuthenticatorCollectionName, { session })

		if (!saveTotpAuthenticatorResult.success) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('创建 TOTP 身份验证器失败，保存数据失败', { uuid })
			return { success: false, isExists: false, message: '创建 TOTP 身份验证器失败，保存数据失败' }
		}

		await session.commitTransaction()
		session.endSession()
		return { success: true, isExists: false, message: '创建 TOTP 身份验证器成功', result: { otpAuth } }
	} catch (error) {
		console.error('创建 TOTP 身份验证器失败时出错，未知错误', error)
		return { success: false, isExists: false, message: '创建 TOTP 身份验证器时出错，未知错误' }
	}
}

/**
 * 用户确认绑定 TOTP 设备
 * @param confirmUserTotpAuthenticatorRequest 用户确认绑定 TOTP 设备的请求载荷
 * @param uuid 用户的 UUID
 * @param token 用户的 token
 * @returns 用户确认绑定 TOTP 设备的请求响应
 */
export const confirmUserTotpAuthenticatorService = async (confirmUserTotpAuthenticatorRequest: ConfirmUserTotpAuthenticatorRequestDto, uuid: string, token: string): Promise<ConfirmUserTotpAuthenticatorResponseDto> => {
	try {
		if (!await checkUserTokenByUUID(uuid, token)) {
			console.error('Confirm TOTP device failed: invalid user')
			return { success: false, message: 'Confirm TOTP device failed: invalid user' }
		}

		const { clientOtp, otpAuth } = confirmUserTotpAuthenticatorRequest

		const { collectionName: userTotpAuthenticatorCollectionName, schemaInstance: userTotpAuthenticatorSchemaInstance } = UserTotpAuthenticatorSchema
		type UserAuthenticator = InferSchemaType<typeof userTotpAuthenticatorSchemaInstance>
		const confirmUserTotpAuthenticatorWhere: QueryType<UserAuthenticator> = {
			UUID: uuid,
			enabled: false,
			otpAuth,
		}
		const confirmUserTotpAuthenticatorSelect: SelectType<UserAuthenticator> = {
			secret: 1,
		}

		const session = await mongoose.startSession()
		session.startTransaction()

		const selectResult = await selectDataFromMongoDB<UserAuthenticator>(confirmUserTotpAuthenticatorWhere, confirmUserTotpAuthenticatorSelect, userTotpAuthenticatorSchemaInstance, userTotpAuthenticatorCollectionName, { session })

		if (!selectResult.success || selectResult.result.length !== 1) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('Confirm TOTP device failed: failed to get verification data')
			return { success: false, message: 'Confirm TOTP device failed: failed to get verification data' }
		}

		const totpSecret = selectResult.result[0].secret
		if (!authenticator.check(clientOtp, totpSecret)) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('Confirm TOTP device failed: verification failed')
			return { success: false, message: 'Confirm TOTP device failed: verification failed' }
		}

		const now = new Date().getTime()
		const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
		const recoveryCode = generateSecureVerificationStringCode(24, charset)
		const recoveryCodeHash = hashPasswordSync(recoveryCode)
		const backupCode = Array.from({ length: 5 }, () => generateSecureVerificationStringCode(6, charset))
		const backupCodeHash = backupCode.map(hashPasswordSync)

		const confirmUserTotpAuthenticatorUpdate: UpdateType<UserAuthenticator> = {
			enabled: true,
			recoveryCodeHash,
			backupCodeHash,
			editDateTime: now,
		}

		const updateAuthenticatorResult = await findOneAndUpdateData4MongoDB<UserAuthenticator>(confirmUserTotpAuthenticatorWhere, confirmUserTotpAuthenticatorUpdate, userTotpAuthenticatorSchemaInstance, userTotpAuthenticatorCollectionName, { session })

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>

		const userAuthWhere: QueryType<UserAuth> = {
			UUID: uuid,
		}
		const userAuthUpdate: UpdateType<UserAuth> = {
			authenticatorType: 'totp',
			editDateTime: now,
		}
		const updateUserAuthResult = await findOneAndUpdateData4MongoDB<UserAuthenticator>(userAuthWhere, userAuthUpdate, userAuthSchemaInstance, userAuthCollectionName, { session })

		if (!updateAuthenticatorResult.success || !updateAuthenticatorResult.result || !updateUserAuthResult.success || !updateUserAuthResult.result) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('Confirm TOTP device failed: update failed')
			return { success: false, message: 'Confirm TOTP device failed: update failed' }
		}

		await session.commitTransaction()
		session.endSession()
		return { success: true, result: { backupCode, recoveryCode }, message: '已绑定 TOTP 设备' }
	} catch (error) {
		console.error('Confirm TOTP device failed: unknown error', error)
		return { success: false, message: 'Confirm TOTP device failed: unknown error' }
	}
}

/**
 * 用户创建 Email 身份验证器服务
 * @param uuid 用户的 UUID
 * @param token 用户的 token
 * @returns 用户创建 Email 身份验证器的请求响应
 */
export const createUserEmailAuthenticatorService = async (uuid: string, token: string): Promise<CreateUserEmailAuthenticatorResponseDto> => {
	try {
		if (!await checkUserTokenByUUID(uuid, token)) {
			console.error('创建 Email 身份验证器失败，非法用户', { uuid })
			return { success: false, isExists: false, message: '创建 Email 身份验证器失败，非法用户' }
		}

		const session = await mongoose.startSession()
		session.startTransaction()

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>

		const createUserEmailAuthenticatorUserAuthWhere: QueryType<UserAuth> = { UUID: uuid }
		const createUserEmailAuthenticatorUserAuthSelect: SelectType<UserAuth> = {
			authenticatorType: 1,
			emailLowerCase: 1,
			email: 1,
		}
		const userAuthResult = await selectDataFromMongoDB<UserAuth>(createUserEmailAuthenticatorUserAuthWhere, createUserEmailAuthenticatorUserAuthSelect, userAuthSchemaInstance, userAuthCollectionName, { session })
		if (!userAuthResult.success || !userAuthResult?.result || userAuthResult.result?.length !== 1) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('创建 TOTP 身份验证器失败，用户不存在', { uuid })
			return { success: false, isExists: false, message: '创建 TOTP 身份验证器失败，用户不存在' }
		}

		const email = userAuthResult.result[0].email
		const emailLowerCase = userAuthResult.result[0].emailLowerCase
		if (!emailLowerCase) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('创建 TOTP 身份验证器失败，未找到邮箱', { uuid })
			return { success: false, isExists: false, message: '创建 TOTP 身份验证器失败，未找到邮箱' }
		}

		if (userAuthResult.result[0].authenticatorType === 'email') {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('创建 TOTP 身份验证器失败，已经开启 Email 2FA', { uuid })
			return { success: false, isExists: true, existsAuthenticatorType: 'email', message: '创建 TOTP 身份验证器失败，已经开启 Email 2FA' }
		}

		if (userAuthResult.result[0].authenticatorType === 'totp') {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('创建 TOTP 身份验证器失败，已经开启 TOTP 2FA', { uuid })
			return { success: false, isExists: true, existsAuthenticatorType: 'totp', message: '创建 TOTP 身份验证器失败，已经开启 TOTP 2FA' }
		}

		const { collectionName: UserEmailAuthenticatorCollectionName, schemaInstance: userEmailAuthenticatorSchemaInstance } = UserEmailAuthenticatorSchema
		type UserAuthenticator = InferSchemaType<typeof userEmailAuthenticatorSchemaInstance>
		const checkUserAuthenticatorWhere: QueryType<UserAuthenticator> = { UUID: uuid, enabled: true }
		const checkUserAuthenticatorSelect: SelectType<UserAuthenticator> = {
			enabled: 1,
			createDateTime: 1
		}

		const checkUserAuthenticatorResult = await selectDataFromMongoDB(checkUserAuthenticatorWhere, checkUserAuthenticatorSelect, userEmailAuthenticatorSchemaInstance, UserEmailAuthenticatorCollectionName, { session })

		if (!checkUserAuthenticatorResult.success || !checkUserAuthenticatorResult.result) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('创建 Email 身份验证器失败，验证器唯一检查失败', { uuid })
			return { success: false, isExists: false, message: '创建身份验证器失败，验证器唯一检查失败' }
		}

		if (checkUserAuthenticatorResult.result.length >= 1) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('创建 Email 身份验证器失败，数据库中已经存储了一个启用的 Email 2FA', { uuid })
			return { success: false, isExists: true, existsAuthenticatorType: 'email', message: '创建 Email 身份验证器失败，数据库中已经存储了一个启用的' }
		}

		const now = new Date().getTime()

		// 准备要插入的身份验证器数据
		const userAuthenticatorData: UserAuthenticator = {
			UUID: uuid,
			enabled: true,
			emailLowerCase,
			createDateTime: now,
			editDateTime: now,
		}

		// 插入数据到数据库
		const saveEmailAuthenticatorResult = await insertData2MongoDB<UserAuthenticator>(userAuthenticatorData, userEmailAuthenticatorSchemaInstance, UserEmailAuthenticatorCollectionName, { session })

		if (!saveEmailAuthenticatorResult.success) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('创建 Email 身份验证器失败，保存数据失败-1', { uuid })
			return { success: false, isExists: false, message: '创建 Email 身份验证器失败，保存数据失败-1' }
		}
		const userAuthWhere: QueryType<UserAuth> = {
			UUID: uuid,
		}
		const userAuthUpdate: UpdateType<UserAuth> = {
			authenticatorType: 'email',
			editDateTime: now,
		}
		const updateUserAuthResult = await findOneAndUpdateData4MongoDB<UserAuthenticator>(userAuthWhere, userAuthUpdate, userAuthSchemaInstance, userAuthCollectionName, { session })

		if (!updateUserAuthResult.success || !updateUserAuthResult.result) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('创建 Email 身份验证器失败，保存数据失败-2', { uuid })
			return { success: false, isExists: false, message: '创建 Email 身份验证器失败，保存数据失败-2' }
		}

		await session.commitTransaction()
		session.endSession()
		return { success: true, isExists: false, message: '创建 Email 身份验证器成功', result: { email, emailLowerCase } }
	} catch (error) {
		console.error('创建 Email 身份验证器失败时出错，未知错误', error)
		return { success: false, isExists: false, message: '创建 Email 身份验证器时出错，未知错误' }
	}
}

/**
 * 用户发送 Email 身份验证器验证邮件
 * @param sendUserEmailAuthenticatorRequestDto 用户发送 Email 身份验证器验证邮件的请求载荷
 * @returns 用户发送 Email 身份验证器验证邮件的请求响应
 */
export const sendUserEmailAuthenticatorService = async (sendUserEmailAuthenticatorVerificationCodeRequest: SendUserEmailAuthenticatorVerificationCodeRequestDto): Promise<SendUserEmailAuthenticatorVerificationCodeResponseDto> => {
	try {
		if (!checkSendUserEmailAuthenticatorVerificationCodeRequest(sendUserEmailAuthenticatorVerificationCodeRequest)) {
			console.error('ERROR', '请求发送身份验证器的邮箱验证码失败，参数不合法')
			return { success: false, isCoolingDown: false, message: '请求发送身份验证器的邮箱验证码失败，参数不合法' }
		}

		const { clientLanguage, email, passwordHash } = sendUserEmailAuthenticatorVerificationCodeRequest
		const emailLowerCase = email.toLowerCase()

		const nowTime = new Date().getTime()
		const todayStart = new Date()
		todayStart.setHours(0, 0, 0, 0)

		// 启动事务
		const session = await createAndStartSession()

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema

		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>

		const sendUserEmailAuthenticatorUserAuthWhere: QueryType<UserAuth> = { emailLowerCase: emailLowerCase }
		const sendUserEmailAuthenticatorUserAuthSelect: SelectType<UserAuth> = {
			passwordHashHash: 1,
			authenticatorType: 1,
			UUID: 1,
		}
		const userAuthResult = await selectDataFromMongoDB<UserAuth>(sendUserEmailAuthenticatorUserAuthWhere, sendUserEmailAuthenticatorUserAuthSelect, userAuthSchemaInstance, userAuthCollectionName, { session })
		const userAuthData = userAuthResult.result?.[0]
		const { UUID: uuid, passwordHashHash } = userAuthData

		if (!userAuthResult.success || userAuthResult.result?.length !== 1 || !email) {
			await abortAndEndSession(session)
			console.error('请求发送身份验证器的邮箱验证码失败，用户不存在')
			return { success: false, isCoolingDown: false, message: '请求发送身份验证器的邮箱验证码失败，用户不存在' }
		}

		const isCorrectPassword = comparePasswordSync(passwordHash, passwordHashHash)
		if (!isCorrectPassword) {
			await abortAndEndSession(session)
			console.error('请求发送身份验证器的邮箱验证码失败，密码错误')
			return { success: false, isCoolingDown: false, message: '请求发送身份验证器的邮箱验证码失败，密码错误' }
		}

		if (userAuthData.authenticatorType !== 'email') {
			await abortAndEndSession(session)
			console.error('请求发送身份验证器的邮箱验证码失败，用户未开启 2FA 或者 2FA 方式不是 Email。')
			return { success: false, isCoolingDown: false, message: '请求发送身份验证器的邮箱验证码失败，用户未开启 2FA 或者 2FA 方式不是 Email。' }
		}

		const { collectionName: userEmailAuthenticatorVerificationCodeCollectionName, schemaInstance: userEmailAuthenticatorVerificationCodeSchemaInstance } = UserEmailAuthenticatorVerificationCodeSchema
		type UserEmailAuthenticatorVerificationCode = InferSchemaType<typeof userEmailAuthenticatorVerificationCodeSchemaInstance>
		const requestSendEmailAuthenticatorByEmailVerificationCodeWhere: QueryType<UserEmailAuthenticatorVerificationCode> = {
			UUID: uuid,
		}

		const requestSendEmailAuthenticatorByEmailVerificationCodeSelect: SelectType<UserEmailAuthenticatorVerificationCode> = {
			emailLowerCase: 1, // 用户邮箱
			attemptsTimes: 1, // 验证码请求次数
			lastRequestDateTime: 1, // 用户上一次请求验证码的时间，用于防止滥用
		}

		const requestSendEmailAuthenticatorByEmailVerificationCodeResult = await selectDataFromMongoDB<UserEmailAuthenticatorVerificationCode>(requestSendEmailAuthenticatorByEmailVerificationCodeWhere, requestSendEmailAuthenticatorByEmailVerificationCodeSelect, userEmailAuthenticatorVerificationCodeSchemaInstance, userEmailAuthenticatorVerificationCodeCollectionName, { session })

		if (!requestSendEmailAuthenticatorByEmailVerificationCodeResult.success) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('ERROR', '请求发送身份验证器的邮箱验证码失败，获取验证码失败')
			return { success: false, isCoolingDown: false, message: '请求发送身份验证器的邮箱验证码失败，获取验证码失败' }
		}

		const lastRequestDateTime = requestSendEmailAuthenticatorByEmailVerificationCodeResult.result?.[0]?.lastRequestDateTime ?? 0
		if (requestSendEmailAuthenticatorByEmailVerificationCodeResult.result.length >= 1 && lastRequestDateTime + 55000 > nowTime) { // 是否仍在冷却，前端 60 秒，后端 55 秒
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.warn('WARN', 'WARNING', '请求发送身份验证器的邮箱验证码失败，未超过邮件超时时间，请稍后再试')
			return { success: true, isCoolingDown: true, message: '请求发送身份验证器的邮箱验证码失败，未超过邮件超时时间，请稍后再试' }
		}

		const attemptsTimes = requestSendEmailAuthenticatorByEmailVerificationCodeResult.result?.[0]?.attemptsTimes ?? 0
		const lastRequestDate = new Date(lastRequestDateTime)
		if (requestSendEmailAuthenticatorByEmailVerificationCodeResult.result.length >= 1 && todayStart < lastRequestDate && attemptsTimes > 5) { // ! 每天五次机会
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.warn('WARN', 'WARNING', '请求发送身份验证器的邮箱验证码失败，已达本日重复次数上限，请稍后再试')
			return { success: true, isCoolingDown: true, message: '请求发送身份验证器的邮箱验证码失败，已达本日重复次数上限，请稍后再试' }
		}

		const verificationCode = generateSecureVerificationNumberCode(6) // 生成六位随机数验证码
		let newAttemptsTimes = attemptsTimes + 1
		if (todayStart > lastRequestDate) {
			newAttemptsTimes = 0
		}

		const requestSeDeleteTotpAuthenticatorVerificationCodeUpdate: UpdateType<UserEmailAuthenticatorVerificationCode> = {
			verificationCode,
			overtimeAt: nowTime + 1800000, // 当前时间加上 1800000 毫秒（30 分钟）作为新的过期时间
			attemptsTimes: newAttemptsTimes,
			lastRequestDateTime: nowTime,
			editDateTime: nowTime,
		}

		const updateResult = await findOneAndUpdateData4MongoDB(requestSendEmailAuthenticatorByEmailVerificationCodeWhere, requestSeDeleteTotpAuthenticatorVerificationCodeUpdate, userEmailAuthenticatorVerificationCodeSchemaInstance, userEmailAuthenticatorVerificationCodeCollectionName, { session })

		if (!updateResult.success) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('ERROR', '请求发送身份验证器的邮箱验证码失败，更新或新增用户验证码失败')
			return { success: false, isCoolingDown: false, message: '请求发送身份验证器的邮箱验证码失败，更新或新增用户验证码失败' }
		}

		try {
			const mail = getI18nLanguagePack(clientLanguage, "SendLoginVerificationCode")
			const correctMailTitle = mail?.mailTitle
			const correctMailHTML = mail?.mailHtml?.replaceAll('{{verificationCode}}', verificationCode)

			const sendMailResult = await sendMail(email, correctMailTitle, { html: correctMailHTML })

			if (!sendMailResult.success) {
				if (session.inTransaction()) {
					await session.abortTransaction()
				}
				session.endSession()
				console.error('ERROR', '请求发送验证身份验证器的邮箱验证码失败，邮件发送失败')
				return { success: false, isCoolingDown: true, message: '请求发送验证身份验证器的邮箱验证码失败，邮件发送失败' }
			}

			await session.commitTransaction()
			session.endSession()
			return { success: true, isCoolingDown: false, message: '验证身份验证器的邮箱验证码已发送至你注册时使用的邮箱，请注意查收，如未收到，请检查垃圾箱或联系 KIRAKIRA 客服。' }
		} catch (error) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('ERROR', '请求发送验证身份验证器的邮箱验证码时出错，邮件发送时出错', error)
			return { success: false, isCoolingDown: true, message: '请求发送验证身份验证器的邮箱验证码时出错，邮件发送时出错' }
		}
	} catch (error) {
		console.error('ERROR', '请求发送验证身份验证器的邮箱验证码时出错，未知错误', error)
		return { success: false, isCoolingDown: false, message: '请求发送验证身份验证器的邮箱验证码时出错，未知错误' }
	}
}

/**
 * 用户发送删除 Email 身份验证器验证邮件
 * @param sendDeleteUserEmailAuthenticatorVerificationCodeRequest 用户发送删除 Email 身份验证器验证邮件的请求载荷
 * @returns 用户发送 Email 身份验证器验证邮件的请求响应
 */
export const sendDeleteUserEmailAuthenticatorService = async (sendDeleteUserEmailAuthenticatorVerificationCodeRequest: SendDeleteUserEmailAuthenticatorVerificationCodeRequestDto, uuid: string, token: string): Promise<SendDeleteUserEmailAuthenticatorVerificationCodeResponseDto> => {
	try {
		if (!checkSendDeleteUserEmailAuthenticatorVerificationCodeRequest(sendDeleteUserEmailAuthenticatorVerificationCodeRequest)) {
			console.error('ERROR', '请求发送身份验证器的邮箱验证码失败，参数不合法')
			return { success: false, isCoolingDown: false, message: '请求发送身份验证器的邮箱验证码失败，参数不合法' }
		}

		if (!await checkUserTokenByUUID(uuid, token)) {
			console.error('请求发送身份验证器的邮箱验证码失败，用户校验未通过')
			return { success: false, isCoolingDown: false, message: '请求发送身份验证器的邮箱验证码失败，用户校验未通过' }
		}

		const { clientLanguage } = sendDeleteUserEmailAuthenticatorVerificationCodeRequest

		const nowTime = new Date().getTime()
		const todayStart = new Date()
		todayStart.setHours(0, 0, 0, 0)

		// 启动事务
		const session = await createAndStartSession()

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema

		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>

		const sendDeleteUserEmailAuthenticatorUserAuthWhere: QueryType<UserAuth> = { UUID: uuid }
		const sendDeleteUserEmailAuthenticatorUserAuthSelect: SelectType<UserAuth> = {
			authenticatorType: 1,
			email: 1,
		}
		const userAuthResult = await selectDataFromMongoDB<UserAuth>(sendDeleteUserEmailAuthenticatorUserAuthWhere, sendDeleteUserEmailAuthenticatorUserAuthSelect, userAuthSchemaInstance, userAuthCollectionName, { session })
		const userAuthData = userAuthResult.result?.[0]
		const { authenticatorType, email } = userAuthData

		if (!userAuthResult.success || userAuthResult.result?.length !== 1 || !email) {
			await abortAndEndSession(session)
			console.error('请求发送身份验证器的邮箱验证码失败，用户不存在')
			return { success: false, isCoolingDown: false, message: '请求发送身份验证器的邮箱验证码失败，用户不存在' }
		}

		if (authenticatorType !== 'email') {
			await abortAndEndSession(session)
			console.error('请求发送身份验证器的邮箱验证码失败，用户未开启 2FA 或者 2FA 方式不是 Email。')
			return { success: false, isCoolingDown: false, message: '请求发送身份验证器的邮箱验证码失败，用户未开启 2FA 或者 2FA 方式不是 Email。' }
		}

		const { collectionName: userEmailAuthenticatorVerificationCodeCollectionName, schemaInstance: userEmailAuthenticatorVerificationCodeSchemaInstance } = UserEmailAuthenticatorVerificationCodeSchema
		type UserEmailAuthenticatorVerificationCode = InferSchemaType<typeof userEmailAuthenticatorVerificationCodeSchemaInstance>
		const requestSendEmailAuthenticatorByEmailVerificationCodeWhere: QueryType<UserEmailAuthenticatorVerificationCode> = {
			UUID: uuid,
		}

		const requestSendEmailAuthenticatorByEmailVerificationCodeSelect: SelectType<UserEmailAuthenticatorVerificationCode> = {
			emailLowerCase: 1, // 用户邮箱
			attemptsTimes: 1, // 验证码请求次数
			lastRequestDateTime: 1, // 用户上一次请求验证码的时间，用于防止滥用
		}

		const requestSendEmailAuthenticatorByEmailVerificationCodeResult = await selectDataFromMongoDB<UserEmailAuthenticatorVerificationCode>(requestSendEmailAuthenticatorByEmailVerificationCodeWhere, requestSendEmailAuthenticatorByEmailVerificationCodeSelect, userEmailAuthenticatorVerificationCodeSchemaInstance, userEmailAuthenticatorVerificationCodeCollectionName, { session })

		if (!requestSendEmailAuthenticatorByEmailVerificationCodeResult.success) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('ERROR', '请求发送身份验证器的邮箱验证码失败，获取验证码失败')
			return { success: false, isCoolingDown: false, message: '请求发送身份验证器的邮箱验证码失败，获取验证码失败' }
		}

		const lastRequestDateTime = requestSendEmailAuthenticatorByEmailVerificationCodeResult.result?.[0]?.lastRequestDateTime ?? 0
		if (requestSendEmailAuthenticatorByEmailVerificationCodeResult.result.length >= 1 && lastRequestDateTime + 55000 > nowTime) { // 是否仍在冷却，前端 60 秒，后端 55 秒
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.warn('WARN', 'WARNING', '请求发送身份验证器的邮箱验证码失败，未超过邮件超时时间，请稍后再试')
			return { success: true, isCoolingDown: true, message: '请求发送身份验证器的邮箱验证码失败，未超过邮件超时时间，请稍后再试' }
		}

		const attemptsTimes = requestSendEmailAuthenticatorByEmailVerificationCodeResult.result?.[0]?.attemptsTimes ?? 0
		const lastRequestDate = new Date(lastRequestDateTime)
		if (requestSendEmailAuthenticatorByEmailVerificationCodeResult.result.length >= 1 && todayStart < lastRequestDate && attemptsTimes > 5) { // ! 每天五次机会
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.warn('WARN', 'WARNING', '请求发送身份验证器的邮箱验证码失败，已达本日重复次数上限，请稍后再试')
			return { success: true, isCoolingDown: true, message: '请求发送身份验证器的邮箱验证码失败，已达本日重复次数上限，请稍后再试' }
		}

		const verificationCode = generateSecureVerificationNumberCode(6) // 生成六位随机数验证码
		let newAttemptsTimes = attemptsTimes + 1
		if (todayStart > lastRequestDate) {
			newAttemptsTimes = 0
		}

		const requestSeDeleteTotpAuthenticatorVerificationCodeUpdate: UpdateType<UserEmailAuthenticatorVerificationCode> = {
			verificationCode,
			overtimeAt: nowTime + 1800000, // 当前时间加上 1800000 毫秒（30 分钟）作为新的过期时间
			attemptsTimes: newAttemptsTimes,
			lastRequestDateTime: nowTime,
			editDateTime: nowTime,
		}

		const updateResult = await findOneAndUpdateData4MongoDB(requestSendEmailAuthenticatorByEmailVerificationCodeWhere, requestSeDeleteTotpAuthenticatorVerificationCodeUpdate, userEmailAuthenticatorVerificationCodeSchemaInstance, userEmailAuthenticatorVerificationCodeCollectionName, { session })

		if (!updateResult.success) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('ERROR', '请求发送身份验证器的邮箱验证码失败，更新或新增用户验证码失败')
			return { success: false, isCoolingDown: false, message: '请求发送身份验证器的邮箱验证码失败，更新或新增用户验证码失败' }
		}

		try {
			const mail = getI18nLanguagePack(clientLanguage, "SendDisableUserEmail2FAVerificationCode")
			const correctMailTitle = mail?.mailTitle
			const correctMailHTML = mail?.mailHtml?.replaceAll('{{verificationCode}}', verificationCode)

			const sendMailResult = await sendMail(email, correctMailTitle, { html: correctMailHTML })

			if (!sendMailResult.success) {
				if (session.inTransaction()) {
					await session.abortTransaction()
				}
				session.endSession()
				console.error('ERROR', '请求发送验证身份验证器的邮箱验证码失败，邮件发送失败')
				return { success: false, isCoolingDown: true, message: '请求发送验证身份验证器的邮箱验证码失败，邮件发送失败' }
			}

			await session.commitTransaction()
			session.endSession()
			return { success: true, isCoolingDown: false, message: '验证身份验证器的邮箱验证码已发送至你注册时使用的邮箱，请注意查收，如未收到，请检查垃圾箱或联系 KIRAKIRA 客服。' }
		} catch (error) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('ERROR', '请求发送验证身份验证器的邮箱验证码时出错，邮件发送时出错', error)
			return { success: false, isCoolingDown: true, message: '请求发送验证身份验证器的邮箱验证码时出错，邮件发送时出错' }
		}
	} catch (error) {
		console.error('ERROR', '请求发送验证身份验证器的邮箱验证码时出错，未知错误', error)
		return { success: false, isCoolingDown: false, message: '请求发送验证身份验证器的邮箱验证码时出错，未知错误' }
	}
}

/**
 * 验证邮箱身份验证器的验证码是否正确
 * @param checkEmailAuthenticatorVerificationCodeRequest 用户通过邮箱验证码验证身份验证器的请求载荷
 * @returns 删除操作的结果
 */
const checkEmailAuthenticatorVerificationCodeService = async (checkEmailAuthenticatorVerificationCodeRequest: CheckEmailAuthenticatorVerificationCodeRequestDto): Promise<CheckEmailAuthenticatorVerificationCodeResponseDto> => {
	try {
		if (!checkEmailAuthenticatorVerificationCodeRequest.email && !checkEmailAuthenticatorVerificationCodeRequest.verificationCode) {
			console.error('ERROR', '用户通过邮箱验证码验证身份验证器失败时失败，参数不合法')
			return { success: false, message: '用户通过邮箱验证码验证身份验证器失败时失败，参数不合法' }
		}

		const session = await mongoose.startSession()
		session.startTransaction()

		const now = new Date().getTime()
		const { email, verificationCode } = checkEmailAuthenticatorVerificationCodeRequest

		const emailLowerCase = email.toLowerCase()

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>

		const checkEmailAuthenticatorVerificationCodeUserAuthWhere: QueryType<UserAuth> = { emailLowerCase }
		const checkEmailAuthenticatorVerificationCodeUserAuthSelect: SelectType<UserAuth> = {
			UUID: 1,
		}
		const userAuthResult = await selectDataFromMongoDB<UserAuth>(checkEmailAuthenticatorVerificationCodeUserAuthWhere, checkEmailAuthenticatorVerificationCodeUserAuthSelect, userAuthSchemaInstance, userAuthCollectionName, { session })
		const uuid = userAuthResult.result?.[0].UUID

		if (!userAuthResult || !userAuthResult.success || !uuid) {
			console.error('ERROR', '用户通过邮箱验证码验证身份验证器失败时失败，用户不存在')
			return { success: false, message: '用户通过邮箱验证码验证身份验证器失败时失败，用户不存在' }
		}

		const { collectionName: UserEmailAuthenticatorVerificationCodeCollectionName, schemaInstance: UserEmailAuthenticatorVerificationCodeSchemaInstance } = UserEmailAuthenticatorVerificationCodeSchema

		type UserEmailAuthenticatorVerificationCode = InferSchemaType<typeof UserEmailAuthenticatorVerificationCodeSchemaInstance>
		const checkDeleteTotpAuthenticatorEmailVerificationCodeWhere: QueryType<UserEmailAuthenticatorVerificationCode> = {
			UUID: uuid,
			verificationCode,
			overtimeAt: { $gte: now },
		}
		const checkDeleteTotpAuthenticatorEmailVerificationCodeSelect: SelectType<UserEmailAuthenticatorVerificationCode> = {
			emailLowerCase: 1, // 用户邮箱
		}

		const checkUserEmailAuthenticatorVerificationCodeResult = await selectDataFromMongoDB<UserEmailAuthenticatorVerificationCode>(checkDeleteTotpAuthenticatorEmailVerificationCodeWhere, checkDeleteTotpAuthenticatorEmailVerificationCodeSelect, UserEmailAuthenticatorVerificationCodeSchemaInstance, UserEmailAuthenticatorVerificationCodeCollectionName, { session })

		if (!checkUserEmailAuthenticatorVerificationCodeResult.success || checkUserEmailAuthenticatorVerificationCodeResult.result?.length !== 1) {
			if (session.inTransaction()) {
				await session.abortTransaction()
			}
			session.endSession()
			console.error('ERROR', '已登录用户通过密码和邮箱验证码删除身份验证器失败：邮箱验证码验证失败')
			return { success: false, message: '已登录用户通过密码和邮箱验证码删除身份验证器失败：邮箱验证码验证失败' }
		}

		await session.commitTransaction()
		session.endSession()
		return { success: true, message: '验证身份验证器成功' }
	} catch (error) {
		console.error('用户通过邮箱验证码验证身份验证器失败时出错，未知错误', error)
		return { success: false, message: '用户通过邮箱验证码验证身份验证器失败时出错，未知错误' }
	}
}

/**
 * 用户删除 Email 2FA
 * @param deleteUserEmailAuthenticatorRequest
 * @param uuid 用户的 UUID
 * @param token 用户的 token
 */
export const deleteUserEmailAuthenticatorService = async (deleteUserEmailAuthenticatorRequest: DeleteUserEmailAuthenticatorRequestDto, uuid: string, token: string): Promise<DeleteUserEmailAuthenticatorResponseDto> => {
	try {
		if (!checkDeleteUserEmailAuthenticatorRequest(deleteUserEmailAuthenticatorRequest)) {
			console.error('用户删除 Email 2FA 时失败，参数非法')
			return { success: false, message: '用户删除 Email 2FA 时失败，参数非法' }
		}

		if (!await checkUserTokenByUUID(uuid, token)) {
			console.error('用户删除 Email 2FA 时失败，用户校验未通过')
			return { success: false, message: '用户删除 Email 2FA 时失败，用户校验未通过' }
		}

		const { passwordHash, verificationCode } = deleteUserEmailAuthenticatorRequest

		const session = await mongoose.startSession()
		session.startTransaction()

		const { collectionName: userAuthCollectionName, schemaInstance: userAuthSchemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof userAuthSchemaInstance>

		const deleteUserEmailAuthenticatorUserAuthWhere: QueryType<UserAuth> = { UUID: uuid }
		const deleteUserEmailAuthenticatorUserAuthSelect: SelectType<UserAuth> = {
			authenticatorType: 1,
			emailLowerCase: 1,
			email: 1,
			passwordHashHash: 1,
		}
		const userAuthResult = await selectDataFromMongoDB<UserAuth>(deleteUserEmailAuthenticatorUserAuthWhere, deleteUserEmailAuthenticatorUserAuthSelect, userAuthSchemaInstance, userAuthCollectionName, { session })
		const userAuthData = userAuthResult.result?.[0]

		if (!userAuthResult.success || userAuthResult.result?.length !== 1) {
			await abortAndEndSession(session)
			console.error('用户删除 Email 2FA 时失败，用户不存在')
			return { success: false, message: '用户删除 Email 2FA 时失败，用户不存在' }
		}

		if (userAuthData.authenticatorType !== 'email') {
			await abortAndEndSession(session)
			console.error('用户删除 Email 2FA 时失败，用户未开启 2FA 或者 2FA 方式不是 Email。')
			return { success: false, message: '用户删除 Email 2FA 时失败，用户未开启 2FA 或者 2FA 方式不是 Email。' }
		}

		const isCorrectPassword = comparePasswordSync(passwordHash, userAuthData.passwordHashHash)
		if (!isCorrectPassword) {
			await abortAndEndSession(session)
			console.error('用户删除 Email 2FA 时失败，密码错误')
			return { success: false, message: '用户删除 Email 2FA 时失败，密码错误' }
		}

		const checkEmailAuthenticatorVerificationCodeRequest: CheckEmailAuthenticatorVerificationCodeRequestDto = {
			email: userAuthData.emailLowerCase,
			verificationCode,
		}
		const verificationCodeCheckResult = await checkEmailAuthenticatorVerificationCodeService(checkEmailAuthenticatorVerificationCodeRequest)

		if (!verificationCodeCheckResult || !verificationCodeCheckResult.success) {
			await abortAndEndSession(session)
			console.error('用户删除 Email 2FA 时失败，验证失败或验证码错误')
			return { success: false, message: '用户删除 Email 2FA 时失败，验证失败或验证码错误' }
		}

		// 1. 清理已经发送的验证码
		const { collectionName: UserEmailAuthenticatorVerificationCodeCollectionName, schemaInstance: UserEmailAuthenticatorVerificationCodeSchemaInstance } = UserEmailAuthenticatorVerificationCodeSchema
		type UserEmailAuthenticatorVerificationCode = InferSchemaType<typeof UserEmailAuthenticatorVerificationCodeSchemaInstance>
		const deleteUserEmailAuthenticatorVerificationCodeWhere: QueryType<UserEmailAuthenticatorVerificationCode> = { UUID: uuid }
		const deleteUserEmailAuthenticatorVerificationCodeResult = await deleteDataFromMongoDB(deleteUserEmailAuthenticatorVerificationCodeWhere, UserEmailAuthenticatorVerificationCodeSchemaInstance, UserEmailAuthenticatorVerificationCodeCollectionName, { session })

		if (!deleteUserEmailAuthenticatorVerificationCodeResult || !deleteUserEmailAuthenticatorVerificationCodeResult.success) {
			await abortAndEndSession(session)
			console.error('用户删除 Email 2FA 时失败，清理该用户的验证码失败', { UUID: uuid })
			return { success: false, message: '用户删除 Email 2FA 时失败，清理该用户的验证码失败' }
		}

		// 2. 删除 Email 2FA
		const { collectionName: UserEmailAuthenticatorCollectionName, schemaInstance: UserEmailAuthenticatorSchemaInstance } = UserEmailAuthenticatorSchema
		type UserEmailAuthenticator = InferSchemaType<typeof UserEmailAuthenticatorSchemaInstance>
		const deleteUserEmailAuthenticatorWhere: QueryType<UserEmailAuthenticator> = { UUID: uuid }
		const deleteUserEmailAuthenticatorResult = await deleteDataFromMongoDB(deleteUserEmailAuthenticatorWhere, UserEmailAuthenticatorSchemaInstance, UserEmailAuthenticatorCollectionName, { session })

		if (!deleteUserEmailAuthenticatorResult || !deleteUserEmailAuthenticatorResult.success) {
			await abortAndEndSession(session)
			console.error('用户删除 Email 2FA 时失败，删除该用户的邮箱验证失败', { UUID: uuid })
			return { success: false, message: '用户删除 Email 2FA 时失败，删除该用户的邮箱验证失败' }
		}

		// 3. 重置用户的 2FA 类型
		const resetUser2FATypeByUUIDResult = await resetUser2FATypeByUUID(uuid, session)

		if (!resetUser2FATypeByUUIDResult) {
			await abortAndEndSession(session)
			console.error('用户删除 Email 2FA 时失败，用户关闭 2FA 失败', { UUID: uuid })
			return { success: false, message: '用户删除 Email 2FA 时失败，用户关闭 2FA 失败' }
		}

		await commitAndEndSession(session)
		return { success: true, message: '用户删除 Email 2FA 成功' }
	} catch (error) {
		console.error('用户删除 Email 2FA 时出错，未知错误', error)
		return { success: false, message: '用户删除 Email 2FA 时出错，未知错误' }
	}
}

/**
 * 通过 Email 检查用户是否已开启 2FA 身份验证器
 * @param checkUserHave2FARequestDto 通过 Email 检查用户是否已开启 2FA 身份验证器的请求载荷
 * @returns 通过 Email 检查用户是否已开启 2FA 身份验证器的请求响应
 */
export const checkUserHave2FAByEmailService = async (checkUserHave2FARequestDto: CheckUserHave2FARequestDto): Promise<CheckUserHave2FAResponseDto> => {
	try {
		const { email } = checkUserHave2FARequestDto
		if (!email) {
			console.error('ERROR', `通过 Email 检查用户是否已开启 2FA 身份验证器失败，邮箱为空`)
			return { success: false, have2FA: false, message: '通过 Email 检查用户是否已开启 2FA 身份验证器失败，邮箱为空' }
		}

		const emailLowerCase = email.toLowerCase()

		const { collectionName, schemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof schemaInstance>

		const userAuthWhere: QueryType<UserAuth> = { emailLowerCase }
		const userAuthSelect: SelectType<UserAuth> = { authenticatorType: 1, UUID: 1 }

		const userAuthResult = await selectDataFromMongoDB<UserAuth>(userAuthWhere, userAuthSelect, schemaInstance, collectionName)
		if (!userAuthResult?.result || userAuthResult.result?.length !== 1) {
			console.error('ERROR', `通过 Email 检查用户是否已开启 2FA 身份验证器失败，未找到用户数据`)
			return { success: false, have2FA: false, message: '通过 Email 检查用户是否已开启 2FA 身份验证器失败，未找到用户数据' }
		}

		const UUID = userAuthResult.result[0].UUID
		if (!UUID) {
			console.error('ERROR', `通过 Email 检查用户是否已开启 2FA 身份验证器失败，未找到 UUID`)
			return { success: false, have2FA: false, message: '通过 Email 检查用户是否已开启 2FA 身份验证器失败，未找到 UUID' }
		}

		const authenticatorType = userAuthResult.result[0].authenticatorType
		if (authenticatorType === 'totp') {
			const { collectionName: userTotpAuthenticatorCollectionName, schemaInstance: userTotpAuthenticatorSchemaInstance } = UserTotpAuthenticatorSchema
			type UserTotpAuthenticator = InferSchemaType<typeof userTotpAuthenticatorSchemaInstance>

			const userTotpAuthenticatorWhere: QueryType<UserTotpAuthenticator> = { UUID, enabled: true }
			const userTotpAuthenticatorSelect: SelectType<UserTotpAuthenticator> = { createDateTime: 1 }

			const userTotpAuthenticatorResult = await selectDataFromMongoDB<UserTotpAuthenticator>(userTotpAuthenticatorWhere, userTotpAuthenticatorSelect, userTotpAuthenticatorSchemaInstance, userTotpAuthenticatorCollectionName)
			const totpCreationDateTime = userTotpAuthenticatorResult?.result?.[0].createDateTime

			return { success: true, have2FA: true, type: authenticatorType, totpCreationDateTime, message: '用户已开启 TOTP 2FA' }
		} else if (authenticatorType === 'email') {
			return { success: true, have2FA: true, type: authenticatorType, message: '用户已开启 Email 2FA' }
		} else {
			return { success: true, have2FA: false, message: '用户未开启 2FA' }
		}
	} catch (error) {
		console.error('通过 Email 检查用户是否已开启 2FA 身份验证器时出错，未知错误', error)
		return { success: false, have2FA: false, message: '通过 Email 检查用户是否已开启 2FA 身份验证器时出错，未知错误' }
	}
}

/**
 * 通过 UUID 检查用户是否已开启 2FA 身份验证器
 * @param uuid 用户的 UUID
 * @param token 用户的 token
 * @returns 通过 UUID 检查用户是否已开启 2FA 身份验证器的请求响应
 */
export const checkUserHave2FAByUUIDService = async (uuid: string, token: string): Promise<CheckUserHave2FAResponseDto> => {
	try {
		if (!await checkUserTokenByUUID(uuid, token)) {
			console.error('ERROR', `通过 UUID 检查用户是否已开启 2FA 身份验证器失败，非法用户`)
			return { success: false, have2FA: false, message: '通过 UUID 检查用户是否已开启 2FA 身份验证器失败，非法用户' }
		}

		const { collectionName, schemaInstance } = UserAuthSchema
		type UserAuth = InferSchemaType<typeof schemaInstance>

		const userAuthWhere: QueryType<UserAuth> = { UUID: uuid }
		const userAuthSelect: SelectType<UserAuth> = { authenticatorType: 1 }

		const userAuthResult = await selectDataFromMongoDB<UserAuth>(userAuthWhere, userAuthSelect, schemaInstance, collectionName)
		if (!userAuthResult?.result || userAuthResult.result?.length !== 1) {
			console.error('ERROR', `通过 UUID 检查用户是否已开启 2FA 身份验证器失败，未找到用户数据`)
			return { success: false, have2FA: false, message: '通过 UUID 检查用户是否已开启 2FA 身份验证器失败，未找到用户数据' }
		}

		const authenticatorType = userAuthResult.result[0].authenticatorType
		if (authenticatorType === 'totp') {
			const { collectionName: userTotpAuthenticatorCollectionName, schemaInstance: userTotpAuthenticatorSchemaInstance } = UserTotpAuthenticatorSchema
			type UserTotpAuthenticator = InferSchemaType<typeof userTotpAuthenticatorSchemaInstance>

			const userTotpAuthenticatorWhere: QueryType<UserTotpAuthenticator> = { UUID: uuid, enabled: true }
			const userTotpAuthenticatorSelect: SelectType<UserTotpAuthenticator> = { createDateTime: 1 }

			const userTotpAuthenticatorResult = await selectDataFromMongoDB<UserTotpAuthenticator>(userTotpAuthenticatorWhere, userTotpAuthenticatorSelect, userTotpAuthenticatorSchemaInstance, userTotpAuthenticatorCollectionName)
			const totpCreationDateTime = userTotpAuthenticatorResult?.result?.[0].createDateTime

			return { success: true, have2FA: true, type: authenticatorType, totpCreationDateTime, message: '用户已开启 TOTP 2FA' }
		} else if (authenticatorType === 'email') {
			return { success: true, have2FA: true, type: authenticatorType, message: '用户已开启 Email 2FA' }
		} else {
			return { success: true, have2FA: false, message: '用户未开启 2FA' }
		}
	} catch (error) {
		console.error('通过 UUID 检查用户是否已开启 2FA 身份验证器时出错，未知错误', error)
		return { success: false, have2FA: false, message: '通过 UUID 检查用户是否已开启 2FA 身份验证器时出错，未知错误' }
	}
}

/**
 * 校验用户注册信息
 * @param userRegistrationRequest
 * @returns boolean 如果合法则返回 true
 */
const checkUserRegistrationData = (userRegistrationRequest: UserRegistrationRequestDto): boolean => {
	// TODO // WARN 这里可能需要更安全的校验机制
	return (
		true
		&& !!userRegistrationRequest.passwordHash && !!userRegistrationRequest.email && !isInvalidEmail(userRegistrationRequest.email)
		&& !!userRegistrationRequest.verificationCode
		&& !!userRegistrationRequest.username
	)
}

/**
 * 用户邮箱是否存在验证的请求参数的非空验证
 * @param userEmailExistsCheckRequest
 * @returns boolean 合法则返回 true
 */
const checkUserEmailExistsCheckRequest = (userEmailExistsCheckRequest: UserEmailExistsCheckRequestDto): boolean => {
	// TODO // WARN 这里可能需要更安全的校验机制
	return (!!userEmailExistsCheckRequest.email && !isInvalidEmail(userEmailExistsCheckRequest.email))
}

/**
 * 用户登录的请求参数的校验
 * @param userExistsCheckRequest
 * @returns boolean 合法则返回 true
 */
const checkUserLoginRequest = (userLoginRequest: UserLoginRequestDto): boolean => {
	// TODO // WARN 这里可能需要更安全的校验机制
	return (!!userLoginRequest.email && !isInvalidEmail(userLoginRequest.email) && !!userLoginRequest.passwordHash)
}

/**
 * 用户修改邮箱的请求参数的非空验证
 * @param updateUserEmailRequest
 * @returns boolean 合法则返回 true
 */
const checkUpdateUserEmailRequest = (updateUserEmailRequest: UpdateUserEmailRequestDto): boolean => {
	// TODO // WARN 这里可能需要更安全的校验机制
	return (
		updateUserEmailRequest.uid !== null && updateUserEmailRequest.uid !== undefined
		&& !!updateUserEmailRequest.oldEmail && !isInvalidEmail(updateUserEmailRequest.oldEmail)
		&& !!updateUserEmailRequest.newEmail && !isInvalidEmail(updateUserEmailRequest.newEmail)
		&& !!updateUserEmailRequest.passwordHash
		&& !!updateUserEmailRequest.verificationCode
	)
}

/**
 * 允许关联的平台列表
 * // TODO 或许这些数据放到环境变量里更好？
 */
const ALLOWED_PLATFORM_ID = [
	'platform.twitter', // Twitter → X
	'platform.qq',
	'platform.wechat', // 微信
	'platform.bilibili',
	'platform.niconico',
	'platform.youtube',
	'platform.otomad_wiki', // 音 MAD 维基
	'platform.weibo', // 新浪微博
	'platform.tieba', // 百度贴吧
	'platform.cloudmusic', // 网易云音乐
	'platform.discord',
	'platform.telegram',
	'platform.midishow',
	'platform.linkedin', // 领英（海外版）
	'platform.facebook',
	'platform.instagram',
	'platform.douyin', // 抖音
	'platform.tiktok', // TikTok（抖音海外版）
	'platform.pixiv',
	'platform.github',
]

/**
 * 允许设置的隐私设置项
 * // TODO 或许这些数据放到环境变量里更好？
 */
const ALLOWED_PRIVARY_ID = [
	'privary.birthday', // 生日
	'privary.age', // 年龄
	'privary.follow', // 关注
	'privary.fans', // 粉丝
	'privary.favorites', // 收藏
]

/**
 * 检查更新或创建用户信息的请求参数
 * @param updateOrCreateUserInfoRequest 更新或创建用户信息的请求参数
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkUpdateOrCreateUserInfoRequest = (updateOrCreateUserInfoRequest: UpdateOrCreateUserInfoRequestDto): boolean => {
	// TODO 也许我们应该在未来为其添加更多验证以避免可能的注入风险

	if (!updateOrCreateUserInfoRequest || isEmptyObject(updateOrCreateUserInfoRequest)) {
		return false
	}

	if (updateOrCreateUserInfoRequest?.userLinkedAccounts?.some(account => !ALLOWED_PLATFORM_ID.includes(account.platformId))) {
		return false
	}

	return true
}

/**
 * 检查更新或创建用户设置时的请求参数
 * @param updateOrCreateUserSettingsRequest 更新或创建用户设置时的请求参数
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkUpdateOrCreateUserSettingsRequest = (updateOrCreateUserSettingsRequest: UpdateOrCreateUserSettingsRequestDto): boolean => {
	// TODO 也许我们应该在未来为其添加更多验证以避免可能的注入风险

	if (!updateOrCreateUserSettingsRequest || isEmptyObject(updateOrCreateUserSettingsRequest)) {
		return false
	}

	if (updateOrCreateUserSettingsRequest?.userLinkedAccountsVisibilitiesSetting?.some(account => !ALLOWED_PLATFORM_ID.includes(account.platformId))) {
		return false
	}

	if (updateOrCreateUserSettingsRequest?.userPrivaryVisibilitiesSetting?.some(account => !ALLOWED_PRIVARY_ID.includes(account.privaryId))) {
		return false
	}

	return true
}

/**
 * 检查请求发送验证码的请求参数
 * @param requestSendVerificationCodeRequest 请求发送验证码的请求参数
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkRequestSendVerificationCodeRequest = (requestSendVerificationCodeRequest: RequestSendVerificationCodeRequestDto): boolean => {
	return (!isInvalidEmail(requestSendVerificationCodeRequest.email))
}

/**
 * 检查使用邀请码注册的参数
 * @param useInvitationCodeDto 使用邀请码注册的参数
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkUseInvitationCodeDto = (useInvitationCodeDto: UseInvitationCodeDto): boolean => {
	return (
		useInvitationCodeDto.registrantUid !== null && useInvitationCodeDto.registrantUid !== undefined
		&& !!useInvitationCodeDto.invitationCode
	)
}

/**
 * 检查检查一个邀请码是否可用的请求载荷
 * @param checkInvitationCodeRequestDto 检查一个邀请码是否可用的请求载荷
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkCheckInvitationCodeRequestDto = (checkInvitationCodeRequestDto: CheckInvitationCodeRequestDto): boolean => {
	const invitationCodeRegex = /^KIRA-[A-Z0-9]{4}-[A-Z0-9]{4}$/
	return (!!checkInvitationCodeRequestDto.invitationCode && invitationCodeRegex.test(checkInvitationCodeRequestDto.invitationCode))
}

/**
 * 验证请求发送修改邮箱的邮箱验证码的请求载荷
 * @param requestSendChangeEmailVerificationCodeRequest 请求发送修改邮箱的邮箱验证码的请求载荷
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkRequestSendChangeEmailVerificationCodeRequest = (requestSendChangeEmailVerificationCodeRequest: RequestSendChangeEmailVerificationCodeRequestDto): boolean => {
	requestSendChangeEmailVerificationCodeRequest // TODO
	return true
}

/**
 * 验证请求发送修改密码的邮箱验证码的请求载荷
 * @param requestSendChangePasswordVerificationCodeRequest 请求发送修改密码的邮箱验证码的请求载荷
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkRequestSendChangePasswordVerificationCodeRequest = (requestSendChangePasswordVerificationCodeRequest: RequestSendChangePasswordVerificationCodeRequestDto): boolean => {
	requestSendChangePasswordVerificationCodeRequest // TODO
	return true
}

/**
 * 验证修改密码的请求载荷
 * @param updateUserPasswordRequest 修改密码的请求载荷
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkUpdateUserPasswordRequest = (updateUserPasswordRequest: UpdateUserPasswordRequestDto): boolean => {
	return (
		true
		&& !!updateUserPasswordRequest.newPasswordHash
		&& !!updateUserPasswordRequest.oldPasswordHash
		&& !!updateUserPasswordRequest.verificationCode && updateUserPasswordRequest.verificationCode.length === 6
	)
}

/**
 * 检查检查用户名失败的请求载荷
 * @param checkUsernameRequest 检查用户名失败的请求载荷
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkCheckUsernameRequest = (checkUsernameRequest: CheckUsernameRequestDto): boolean => {
	return (!!checkUsernameRequest.username && checkUsernameRequest.username?.length <= 200 && checkUsernameRequest.username?.length > 0)
}

/**
 * 检查管理员获取用户信息的请求载荷
 * @param adminGetUserInfoRequest 管理员获取用户信息的请求载荷
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkAdminGetUserInfoRequest = (adminGetUserInfoRequest: AdminGetUserInfoRequestDto): boolean => {
	return (
		adminGetUserInfoRequest.isOnlyShowUserInfoUpdatedAfterReview !== undefined && adminGetUserInfoRequest.isOnlyShowUserInfoUpdatedAfterReview !== null
		&& !!adminGetUserInfoRequest.pagination && adminGetUserInfoRequest.pagination.page > 0 && adminGetUserInfoRequest.pagination.pageSize > 0
	)
}

/**
 * 检查管理员通过用户信息审核的请求载荷
 * @param approveUserInfoRequest 管理员通过用户信息审核的请求载荷
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkApproveUserInfoRequest = (approveUserInfoRequest: ApproveUserInfoRequestDto): boolean => {
	return (!!approveUserInfoRequest.UUID)
}

/**
 * 检查管理员清空某个用户的信息的请求载荷
 * @param adminClearUserInfoRequest 管理员清空某个用户的信息的请求载荷
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkAdminClearUserInfoRequest = (adminClearUserInfoRequest: AdminClearUserInfoRequestDto): boolean => {
	return (
		adminClearUserInfoRequest.uid !== undefined && adminClearUserInfoRequest.uid !== null && typeof adminClearUserInfoRequest.uid === 'number' && adminClearUserInfoRequest.uid > 0
	)
}

/**
 * 检查通过恢复码删除用户 2FA 的参数
 * @param deleteAuthenticatorByRecoveryCodeData 通过恢复码删除用户 2FA 的参数
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkDeleteTotpAuthenticatorByRecoveryCodeData = (deleteTotpAuthenticatorByRecoveryCodeData: DeleteTotpAuthenticatorByRecoveryCodeParametersDto): boolean => {
	return (!!deleteTotpAuthenticatorByRecoveryCodeData.email && !!deleteTotpAuthenticatorByRecoveryCodeData.recoveryCodeHash)
}

/**
 * 检查已登录用户通过密码和 TOTP 验证码删除身份验证器的请求载荷
 * @param deleteAuthenticatorByTotpVerificationCodeRequest 已登录用户通过密码和 TOTP 验证码删除身份验证器的请求载荷
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkDeleteTotpAuthenticatorByTotpVerificationCodeRequest = (deleteTotpAuthenticatorByTotpVerificationCodeRequest: DeleteTotpAuthenticatorByTotpVerificationCodeRequestDto): boolean => {
	return (!!deleteTotpAuthenticatorByTotpVerificationCodeRequest.clientOtp && !!deleteTotpAuthenticatorByTotpVerificationCodeRequest.passwordHash)
}

/**
 * 检查用户发送 Email 身份验证器验证邮件的请求载荷
 * @param sendDeleteTotpAuthenticatorByEmailVerificationCodeRequest 用户发送 Email 身份验证器验证邮件的请求载荷
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkSendUserEmailAuthenticatorVerificationCodeRequest = (sendUserEmailAuthenticatorVerificationCodeRequest: SendUserEmailAuthenticatorVerificationCodeRequestDto): boolean => {
	return (!!sendUserEmailAuthenticatorVerificationCodeRequest.email && !!sendUserEmailAuthenticatorVerificationCodeRequest.passwordHash)
}

/**
 * 检查用户发送删除 Email 身份验证器验证邮件的请求载荷
 * @param sendDeleteTotpAuthenticatorByEmailVerificationCodeRequest 用户发送删除 Email 身份验证器验证邮件的请求载荷
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkSendDeleteUserEmailAuthenticatorVerificationCodeRequest = (sendDeleteUserEmailAuthenticatorVerificationCodeRequest: SendDeleteUserEmailAuthenticatorVerificationCodeRequestDto): boolean => {
	// TODO: 该请求接口允许为空
	return true
}

/**
 * 检查用户删除 Email 2FA 的请求载荷
 * @param deleteUserEmailAuthenticatorRequest 用户删除 Email 2FA 的请求载荷
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkDeleteUserEmailAuthenticatorRequest = (deleteUserEmailAuthenticatorRequest: DeleteUserEmailAuthenticatorRequestDto): boolean => {
	return (
		!!deleteUserEmailAuthenticatorRequest.passwordHash
		&& !!deleteUserEmailAuthenticatorRequest.verificationCode
	)
}

/**
 * 检查管理员编辑用户信息的请求载荷
 * @param adminEditUserInfoRequest 管理员编辑用户信息的请求载荷
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkAdminEditUserInfoRequest = (adminEditUserInfoRequest: AdminEditUserInfoRequestDto): boolean => {
	return (
		adminEditUserInfoRequest.uid !== null && adminEditUserInfoRequest.uid !== undefined
		&& !!adminEditUserInfoRequest.userInfo
	)
}

/**
 * 检查根据 UUID 校验用户是否已经存在的请求载荷
 * @param checkUserExistsByUuidRequest 根据 UUID 校验用户是否已经存在的请求载荷
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkCheckUserExistsByUuidRequest = (checkUserExistsByUuidRequest: CheckUserExistsByUuidRequestDto): boolean => {
	return ( !!checkUserExistsByUuidRequest.uuid )
}

/**
 * 检查排序相关的变量
 * @param sortBy 排序字段
 * @param sortOrder 排序顺序
 * @returns 检查结果，合法返回 true，不合法返回 false
 */
const checkSortVariables = (sortBy: string, sortOrder: string): boolean => {
	const allowedSortFields = ['createDateTime', 'editDateTime', 'username', 'userNickname', 'uid'] // 允许的排序方式
	if (!allowedSortFields.includes(sortBy)) {
		return false
	}
	if (sortOrder !== 'ascend' && sortOrder !== 'descend') {
		return false
	}
	return true
}

