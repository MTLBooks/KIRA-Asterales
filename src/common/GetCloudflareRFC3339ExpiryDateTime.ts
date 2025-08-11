/**
 * Generate Cloudflare-style RFC3339 expiry date string, e.g.: "2024-03-17T13:47:28Z"
 * @param expiresIn Expiry duration, unit: seconds.
 * @returns Cloudflare-style RFC3339 expiry date string
 */
export function getCloudflareRFC3339ExpiryDateTime(expiresIn: number): string {
	return (new Date((new Date()).getTime() + expiresIn * 1000)).toISOString().replace(/\.\d{3}/, '')
}
