import * as Location from 'expo-location';

/**
 * Request location permissions from the user.
 * @returns {Promise<boolean>} Whether permission was granted
 */
export const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

/**
 * Get the user's current location.
 * @returns {Promise<{latitude: number, longitude: number}>} Current coordinates
 */
export const getCurrentLocation = async () => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error('Location permission not granted');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
};

// TODO: Add location watching for real-time tracking
// TODO: Add background location tracking
