import mongoose, { ClientSession } from "mongoose"

/**
 * Create and start a transaction
 * @returns A transaction that has already been started
 * @throws error Failed to create or start transaction
 */
export const createAndStartSession = async (): Promise<ClientSession> => {
	try {
		const session = await mongoose.startSession()
		session.startTransaction()
		return session
	} catch (error) {
		throw new Error('Failed to start MongoDB Session', error)
	}
}

/**
 * Rollback and end transaction
 * @param session Transaction session
 * @returns Returns true if successfully rolled back and ended transaction, otherwise returns false
 */
export const abortAndEndSession = async (session: ClientSession): Promise<boolean> => {
	if (!session) {
		return false
	}

	if (!session.inTransaction()) {
		return false
	}

	await session.abortTransaction()
	session.endSession()
	return true
}

/**
 * Commit and end transaction
 * @param session Transaction session
 * @returns Returns true if successfully committed and ended transaction, otherwise returns false
 */
export const commitAndEndSession = async (session: ClientSession): Promise<boolean> => {
	if (!session) {
		return false
	}

	await session.commitTransaction()
	session.endSession()
}
