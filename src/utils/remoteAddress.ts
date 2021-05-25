import { Request } from 'express';
import { first } from 'lodash';

/**
 * @returns {String} the IP address of the originating Client, or `undefined`
 */
export function deriveRemoteAddress(req: Request | null | undefined): string | undefined {
  // inspired by '@withjoy/telemetry' + `deriveIPFromRequest`
  //   in that it respects 'x-forwarded-for', and grabs the "farthest" IP from it
  //   but ... we can't use it directly because it derives `Socket#remoteAddress`
  //   (see below)
  // we previously tried using `forwarded`, but it derives *local* addresses as well;
  //   that does not suit our needs;
  //   for example, it would be VERY BAD for us to `limitd` / rate limiting on '::ffff:127.0.0.1'
  //   or the IP of the immediate upstream load balancer
  //   we only care about true forwarding, via standard header

  // https://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html
  //   4.2 Message Headers
  //   "It MUST be possible to combine the multiple header fields into one "field-name: field-value" pair,
  //    without changing the semantics of the message, by appending each subsequent field-value to the first,
  //    each separated by a comma."
  const headers = req?.headers?.['x-forwarded-for'];
  const header: string | undefined = (Array.isArray(headers)
    ? headers[0]
    : headers
  );
  if (! header) {
    return undefined;
  }

  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
  //   "the right-most IP address is the IP address of the most recent proxy
  //    and the left-most IP address is the IP address of the originating client."
  const addresses = header.split(/\s*,\s*/);
  return first(addresses) || undefined;
}
