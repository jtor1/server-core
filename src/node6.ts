//
// @see README.md + "Node 6 Support"
//

import { VERSION } from './utils/const';
import {
  LivestreamUrlParseResult,
  LivestreamUrlProvider,
  livestreamGraphQL,
  parseLivestreamUrl,
} from './utils/livestream';
import {
  sessionMiddleware,
  SESSION_COOKIE_NAME,
  SESSION_HEADER_NAME,
  SESSION_REQUEST_PROPERTY,
} from './middleware/session';

export {
  VERSION,

  LivestreamUrlParseResult,
  LivestreamUrlProvider,
  livestreamGraphQL,
  parseLivestreamUrl,

  sessionMiddleware,
  SESSION_COOKIE_NAME,
  SESSION_HEADER_NAME,
  SESSION_REQUEST_PROPERTY,
};
