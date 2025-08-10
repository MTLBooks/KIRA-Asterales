import 'dotenv/config'
import fs from 'fs'
import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import elasticsearchPlugin from './plugins/elasticsearch.js'
import registerRoutes from './route/router.js'
import { connectMongoDBCluster } from './dbPool/DbClusterPool.js'
import rbacPlugin from './plugins/rbac.js'

const SERVER_PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 9999
const SERVER_ENV = process.env.SERVER_ENV

const httpsOptions = SERVER_ENV && SERVER_ENV !== 'dev'
	? { key: process.env.SSL_KEY || '', cert: process.env.SSL_CERT || '' }
	: { key: fs.readFileSync('src/ssl/key.pem', 'utf8'), cert: fs.readFileSync('src/ssl/cert.pem', 'utf8') }

const fastify = Fastify({ logger: true, trustProxy: true, https: httpsOptions as any })

await fastify.register(fastifyCors, { credentials: true, origin: true })
await fastify.register(fastifyCookie)
await fastify.register(elasticsearchPlugin)
await fastify.register(rbacPlugin) // RBAC preHandler guards

// Connect MongoDB before routes
await connectMongoDBCluster().catch(error => {
	fastify.log.error({ err: error }, 'Failed to connect to MongoDB')
	process.exit(1)
})

// Accept empty JSON bodies (treat as {}) to mirror Koa/bodyparser behavior
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
	if (!body || (typeof body === 'string' && body.length === 0)) return done(null, {})
	try {
		const text = typeof body === 'string' ? body : body.toString('utf8')
		const json = JSON.parse(text)
		done(null, json)
	} catch (err) {
		done(err as Error)
	}
})

await fastify.register(registerRoutes)

await fastify.listen({ port: SERVER_PORT, host: '0.0.0.0' }) 