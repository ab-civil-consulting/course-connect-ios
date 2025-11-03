import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { RootStackParams } from "../../app/_layout";
import { ROUTES } from "../../types";
import { MUTATION_KEYS, QUERY_KEYS } from "../constants";
import { retry } from "../helpers";
import { AuthApiImpl } from "../authApi";
import { LoginRequestArgs, RegisterRequestArgs, AskResetPasswordRequestArgs } from "../models";

export const useGetLoginPrerequisitesQuery = (backendOverride?: string) => {
  const params = useLocalSearchParams<RootStackParams[ROUTES.SIGNIN]>();
  const backend = backendOverride || params.backend;

  return useQuery({
    queryKey: [QUERY_KEYS.loginPrerequisites, backend],
    queryFn: async () => {
      return await AuthApiImpl.getLoginPrerequisites(backend!);
    },
    enabled: !!backend,
    staleTime: 0,
    retry,
  });
};

export const useLoginWithUsernameAndPasswordMutation = (backendOverride?: string) => {
  const params = useLocalSearchParams<RootStackParams[ROUTES.SIGNIN]>();
  const backend = backendOverride || params.backend;

  return useMutation({
    mutationKey: [MUTATION_KEYS.login],
    mutationFn: async ({ loginPrerequisites, username, password, otp }: LoginRequestArgs) => {
      return await AuthApiImpl.login(
        backend!,
        { ...loginPrerequisites, username, password, grant_type: "password" },
        otp,
      );
    },
  });
};

export const useRegisterMutation = (backend: string) => {
  return useMutation({
    mutationKey: [MUTATION_KEYS.register],
    mutationFn: async (data: RegisterRequestArgs) => {
      return await AuthApiImpl.register(backend, data);
    },
  });
};

export const useAskResetPasswordMutation = (backend: string) => {
  return useMutation({
    mutationKey: [MUTATION_KEYS.askResetPassword],
    mutationFn: async (data: AskResetPasswordRequestArgs) => {
      return await AuthApiImpl.askResetPassword(backend, data);
    },
  });
};
