import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { Client } from '@elastic/elasticsearch'
import { connectElasticSearchCluster } from '../elasticsearchPool/ElasticsearchClusterPool.js'

declare module 'fastify' {
  interface FastifyRequest {
    elasticsearchClient?: Client
  }
  interface FastifyInstance {
    elasticsearchClient?: Client
  }
}

export default fp(async function elasticsearchPlugin(fastify: FastifyInstance) {
  let client: Client
  try {
    client = await connectElasticSearchCluster()
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to create Elasticsearch client')
    process.exit(1)
  }

  fastify.decorate('elasticsearchClient', client)
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.elasticsearchClient = client
  })
}) 