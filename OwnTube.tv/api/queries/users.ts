import { useLocalSearchParams } from "expo-router";
import { RootStackParams } from "../../app/_layout";
import { ROUTES } from "../../types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MUTATION_KEYS, QUERY_KEYS } from "../constants";
import { retry } from "../helpers";
import { UsersApiImpl } from "../usersApi";

export const useGetMyUserInfoQuery = (backendParam?: string) => {
  const { backend: routeBackend } = useLocalSearchParams<RootStackParams[ROUTES.INDEX]>();
  const backend = backendParam || routeBackend;

  return useQuery({
    queryKey: [QUERY_KEYS.myUserInfo, backend],
    queryFn: async () => {
      return await UsersApiImpl.getMyUserInfo(backend!);
    },
    enabled: false,
    retry,
  });
};

export const useGetSubscriptionByChannelQuery = (channelHandle: string, enabled: boolean) => {
  const { backend } = useLocalSearchParams<RootStackParams[ROUTES.INDEX]>();

  return useQuery({
    queryKey: [QUERY_KEYS.myChannelSubscription, backend, channelHandle],
    queryFn: async () => {
      return await UsersApiImpl.getSubscriptionByChannel(backend!, channelHandle);
    },
    enabled: !!channelHandle && enabled,
    retry: 1,
  });
};

export const useUpdateMyUserInfoMutation = (backend: string) => {
  return useMutation({
    mutationKey: [MUTATION_KEYS.updateUserInfo, backend],
    mutationFn: async (data: { email?: string; password?: string; currentPassword: string }) => {
      return await UsersApiImpl.updateMyUserInfo(backend, data);
    },
  });
};
