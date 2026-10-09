import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import { z } from 'zod';
import { Context } from '../../context';

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['BUYER', 'SELLER', 'BOTH']),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const authResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) return null;
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.userId },
      });
      if (!user) return null;
      const { password, ...safeUser } = user;
      return {
        ...safeUser,
        createdAt: safeUser.createdAt.toISOString(),
      };
    },
  },
  Mutation: {
    register: async (_: unknown, args: any, ctx: Context) => {
      const parsed = RegisterSchema.safeParse(args);
      if (!parsed.success) {
        throw new GraphQLError(parsed.error.errors[0].message, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const { name, email, password, role } = parsed.data;

      const existing = await ctx.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existing) {
        throw new GraphQLError('A user with this email already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await ctx.prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role,
        },
      });

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new GraphQLError('JWT_SECRET is not configured', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        jwtSecret,
        { expiresIn: '7d' }
      );

      try {
        await ctx.redis.setex(`session:${user.id}`, 604800, token);
      } catch (err) {
        console.warn('[Redis] Failed to cache session token:', err);
      }

      const { password: _pwd, ...safeUser } = user;
      return {
        token,
        user: {
          ...safeUser,
          createdAt: safeUser.createdAt.toISOString(),
        },
      };
    },

    login: async (_: unknown, args: any, ctx: Context) => {
      const parsed = LoginSchema.safeParse(args);
      if (!parsed.success) {
        throw new GraphQLError(parsed.error.errors[0].message, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const { email, password } = parsed.data;

      const user = await ctx.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new GraphQLError('JWT_SECRET is not configured', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        jwtSecret,
        { expiresIn: '7d' }
      );

      try {
        await ctx.redis.setex(`session:${user.id}`, 604800, token);
      } catch (err) {
        console.warn('[Redis] Failed to cache session token:', err);
      }

      const { password: _pwd, ...safeUser } = user;
      return {
        token,
        user: {
          ...safeUser,
          createdAt: safeUser.createdAt.toISOString(),
        },
      };
    },
  },
};
