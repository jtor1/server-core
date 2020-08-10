import {
  _VirtualEventLinkParseFragment,
} from './_helpers';


// @public
export enum VirtualEventProvider {
  zoom = 'zoom',
  youtube = 'youtube',
  googleMeet = 'googleMeet',
  eventlive = 'eventlive',
}

export type VirtualEventLinkParseResult = _VirtualEventLinkParseFragment & {
  provider: VirtualEventProvider;
  linkText: string;
}
