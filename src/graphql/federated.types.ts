export interface FederatedTypeReference {
  __typename: string;
  id: string;
}
type FederatedMaybeId = string | null | undefined;
type FederatedTypeResolver = (id: FederatedMaybeId) => FederatedTypeReference | null;

function _federatedTypeById(__typename: string): FederatedTypeResolver {
  return function _federatedType(id: FederatedMaybeId) {
    if (! id) {
      return null;
    }
    return { __typename, id };
  }
}


export const federatedUserById = _federatedTypeById('User'); // => `identity_service.User`
export const federatedEventById = _federatedTypeById('Event'); // => `event_service.Event`
export const federatedPhotoById = _federatedTypeById('Photo'); // => `photo_service.Photo`
export const federatedVideoById = _federatedTypeById('Video'); // => `photo_service.Video`
