declare namespace Express {
  export interface Request {
    token?: string;
    userId?: string;
  }
}
