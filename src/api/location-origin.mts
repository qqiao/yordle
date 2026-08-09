/**
 * Returns the browser origin, including a non-default port when one is present.
 */
export function locationOrigin(
  location: Pick<Location, 'origin'> = document.location,
): string {
  return location.origin;
}
