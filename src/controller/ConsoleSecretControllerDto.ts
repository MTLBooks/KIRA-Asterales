/**
 * Get staging backend environment secrets response
 */
export type GetStgEnvBackEndSecretResponse = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Secrets */
	result: {
		envs?: Record<string, string>;
	};
}
