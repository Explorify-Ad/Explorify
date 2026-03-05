import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Store data in AsyncStorage.
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON stringified)
 */
export const storeData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error('Error storing data:', error);
  }
};

/**
 * Retrieve data from AsyncStorage.
 * @param {string} key - Storage key
 * @returns {Promise<*>} Parsed stored value or null
 */
export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error reading data:', error);
    return null;
  }
};

/**
 * Remove data from AsyncStorage.
 * @param {string} key - Storage key
 */
export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing data:', error);
  }
};
