import { Client } from '@elastic/elasticsearch'
//import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types.js'
import { isEmptyObject } from '../common/ObjectTool.js'
import { EsResultType, EsSchema2TsType } from './ElasticsearchClusterPoolTypes.js'

/**
 * Create Elasticsearch connection (should be created once during app lifecycle; used by Fastify plugin)
 * @returns Elasticsearch client connection
 */
export const connectElasticSearchCluster = async (): Promise<Client> => {
	try {
		const ELASTICSEARCH_ADMIN_USERNAME = process.env.ELASTICSEARCH_ADMIN_USERNAME
		const ELASTICSEARCH_ADMIN_PASSWORD = process.env.ELASTICSEARCH_ADMIN_PASSWORD
		const ELASTICSEARCH_CLUSTER_HOST = process.env.ELASTICSEARCH_CLUSTER_HOST
		const ELASTICSEARCH_PROTOCOL = process.env.ELASTICSEARCH_PROTOCOL === 'http' ? 'http' : 'https'

		if (!ELASTICSEARCH_ADMIN_USERNAME) {
			console.error('ERROR', 'Failed to create or connect to search engine cluster: ELASTICSEARCH_ADMIN_USERNAME is empty, please check environment variable settings')
			process.exit()
		}
		if (!ELASTICSEARCH_ADMIN_PASSWORD) {
			console.error('ERROR', 'Failed to create or connect to search engine cluster: ELASTICSEARCH_ADMIN_PASSWORD is empty, please check environment variable settings')
			process.exit()
		}
		if (!ELASTICSEARCH_CLUSTER_HOST) {
			console.error('ERROR', 'Failed to create or connect to search engine cluster: ELASTICSEARCH_CLUSTER_HOST is empty, please check environment variable settings')
			process.exit()
		}

		const ELASTICSEARCH_CLUSTER_HOST_LIST = ELASTICSEARCH_CLUSTER_HOST?.split(',')?.map(host => `${ELASTICSEARCH_PROTOCOL}://${host}`)

		if (!ELASTICSEARCH_CLUSTER_HOST_LIST || ELASTICSEARCH_CLUSTER_HOST_LIST?.length <= 0) {
			console.error('ERROR', 'Failed to create or connect to search engine cluster: ELASTICSEARCH_CLUSTER_HOST_LIST is empty, please check environment variable settings, cluster address must consist of cluster addresses and port numbers separated by commas, e.g.: XXX.XXX.XXX.XXX:32000,YYY.YYY.YYY.YYY:32000,ZZZ.ZZZ.ZZZ.ZZZ:32000')
			process.exit()
		}

		const client = new Client({
			node: ELASTICSEARCH_CLUSTER_HOST_LIST,
			auth: {
				username: ELASTICSEARCH_ADMIN_USERNAME,
				password: ELASTICSEARCH_ADMIN_PASSWORD,
			},
			tls: {
				rejectUnauthorized: false, // This will ignore SSL certificate validation
			},
		})

		try {
			await client.ping()
		} catch (error) {
			console.error('ERROR', 'Failed to create or connect to search engine cluster: PING returned an error result:', error)
			process.exit()
		}

		try {
			const elasticsearchClusterInfoResult = await client.info()
			console.info()
			console.info('Elasticsearch Cluster Connect successfully!')
			console.info(`cluster_name: ${elasticsearchClusterInfoResult?.cluster_name}, cluster_uuid: ${elasticsearchClusterInfoResult?.cluster_uuid}, current_connect_name: ${elasticsearchClusterInfoResult?.name}, version: ${elasticsearchClusterInfoResult?.version?.number}, tagline: ${elasticsearchClusterInfoResult?.tagline}`)
		} catch (error) {
			console.error('ERROR', 'Failed to create or connect to search engine cluster: INFO returned an error result:', error)
			process.exit()
		}

		return client
	} catch (error) {
		console.error('ERROR', 'Failed to create search engine connection: connectElasticSearchCluster unexpectedly terminated:', error)
		process.exit()
	}
}

/**
 * Delete documents from database cluster
 * @param client Elasticsearch connection, should be stored in ctx
 * @param indexName Index name, this field should be stored in the same object as schema (so schema and indexName form a binding relationship)
 * @param conditions Conditions for deleting data
 * @returns Result of deleting data, returns true on success, false on failure
 */
export const deleteDataFromElasticsearchCluster = async (client: Client, indexName: string, conditions: Record<string, string | number>): Promise<boolean> => {
	try {
		// Build bool query conditions
		const mustConditions = Object.keys(conditions).map(field => ({
			match: { [field]: conditions[field] },
		}))

		// Search for documents matching the conditions
		const searchResponse = await client.search({
			index: indexName,
			body: {
				query: {
					bool: {
						must: mustConditions,
					},
				},
			},
		})

		// Ensure response contains hits
		if (searchResponse.hits && searchResponse.hits.hits) {
			// Iterate through search results and delete each document
			const hits = searchResponse.hits.hits
			for (const hit of hits) {
				await client.delete({
					index: indexName,
					id: hit._id,
				})
			}
			return true
		} else {
			console.error('ERROR', 'No documents found matching the conditions.')
			return false
		}
	} catch (error) {
		console.error('ERROR', 'Error occurred while deleting data in search engine, unknown reason', error)
		return false
	}
}

