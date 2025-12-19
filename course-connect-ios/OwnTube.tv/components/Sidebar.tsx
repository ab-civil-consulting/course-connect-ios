import React from "react";
import { FC } from "react";
import { DrawerContentComponentProps, DrawerContentScrollView } from "@react-navigation/drawer";
import { Link } from "expo-router";
import { useTheme } from "@react-navigation/native";
import { ROUTES, STORAGE } from "../types";
import { useTranslation } from "react-i18next";
import { useAppConfigContext, useColorSchemeContext, useFullScreenModalContext, useSidebarContext } from "../contexts";
import { Platform, StyleSheet, View } from "react-native";
import { Button, Separator } from "./shared";
import { spacing } from "../theme";
import { Spacer } from "./shared/Spacer";
import { useBreakpoints } from "../hooks";
import { InstanceInfo } from "./InstanceInfo";
import { Settings, SignOutModal } from "./VideoControlsOverlay/components/modals";
import { useNetInfo } from "@react-native-community/netinfo";
import { writeToAsyncStorage } from "../utils";
import useLeaveInstancePermission from "../hooks/useLeaveInstancePermission";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QrCodeLinkModal } from "./QRCodeLinkModal";
import { useAuthSessionStore } from "../store";
import { SearchPopup } from "./SearchPopup";

const SIDEBAR_ROUTES = [
  {
    nameKey: "home",
    icon: "Home",
    href: { pathname: "/home" },
    routeName: "(home)/home",
  },
  {
    nameKey: "search",
    icon: "Search",
  },
  {
    nameKey: "history",
    icon: "History",
    href: { pathname: `/${ROUTES.HISTORY}` },
    routeName: `(home)/${ROUTES.HISTORY}`,
    isAvailableOffline: true,
  },
];

interface SidebarProps extends DrawerContentComponentProps {
  backend?: string;
  shouldExpand: boolean;
}

