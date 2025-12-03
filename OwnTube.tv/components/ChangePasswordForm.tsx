import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@react-navigation/native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Spacer } from "./shared";
import { Typography } from "./Typography";
import { spacing } from "../theme";
import { useUpdateMyUserInfoMutation } from "../api";
import Toast from "react-native-toast-message";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().trim().min(1, "requiredField"),
    newPassword: z.string().trim().min(8, "passwordTooShort"),
    confirmNewPassword: z.string().trim().min(1, "requiredField"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "passwordsDoNotMatch",
    path: ["confirmNewPassword"],
  });

interface ChangePasswordFormProps {
  backend: string;
  onSuccess?: () => void;
}

export const ChangePasswordForm = ({ backend, onSuccess }: ChangePasswordFormProps) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [serverError, setServerError] = useState<string>("");

  const { mutateAsync: updateUserInfo, isPending } = useUpdateMyUserInfoMutation(backend);

  const { control, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    mode: "onTouched",
    resolver: zodResolver(changePasswordSchema),
  });

  const newPassword = watch("newPassword");

  const onSubmit = async (data: z.infer<typeof changePasswordSchema>) => {
    setServerError("");

    try {
      await updateUserInfo({
        password: data.newPassword,
        currentPassword: data.currentPassword,
      });

      Toast.show({
        type: "info",
        text1: t("passwordUpdatedSuccessTitle"),
        text2: t("passwordUpdatedSuccessMessage"),
      });

      reset();
      onSuccess?.();
    } catch (error: unknown) {
      const err = error as {
        response?: {
          status?: number;
          data?: { detail?: string; error?: string };
        };
        message?: string;
      };

      console.error("[ChangePasswordForm] Failed to update password:", err);

      if (err?.response?.status === 403) {
        setServerError(t("incorrectPassword"));
      } else if (err?.response?.status === 422) {
        setServerError(t("passwordTooWeak"));
      } else if (err?.response?.data?.detail) {
        setServerError(err.response.data.detail);
      } else if (err?.response?.data?.error) {
        setServerError(err.response.data.error);
      } else if (err?.message) {
        setServerError(err.message);
      } else {
        setServerError(t("failedToUpdatePassword"));
      }
    }
  };

  // Simple password strength indicator
  const getPasswordStrength = (password: string): { text: string; color: string } => {
    if (!password) return { text: "", color: colors.themeDesaturated500 };
    if (password.length < 8) return { text: t("passwordStrengthWeak"), color: colors.error500 };
    if (password.length < 12) return { text: t("passwordStrengthFair"), color: colors.warning500 || "#FFA500" };
    return { text: t("passwordStrengthGood"), color: colors.success500 || "#00C851" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <View style={styles.container}>
      <Controller
        name="currentPassword"
        control={control}
        render={({ field, fieldState }) => (
          <Input
            autoCorrect={false}
            value={field.value}
            secureTextEntry
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoComplete="current-password"
            variant="default"
            placeholder={t("currentPassword")}
            placeholderTextColor={colors.themeDesaturated500}
            error={fieldState.error?.message && t(fieldState.error.message)}
          />
        )}
      />

      <Spacer height={spacing.md} />

      <Controller
        name="newPassword"
        control={control}
        render={({ field, fieldState }) => (
          <>
            <Input
              autoCorrect={false}
              value={field.value}
              secureTextEntry
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoComplete="new-password"
              variant="default"
              placeholder={t("newPassword")}
              placeholderTextColor={colors.themeDesaturated500}
              error={fieldState.error?.message && t(fieldState.error.message)}
            />
            {!fieldState.error && passwordStrength.text && (
              <Typography fontSize="sizeXS" color={passwordStrength.color} style={{ marginTop: 4 }}>
                {passwordStrength.text}
              </Typography>
            )}
          </>
        )}
      />

      <Spacer height={spacing.md} />

      <Controller
        name="confirmNewPassword"
        control={control}
        render={({ field, fieldState }) => (
          <Input
            autoCorrect={false}
            value={field.value}
            secureTextEntry
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoComplete="new-password"
            variant="default"
            placeholder={t("confirmNewPassword")}
            placeholderTextColor={colors.themeDesaturated500}
            error={fieldState.error?.message && t(fieldState.error.message)}
          />
        )}
      />

      {serverError && (
        <>
          <Spacer height={spacing.md} />
          <Typography fontSize="sizeXS" color={colors.error500}>
            {serverError}
          </Typography>
        </>
      )}

      <Spacer height={spacing.lg} />

      <Button
        disabled={isPending}
        onPress={handleSubmit(onSubmit)}
        contrast="high"
        text={isPending ? t("updating") : t("updatePassword")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});
