export const GPS_CONFIG: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
};

export const DISTANCE_CONFIG = {
  osrmUrl: "https://router.project-osrm.org/table/v1/driving",
  userAgent: "octane-fuel-intelligence-client",
  osrmTimeoutMs: 15000,
};
