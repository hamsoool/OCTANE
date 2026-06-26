import { GPS_CONFIG } from "../constants/navigation";

export function startWatching(
  onPosition: (pos: GeolocationPosition) => void,
  onError?: (err: GeolocationPositionError) => void
): number {
  return navigator.geolocation.watchPosition(onPosition, onError, GPS_CONFIG);
}

export function stopWatching(watchId: number | null): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }
}

export function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options ?? GPS_CONFIG);
  });
}
