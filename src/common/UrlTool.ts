/**
 * Get correct Cookie Domain setting
 * @returns string Cookie Domain
 */
export function getCorrectCookieDomain(): string {
	try {
		const serverEnv = process.env.SERVER_ENV
		const serverRootUrl = process.env.SERVER_ROOT_URL
		const devEnvFlag = 'dev'
		const localhostCookieDomain = ''
		return serverEnv && serverEnv === devEnvFlag ? localhostCookieDomain : (serverRootUrl || localhostCookieDomain)
	} catch (error) {
		console.error('ERROR', 'Error occurred while getting Cookie Domain:', error)
	}
}
