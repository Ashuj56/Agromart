import jwt from 'jsonwebtoken';
import { Request } from 'express';

export type UserRole = 'BUYER' | 'SELLER' | 'BOTH';

export interface AuthUser {
  userId: string;
  role: UserRole;
}

export function getUserFromHeader(req: Request): AuthUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  const token = parts[1];
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    const decoded = jwt.verify(token, secret) as AuthUser;
    if (decoded && decoded.userId && decoded.role) {
      return {
        userId: decoded.userId,
        role: decoded.role,
      };
    }
    return null;
  } catch {
    return null;
  }
}
