// utils/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  TRAIN_NUMBER: "train_number",
  DRIVER_NAME: "driver_name",
};

/**
 * Save train number locally
 */
export async function saveTrainNumber(trainNumber: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.TRAIN_NUMBER, trainNumber);
  } catch (error) {
    console.error("Error saving train number:", error);
  }
}

/**
 * Get saved train number
 */
export async function getTrainNumber(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.TRAIN_NUMBER);
  } catch (error) {
    console.error("Error getting train number:", error);
    return null;
  }
}

/**
 * Save driver name locally
 */
export async function saveDriverName(driverName: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.DRIVER_NAME, driverName);
  } catch (error) {
    console.error("Error saving driver name:", error);
  }
}

/**
 * Get saved driver name
 */
export async function getDriverName(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.DRIVER_NAME);
  } catch (error) {
    console.error("Error getting driver name:", error);
    return null;
  }
}

/**
 * Clear all saved data
 */
export async function clearStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEYS.TRAIN_NUMBER, KEYS.DRIVER_NAME]);
  } catch (error) {
    console.error("Error clearing storage:", error);
  }
}
