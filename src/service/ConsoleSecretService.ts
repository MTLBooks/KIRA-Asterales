import { GetStgEnvBackEndSecretResponse } from "../controller/ConsoleSecretControllerDto.js";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { checkUserTokenByUuidService } from "./UserService.js";

let client: SecretsManagerClient

const SERVER_ENV = process.env.SERVER_ENV

const AWS_SECRET_REGION = process.env.AWS_SECRET_REGION
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
const AWS_SECRET_ACCESS_SECRET = process.env.AWS_SECRET_ACCESS_SECRET
const AWS_SECRET_NAME = process.env.AWS_SECRET_NAME

if (!!SERVER_ENV && ['dev', 'prod'].includes(SERVER_ENV)) {
	try {
		if (!AWS_SECRET_REGION || !AWS_SECRET_ACCESS_KEY || !AWS_SECRET_ACCESS_SECRET) {
			console.error("ERROR", "Missing AWS credentials. Please set AWS_SECRET_REGION, AWS_SECRET_ACCESS_KEY and AWS_SECRET_ACCESS_SECRET")
			process.exit()
		}
	
		// Create AWS Secrets Manager client
		client = new SecretsManagerClient({
			region: AWS_SECRET_REGION, // custom region
			credentials: {
				accessKeyId: AWS_SECRET_ACCESS_KEY, // custom Access Key
				secretAccessKey: AWS_SECRET_ACCESS_SECRET, // custom Secret Key
			},
		})
	
		console.info()
		console.info('Created an AWS Sercret Manager Client based on the environment variables you provided!')
	} catch(error) {
		console.error('ERROR', 'Failed to create AWS Secrets Manager client:', error)
		process.exit()
	}
} else {
	console.info()
	console.info('Now starting the server without creating an AWS Sercret Manager Client.')
}

/**
 * Get staging backend environment secrets
 * @param uuid User UUID
 * @param token User Token
 * @returns Response for staging backend environment secrets
 */
export async function getStgEnvBackEndSecretService(uuid: string, token: string): Promise<GetStgEnvBackEndSecretResponse> {
	try {
		if (!SERVER_ENV || !['dev', 'prod'].includes(SERVER_ENV)) {
			console.error('ERROR', 'Get staging backend secrets failed: not connected to prod or dev environment')
			return { success: false, message: 'Get staging backend secrets failed: not connected to prod or dev environment', result: {} }
		}

		if (!client) {
			console.error('ERROR', 'Get staging backend secrets failed: AWS Secrets Manager client not initialized')
			return { success: false, message: 'Get staging backend secrets failed: AWS Secrets Manager not connected', result: {} }
		}

		if (!(await checkUserTokenByUuidService(uuid, token)).success) {
			console.error('ERROR', 'Get staging backend secrets failed: token verification failed')
			return { success: false, message: 'Get staging backend secrets failed: token verification failed', result: {} }
		}

		if (!AWS_SECRET_NAME) {
			console.error('ERROR', 'Get staging backend secrets failed: secret name is not provided in env. Please set AWS_SECRET_REGION.')
			return { success: false, message: 'Get staging backend secrets failed: secret name not provided', result: {} }
		}
		
		try {
			const command = new GetSecretValueCommand({ SecretId: AWS_SECRET_NAME });
			const response = await client.send(command);

			try {
				const secerts: Record<string, string> = JSON.parse(response.SecretString);
				return { success: true, message: 'Get staging backend secrets success', result: { envs: secerts } }
			} catch(error) {
				console.error('ERROR', 'Get staging backend secrets error: failed to parse JSON:', error)
				return { success: false, message: 'Get staging backend secrets error: JSON parse failed', result: {} }
			}
		} catch(error) {
			console.error('ERROR', 'Get staging backend secrets error: fetch failed:', error)
			return { success: false, message: 'Get staging backend secrets error: fetch failed', result: {} }
		}
	} catch (error) {
		console.error('ERROR', 'Get staging backend secrets error: unknown error:', error)
		return { success: false, message: 'Get staging backend secrets error: unknown error', result: {} }
	}
}
