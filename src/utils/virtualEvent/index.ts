import {
  VirtualEventProvider,
  VirtualEventLinkParseResult,
} from './types';
import { parseLink } from './aggregator';
import * as schema from './schema';

export {
  VirtualEventProvider,
  VirtualEventLinkParseResult,

  parseLink as parseVirtualEventLink,
  schema as virtualEventGraphQL,
};
