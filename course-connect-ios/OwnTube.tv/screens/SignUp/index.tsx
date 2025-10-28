import { Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Button, FormComponent, Input, Typography } from "../../components";
import { useTranslation } from "react-i18next";
import { useGetInstanceInfoQuery, useGetInstanceServerConfigQuery, useRegisterMutation } from "../../api";
import { useAppConfigContext } from "../../contexts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RootStackParams } from "../../app/_layout";
import { ROUTES } from "../../types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { borderRadius, spacing } from "../../theme";
import { Spacer } from "../../components/shared/Spacer";
import { useTheme } from "@react-navigation/native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SignInFormLoader } from "../../components/loaders/SignInFormLoader";
import { useCallback, useRef, useState } from "react";
import { useCustomFocusManager } from "../../hooks";

const signUpFormValidationSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, "requiredField")
      .min(3, "usernameTooShort")
      .max(50, "usernameTooLong")
      .regex(/^[a-z0-9_.]+$/, "usernameInvalidChars")
      .regex(/^[a-z]/, "usernameMustStartWithLetter")
      .transform((val) => val.toLowerCase()),
    email: z.string().trim().min(1, "requiredField").email("invalidEmail"),
    password: z.string().trim().min(8, "passwordTooShort"),
    confirmPassword: z.string().trim().min(1, "requiredField"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsDoNotMatch",
    path: ["confirmPassword"],
  });

