import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import axios from 'axios'
import { getCloudflareRFC3339ExpiryDateTime } from '../common/GetCloudflareRFC3339ExpiryDateTime.js'

/**
 * Generate a pre-signed URL that can be used to upload data to Cloudflare R2 storage
 * @param bucketName Target bucket name
 * @param fileName File name, note: this is the name after the file is uploaded to Cloudflare R2, not the name of the file to be uploaded
 * @param expiresIn Expiry duration of the pre-signed URL, unit: seconds. Default 3600 seconds
 * @returns Cloudflare R2 pre-signed URL
 */
export const createCloudflareR2PutSignedUrl = async (bucketName: string, fileName: string, expiresIn: number = 3600): Promise<string | undefined> => {
	const r2EndPoint = process.env.CF_R2_END_POINT
	const accessKeyId = process.env.CF_ACCESS_KEY_ID
	const secretAccessKey = process.env.CF_SECRET_ACCESS_KEY

	if (expiresIn <= 0) {
		console.error('ERROR', 'Cannot create R2 pre-signed URL, expiry time must be greater than or equal to 0 seconds', { bucketName, fileName, expiresIn })
		return undefined
	}

	if (expiresIn > 604800) {
		console.error('ERROR', 'Cannot create R2 pre-signed URL, expiry time must be less than or equal to 604800 seconds (7 days)', { bucketName, fileName, expiresIn })
		return undefined
	}

	if (!r2EndPoint && !accessKeyId && !secretAccessKey) {
		console.error('ERROR', 'Cannot create S3(R2) bucket instance, required parameters: r2EndPoint, accessKeyId and secretAccessKey may be empty.', { bucketName, fileName, expiresIn })
		return undefined
	}

	try {
		const R2 = new S3Client({
			endpoint: r2EndPoint,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
			region: 'auto',
		})

		if (!R2) {
			console.error('ERROR', 'Created R2 client is empty', { bucketName, fileName, expiresIn })
			return undefined
		}

		try {
			const url = await getSignedUrl(
				R2,
				new PutObjectCommand({
					Bucket: bucketName,
					Key: fileName,
				}),
				{ expiresIn },
			)

			if (!url) {
				console.error('ERROR', 'Created pre-signed URL is empty', { bucketName, fileName, expiresIn })
				R2.destroy()
				return undefined
			}

			R2.destroy()
			return url
		} catch (error) {
			console.error('ERROR', 'Failed to create pre-signed URL, error message:', error, { bucketName, fileName, expiresIn })
			R2.destroy()
			return undefined
		}
	} catch (error) {
		console.error('ERROR', 'Failed to connect to S3(R2) bucket or create pre-signed URL, error message:', error, { bucketName, fileName, expiresIn })
		return undefined
	}
}

/**
 * Generate a pre-signed URL that can be used to upload images to Cloudflare Images
 * @param fileName Image name, note: this is the name after the file is uploaded to R2, not the name of the file to be uploaded, file extension not required, recommend using URL-friendly characters for filename
 * @param expiresIn Expiry duration of the pre-signed URL, unit: seconds. Default 660 seconds (11 minutes), minimum 600 (10 minutes), maximum 21600 (360 minutes, 6 hours)
 * @param metaData Image metadata
 * @returns Pre-signed URL that can be used to upload images to Cloudflare Images
 */
export const createCloudflareImageUploadSignedUrl = async (fileName?: string, expiresIn: number = 660, metaData?: Record<string, string>): Promise<string | undefined> => {
	try {
		const imagesEndpointUrl = process.env.CF_IMAGES_ENDPOINT_URL
		const imagesToken = process.env.CF_IMAGES_TOKEN

		if (expiresIn < 600) {
			console.error('ERROR', 'Cannot create Cloudflare Images pre-signed URL, expiry time must be greater than or equal to 120 seconds (2 minutes)', { fileName, expiresIn, metaData })
			return undefined
		}

		if (expiresIn > 21600) {
			console.error('ERROR', 'Cannot create Cloudflare Images pre-signed URL, expiry time must be less than or equal to 21600 seconds (360 minutes, 6 hours)', { fileName, expiresIn, metaData })
			return undefined
		}

		if (!imagesEndpointUrl && !imagesToken) {
			console.error('ERROR', 'Cannot create Cloudflare Images pre-signed URL: imagesEndpointUrl and imagesToken may be empty. Please check environment variable settings (CF_IMAGES_ENDPOINT_URL, CF_IMAGES_TOKEN)', { fileName, expiresIn, metaData })
			return undefined
		}

		// Create Axios request data
		const data: Record<string, string | Record<string, string> > = {}
		data.expiry = getCloudflareRFC3339ExpiryDateTime(expiresIn) // Generated date format: 2024-03-17T13:47:28Z
		fileName && (data.id = fileName)
		metaData && (data.metaData = metaData)

		// Create Axios request configuration
		const config = {
			headers: {
				Authorization: `Bearer ${imagesToken}`,
				'Content-Type': 'multipart/form-data; boundary=---011000010111000001101001',
			},
		}
		try {
			const imageUploadSignedUrlResult = await axios.post(imagesEndpointUrl, data, config)
			const imageUploadSignedUrl = imageUploadSignedUrlResult?.data?.result?.uploadURL
			if (imageUploadSignedUrlResult.status === 200 && imageUploadSignedUrl) {
				return imageUploadSignedUrl
			} else {
				console.error('ERROR', 'Cannot create Cloudflare Images pre-signed URL: Failed to create URL!', { fileName, expiresIn, metaData })
				return undefined
			}
		} catch (error) {
			console.error('ERROR', 'Cannot create Cloudflare Images pre-signed URL: Network request failed!', { error, errorDetail: error?.response?.data?.errors }, { fileName, expiresIn, metaData })
			return undefined
		}
	} catch (error) {
		console.error('ERROR', 'Failed to create Cloudflare Images upload pre-signed URL:', error)
	}
}
