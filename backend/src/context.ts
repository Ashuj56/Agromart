import { PrismaClient, UserRole } from '@prisma/client';
import Redis from 'ioredis';

export interface Context {
  user: { userId: string; role: UserRole } | null;
  prisma: PrismaClient;
  redis: Redis;
}
