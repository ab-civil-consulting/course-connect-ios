import { useLocalSearchParams } from "expo-router";
import { RootStackParams } from "../../app/_layout";
import { Query, QueryKey, useInfiniteQuery, useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { GetVideosVideo, OwnTubeError } from "../models";
import { ApiServiceImpl } from "../peertubeVideosApi";
import { VideosCommonQuery, Video, VideoCaption } from "@peertube/peertube-types";
import { retry } from "../helpers";

import { QUERY_KEYS } from "../constants";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { getDeviceTypeForVideoView } from "../../utils";
import { postHogInstance } from "../../diagnostics";

export const useGetVideosQuery = <TResult = GetVideosVideo[]>({
  enabled = true,
  select,
  params,
  uniqueQueryKey,
  refetchInterval,
}: {
  enabled?: boolean;
  select?: (queryReturn: { data: GetVideosVideo[]; total: number }) => { data: TResult; total: number };
  params?: VideosCommonQuery;
  uniqueQueryKey?: string;
  refetchInterval?: number;
}) => {
  const { backend } = useLocalSearchParams<RootStackParams["index"]>();

  return useQuery({
    queryKey: [QUERY_KEYS.videos, backend, uniqueQueryKey],
    queryFn: async () => {
      // IMPORTANT: Only use start and count parameters!
      const result = await ApiServiceImpl.getVideos(backend!, {
        count: params?.count || 50,
        start: params?.start || 0,
      });

      // Filter client-side if categoryOneOf is specified
      let filteredData = result.data;
      if (params?.categoryOneOf && params.categoryOneOf.length > 0) {
        filteredData = result.data.filter(video =>
          params.categoryOneOf!.includes(video.category?.id)
        );
      }

      // Sort client-side by publishedAt (newest first) if requested
      if (params?.sort === "-publishedAt") {
        filteredData = filteredData.sort((a, b) => {
          const dateA = new Date(a.publishedAt).getTime();
          const dateB = new Date(b.publishedAt).getTime();
          return dateB - dateA;
        });
      }

      return {
        data: filteredData,
        total: result.total,
      };
    },
    enabled: enabled && !!backend,
    select,
    refetchInterval,
    retry,
  });
};

export const useInfiniteVideosQuery = (
  queryArg: Partial<{
    firstPageSize?: number;
    pageSize: number;
    uniqueQueryKey: string;
    queryParams: VideosCommonQuery;
    backend?: string;
  }>,
) => {
  const { backend: backendFromParams } = useLocalSearchParams<RootStackParams["index"]>();
  const { pageSize = 24, uniqueQueryKey, queryParams, firstPageSize, backend: backendFromArg } = queryArg;
  const backend = backendFromArg || backendFromParams;
  const _0PageSize = firstPageSize ?? pageSize;

  return useInfiniteQuery({
    initialPageParam: 0,
    getNextPageParam: (lastPage: { data: GetVideosVideo[]; total: number }, _nextPage, lastPageParam) => {
      const nextCount = (lastPageParam === 0 ? _0PageSize : lastPageParam) + (lastPageParam ? pageSize : 0);
      return nextCount >= lastPage.total ? null : nextCount;
    },
    queryKey: [QUERY_KEYS.videos, backend, "infinite", uniqueQueryKey],
    queryFn: async ({ pageParam }) => {
      // IMPORTANT: Only use start and count parameters!
      // Adding filters like categoryOneOf, sort, etc. triggers 401 errors
      const result = await ApiServiceImpl.getVideos(backend!, {
        count: pageParam === 0 ? _0PageSize : pageSize,
        start: pageParam,
      });

      // Filter client-side if categoryOneOf is specified
      let filteredData = result.data;
      if (queryParams?.categoryOneOf && queryParams.categoryOneOf.length > 0) {
        filteredData = result.data.filter(video =>
          queryParams.categoryOneOf!.includes(video.category?.id)
        );
      }

      // Sort client-side by publishedAt (newest first)
      filteredData = filteredData.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      return {
        data: filteredData,
        total: result.total, // Keep original total for pagination logic
      };
    },
    enabled: !!backend,
    retry,
    staleTime: 0, // Force fresh data - don't use cache
    gcTime: 0, // Clear cache immediately
  });
};

const LIVE_REFETCH_INTERVAL = 10_000;

export const useGetVideoQuery = <TResult = Video>({
  id,
  select,
  enabled = true,
}: {
  id?: string;
  select?: (data: Video) => TResult;
  enabled?: boolean;
}) => {
  const { backend } = useLocalSearchParams<RootStackParams["index"]>();

  return useQuery({
    queryKey: [QUERY_KEYS.video, id],
    queryFn: async () => {
      return await ApiServiceImpl.getVideo(backend!, id!);
    },
    enabled: !!backend && !!id && enabled,
    refetchInterval: (query: Query<Video, OwnTubeError, Video, QueryKey>) => {
      return query.state.data?.isLive ? LIVE_REFETCH_INTERVAL : 0;
    },
    select,
    staleTime: 0,
    retry,
  });
};

export const usePostVideoViewMutation = () => {
  const { backend } = useLocalSearchParams<RootStackParams["index"]>();

  return useMutation({
    mutationFn: async ({
      videoId,
      currentTime = 0,
      viewEvent,
    }: {
      videoId?: string;
      currentTime?: number;
      viewEvent?: "seek";
    }) => {
      return await ApiServiceImpl.postVideoView(backend!, videoId!, {
        currentTime,
        viewEvent,
        sessionId: postHogInstance.getSessionId(),
        client: Constants.expoConfig?.name ?? "OwnTube",
        device: getDeviceTypeForVideoView(Device.deviceType),
        operatingSystem: Device.osName ?? undefined,
      });
    },
  });
};

export const useGetVideoCaptionsQuery = (id?: string, enabled = true) => {
  const { backend } = useLocalSearchParams<RootStackParams["index"]>();

  return useQuery({
    queryKey: [QUERY_KEYS.videoCaptions, id],
    queryFn: async () => {
      return await ApiServiceImpl.getVideoCaptions(backend!, id!);
    },
    enabled: !!backend && !!id && enabled,
    staleTime: 0,
    retry,
  });
};

export const useGetVideoCaptionsCollectionQuery = (videoIds: string[] = [], queryKey: string) => {
  const { backend } = useLocalSearchParams<RootStackParams["index"]>();

  return useQueries({
    queries: videoIds.map((videoId) => ({
      queryKey: [queryKey, videoId, "captions"],
      queryFn: async () => {
        try {
          return await ApiServiceImpl.getVideoCaptions(backend!, videoId!);
        } catch (e) {
          throw new OwnTubeError({ message: (e as unknown as { message: string }).message });
        }
      },
      retry,
      enabled: !!backend && videoIds.length > 0,
    })),
    combine: (result) => {
      return result.filter(({ data }) => !!data).map(({ data }) => data || ([] as VideoCaption[]));
    },
  });
};

export const useGetVideoFullInfoCollectionQuery = (videoIds: string[] = [], queryKey: string) => {
  const { backend } = useLocalSearchParams<RootStackParams["index"]>();

  return useQueries({
    queries: videoIds.map((videoId) => ({
      queryKey: [queryKey, videoId],
      queryFn: async () => {
        try {
          const res = await ApiServiceImpl.getVideo(backend!, videoId!);
          // FIXED: Don't add https:// - VideoThumbnail handles URL construction
          return res;
        } catch (e) {
          throw new OwnTubeError({ message: (e as unknown as { message: string }).message });
        }
      },
      retry,
      enabled: !!backend && videoIds.length > 0,
    })),
    combine: (result) => {
      return result.filter(({ data }) => !!data).map(({ data }) => data || ({} as Video));
    },
  });
};
