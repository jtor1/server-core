//
// @see README.md + "Node 6 Support"
//
/* istanbul ignore file */

import { VERSION } from './utils/const';
import {
  VirtualEventLinkParseResult,
  VirtualEventProvider,
  virtualEventGraphQL,
  parseVirtualEventLink,
} from './utils/virtualEvent';
import {
  sessionMiddleware,
  SESSION_COOKIE_NAME,
  SESSION_HEADER_NAME,
  SESSION_REQUEST_PROPERTY,
} from './middleware/session';

export {
  VERSION,

  VirtualEventLinkParseResult,
  VirtualEventProvider,
  virtualEventGraphQL,
  parseVirtualEventLink,

  sessionMiddleware,
  SESSION_COOKIE_NAME,
  SESSION_HEADER_NAME,
  SESSION_REQUEST_PROPERTY,
};
