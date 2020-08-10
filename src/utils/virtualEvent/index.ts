import {
  VirtualEventProvider,
  VirtualEventLinkParseResult,
} from './types';
import {
  _VirtualEventLinkParser,
} from './_helpers';
import { parseLink as parseZoomUrl } from './zoom';
import { parseLink as parseYouTubeUrl } from './youtube';
import { parseLink as parseGoogleMeetUrl } from './googleMeet';
import { parseLink as parseEventLiveUrl } from './eventlive';

import * as schema from './schema';
export const virtualEventGraphQL = schema;


const PROVIDER_PARSERS = new Map<VirtualEventProvider, _VirtualEventLinkParser>([
  [ VirtualEventProvider.zoom, parseZoomUrl ],
  [ VirtualEventProvider.youtube, parseYouTubeUrl ],
  [ VirtualEventProvider.googleMeet, parseGoogleMeetUrl ],
  [ VirtualEventProvider.eventlive, parseEventLiveUrl ],
]);


// @public
export {
  VirtualEventProvider,
  VirtualEventLinkParseResult,
};

export function parseVirtualEventLink(text: string): VirtualEventLinkParseResult | null {
  let match: VirtualEventLinkParseResult | null = null;
  if (! text) {
    return match;
  }

  for (let [ provider, parser ] of PROVIDER_PARSERS.entries()) {
    const parsed = parser(text);
    if (parsed) {
      match = {
        ...parsed,

        provider,
        linkText: text,
      };
      break;
    }
  }

  return match;
}
