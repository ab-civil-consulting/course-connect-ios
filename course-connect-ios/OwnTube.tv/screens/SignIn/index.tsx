import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableWithoutFeedback, View } from "react-native";
import { Button, FormComponent, Input, Separator, Typography } from "../../components";
import { useTranslation } from "react-i18next";
import {
  useGetInstanceInfoQuery,
  useGetInstanceServerConfigQuery,
  useGetLoginPrerequisitesQuery,
  useGetMyUserInfoQuery,
  useLoginWithUsernameAndPasswordMutation,
} from "../../api";
import { useAppConfigContext } from "../../contexts";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { RootStackParams } from "../../app/_layout";
import { ROUTES } from "../../types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "../../theme";
import { Spacer } from "../../components/shared/Spacer";
import { useTheme } from "@react-navigation/native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SignInFormLoader } from "../../components/loaders/SignInFormLoader";
import { useCallback, useRef } from "react";
import { useCustomFocusManager } from "../../hooks";
import { useAuthSessionStore } from "../../store";
import { parseAuthSessionData } from "../../utils/auth";
import { ServerErrorCodes, UserLoginResponse } from "../../api/models";
import { useCustomDiagnosticsEvents } from "../../diagnostics/useCustomDiagnosticEvents";
import { CustomPostHogEvents } from "../../diagnostics/constants";

const signInFormValidationSchema = z.object({
  username: z.string().trim().min(1, "requiredField"),
  password: z.string().trim().min(1, "requiredField"),
});

