import { JwtPayload } from './jwt';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      staff?: {
        id?: string;
        [key: string]: any;
      };
    }
  }
}

export {};