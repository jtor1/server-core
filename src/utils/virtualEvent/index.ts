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


type _VirtualEventLinkProviderToolkit = {
  provider: VirtualEventProvider,
  parseLink: _VirtualEventLinkParser,
};
const PROVIDER_TOOLKITS: Array<_VirtualEventLinkProviderToolkit> = [
  {
    provider: VirtualEventProvider.zoom,
    parseLink: parseZoomUrl,
  },
  {
    provider: VirtualEventProvider.youtube,
    parseLink: parseYouTubeUrl,
  },
  {
    provider: VirtualEventProvider.googleMeet,
    parseLink: parseGoogleMeetUrl,
  },
  {
    provider: VirtualEventProvider.eventlive,
    parseLink: parseEventLiveUrl,
  },
];


// @public
export {
  VirtualEventProvider,
  VirtualEventLinkParseResult,
};

export function parseVirtualEventLink(text: string): VirtualEventLinkParseResult | null {
  if (! text) {
    return null;
  }

  // assume unknown
  let match: VirtualEventLinkParseResult = {
    provider: VirtualEventProvider.unknown,
    linkText: text,
    passwordDetected: false,
  };

  for (let { provider, parseLink } of PROVIDER_TOOLKITS) {
    const parsed = parseLink(text);
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
