import crypto from 'crypto'

/**
 * Generate unpredictable random string, poor performance
 *
 * @param length Length of the generated random string
 * @returns Random string
 */
export const generateSecureRandomString = (length: number): string => {
	try {
		if (length && typeof length === 'number' && length > 0 && !!Number.isInteger(length)) {
			const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
			let result = ''
			while (length > 0) {
				const bytes = crypto.randomBytes(length)
				for (let i = 0; i < bytes.length && length > 0; i++) {
					const randomValue = bytes[i]
					if (randomValue < 256 - (256 % charset.length)) { // Avoid bias
						result += charset.charAt(randomValue % charset.length)
						length--
					}
				}
			}
			return result
		} else {
			console.error('something error in function generateSecureRandomString, required data length is empty or not > 0 or not Integer')
			return ''
		}
	} catch (e) {
		console.error('something error in function generateSecureRandomString', e)
		return ''
	}
}

/**
 * Generate potentially predictable random string, better performance // WARN
 *
 * @param length Length of the generated random string
 * @returns Random string
 */
export const generateRandomString = (length: number): string => {
	try {
		if (length && typeof length === 'number' && length > 0 && !!Number.isInteger(length)) {
			let text = ''
			const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

			for (let i = 0; i < length; i++)
				text += possible.charAt(Math.floor(Math.random() * possible.length))

			return text
		} else {
			console.error('something error in function generateSecureRandomString, required data length is empty or not > 0 or not Integer')
			return ''
		}
	} catch (e) {
		console.error('something error in function generateRandomString', e)
		return ''
	}
}

/**
 * Return a random integer in a range (including both ends of the range)
 * @param num1 First number
 * @param num2 Second number
 * @returns A random integer in the range of the two numbers
 */
export const getRandomNumberInRange = (num1: number, num2: number): number => {
	// If num1 is greater than num2, swap their values
	if (num1 > num2) {
		[num1, num2] = [num2, num1]
	}
	return Math.floor(Math.random() * (num2 - num1 + 1)) + num1
}

/**
 * Generate unpredictable numeric verification code
 * @param length Number of digits in the verification code
 * @returns Unpredictable numeric verification code
 */
export const generateSecureVerificationNumberCode = (length: number): string => {
	const buffer = crypto.randomBytes(length) // Generate n random bytes
	const code = Array.from(buffer, byte => (byte % 10).toString()).join('') // Convert random bytes to numbers using modulo
	return code
}

/**
 * Generate unpredictable random string based on input length and character set
 * @param length Number of digits in the random string
 * @param charset Character set for the random string
 * @returns Unpredictable random string
 */
export const generateSecureVerificationStringCode = (length: number, charset: string): string => {
	const buffer = crypto.randomBytes(length) // Generate n random bytes
	const code = Array.from(buffer, byte => charset[byte % charset.length]).join('') // Map random bytes to character set
	return code
}
