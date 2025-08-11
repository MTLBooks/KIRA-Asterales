import type { FastifyInstance } from 'fastify'
import { helloWorldHandler } from '../controller/hello.js'
import registerVideoRoutes from './modules/video.js'
import registerNovelRoutes from './modules/novel.js'
import registerUserRoutes from './modules/user.js'
import registerBlockRoutes from './modules/block.js'
import registerHistoryRoutes from './modules/history.js'
import registerFavoritesRoutes from './modules/favorites.js'
import registerFeedRoutes from './modules/feed.js'
import registerRbacRoutes from './modules/rbac.js'
import registerSecretRoutes from './modules/secret.js'
import registerChapterRoutes from './modules/chapter.js'

export default async function registerRoutes(fastify: FastifyInstance) {
    // Hello/test
    fastify.get('/', {}, helloWorldHandler)
    fastify.get('/02/koa/hello', {}, helloWorldHandler)

    // --- Modular route registrations ---
    await registerUserRoutes(fastify)      // /user/*
    await registerBlockRoutes(fastify)     // /block/* and /user/blocked/info
    await registerHistoryRoutes(fastify)   // /history/*
    await registerFavoritesRoutes(fastify) // /favorites/*
    await registerFeedRoutes(fastify)      // /feed/*
    await registerRbacRoutes(fastify)      // /rbac/*
    await registerSecretRoutes(fastify)    // /secret/*
    await registerChapterRoutes(fastify)    // /chapter/*

    // Feature stacks
    await registerVideoRoutes(fastify)     // /video/* hierarchy
    await registerNovelRoutes(fastify)     // /novel/* and /chapter/* hierarchies
} 