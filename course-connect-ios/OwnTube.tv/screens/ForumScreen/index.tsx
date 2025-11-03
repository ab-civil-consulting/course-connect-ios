import { ForumList } from "../../components/Forum";
import { useAppConfigContext } from "../../contexts";
import { Screen } from "../../layouts/Screen";
import { useAuthSessionStore } from "../../store";
import { Button, EmptyPage } from "../../components";
import { useRouter } from "expo-router";
import { ROUTES } from "../../types";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { spacing } from "../../theme";
import { usePageContentTopPadding } from "../../hooks";

export const ForumScreen = () => {
  const { session } = useAuthSessionStore();
  const { currentBackend } = useAppConfigContext();
  const router = useRouter();
  const { t } = useTranslation();
  const { top } = usePageContentTopPadding();

  // Check if user is authenticated
  if (!session) {
    const handleSignIn = () => {
      router.navigate({
        pathname: ROUTES.SIGNIN,
        params: { backend: currentBackend, returnTo: ROUTES.FORUM },
      });
    };

    return (
      <View style={[styles.errorContainer, { paddingTop: top }]}>
        <EmptyPage text={t("signInRequired")} />
        <Button
          onPress={handleSignIn}
          contrast="high"
          text={t("signInToViewVideos")}
          style={styles.signInButton}
        />
      </View>
    );
  }

  return (
    <Screen>
      <ForumList backend={currentBackend} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  errorContainer: { alignItems: "center", flex: 1, height: "100%", justifyContent: "center", width: "100%" },
  signInButton: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, height: 48 },
});
