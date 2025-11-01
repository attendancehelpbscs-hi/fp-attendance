import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: string | JwtPayload;
      staff?: {
        id: string;
        name: string;
        email: string;
      };
    }
  }
}

export {};