export const Sidebar: FC<SidebarProps> = ({ backend, shouldExpand, ...navigationProps }) => {
  const { colors } = useTheme();
  const { scheme, toggleScheme } = useColorSchemeContext();
  const { t } = useTranslation();
  const isDarkMode = scheme === "dark";
  const breakpoints = useBreakpoints();
  const { toggleSidebar } = useSidebarContext();
  const { toggleModal, setContent } = useFullScreenModalContext();
  const { isConnected } = useNetInfo();
  const { isLeaveInstanceAllowed } = useLeaveInstancePermission(navigationProps);
  const { primaryBackend, currentInstanceConfig } = useAppConfigContext();
  const safeArea = useSafeAreaInsets();
  const { session } = useAuthSessionStore();

  const isLeaveInstanceShown =
    !primaryBackend && isLeaveInstanceAllowed && !currentInstanceConfig?.customizations?.menuHideLeaveButton;

  const handleOpenSettings = () => {
    toggleModal(true);
    setContent(<Settings onClose={() => toggleModal(false)} />);
  };

  const handleLeaveInstance = () => {
    writeToAsyncStorage(STORAGE.DATASOURCE, "").then(() => {
      navigationProps.navigation.navigate(`(home)/${ROUTES.INDEX}`);
    });
  };

  const handleSignOut = () => {
    toggleModal(true);
    setContent(<SignOutModal handleClose={() => toggleModal(false)} />);
  };

  const paddingHelperStyle = { ...styles.paddingHHelper, width: shouldExpand ? undefined : 48 };

  return (
    <DrawerContentScrollView
      {...navigationProps}
      contentContainerStyle={{
        padding: 0,
        paddingTop: safeArea.top,
        alignItems: shouldExpand ? undefined : "center",
      }}
      style={[
        styles.container,
        {
          backgroundColor: colors.theme50,
          paddingHorizontal: shouldExpand ? spacing.md : ["ios", "android"].includes(Platform.OS) ? 0 : spacing.sm,
          width: "100%",
          paddingTop: shouldExpand ? spacing.lg : spacing.xl,
          overflow: "hidden",
        },
      ]}
    >
      {shouldExpand ? (
        <View style={styles.expandedInstanceInfo}>
          <InstanceInfo backend={backend} />
          {breakpoints.isMobile ? (
            <Button style={styles.button} icon="Arrow-Left" onPress={navigationProps.navigation.toggleDrawer} />
          ) : (
            <Button
              style={styles.button}
              icon="Arrow-Left"
              onPress={() => toggleSidebar(shouldExpand)}
              aria-label={t("collapseSidebar")}
              hideFocusBorder={true}
            />
          )}
        </View>
      ) : (
        <View style={styles.collapsedInstanceInfo}>
          <InstanceInfo backend={backend} showText={false} />
          {!breakpoints.isMobile && (
            <Button
              style={styles.button}
              icon="Arrow-Right"
              onPress={() => toggleSidebar(shouldExpand)}
              aria-label={t("expandSidebar")}
              hideFocusBorder={true}
            />
          )}
        </View>
      )}
      {currentInstanceConfig?.customizations?.loginWithUsernameAndPassword && (
        <View style={styles.routesContainer}>
          {session ? (
            <Button
              justifyContent="flex-start"
              icon={"Exit"}
              text={shouldExpand ? t("signOut") : undefined}
              style={paddingHelperStyle}
              onPress={handleSignOut}
            />
          ) : (
            <Link href={{ pathname: ROUTES.SIGNIN, params: { backend } }} asChild>
              <Button
                isActive={
                  navigationProps.state.index ===
                  navigationProps.state.routes.findIndex(({ name }) => name === `(home)/${ROUTES.SIGNIN}`)
                }
                justifyContent="flex-start"
                icon={"Sign-in"}
                text={shouldExpand ? t("signIn") : undefined}
                style={paddingHelperStyle}
              />
            </Link>
          )}
        </View>
      )}
      <View style={styles.routesContainer}>
        {SIDEBAR_ROUTES.filter(({ nameKey }) => {
          switch (nameKey) {
            case "history":
              return !currentInstanceConfig?.customizations?.menuHideHistoryButton;
            default:
              return true;
          }
        }).map(({ nameKey, icon, href, routeName, isAvailableOffline }) => {
          const isActive =
            navigationProps.state.index === navigationProps.state.routes.findIndex(({ name }) => name === routeName);
          const isDisabled = !isConnected && !isAvailableOffline;

          if (!href) {
            return breakpoints.isMobile ? null : (
              <Button
                key={"search"}
                disabled={isDisabled}
                isActive={isActive}
                justifyContent="flex-start"
                icon={"Search"}
                text={shouldExpand ? t("search") : undefined}
                style={{ ...styles.button, ...paddingHelperStyle }}
                onPress={() => {
                  navigationProps.navigation.closeDrawer();
                  toggleModal(true);
                  setContent(<SearchPopup backend={backend} handleClose={() => toggleModal(false)} />);
                }}
              />
            );
          }

          return (
            <Link href={{ ...href, params: { backend } }} key={routeName} asChild>
              <Button
                disabled={isDisabled}
                isActive={isActive}
                justifyContent="flex-start"
                icon={icon}
                text={shouldExpand ? t(nameKey) : undefined}
                style={{ ...styles.button, ...paddingHelperStyle }}
              />
            </Link>
          );
        })}
      </View>
      <Spacer height={spacing.xs} />
      <View style={styles.separatorContainer}>
        <Separator />
      </View>
      {Number(currentInstanceConfig?.customizations?.menuExternalLinks?.length) > 0 && shouldExpand && (
        <>
          {currentInstanceConfig?.customizations?.menuExternalLinks?.map(({ label, url }) => (
            <React.Fragment key={url}>
              {Platform.isTV ? (
                <Button
                  onPress={() => {
                    toggleModal(true);
                    setContent(<QrCodeLinkModal link={url} />);
                  }}
                  justifyContent="flex-start"
                  icon={"External-Link"}
                  text={label}
                  style={{ ...styles.button, ...paddingHelperStyle, width: "100%" }}
                />
              ) : (
                <Link target="_blank" rel="noreferrer noopener" href={url} asChild={Platform.OS !== "web"}>
                  <Button
                    justifyContent="flex-start"
                    icon={"External-Link"}
                    text={shouldExpand ? label : undefined}
                    style={{ ...styles.button, ...paddingHelperStyle, width: "100%" }}
                  />
                </Link>
              )}
            </React.Fragment>
          ))}
          <View style={styles.separatorContainer}>
            <Separator />
          </View>
        </>
      )}
      <View style={styles.routesContainer}>
        <Button
          justifyContent="flex-start"
          onPress={toggleScheme}
          icon={isDarkMode ? "Light-mode" : "Dark-mode"}
          text={shouldExpand ? t(isDarkMode ? "lightMode" : "darkMode") : undefined}
          style={paddingHelperStyle}
        />
        <Button
          justifyContent="flex-start"
          onPress={handleOpenSettings}
          icon="Settings"
          text={shouldExpand ? t("settingsPageTitle") : undefined}
          style={paddingHelperStyle}
        />
        {isLeaveInstanceShown && (
          <Button
            justifyContent="flex-start"
            onPress={handleLeaveInstance}
            contrast="none"
            icon="Exit"
            text={shouldExpand ? t("leaveSite") : undefined}
            style={paddingHelperStyle}
          />
        )}
      </View>
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    paddingVertical: 6,
  },
  collapsedInstanceInfo: {
    alignItems: "center",
    flexDirection: "column",
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  container: {
    paddingBottom: 8,
    paddingTop: 8,
  },
  expandedInstanceInfo: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingBottom: spacing.lg,
    paddingLeft: spacing.xs,
  },
  paddingHHelper: {
    height: 48,
    paddingHorizontal: ["ios", "android"].includes(Platform.OS) ? spacing.md : undefined,
  },
  routesContainer: { gap: 4 },
  separatorContainer: { paddingVertical: spacing.sm, width: "100%" },
});
