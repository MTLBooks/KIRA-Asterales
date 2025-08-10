import { ClientSession } from 'mongoose'
import { getNextSequenceValuePool } from '../dbPool/DbClusterPool.js'

// NOTE Default ejected values for auto-increment sequences
const __DEFAULT_SEQUENCE_EJECT__: number[] = [9, 42, 233, 404, 2233, 10388, 10492, 114514]

/**
 * Result for getting next sequence number
 * @param success Execution result
 * @param sequenceId Sequence key
 * @param sequenceValue Sequence value
 * @param message Extra info
 */
type SequenceNumberResultType = {
	success: boolean;
	sequenceId?: string;
	sequenceValue?: number;
	message?: string;
}

/**
 * Get next sequence value
 * @param sequenceId Sequence key
 * @param sequenceDefaultNumber Initial value (default 0). Ignored if already created. Can be negative.
 * @param sequenceStep Step (default 1). Can be negative.
 * @param session Transaction session
 * @returns Status and the next sequence value
 */
export const getNextSequenceValueService = async (sequenceId: string, sequenceDefaultNumber: number = 0, sequenceStep: number = 1, session?: ClientSession): Promise<SequenceNumberResultType> => {
	try {
		if (sequenceId) {
			try {
				const getNextSequenceValue = await getNextSequenceValuePool(sequenceId, sequenceDefaultNumber, sequenceStep, { session })
				const sequenceValue = getNextSequenceValue?.result
				if (getNextSequenceValue.success && sequenceValue !== null && sequenceValue !== undefined) {
					return { success: true, sequenceId, sequenceValue, message: 'Get next sequence value success' }
				} else {
					console.error('ERROR', 'Program error: sequence value is null', { error: getNextSequenceValue.error, message: getNextSequenceValue.message })
					return { success: false, sequenceId, message: 'Program error: sequence value is invalid' }
				}
			} catch (error) {
				console.error('ERROR', 'Get next sequence value failed: MongoDB query error:', error)
				return { success: false, sequenceId, message: 'Program error: exception when fetching sequence value' }
			}
		} else {
			console.error('ERROR', 'Get next sequence value failed: sequenceId is empty')
			return { success: false, message: 'Program error: missing required parameter sequenceId' }
		}
	} catch (error) {
		console.error('ERROR', 'Get next sequence value failed: unexpected exception:', error)
		return { success: false, message: 'Program error: unexpected exception when getting sequence value' }
	}
}

/**
 * Get next sequence value while skipping ejected values until a valid value is found
 * @param sequenceId Sequence key
 * @param eject Values to skip (defaults to __DEFAULT_SEQUENCE_EJECT__)
 * @param sequenceDefaultNumber Initial value (default 0)
 * @param sequenceStep Step (default 1)
 * @param session Transaction session
 * @returns Status and the next valid sequence value
 */
export const getNextSequenceValueEjectService = async (sequenceId: string, eject: number[] = __DEFAULT_SEQUENCE_EJECT__, sequenceDefaultNumber: number = 0, sequenceStep: number = 1, session?: ClientSession): Promise<SequenceNumberResultType> => {
	try {
		let getNextSequenceValueServiceResult: SequenceNumberResultType
		let nextSequenceValue: number
		do {
			getNextSequenceValueServiceResult = await getNextSequenceValueService(sequenceId, sequenceDefaultNumber, sequenceStep, session)
			nextSequenceValue = getNextSequenceValueServiceResult?.sequenceValue

			// If failed or null, abort
			if (!getNextSequenceValueServiceResult.success || nextSequenceValue === null || nextSequenceValue === undefined) {
				console.error('ERROR', 'Loop fetch sequence value failed: data invalid')
				return { success: false, sequenceId, message: 'Loop fetch sequence value failed: result is empty or unsuccessful' }
			}
		} while (eject && eject.includes(nextSequenceValue))
		return { success: true, sequenceId, sequenceValue: nextSequenceValue, message: 'Get next sequence value success' }
	} catch (error) {
		console.error('ERROR', 'Loop fetch sequence value failed')
		return { success: false, sequenceId, message: 'Loop fetch sequence value failed: unexpected exception' }
	}
}




