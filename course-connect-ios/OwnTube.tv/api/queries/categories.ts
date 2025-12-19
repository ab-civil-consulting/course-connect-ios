import { useLocalSearchParams } from "expo-router";
import { RootStackParams } from "../../app/_layout";
import { useQueries, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants";
import { CategoriesApiImpl } from "../categoriesApi";
import { combineCollectionQueryResults, retry } from "../helpers";
import { ApiServiceImpl } from "../peertubeVideosApi";
import { ApiError } from "../models";

export const useGetCategoriesQuery = ({ enabled = true }: { enabled?: boolean }) => {
  const { backend } = useLocalSearchParams<RootStackParams["index"]>();

  return useQuery({
    queryKey: [QUERY_KEYS.categories, backend],
    queryFn: async () => {
      return await CategoriesApiImpl.getCategories(backend!);
    },
    enabled: !!backend && enabled,
    retry,
  });
};

export const useGetCategoriesCollectionQuery = (categories: Array<{ name: string; id: number }> = []) => {
  const { backend } = useLocalSearchParams<RootStackParams["categories"]>();

  return useQueries({
    queries: categories?.map(({ name, id }) => ({
      queryKey: [QUERY_KEYS.categoriesCollection, id, backend],
      queryFn: async () => {
        try {
          // Fetch all videos (search endpoint doesn't support categoryOneOf filtering)
          // We'll filter client-side after fetching
          const res = await ApiServiceImpl.getVideos(backend!, {
            count: 100, // Fetch more videos to ensure we get enough per category
          });

          // Filter videos by category on the client side
          const filteredVideos = res.data.filter((video) => video.category?.id === id);

          // Sort by publishedAt (newest first) and take only 4 videos
          const sortedVideos = filteredVideos
            .sort((a, b) => {
              const dateA = new Date(a.publishedAt).getTime();
              const dateB = new Date(b.publishedAt).getTime();
              return dateB - dateA; // Descending order (newest first)
            })
            .slice(0, 4);

          return {
            data: sortedVideos,
            total: filteredVideos.length,
            name,
            id,
          };
        } catch (error) {
          if ((error as unknown as ApiError).status === 429) {
            throw error;
          }
          return { error, isError: true, id, name, data: [], total: 0 };
        }
      },
      retry,
      enabled: !!backend,
    })),
    combine: (result) => combineCollectionQueryResults<{ name: string; id: number }>(result as any),
  });
};
