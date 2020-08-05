import {
  _LivestreamUrlParseFragment,
} from './_helpers';


// @public
export enum LivestreamUrlProvider {
  zoom = 'zoom',
  youtube = 'youtube',
  googleMeet = 'googleMeet',
  eventlive = 'eventlive',
}

export type LivestreamUrlParseResult = _LivestreamUrlParseFragment & {
  provider: LivestreamUrlProvider;
  text: string;
}