export const SignUp = () => {
  const { t } = useTranslation();
  const { backend } = useLocalSearchParams<RootStackParams[ROUTES.SIGNUP]>();
  const { colors } = useTheme();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [serverErrorMessage, setServerErrorMessage] = useState<string>("");

  const { data: instanceInfo, isLoading: isLoadingInstanceInfo } = useGetInstanceInfoQuery(backend);
  const { data: instanceServerConfig, isLoading: isLoadingInstanceServerConfig } = useGetInstanceServerConfigQuery({
    hostname: backend,
  });
  const { mutateAsync: register, isPending: isRegistering } = useRegisterMutation(backend!);
  const { currentInstanceConfig } = useAppConfigContext();
  const { top } = useSafeAreaInsets();
  useCustomFocusManager();
  const router = useRouter();

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
    resolver: zodResolver(signUpFormValidationSchema),
  });

  const handleSignUp = async (formValues: z.infer<typeof signUpFormValidationSchema>) => {
    setServerErrorMessage(""); // Clear previous errors
    try {
      await register({
        username: formValues.username,
        email: formValues.email,
        password: formValues.password,
      });
      setRegistrationSuccess(true);
      reset();
    } catch (error: unknown) {
      const e = error as {
        response?: { data?: { detail?: string; "invalid-params"?: Record<string, { msg?: string }> } };
        message?: string;
      };
      console.error("Registration failed:", e);

      // Try to extract specific error message from PeerTube response
      if (e?.response?.data?.detail) {
        setServerErrorMessage(e.response.data.detail);
      } else if (e?.response?.data?.["invalid-params"]) {
        // Parse field-specific errors
        const invalidParams = e.response.data["invalid-params"];
        const fieldErrors = Object.keys(invalidParams).map((field) => {
          const error = invalidParams[field];
          return `${field}: ${error.msg || "Invalid value"}`;
        });
        setServerErrorMessage(fieldErrors.join(", "));
      } else if (e?.message) {
        setServerErrorMessage(e.message);
      } else {
        setServerErrorMessage(t("registrationFailed"));
      }
    }
  };

  const emailFieldRef = useRef<TextInput | null>(null);
  const passwordFieldRef = useRef<TextInput | null>(null);
  const confirmPasswordFieldRef = useRef<TextInput | null>(null);

  const isLoading = isLoadingInstanceInfo || isLoadingInstanceServerConfig;

  const navigateToSignIn = useCallback(() => {
    router.push({ pathname: ROUTES.SIGNIN, params: { backend } });
  }, [backend, router]);

  if (registrationSuccess) {
    return (
      <View style={{ paddingTop: spacing.xxxl + top, ...styles.container }}>
        <Typography fontWeight="ExtraBold" fontSize="sizeXL" style={styles.textAlignCenter}>
          {t("registrationSuccessful")}
        </Typography>
        <Spacer height={spacing.xl} />
        <Typography fontSize="sizeSm" style={styles.textAlignCenter} color={colors.themeDesaturated500}>
          {instanceServerConfig?.signup.requiresApproval
            ? t("registrationPendingApproval")
            : t("registrationCheckEmail")}
        </Typography>
        <Spacer height={spacing.xxl} />
        <Button onPress={navigateToSignIn} style={styles.height48} contrast="high" text={t("goToSignIn")} />
      </View>
    );
  }

  return (
    <FormComponent
      style={{ paddingTop: spacing.xxxl + top, ...styles.container }}
      onSubmit={handleSubmit(handleSignUp)}
    >
      {isLoading ? (
        <SignInFormLoader />
      ) : (
        <View>
          <Typography fontWeight="ExtraBold" fontSize="sizeXL" style={styles.textAlignCenter}>
            {t("signUpToApp", { appName: currentInstanceConfig?.customizations?.pageTitle || instanceInfo?.name })}
          </Typography>
          <Spacer height={spacing.xxl} />
          <Controller
            name="username"
            control={control}
            render={({ field, fieldState }) => {
              return (
                <>
                  <Input
                    autoFocus
                    autoCorrect={false}
                    autoCapitalize="none"
                    value={field.value}
                    onChangeText={(text) => field.onChange(text.toLowerCase())}
                    onBlur={field.onBlur}
                    autoComplete="username"
                    variant="default"
                    placeholder={t("username")}
                    placeholderTextColor={colors.themeDesaturated500}
                    error={fieldState.error?.message && t(fieldState.error?.message)}
                    onSubmitEditing={() => {
                      emailFieldRef.current?.focus?.();
                    }}
                    enterKeyHint="next"
                  />
                  {!fieldState.error && (
                    <Typography fontSize="sizeXS" color={colors.themeDesaturated500} style={{ marginTop: 4 }}>
                      {t("usernameRequirements")}
                    </Typography>
                  )}
                </>
              );
            }}
          />
          <Spacer height={spacing.xl} />
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => {
              return (
                <Input
                  ref={emailFieldRef}
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
                  autoComplete="new-password"
                  variant="default"
                  placeholder={t("password")}
                  placeholderTextColor={colors.themeDesaturated500}
                  error={fieldState.error?.message && t(fieldState.error?.message)}
                  onSubmitEditing={() => {
                    confirmPasswordFieldRef.current?.focus?.();
                  }}
                  enterKeyHint="next"
                />
              );
            }}
          />
          <Spacer height={spacing.xl} />
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field, fieldState }) => {
              return (
                <Input
                  ref={confirmPasswordFieldRef}
                  autoCorrect={false}
                  value={field.value}
                  secureTextEntry
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  autoComplete="new-password"
                  variant="default"
                  placeholder={t("confirmPassword")}
                  placeholderTextColor={colors.themeDesaturated500}
                  error={fieldState.error?.message && t(fieldState.error?.message)}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                    handleSubmit(handleSignUp)();
                  }}
                  enterKeyHint="done"
                />
              );
            }}
          />
          <Spacer height={spacing.xl} />
          <Button
            disabled={isRegistering}
            onPress={() => {
              Keyboard.dismiss();
              handleSubmit(handleSignUp)();
            }}
            style={styles.height48}
            contrast="high"
            text={t("createAccount")}
          />
          {Platform.OS === "web" && <button type="submit" style={{ display: "none" }} />}
          <Spacer height={spacing.xl} />
          {serverErrorMessage && (
            <>
              <Typography style={styles.textAlignCenter} fontSize="sizeXS" color={colors.error500}>
                {serverErrorMessage}
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
              {t("alreadyHaveAccount")}
            </Typography>
            <Pressable
              onPress={navigateToSignIn}
              style={({ focused }) => ({
                borderWidth: focused ? 2 : 0,
                margin: focused ? -2 : 0,
                borderRadius: borderRadius.radiusSm,
              })}
            >
              <Typography
                style={[{ color: colors.theme500 }, styles.textAlignCenter]}
                fontSize="sizeXS"
                fontWeight="Medium"
              >
                {t("signIn")}
              </Typography>
            </Pressable>
          </View>
        </View>
      )}
    </FormComponent>
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
  textAlignCenter: { textAlign: "center" },
});
