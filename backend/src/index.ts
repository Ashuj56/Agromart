import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './schema/resolvers';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { getUserFromHeader } from './middleware/auth';
import { Context } from './context';
import { razorpayWebhookRouter } from './payments/webhook';
import { register, metricsMiddleware } from './metrics';

const app = express();
const httpServer = http.createServer(app);

// 1. Metrics middleware for tracking request durations & counts
app.use(metricsMiddleware);

// 2. Razorpay webhook BEFORE express.json()
app.use(razorpayWebhookRouter);

// 3. Health & metrics endpoints
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/ready', async (_req, res) => {
  try {
    // Check PostgreSQL
    await prisma.$queryRaw`SELECT 1`;
    // Check Redis
    await redis.ping();
    res.status(200).json({ status: 'ready' });
  } catch (err: any) {
    res.status(503).json({ status: 'not ready', error: err.message });
  }
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// 4. Apollo Server initialization
async function startServer() {
  const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const user = getUserFromHeader(req);
        return {
          user,
          prisma,
          redis,
        };
      },
    })
  );

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 AgroMart API server ready at http://localhost:${PORT}/graphql`);
    console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
    console.log(`💓 Health check at http://localhost:${PORT}/health`);

    // Keep Supabase free-tier DB alive (prevents 4s cold-start after inactivity)
    const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes
    setInterval(async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        console.log('💓 [DB Keepalive] ping ok');
      } catch (err: any) {
        console.warn('[DB Keepalive] ping failed:', err.message);
      }
    }, KEEPALIVE_INTERVAL_MS);
    console.log(`⏱️  DB keepalive ping scheduled every ${KEEPALIVE_INTERVAL_MS / 1000}s`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting AgroMart backend:', err);
  process.exit(1);
});
