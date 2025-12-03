import { GetVideosVideo, ApiError } from "./models";
import { UseQueryResult } from "@tanstack/react-query";

export const retry = (failureCount: number, error: ApiError) => {
  if (error.status === 429) {
    return true;
  }
  return failureCount < 5;
};

export const getErrorTextKeys = (error: ApiError | null): { title: string; description: string } => {
  if (error && Number(error.status) >= 401 && Number(error.status) <= 403) {
    return { title: "accessDenied", description: "noPermissions" };
  } else {
    return { title: "pageCouldNotBeLoaded", description: "failedToEstablishConnection" };
  }
};

export const combineCollectionQueryResults = <T>(
  result: UseQueryResult<
    { data: Array<GetVideosVideo>; total: number; isError?: boolean; error?: unknown } & T,
    ApiError
  >[],
) => {
  return {
    data: result.filter((item) => item?.data?.isError || Number(item?.data?.total) > 0),
    isLoading: result.filter(({ isLoading }) => isLoading).length > 1,
    isError: result.length > 0 && result.every(({ data }) => data?.isError),
  };
};
