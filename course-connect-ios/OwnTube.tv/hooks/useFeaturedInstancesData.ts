import JSON5 from "json5";
import { useEffect, useState } from "react";
import { Asset } from "expo-asset";
import { Platform } from "react-native";
import { readAsStringAsync } from "expo-file-system/legacy";
import { InstanceConfig } from "../instanceConfigs";

export const useFeaturedInstancesData = () => {
  const [featuredInstances, setFeaturedInstances] = useState<InstanceConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const getFeaturedList = async () => {
    try {
      if (__DEV__) {
        console.log('[useFeaturedInstancesData] Starting to load featured instances...');
      }
      const [{ localUri }] = await Asset.loadAsync(require("../public/featured-instances.json5"));
      if (__DEV__) {
        console.log('[useFeaturedInstancesData] Asset loaded, localUri:', localUri);
      }

      if (localUri) {
        if (Platform.OS === "web") {
          const config = await fetch(localUri).then((res) => res.text());
          return JSON5.parse<InstanceConfig[]>(config);
        } else {
          const config = await readAsStringAsync(localUri);
          return JSON5.parse<InstanceConfig[]>(config);
        }
      }
      return [];
    } catch (err) {
      console.error('[useFeaturedInstancesData] Failed to load featured instances:', err);
      throw err;
    }
  };

  useEffect(() => {
    getFeaturedList()
      .then((instances) => {
        if (__DEV__) {
          console.log('[useFeaturedInstancesData] Successfully loaded', instances.length, 'featured instances');
        }
        setFeaturedInstances(instances);
      })
      .catch((err) => {
        console.error('[useFeaturedInstancesData] Error in useEffect:', err);
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return { featuredInstances, isLoading, error };
};
