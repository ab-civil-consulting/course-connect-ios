import { StyleSheet, View } from "react-native";
import { spacing } from "../theme";
import { useTheme } from "@react-navigation/native";
import { BuildInfo } from "./BuildInfo";
import { Typography } from "./Typography";
import { useTranslation } from "react-i18next";
import { Image } from "react-native";
import { Link } from "expo-router";
import { ROUTES } from "../types";

interface InfoFooterProps {
  showBuildInfo?: boolean;
}

export const InfoFooter = ({ showBuildInfo }: InfoFooterProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          resizeMode="contain"
          source={require("../assets/mc-assist-logo-blue.png")}
          style={{ width: 32, height: 32 }}
        />
        <Typography fontSize="sizeLg" fontWeight="SemiBold" color={colors.theme950}>
          AB CIVIL
        </Typography>
      </View>
      {showBuildInfo && (
        <View style={styles.buildInfoContainer}>
          {process.env.EXPO_PUBLIC_HIDE_GIT_DETAILS ? (
            <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
              <Typography fontSize={"sizeXS"} color={colors.themeDesaturated500}>
                {t("build")}{" "}
              </Typography>
              <BuildInfo />
            </View>
          ) : (
            <BuildInfo alignCenter />
          )}
        </View>
      )}
      <Link href={ROUTES.PRIVACY}>
        <Typography style={{ textDecorationLine: "underline" }} fontSize={"sizeXS"} color={colors.themeDesaturated500}>
          {t("privacyPolicy")}
        </Typography>
      </Link>
    </View>
  );
};

const styles = StyleSheet.create({
  buildInfoContainer: {
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  container: {
    alignItems: "center",
    gap: spacing.xl,
    justifyContent: "center",
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xxxl,
    position: undefined,
    width: "100%",
    zIndex: undefined,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});
