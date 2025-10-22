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
      return await ApiServiceImpl.getVideos(backend!, { count: 50, ...params });
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

  // DEBUG: Log query setup
  console.log("[useInfiniteVideosQuery] Setup:", {
    backend,
    uniqueQueryKey,
    queryParams,
    pageSize,
    firstPageSize: _0PageSize,
    enabled: !!backend
  });

  return useInfiniteQuery({
    initialPageParam: 0,
    getNextPageParam: (lastPage: { data: GetVideosVideo[]; total: number }, _nextPage, lastPageParam) => {
      const nextCount = (lastPageParam === 0 ? _0PageSize : lastPageParam) + (lastPageParam ? pageSize : 0);

      console.log("[useInfiniteVideosQuery] getNextPageParam:", {
        lastPageDataLength: lastPage.data.length,
        lastPageTotal: lastPage.total,
        nextCount,
        hasMore: nextCount < lastPage.total
      });

      return nextCount >= lastPage.total ? null : nextCount;
    },
    queryKey: [QUERY_KEYS.videos, backend, "infinite", uniqueQueryKey],
    queryFn: async ({ pageParam }) => {
      console.log("[useInfiniteVideosQuery] queryFn called:", {
        pageParam,
        count: pageParam === 0 ? _0PageSize : pageSize,
        backend,
        queryParams
      });

      const result = await ApiServiceImpl.getVideos(backend!, {
        count: pageParam === 0 ? _0PageSize : pageSize,
        start: pageParam,
        sort: "-publishedAt",
        ...queryParams,
      });

      console.log("[useInfiniteVideosQuery] API Result:", {
        dataLength: result.data.length,
        total: result.total,
        firstVideoName: result.data[0]?.name
      });

      return result;
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
