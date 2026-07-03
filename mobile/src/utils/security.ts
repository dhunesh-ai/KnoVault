import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  saveItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },
  deleteItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};
