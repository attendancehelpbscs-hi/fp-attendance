import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import createError from 'http-errors';
import constants from '../config/constants.config';
import { JwtPayload } from '../@types/jwt';

const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createError(401, 'No token provided'));
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, constants.accessTokenSecret) as JwtPayload;

    req.user = decoded;
    next();
  } catch (error) {
    return next(createError(401, 'Invalid token'));
  }
};

export default auth;