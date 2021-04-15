import { Request } from 'express';

export function deriveRemoteAddress(req: Request | null | undefined): string | undefined {
  // we tried using `forwarded`, but it derives *local* addresses as well;
  //   that does not suit our needs;
  //   for example, it would be VERY BAD for us to `limitd` / rate limiting on '::ffff:127.0.0.1'
  //   we only care about true forwarding, via standard header
  const derived = req?.headers?.['x-forwarded-for'];
  return (Array.isArray(derived)
    ? derived[0]
    : derived
  ) || undefined;
}
