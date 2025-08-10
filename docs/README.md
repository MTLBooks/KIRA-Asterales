# KIRAKIRA-Rosales Developer Guide

## 1. Preface

KIRAKIRA-Rosales ("Rosales" or simply "the backend") is a RESTful backend API built on the Koa framework using TypeScript.

This document covers:
1. How to extend and develop against the existing codebase.
2. Infrastructure used by the backend, such as databases, search engine, and cluster deployment.

You are expected to be familiar with: basic [JavaScript](https://developer.mozilla.org/docs/Web/JavaScript) and [TypeScript](https://www.typescriptlang.org/) syntax, how [HTTP](https://developer.mozilla.org/docs/Web/HTTP/Overview) works, and general concepts of [Databases](https://en.wikipedia.org/wiki/Database) and [NoSQL](https://en.wikipedia.org/wiki/NoSQL).

### Tech Stack
It is important to understand the architecture of KIRAKIRA-Rosales and its related infrastructure before you start.

- TypeScript for type safety and code quality
- Koa.js as the Node.js web framework
- Production runs on AWS EKS (Kubernetes)
- MongoDB for primary data storage
- Elasticsearch for search
- Persistent storage via AWS EBS volumes mounted in EKS; images and videos stored with Cloudflare R2, Images, and Stream

Badges: JavaScript, TypeScript, Node.js, Koa, MongoDB, Elasticsearch, Kubernetes, Cloudflare

## 2. Install and Run

### 1) Clone the repository
Make sure you have [Git](https://git-scm.com/) installed and have access to this repository.

```sh
# Replace <some-dir> with a directory on your machine
cd <some-dir>

# Clone
git clone https://github.com/KIRAKIRA-DOUGA/KIRAKIRA-Rosales.git
```
You can also use GitHub Desktop or any Git-compatible GUI tool.

### 2) Configure environment variables
> Important
> The examples below do not include all environment variables. In practice you must set every required variable.
> See the environment template in the repo root for the complete list: `.env.example`.

Windows PowerShell example:
```powershell
$env:SERVER_PORT="9999"
$env:SERVER_ENV="dev"
$env:SERVER_ROOT_URL="kirakira.moe"
...
```

Linux shell example:
```bash
export SERVER_PORT="9999"
export SERVER_ENV="dev"
export SERVER_ROOT_URL="kirakira.moe"
...
```

If you run into problems setting environment variables, search or open a discussion in Issues/Discussions.

### 3) Start the backend dev server
> Important
> In dev mode, code is compiled into the `.kirakira` directory at the repo root.

```sh
# Install dependencies
npm install

# Start dev server
npm run dev

# Or run with hot reload
npm run dev-hot
```
If you need to change the dev build output directory, edit `scripts.start` in `package.json` and replace all occurrences of `.kirakira` with your custom folder (e.g. `.foo`). Example: `tsc --noEmitOnError --sourceMap --outDir .foo && node ./.foo/app.js`.

### 4) Verify
After successful startup, you should have a dev server listening on port 9999 (or the port you configured). Open `https://localhost:9999` in your browser; you should see "Hello World" or similar.

## 3. Development

### Get familiar with the project structure
```
◌
├ .github - GitHub configuration
│  └ workflows - GitHub Actions workflows
├ .vscode - VSCode settings
├ docs - Documentation (this file)
├ old - Archived code kept for reference
├ src - Source code
│  ├ cloudflare - Cloudflare related helpers
│  ├ common - Common helper functions
│  ├ controller - Controllers that parse request payloads and enrich responses
│  ├ dbPool - MongoDB helper utilities
│  ├ elasticsearchPool - Elasticsearch helper utilities
│  ├ middleware - Server middlewares
│  ├ route - Route definitions
│  ├ service - Business logic services
│  ├ ssl - SSL dev certificates
│  ├ store - "State management" or process-wide runtime variables
│  ├ type - Shared TypeScript types
│  └ app.ts - Application entrypoint
├ .dockerignore - Files to ignore during `docker build`
├ .editorconfig - Code style
├ .env.example - Environment variable template and notes
├ .eslintignore - ESLint ignore list
├ .eslintrc.cjs - ESLint config
├ .gitattributes - Git attributes
├ .gitignore - Git ignore list
├ Dockerfile - Docker image build recipe
├ LICENSE - License
├ README.md - Project README
├ package-lock.json - Locked dependency versions for npm
├ package.json - Metadata, scripts, dependency list
├ tsconfig.json - TypeScript configuration
└ ℩ɘvoↄ.svg - Cover image
```

### Start with Hello World
There is a special file `src/controller/HelloWorld.ts`:
```ts
import { koaCtx, koaNext } from '../type/koaTypes.js'

export const helloWorld = async (ctx: koaCtx, next: koaNext): Promise<void> => {
	const something = ctx.query.something
	ctx.body = something === 'Beautiful' ? `Hello Beautiful World` : 'Hello World'
	await next()
}
```
Line by line:
- `koaCtx` and `koaNext` are types exported from `koaTypes.ts`:
```ts
export type koaCtx = Koa.ParameterizedContext<Koa.DefaultState, Koa.DefaultContext, unknown> & {elasticsearchClient?: Client}
export type koaNext = Koa.Next
```
- `koaCtx` is the Koa request context containing request/response and middleware-added fields.
- `koaNext` is an async function you call to continue to the next middleware.
- In routes, Koa Router injects `(ctx, next)` into your controller.

The controller reads a query param `something` and returns different responses based on it. In dev, visit `https://localhost:9999?something=Beautiful` to see "Hello Beautiful World".

### Routing
Routes map URLs to controller functions in `src/route/router.ts`.

GET example:
```ts
router.get(URL, controller)
```

POST example:
```ts
router.post(URL, controller)
```

Other verbs:
```ts
router.put(URL, controller)
router.delete(URL, controller)
```

> Important
> Pass the controller function, not the invocation result:
```ts
router.get(URL, controller)   // correct
router.get(URL, controller()) // incorrect
```

### Request payloads and responses
Clients send data to the backend and receive results back.

Explicitly via URL parameters:
```sh
curl "https://localhost:9999?something=Beautiful"
```
Controller side:
```ts
const something = ctx.query.something
```
Note: `ctx.query.something` is `string | string[]`. Validate or cast before use.

Via request body (e.g., POST):
```sh
curl -d "param1=value1&param2=value2" -X POST https://localhost:9999/xxxxx
```
Controller side:
```ts
const data = ctx.request.body as { param1: string; param2: string }
```
Validate the shape and contents before using.

Implicitly via Cookies:
- Cookies can be HTTPS-only
- HttpOnly cookies cannot be read via JavaScript; set/remove via Set-Cookie
- Many browsers enforce first-party cookies (`SameSite=Strict`)
- Use `fetch(..., { credentials: 'include' })` to include cookies cross-origin

In controllers:
```ts
ctx.cookies.get(cookieKey)
```
Always validate values before use.

Returning responses:
```ts
ctx.body = results
await next() // if last middleware, the response is sent
```

### Accessing MongoDB and Elasticsearch
- User data is stored in MongoDB (via Mongoose).
- Searchable data is stored in Elasticsearch.

MongoDB connection is created at startup in `src/dbPool/DbClusterPool.ts` by `connectMongoDBCluster()`. It reads env vars for connection string and credentials, and registers initial models.

Simple example:
```ts
import mongoose, { InferSchemaType } from 'mongoose'

class UserSchemaFactory {
	schema = {
		uid: { type: Number, unique: true, required: true },
		username: { type: String },
		editDateTime: { type: Number, required: true },
	}
	collectionName = 'user'
	schemaInstance = new Schema(this.schema)
}

const UserSchema =  new UserSchemaFactory()
const { collectionName, schemaInstance } = UserSchema

type User = InferSchemaType<typeof schemaInstance>

const user: User = {
	uid: 1,
	username: 'foo',
	editDateTime: Date.now(),
}

await insertData2MongoDB<User>(user, schemaInstance, collectionName)

const userWhere: QueryType<User> = { uid: 1 }
const userSelect: SelectType<User> = { username: 1 }
const userResult = await selectDataFromMongoDB<User>(userWhere, userSelect, schemaInstance, collectionName)
console.log('RESULT', userResult)
```

Elasticsearch connection is created at startup by `connectElasticSearchCluster()` in `src/elasticsearchPool/ElasticsearchClusterPool.ts`. The client is attached to `ctx.elasticsearchClient` via middleware.

Example:
```ts
const esClient = ctx.elasticsearchClient

const VideoDocument = {
	schema: {
		title: { type: String, required: true as const },
		kvid: { type: Number, required: true as const },
	},
	indexName: 'search-kirakira-video-elasticsearch',
}

const { indexName: esIndexName, schema: videoEsSchema } = VideoDocument

const videoEsData = {
	title: 'foo bar baz',
	kvid: 1,
}
await insertData2ElasticsearchCluster(esClient, esIndexName, videoEsSchema, videoEsData, true)

const esQuery = { query_string: { query: 'foo' } }
const esSearchResult = await searchDataFromElasticsearchCluster(esClient, esIndexName, videoEsSchema, esQuery)
console.log('RESULT', esSearchResult)
```

## 4. API Reference
See routes in `src/route/router.ts`.

## 5. Build and Deploy
You can test locally, run on a server instance, or build a container image and run under Docker/Kubernetes.

### Build, then run
1) Set environment variables (same as in the development section).

2) Build and preview
> Important
> Default build output is `dist`. You may change this in `tsconfig.json` and update the start command accordingly.

```sh
# 1. Install deps
npm install

# 2. Build
npm run build

# 3. Run
node ./dist/app.js
```

### Container image (recommended for production)
Best practice is to deploy KIRAKIRA-Rosales on a Kubernetes cluster (e.g., AWS EKS).

Ensure Docker is installed and running:
```sh
docker --version
```

Build and push a multi-arch image (example; adjust for your OS):
```sh
# Create and use a new builder (skip if it already exists)
docker buildx create --name mybuilder --use

# Bootstrap builder
docker buildx inspect --bootstrap

# Build and push multi-platform image to your registry
# Replace <username>/<repo-name> and <tag> (e.g., 3.21.1)
# Mind the trailing dot
#                          ↓
docker buildx build --platform linux/amd64,linux/arm64 -t <username>/<repo-name>:<tag> --push .
```
Then deploy the image to your K8s or container environment.

> Important
> Do not forget to configure environment variables in production and container environments!

## 6. Open Source and Security
- Licensed under BSD-3-Clause.
- For general issues, open an Issue. For privacy/security matters, visit the Discord channel: https://discord.gg/maveEWn6VP
