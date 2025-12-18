import { useMemo } from "react";
import build_info from "../build-info.json";
import { useGlobalSearchParams, usePathname } from "expo-router";

export const useVideoLink = ({
  isTimestampAdded,
  addedTimestamp = 0,
}: {
  isTimestampAdded: boolean;
  addedTimestamp?: number;
}) => {
  const params = useGlobalSearchParams();
  const pathname = usePathname();

  return useMemo(() => {
    const paramsCopy = { ...params };
    delete paramsCopy.timestamp;

    // Build redirect URL pointing to our smart redirect page
    const redirectUrl = `${build_info.WEB_URL?.toLowerCase()}/redirect.html`;
    const queryParams = new URLSearchParams(paramsCopy as Record<string, string>);

    if (isTimestampAdded) {
      queryParams.append("timestamp", addedTimestamp.toString());
    }

    return `${redirectUrl}?${queryParams.toString()}`;
  }, [isTimestampAdded, pathname, params, addedTimestamp]);
};
