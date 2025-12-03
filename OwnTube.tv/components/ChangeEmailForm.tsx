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

const changeEmailSchema = z.object({
  newEmail: z.string().trim().min(1, "requiredField").email("invalidEmail"),
  currentPassword: z.string().trim().min(1, "requiredField"),
});

interface ChangeEmailFormProps {
  backend: string;
  currentEmail?: string;
  onSuccess?: () => void;
}

export const ChangeEmailForm = ({ backend, currentEmail, onSuccess }: ChangeEmailFormProps) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [serverError, setServerError] = useState<string>("");

  const { mutateAsync: updateUserInfo, isPending } = useUpdateMyUserInfoMutation(backend);

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      newEmail: "",
      currentPassword: "",
    },
    mode: "onTouched",
    resolver: zodResolver(changeEmailSchema),
  });

  const onSubmit = async (data: z.infer<typeof changeEmailSchema>) => {
    setServerError("");

    try {
      await updateUserInfo({
        email: data.newEmail,
        currentPassword: data.currentPassword,
      });

      Toast.show({
        type: "info",
        text1: t("emailUpdatedSuccessTitle"),
        text2: t("emailUpdatedSuccessMessage"),
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

      console.error("[ChangeEmailForm] Failed to update email:", err);

      if (err?.response?.status === 403) {
        setServerError(t("incorrectPassword"));
      } else if (err?.response?.status === 409) {
        setServerError(t("emailAlreadyInUse"));
      } else if (err?.response?.data?.detail) {
        setServerError(err.response.data.detail);
      } else if (err?.response?.data?.error) {
        setServerError(err.response.data.error);
      } else if (err?.message) {
        setServerError(err.message);
      } else {
        setServerError(t("failedToUpdateEmail"));
      }
    }
  };

  return (
    <View style={styles.container}>
      {currentEmail && (
        <>
          <Typography fontSize="sizeXS" color={colors.themeDesaturated500}>
            {t("currentEmail")}: {currentEmail}
          </Typography>
          <Spacer height={spacing.md} />
        </>
      )}

      <Controller
        name="newEmail"
        control={control}
        render={({ field, fieldState }) => (
          <Input
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="email-address"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoComplete="email"
            variant="default"
            placeholder={t("newEmail")}
            placeholderTextColor={colors.themeDesaturated500}
            error={fieldState.error?.message && t(fieldState.error.message)}
          />
        )}
      />

      <Spacer height={spacing.md} />

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
        text={isPending ? t("updating") : t("updateEmail")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});
