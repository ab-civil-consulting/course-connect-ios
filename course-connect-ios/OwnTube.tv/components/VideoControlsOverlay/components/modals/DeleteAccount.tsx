import { useState } from "react";
import { ModalContainer } from "../../../ModalContainer";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { StyleSheet, View } from "react-native";
import { Button, Input } from "../../../shared";
import { Spacer } from "../../../shared/Spacer";
import { spacing } from "../../../../theme";
import { useTranslation } from "react-i18next";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { RootStackParams } from "../../../../app/_layout";
import { ROUTES } from "../../../../types";
import { useAuthSessionStore } from "../../../../store";
import { useDeleteMyAccountMutation } from "../../../../api/queries/users";
import { Typography } from "../../../Typography";
import { useTheme } from "@react-navigation/native";
import Toast from "react-native-toast-message";

export const DeleteAccountModal = ({ handleClose }: { handleClose: () => void }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { backend } = useGlobalSearchParams<RootStackParams[ROUTES.INDEX]>();
  const { removeSession } = useAuthSessionStore();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { mutateAsync: deleteAccount, isPending } = useDeleteMyAccountMutation(backend!);

  const handleDelete = async () => {
    if (!password.trim()) {
      setError(t("requiredField"));
      return;
    }

    setError("");

    try {
      await deleteAccount(password);

      Toast.show({
        type: "info",
        text1: t("deleteAccountSuccess"),
      });

      handleClose();
      removeSession(backend);
      router.replace("/");
    } catch (err: unknown) {
      const error = err as {
        response?: {
          status?: number;
          data?: { detail?: string; error?: string };
        };
        message?: string;
      };

      if (__DEV__) {
        console.error("[DeleteAccountModal] Failed to delete account:", error);
      }

      if (error?.response?.status === 403) {
        setError(t("incorrectPassword"));
      } else if (error?.response?.data?.detail) {
        setError(error.response.data.detail);
      } else if (error?.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError(t("deleteAccountError"));
      }
    }
  };

  return (
    <Animated.View
      entering={SlideInUp}
      exiting={SlideOutUp}
      style={[styles.modalWrapper, { pointerEvents: "box-none" }]}
    >
      <ModalContainer onClose={handleClose} title={t("deleteAccountConfirmTitle")}>
        <View style={styles.modalContentContainer}>
          <Typography fontSize="sizeSm" color={colors.theme950} style={styles.warningText}>
            {t("deleteAccountConfirmMessage")}
          </Typography>

          <Spacer height={spacing.lg} />

          <Input
            autoCorrect={false}
            value={password}
            secureTextEntry
            onChangeText={(text) => {
              setPassword(text);
              setError("");
            }}
            autoComplete="current-password"
            variant="default"
            placeholder={t("deleteAccountPasswordPrompt")}
            placeholderTextColor={colors.themeDesaturated500}
            error={error}
          />

          <Spacer height={spacing.lg} />

          <View style={styles.buttonContainer}>
            <Button onPress={handleClose} text={t("cancel")} disabled={isPending} />
            <Button
              contrast="high"
              text={isPending ? t("deleting") : t("deleteAccount")}
              onPress={handleDelete}
              disabled={isPending || !password.trim()}
            />
          </View>
        </View>
      </ModalContainer>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: "row",
    gap: spacing.lg,
    justifyContent: "flex-end",
  },
  modalContentContainer: {
    paddingTop: spacing.sm,
  },
  modalWrapper: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  warningText: {
    textAlign: "center",
  },
});