/**
 * Insert data into Elasticsearch cluster and refresh (if refreshFlag is true, refresh immediately, but default is false, wait for cluster to refresh automatically)
 * @param client Elasticsearch connection, should be stored in ctx
 * @param indexName Index name, this field should be stored in the same object as schema (so schema and indexName form a binding relationship)
 * @param schema Schema of the index to be inserted (in Elasticsearch it should be called: index template), main function is to provide generic T and limit the type of data, this field should be stored in the same object as indexName (so schema and indexName form a binding relationship)
 * @param data Data to be inserted, type is inferred from schema's generic type
 * @param refreshFlag Whether to refresh search immediately after inserting data (not recommended to refresh search immediately in high concurrency scenarios)
 * @returns Result of inserting data, returns {success: true} on success, otherwise {success: false}
 */
export const insertData2ElasticsearchCluster = async <T>(client: Client, indexName: string, schema: T, data: EsSchema2TsType<T>, refreshFlag: boolean = false): Promise<EsResultType<EsSchema2TsType<T>>> => {
	try {
		if (!isEmptyObject(schema as object) && !isEmptyObject(data) && indexName && client && !isEmptyObject(client)) {
			try {
				const indexResult = await client.index<EsSchema2TsType<T>>({
					index: indexName,
					document: data,
				})
				if (indexResult && indexResult.result) {
					if (refreshFlag) {
						// After indexing (v.) data, you can manually execute refresh to display in search results. If not manually executed, the cluster will automatically execute once every interval
						try {
							const refreshResult = await client.indices.refresh({ index: indexName })
							if (refreshResult) {
								return { success: true, message: 'Successfully inserted data into Elasticsearch, manual search refresh successful', result: [indexResult.result] as unknown as EsSchema2TsType<T>[] }
							} else {
								return { success: true, message: 'Successfully inserted data into Elasticsearch, but search refresh result is empty', result: [indexResult.result] as unknown as EsSchema2TsType<T>[] }
							}
						} catch (error) {
							console.warn('WARN', 'WARNING', 'Successfully inserted data into Elasticsearch, but error occurred during search refresh', error)
							return { success: true, message: 'Successfully inserted data into Elasticsearch, but error occurred during search refresh', result: [indexResult.result] as unknown as EsSchema2TsType<T>[] }
						}
					} else {
						return { success: true, message: 'Successfully inserted data into Elasticsearch, please wait for automatic refresh', result: [indexResult.result] as unknown as EsSchema2TsType<T>[] }
					}
				} else {
					console.error('ERROR', 'Error occurred while inserting data into Elasticsearch, index (v.) data return result is abnormal')
					return { success: false, message: 'Error occurred while inserting data into Elasticsearch, index (v.) data return result is abnormal' }
				}
			} catch (error) {
				console.error('ERROR', 'Error occurred while inserting data into Elasticsearch, error occurred while indexing (v.) data', error)
				return { success: false, message: 'Error occurred while inserting data into Elasticsearch, error occurred while indexing (v.) data' }
			}
		} else {
			console.error('ERROR', 'Error occurred while inserting data into Elasticsearch, schema, data, indexName, or client is empty')
			return { success: false, message: 'Error occurred while inserting data into Elasticsearch, necessary data is empty' }
		}
	} catch (error) {
		console.error('ERROR', 'Error occurred while inserting data into Elasticsearch, unknown exception', error)
		return { success: false, message: 'Error occurred while inserting data into Elasticsearch, unknown exception' }
	}
}

/**
 * Search data from Elasticsearch cluster
 * @param client Elasticsearch connection, should be stored in ctx
 * @param indexName Index name, this field should be stored in the same object as schema (so schema and indexName form a binding relationship)
 * @param schema Schema of the index to be inserted (in Elasticsearch it should be called: index template), main function is to provide generic T and limit the type of data, this field should be stored in the same object as indexName (so schema and indexName form a binding relationship)
 * @param query Query parameters, similar to WHERE in database, but Elasticsearch has its own logic, recommend referring to official documentation.
 * @returns Query return result
 */
export const searchDataFromElasticsearchCluster = async <T>(client: Client, indexName: string, schema: T, query: any): Promise<EsResultType<EsSchema2TsType<T>>> => {
	try {
		if (client && !isEmptyObject(client) && indexName && schema && !isEmptyObject(schema as object) && query && !isEmptyObject(query)) {
			try {
				const result = await client.search({
					index: indexName,
					query,
				})
				if (result && !isEmptyObject(result) && !result.timed_out) {
					const hits = result?.hits?.hits
					if (hits?.length && hits.length > 0) {
						return { success: true, message: 'Search successful in Elasticsearch', result: hits.map(hit => hit._source as EsSchema2TsType<T>) }
					} else {
						return { success: true, message: 'Search successful in Elasticsearch, but no results', result: [] }
					}
				} else {
					console.error('ERROR', 'Failed to search data in Elasticsearch, return result is empty or abnormal')
					return { success: false, message: 'Failed to search data in Elasticsearch, return result is empty or abnormal' }
				}
			} catch (error) {
				console.error('ERROR', 'Failed to search data in Elasticsearch, error occurred while searching data', error)
				return { success: false, message: 'Failed to search data in Elasticsearch, error occurred while searching data' }
			}
		} else {
			console.error('ERROR', 'Failed to search data in Elasticsearch, necessary parameters are empty')
			return { success: false, message: 'Failed to search data in Elasticsearch, necessary parameters are empty' }
		}
	} catch (error) {
		console.error('ERROR', 'Failed to search data in Elasticsearch, unknown exception', error)
		return { success: false, message: 'Failed to search data in Elasticsearch, unknown exception' }
	}
}





