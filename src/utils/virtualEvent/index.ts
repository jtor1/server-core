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
import { parseLink as parseUnknownUrl } from './unknown';

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
  // always last
  {
    provider: VirtualEventProvider.unknown,
    parseLink: parseUnknownUrl,
  },
];


// @public
export {
  VirtualEventProvider,
  VirtualEventLinkParseResult,
};

export function parseVirtualEventLink(linkText: string): VirtualEventLinkParseResult | null {
  if (! linkText) {
    return null;
  }

  for (let { provider, parseLink } of PROVIDER_TOOLKITS) {
    const parsed = parseLink(linkText);
    if (parsed) {
      return {
        provider,
        linkText,
        isLinkValid: true,

        ...parsed,
      };
    }
  }

  // whatever the Couple cut-and-pasted to us, we echo back;
  //   no known Provider
  //   we detected nothing useful
  return {
    provider: VirtualEventProvider.unknown,
    linkText,
    isLinkValid: false,
    isPasswordDetected: false,
  };
}
