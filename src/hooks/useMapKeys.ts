import {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS} from '../constants';

export interface MapKeys {
  apiKey: string;
  securityKey: string;
}

export interface UseMapKeysResult {
  keys: MapKeys;
  isLoading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

/**
 * 用于加载高德地图 API Key 的 Hook
 * 从 AsyncStorage 异步读取配置
 */
export const useMapKeys = (): UseMapKeysResult => {
  const [keys, setKeys] = useState<MapKeys>({
    apiKey: '',
    securityKey: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadKeys = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [apiKey, securityKey] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AMAP_KEY),
        AsyncStorage.getItem(STORAGE_KEYS.AMAP_SECURITY_KEY),
      ]);

      setKeys({
        apiKey: apiKey || '',
        securityKey: securityKey || '',
      });
    } catch (err) {
      console.error('加载地图 API Key 失败:', err);
      setError(err instanceof Error ? err : new Error('加载地图配置失败'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  return {
    keys,
    isLoading,
    error,
    reload: loadKeys,
  };
};

export default useMapKeys;
