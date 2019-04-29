import { Request, Response, NextFunction } from 'express';
import { verifyAll, TokenConfig } from './verify.token';

const getToken = (req: Request) => req.headers.authorization;

export const tokenCheck = (tokenConfig: TokenConfig) => async (req: Request, res: Response, next: NextFunction) => {
  const token = getToken(req);
  if (token) {
    const decoded = verifyAll(tokenConfig, token);
    if (decoded instanceof Error) {
      next();
    } else {
      (req as any).token = token;
      next();
    }
  } else {
    next();
  }
}
