import { LocationModelTemplate } from '../../data/location/model';
import uuidV5 from 'uuid/v5';


export const FETCH_RETENTION_INTERVAL = 604800000; // 1 week

export const UUID_ROOT_NAMESPACE = 'dfb295fb-68dc-4bb7-9920-95d4e392b2f9';


export function shouldLocationBeFetched(location: LocationModelTemplate | null | undefined): boolean {
  if ( !location || !location.fetchedAt) {
    return true;
  }
  return Date.now() > location.fetchedAt.getTime() + FETCH_RETENTION_INTERVAL;
}

export function reproducibleLocationId(placeId: string): string {
  if (! placeId) {
    throw new Error('LocationModel#createReproducibleId: insufficient data');
  }
  return uuidV5(placeId, UUID_ROOT_NAMESPACE);
}

