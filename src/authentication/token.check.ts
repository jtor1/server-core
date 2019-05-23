import { Request, Response, NextFunction } from 'express';
import { verifyAll, TokenConfig } from './verify.token';

/**
 * Derives the token value -- usually a JWT -- from the 'Authorization' header.
 * What we call `req.token` is actually the full 'Authorization' header.
 *
 * eg. 'Authorization: Bearer TOKEN_VALUE' => TOKEN_VALUE
 */
export const deriveTokenValue = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (! header) {
    return null;
  }
  const [ tokenType, tokenValue ] = header.split(' ');
  if (! tokenValue) {
    return null;
  }
  return tokenValue;
}

export const tokenCheck = (tokenConfig: TokenConfig) => async (req: Request, res: Response, next: NextFunction) => {
  const token = deriveTokenValue(req);
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
