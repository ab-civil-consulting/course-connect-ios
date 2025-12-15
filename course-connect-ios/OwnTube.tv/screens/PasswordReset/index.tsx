import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import { Button, FormComponent, Input, Typography } from "../../components";
import { useTranslation } from "react-i18next";
import { useGetInstanceInfoQuery, useGetInstanceServerConfigQuery, useAskResetPasswordMutation } from "../../api";
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
import { useCallback, useState } from "react";
import { useCustomFocusManager } from "../../hooks";

const passwordResetFormValidationSchema = z.object({
  email: z.string().trim().min(1, "requiredField").email("invalidEmail"),
});

export const PasswordReset = () => {
  const { t } = useTranslation();
  const { backend } = useLocalSearchParams<RootStackParams[ROUTES.PASSWORD_RESET]>();
  const { colors } = useTheme();
  const [resetRequestSuccess, setResetRequestSuccess] = useState(false);
  const [serverErrorMessage, setServerErrorMessage] = useState<string>("");

  const { isLoading: isLoadingInstanceInfo } = useGetInstanceInfoQuery(backend);
  const { isLoading: isLoadingInstanceServerConfig } = useGetInstanceServerConfigQuery({
    hostname: backend,
  });
  const { mutateAsync: requestPasswordReset, isPending: isRequestingReset } = useAskResetPasswordMutation(backend!);
  const { top } = useSafeAreaInsets();
  useCustomFocusManager();
  const router = useRouter();

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      email: "",
    },
    mode: "onTouched",
    resolver: zodResolver(passwordResetFormValidationSchema),
  });

  const handlePasswordReset = async (formValues: z.infer<typeof passwordResetFormValidationSchema>) => {
    setServerErrorMessage("");
    try {
      await requestPasswordReset({
        email: formValues.email,
      });
      setResetRequestSuccess(true);
      reset();
    } catch (error: unknown) {
      const e = error as {
        response?: { data?: { detail?: string; "invalid-params"?: Record<string, { msg?: string }> } };
        message?: string;
      };
      console.error("Password reset request failed:", e);

      if (e?.response?.data?.detail) {
        setServerErrorMessage(e.response.data.detail);
      } else if (e?.response?.data?.["invalid-params"]) {
        const invalidParams = e.response.data["invalid-params"];
        const fieldErrors = Object.keys(invalidParams).map((field) => {
          const error = invalidParams[field];
          return `${field}: ${error.msg || "Invalid value"}`;
        });
        setServerErrorMessage(fieldErrors.join(", "));
      } else if (e?.message) {
        setServerErrorMessage(e.message);
      } else {
        setServerErrorMessage(t("passwordResetRequestFailed"));
      }
    }
  };

  const isLoading = isLoadingInstanceInfo || isLoadingInstanceServerConfig;

  const navigateToSignIn = useCallback(() => {
    router.push({ pathname: ROUTES.SIGNIN, params: { backend } });
  }, [backend, router]);

  if (resetRequestSuccess) {
    return (
      <View style={{ paddingTop: spacing.xxxl + top, ...styles.container }}>
        <Typography fontWeight="ExtraBold" fontSize="sizeXL" style={styles.textAlignCenter}>
          {t("passwordResetEmailSent")}
        </Typography>
        <Spacer height={spacing.xl} />
        <Typography fontSize="sizeSm" style={styles.textAlignCenter} color={colors.themeDesaturated500}>
          {t("passwordResetCheckEmail")}
        </Typography>
        <Spacer height={spacing.xxl} />
        <Button onPress={navigateToSignIn} style={styles.height48} contrast="high" text={t("goToSignIn")} />
      </View>
    );
  }

  return (
    <FormComponent
      style={{ paddingTop: spacing.xxxl + top, ...styles.container }}
      onSubmit={handleSubmit(handlePasswordReset)}
    >
      {isLoading ? (
        <SignInFormLoader />
      ) : (
        <View>
          <Typography fontWeight="ExtraBold" fontSize="sizeXL" style={styles.textAlignCenter}>
            {t("resetPassword")}
          </Typography>
          <Spacer height={spacing.md} />
          <Typography fontSize="sizeSm" style={styles.textAlignCenter} color={colors.themeDesaturated500}>
            {t("resetPasswordInstructions")}
          </Typography>
          <Spacer height={spacing.xxl} />
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => {
              return (
                <Input
                  autoFocus
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
                    Keyboard.dismiss();
                    handleSubmit(handlePasswordReset)();
                  }}
                  enterKeyHint="done"
                />
              );
            }}
          />
          <Spacer height={spacing.xl} />
          <Button
            disabled={isRequestingReset}
            onPress={() => {
              Keyboard.dismiss();
              handleSubmit(handlePasswordReset)();
            }}
            style={styles.height48}
            contrast="high"
            text={t("sendResetLink")}
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
              {t("rememberPassword")}
            </Typography>
            <Spacer height={spacing.xs} />
            <Pressable
              onPress={navigateToSignIn}
              style={({ focused }: { pressed?: boolean; focused?: boolean }) => ({
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