export const SignIn = ({ backend: backendProp }: { backend?: string } = {}) => {
  const { t } = useTranslation();
  const params = useLocalSearchParams<RootStackParams[ROUTES.SIGNIN]>();
  const backend = backendProp || params.backend;
  const username = params.username || "";
  const { colors } = useTheme();
  const { captureDiagnosticsEvent } = useCustomDiagnosticsEvents();

  const { data: instanceInfo, isLoading: isLoadingInstanceInfo } = useGetInstanceInfoQuery(backend);
  const { data: instanceServerConfig, isLoading: isLoadingInstanceServerConfig } = useGetInstanceServerConfigQuery({
    hostname: backend,
  });
  const { data: loginPrerequisites, isLoading: isLoadingLoginPrerequisites } = useGetLoginPrerequisitesQuery(backend);
  const {
    mutateAsync: login,
    isError: isLoginError,
    isPending: isLoggingIn,
    reset: resetLoginMutation,
  } = useLoginWithUsernameAndPasswordMutation(backend);
  const { refetch: getUserInfo, isFetching: isGettingUserInfo, isError: isUserInfoError } = useGetMyUserInfoQuery(backend);
  const { currentInstanceConfig } = useAppConfigContext();
  const { top } = useSafeAreaInsets();
  useCustomFocusManager();
  const { addSession, selectSession, updateSession } = useAuthSessionStore();
  const router = useRouter();

  const { control, handleSubmit, reset, formState } = useForm({
    values: {
      username,
      password: "",
    },
    mode: "onTouched",
    resolver: zodResolver(signInFormValidationSchema),
  });

  useFocusEffect(
    useCallback(() => {
      if (formState.isSubmitSuccessful) {
        reset();
      }

      return () => {
        reset();
        resetLoginMutation();
      };
    }, [formState.isSubmitSuccessful, reset, resetLoginMutation]),
  );

  const handleSignIn = async (formValues: z.infer<typeof signInFormValidationSchema>) => {
    console.log('[SignIn] handleSignIn called with backend:', backend);
    if (loginPrerequisites) {
      let loginResponse: UserLoginResponse;

      try {
        loginResponse = await login({ loginPrerequisites, ...formValues });
        console.log('[SignIn] Login successful');
      } catch (e) {
        const { code } = e as { code: string };
        console.error('[SignIn] Login failed:', e);

        if (code === ServerErrorCodes.MISSING_TWO_FACTOR) {
          router.navigate({ pathname: ROUTES.OTP, params: { backend } });
          captureDiagnosticsEvent(CustomPostHogEvents.TwoFAScreen, { backend });
          return;
        }

        throw e;
      }

      const authSessionData = parseAuthSessionData(loginResponse, backend);
      console.log('[SignIn] Auth session data parsed');

      if (loginResponse) {
        await addSession(backend, authSessionData);
        console.log('[SignIn] Session added to store');
        await selectSession(backend);
        console.log('[SignIn] Session selected');

        const { data: userInfoResponse } = await getUserInfo();

        if (userInfoResponse) {
          await updateSession(backend, {
            userInfoUpdatedAt: new Date().toISOString(),
            userInfoResponse,
            email: userInfoResponse.email,
          });
          console.log('[SignIn] User info updated');
        }

        captureDiagnosticsEvent(CustomPostHogEvents.Login, { backend });
        console.log('[SignIn] Navigating to home with backend:', backend);
        router.navigate({ pathname: ROUTES.HOME, params: { backend } });
      }
    } else {
      console.error('[SignIn] No loginPrerequisites available');
    }
  };

  const passwordFieldRef = useRef<TextInput | null>(null);

  const isLoading = isLoadingInstanceInfo || isLoadingInstanceServerConfig || isLoadingLoginPrerequisites;

  const KeyboardWrapper = Platform.OS === "web" ? View : KeyboardAvoidingView;
  const keyboardProps = Platform.OS === "web" ? {} : { behavior: Platform.OS === "ios" ? "padding" as const : "height" as const };

  return (
    <KeyboardWrapper
      style={styles.keyboardAvoidingView}
      {...keyboardProps}
    >
      <FormComponent
        style={{ paddingTop: spacing.xxxl + top, ...styles.container }}
        onSubmit={handleSubmit(handleSignIn)}
      >
        {isLoading ? (
          <SignInFormLoader />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {Platform.OS === "web" ? (
              <View>
                <Typography fontWeight="ExtraBold" fontSize="sizeXL" style={styles.textAlignCenter}>
                  {t("signInToApp", { appName: currentInstanceConfig?.customizations?.pageTitle || instanceInfo?.name })}
                </Typography>
                <Spacer height={spacing.xxl} />
                <Controller
                  name="username"
                  control={control}
                  render={({ field, fieldState }) => {
                    return (
                      <Input
                        autoCorrect={false}
                        autoCapitalize="none"
                        value={field.value}
                        keyboardType={Platform.OS !== "web" ? "email-address" : undefined}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        autoComplete="email"
                        variant="default"
                        placeholder={t("email")}
                        placeholderTextColor={colors.themeDesaturated500}
                        error={fieldState.error?.message && t(fieldState.error?.message)}
                        onSubmitEditing={() => {
                          passwordFieldRef.current?.focus?.();
                        }}
                        enterKeyHint="next"
                      />
                    );
                  }}
                />
                <Spacer height={spacing.xl} />
                <Controller
                  name="password"
                  control={control}
                  render={({ field, fieldState }) => {
                    return (
                      <Input
                        ref={passwordFieldRef}
                        autoCorrect={false}
                        value={field.value}
                        secureTextEntry
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        onSubmitEditing={() => {
                          Keyboard.dismiss();
                          handleSubmit(handleSignIn)();
                        }}
                        autoComplete="current-password"
                        variant="default"
                        placeholder={t("password")}
                        placeholderTextColor={colors.themeDesaturated500}
                        error={fieldState.error?.message && t(fieldState.error?.message)}
                        enterKeyHint="done"
                      />
                    );
                  }}
                />
                <Spacer height={spacing.xl} />
                <Button
                  disabled={isLoggingIn || isGettingUserInfo || isLoadingLoginPrerequisites}
                  onPress={() => {
                    Keyboard.dismiss();
                    handleSubmit(handleSignIn)();
                  }}
                  style={styles.height48}
                  contrast="high"
                  text={t("signIn")}
                />
                {Platform.OS === "web" && <button type="submit" style={{ display: "none" }} />}
                <Spacer height={spacing.xl} />
                {(isLoginError || isUserInfoError) && (
                  <>
                    <Typography style={styles.textAlignCenter} fontSize="sizeXS" color={colors.error500}>
                      {t("signInDataIncorrect")}
                    </Typography>
                    <Spacer height={spacing.xl} />
                  </>
                )}
                <View style={styles.alignItemsCenter}>
                  <Typography
                    style={styles.textAlignCenter}
                    fontSize="sizeXS"
                    fontWeight="Medium"
                    color={colors.themeDesaturated500}
                  >
                    {t("forgotPassword")}
                  </Typography>
                  <Spacer height={spacing.sm} />
                  <Button
                    onPress={() => {
                      router.push({ pathname: `/(home)/${ROUTES.PASSWORD_RESET}`, params: { backend } });
                    }}
                    style={styles.height48}
                    contrast="low"
                    text={t("resetPassword")}
                  />
                  {instanceServerConfig?.signup.allowed && (
                    <>
                      <Spacer height={spacing.xl} />
                      <Separator />
                      <Spacer height={spacing.xl} />
                      <Typography
                        style={styles.textAlignCenter}
                        fontSize="sizeXS"
                        fontWeight="Medium"
                        color={colors.themeDesaturated500}
                      >
                        {t("noAccountCreateOne")}
                      </Typography>
                      <Spacer height={spacing.sm} />
                      <Button
                        onPress={() => {
                          console.log('[SignIn] Create Account button clicked');
                          console.log('[SignIn] Navigating to:', `/(home)/${ROUTES.SIGNUP}`);
                          console.log('[SignIn] With backend:', backend);
                          router.push({ pathname: `/(home)/${ROUTES.SIGNUP}`, params: { backend } });
                          console.log('[SignIn] router.push called');
                        }}
                        style={styles.height48}
                        contrast="low"
                        text={t("createAccount")}
                      />
                    </>
                  )}
                </View>
              </View>
            ) : (
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View>
                  <Typography fontWeight="ExtraBold" fontSize="sizeXL" style={styles.textAlignCenter}>
                    {t("signInToApp", { appName: currentInstanceConfig?.customizations?.pageTitle || instanceInfo?.name })}
                  </Typography>
                  <Spacer height={spacing.xxl} />
                  <Controller
                    name="username"
                    control={control}
                    render={({ field, fieldState }) => {
                      return (
                        <Input
                          autoCorrect={false}
                          autoCapitalize="none"
                          value={field.value}
                          keyboardType={Platform.OS !== "web" ? "email-address" : undefined}
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                          autoComplete="email"
                          variant="default"
                          placeholder={t("email")}
                          placeholderTextColor={colors.themeDesaturated500}
                          error={fieldState.error?.message && t(fieldState.error?.message)}
                          onSubmitEditing={() => {
                            passwordFieldRef.current?.focus?.();
                          }}
                          enterKeyHint="next"
                        />
                      );
                    }}
                  />
                  <Spacer height={spacing.xl} />
                  <Controller
                    name="password"
                    control={control}
                    render={({ field, fieldState }) => {
                      return (
                        <Input
                          ref={passwordFieldRef}
                          autoCorrect={false}
                          value={field.value}
                          secureTextEntry
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                          onSubmitEditing={() => {
                            Keyboard.dismiss();
                            handleSubmit(handleSignIn)();
                          }}
                          autoComplete="current-password"
                          variant="default"
                          placeholder={t("password")}
                          placeholderTextColor={colors.themeDesaturated500}
                          error={fieldState.error?.message && t(fieldState.error?.message)}
                          enterKeyHint="done"
                        />
                      );
                    }}
                  />
                  <Spacer height={spacing.xl} />
                  <Button
                    disabled={isLoggingIn || isGettingUserInfo || isLoadingLoginPrerequisites}
                    onPress={() => {
                      Keyboard.dismiss();
                      handleSubmit(handleSignIn)();
                    }}
                    style={styles.height48}
                    contrast="high"
                    text={t("signIn")}
                  />
                  {Platform.OS === "web" && <button type="submit" style={{ display: "none" }} />}
                  <Spacer height={spacing.xl} />
                  {(isLoginError || isUserInfoError) && (
                    <>
                      <Typography style={styles.textAlignCenter} fontSize="sizeXS" color={colors.error500}>
                        {t("signInDataIncorrect")}
                      </Typography>
                      <Spacer height={spacing.xl} />
                    </>
                  )}
                  <View style={styles.alignItemsCenter}>
                    <Typography
                      style={styles.textAlignCenter}
                      fontSize="sizeXS"
                      fontWeight="Medium"
                      color={colors.themeDesaturated500}
                    >
                      {t("forgotPassword")}
                    </Typography>
                    <Spacer height={spacing.sm} />
                    <Button
                      onPress={() => {
                        router.push({ pathname: `/(home)/${ROUTES.PASSWORD_RESET}`, params: { backend } });
                      }}
                      style={styles.height48}
                      contrast="low"
                      text={t("resetPassword")}
                    />
                    {instanceServerConfig?.signup.allowed && (
                      <>
                        <Spacer height={spacing.xl} />
                        <Separator />
                        <Spacer height={spacing.xl} />
                        <Typography
                          style={styles.textAlignCenter}
                          fontSize="sizeXS"
                          fontWeight="Medium"
                          color={colors.themeDesaturated500}
                        >
                          {t("noAccountCreateOne")}
                        </Typography>
                        <Spacer height={spacing.sm} />
                        <Button
                          onPress={() => {
                            console.log('[SignIn] Create Account button clicked');
                            console.log('[SignIn] Navigating to:', `/(home)/${ROUTES.SIGNUP}`);
                            console.log('[SignIn] With backend:', backend);
                            router.push({ pathname: `/(home)/${ROUTES.SIGNUP}`, params: { backend } });
                            console.log('[SignIn] router.push called');
                          }}
                          style={styles.height48}
                          contrast="low"
                          text={t("createAccount")}
                        />
                      </>
                    )}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            )}
          </ScrollView>
        )}
      </FormComponent>
    </KeyboardWrapper>
  );
};

const styles = StyleSheet.create({
  alignItemsCenter: { alignItems: "center" },
  container: {
    alignSelf: "center",
    flex: 1,
    maxWidth: 320,
    width: "100%",
  },
  height48: { height: 48 },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  textAlignCenter: { textAlign: "center" },
});
