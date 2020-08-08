import {
  LivestreamUrlProvider,
  LivestreamUrlParseResult,
} from './types';
import {
  _LivestreamUrlParser,
} from './_helpers';
import { parseZoomUrl } from './zoom';
import { parseYoutube } from './youtube';
import { parseGoogleMeet } from './googleMeet';
import { parseEventLive } from './eventlive';

import * as schema from './schema';
export const livestreamGraphQL = schema;


const PROVIDER_PARSERS = new Map<LivestreamUrlProvider, _LivestreamUrlParser>([
  [ LivestreamUrlProvider.zoom, parseZoomUrl ],
  [ LivestreamUrlProvider.youtube, parseYoutube ],
  [ LivestreamUrlProvider.googleMeet, parseGoogleMeet ],
  [ LivestreamUrlProvider.eventlive, parseEventLive ],
]);


// @public
export {
  LivestreamUrlProvider,
  LivestreamUrlParseResult,
};

export function parseLivestreamUrl(text: string): LivestreamUrlParseResult | null {
  let match: LivestreamUrlParseResult | null = null;

  for (let [ provider, parser ] of PROVIDER_PARSERS.entries()) {
    const parsed = parser(text);
    if (parsed) {
      match = {
        ...parsed,
        provider,
        text,
      };
      break;
    }
  }

  return match;
}
