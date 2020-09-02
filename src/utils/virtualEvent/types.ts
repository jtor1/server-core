import {
  _VirtualEventLinkParseFragment,
} from './_helpers';


// @public
export enum VirtualEventProvider {
  unknown = 'unknown',
  zoom = 'zoom',
  youtube = 'youtube',
  googleMeet = 'googleMeet',
  eventlive = 'eventlive',
}

export type VirtualEventLinkParseResult = _VirtualEventLinkParseFragment & {
  provider: VirtualEventProvider;
  linkText: string;
  isLinkValid: boolean;
  // FIXME:  @deprecated
  passwordDetected: boolean;
}
