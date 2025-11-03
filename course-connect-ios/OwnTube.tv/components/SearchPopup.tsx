import { StyleSheet, View } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { ModalContainer } from "./ModalContainer";
import { FormComponent } from "./helpers";

import { useState } from "react";

import { useRouter } from "expo-router";
import { ROUTES } from "../types";
import { SearchInput } from "./SearchInput";
import { useTranslation } from "react-i18next";
import { useBreakpoints } from "../hooks";
import { useAuthSessionStore } from "../store";
import { Button } from "./shared";
import { EmptyPage } from "./EmptyPage";
import { spacing } from "../theme";

export const SearchPopup = ({ handleClose, backend }: { handleClose: () => void; backend?: string }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuthSessionStore();
  const breakpoints = useBreakpoints();

  const handleSubmit = () => {
    if (searchQuery.trim().length === 0) {
      return;
    }

    router.push({ pathname: `(home)/${ROUTES.SEARCH}`, params: { backend, searchQuery } });
    handleClose();
  };

  // Check if user is authenticated
  if (!session) {
    const handleSignIn = () => {
      handleClose();
      router.navigate({
        pathname: ROUTES.SIGNIN,
        params: { backend, returnTo: ROUTES.SEARCH },
      });
    };

    return (
      <Animated.View
        style={[styles.modalWrapper, { paddingTop: breakpoints.isMobile ? "25%" : "10%", pointerEvents: "box-none" }]}
        entering={SlideInUp}
        exiting={SlideOutUp}
      >
        <ModalContainer showCloseButton onClose={handleClose} title={t("search")}>
          <View style={styles.authContainer}>
            <EmptyPage text={t("signInRequired")} />
            <Button
              onPress={handleSignIn}
              contrast="high"
              text={t("signInToViewVideos")}
              style={styles.signInButton}
            />
          </View>
        </ModalContainer>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.modalWrapper, { paddingTop: breakpoints.isMobile ? "25%" : "10%", pointerEvents: "box-none" }]}
      entering={SlideInUp}
      exiting={SlideOutUp}
    >
      <ModalContainer showCloseButton onClose={handleClose} title={t("searchForVideos")}>
        <FormComponent
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <SearchInput
            autoFocus
            handleSubmit={handleSubmit}
            style={breakpoints.isMobile ? { width: 300 } : { width: 468 }}
            value={searchQuery}
            setValue={setSearchQuery}
          />
        </FormComponent>
      </ModalContainer>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  authContainer: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modalWrapper: { alignItems: "center", flex: 1 },
  signInButton: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, height: 48 },
});
