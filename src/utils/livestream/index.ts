import {
  LivestreamUrlProvider,
  LivestreamUrlParseResult,
} from './types';
import {
  _LivestreamUrlParser,
} from './_helpers';
import { parseUrl as parseZoomUrl } from './zoom';
import { parseUrl as parseYouTubeUrl } from './youtube';
import { parseUrl as parseGoogleMeetUrl } from './googleMeet';
import { parseUrl as parseEventLiveUrl } from './eventlive';

import * as schema from './schema';
export const livestreamGraphQL = schema;


const PROVIDER_PARSERS = new Map<LivestreamUrlProvider, _LivestreamUrlParser>([
  [ LivestreamUrlProvider.zoom, parseZoomUrl ],
  [ LivestreamUrlProvider.youtube, parseYouTubeUrl ],
  [ LivestreamUrlProvider.googleMeet, parseGoogleMeetUrl ],
  [ LivestreamUrlProvider.eventlive, parseEventLiveUrl ],
]);


// @public
export {
  LivestreamUrlProvider,
  LivestreamUrlParseResult,
};

export function parseLivestreamUrl(text: string): LivestreamUrlParseResult | null {
  let match: LivestreamUrlParseResult | null = null;
  if (! text) {
    return match;
  }

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
