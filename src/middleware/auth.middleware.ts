import { Request, Response, NextFunction } from 'express';
import { jwtVerify, decodeJwt } from 'jose';
import { clearConversationHistory } from '../services/chat.service';

const JWT_SECRET = process.env.JWT_SECRET;

const getSecretKey = () => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }
  return new TextEncoder().encode(JWT_SECRET);
};

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'renter' | 'owner';
  name?: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' },
      });
    }

    const token = authHeader.split(' ')[1];
    const secretKey = getSecretKey();

    const { payload } = await jwtVerify(token, secretKey);

    req.user = {
      id: payload.sub as string,
      email: payload.email as string,
      role: (payload.role as 'renter' | 'owner') || 'renter',
      name: payload.name as string | undefined,
    };

    next();
  } catch {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const payload = decodeJwt(token);
        if (payload.sub) {
          clearConversationHistory(payload.sub);
        }
      }
    } catch {
      // best-effort cleanup
    }

    return res.status(401).json({
      success: false,
      error: { code: 'SESSION_EXPIRED', message: 'Invalid or expired token' },
    });
  }
};

export const requireOwner = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({
      success: false,
      error: { code: 'INSUFFICIENT_ROLE', message: 'Owner access required' },
    });
  }
  next();
};
