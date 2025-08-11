import bcrypt from 'bcrypt'

const HASH_ROUND = 8 // Bcrypt Hash rounds, higher values are slower but more secure. // WARN Never change this!
/**
 * Hash a password using Bcrypt
 * @param password Original password
 * @returns Hashed password
 */
export function hashPasswordSync(password: string): string {
	return bcrypt.hashSync(password, HASH_ROUND)
}

/**
 * Verify a password that has been hashed with Bcrypt
 * @param passwordOrigin Original password
 * @param passwordHash Password that has been hashed with Bcrypt
 * @returns Verification result, returns true if valid, false if invalid
 */
export function comparePasswordSync(passwordOrigin: string, passwordHash: string): boolean {
	return bcrypt.compareSync(passwordOrigin, passwordHash)
}
