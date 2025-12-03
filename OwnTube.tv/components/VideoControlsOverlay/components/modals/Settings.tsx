import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { ModalContainer } from "../../../ModalContainer";
import { ScrollView, StyleSheet, View } from "react-native";
import { Spacer } from "../../../shared/Spacer";
import { spacing } from "../../../../theme";
import { Button, Checkbox, Separator } from "../../../shared";
import { useAppConfigContext } from "../../../../contexts";
import { useSelectLocale } from "../../../../hooks";
import { LANGUAGE_OPTIONS } from "../../../../i18n";
import { useTheme } from "@react-navigation/native";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { Typography } from "../../../Typography";
import { RootStackParams } from "../../../../app/_layout";
import { writeToAsyncStorage } from "../../../../utils";
import { ROUTES, STORAGE } from "../../../../types";
import Constants from "expo-constants";
import DeviceCapabilities from "../../../DeviceCapabilities";
import Picker from "../../../shared/Picker";
import { useGetInstanceInfoQuery } from "../../../../api";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { PostHogPersistedProperty } from "posthog-react-native";
import { useSettingsStore } from "../../../../store";
import { useAuthSessionStore } from "../../../../store";

interface SettingsProps {
  onClose: () => void;
}

export const Settings = ({ onClose }: SettingsProps) => {
  const { backend } = useGlobalSearchParams<RootStackParams["index"]>();
  const { isDebugMode, setIsDebugMode, primaryBackend } = useAppConfigContext();
  const { currentLang, handleChangeLang, t } = useSelectLocale();
  const { dark: isDarkTheme, colors } = useTheme();
  const router = useRouter();
  const posthog = usePostHog();

  const { data: instanceInfo } = useGetInstanceInfoQuery(backend);
  const { currentInstanceConfig } = useAppConfigContext();
  const { session } = useAuthSessionStore();

  const { settings, loadSettings, updatePlaybackSettings, updateDownloadSettings, isLoaded } = useSettingsStore();

  // Load settings on mount
  useEffect(() => {
    if (!isLoaded) {
      loadSettings();
    }
  }, [isLoaded, loadSettings]);

  const handleLeaveInstance = () => {
    writeToAsyncStorage(STORAGE.DATASOURCE, "").then(() => {
      onClose();
      router.navigate("/");
    });
  };

  const handleSelectLanguage = (langCode: string) => {
    handleChangeLang(langCode);
  };

  // Quality options for video playback
  const qualityOptions = [
    { label: t("qualityAuto"), value: "auto" },
    { label: "1080p", value: "1080p" },
    { label: "720p", value: "720p" },
    { label: "480p", value: "480p" },
    { label: "360p", value: "360p" },
  ];

  // Playback speed options
  const speedOptions = [
    { label: "0.5x", value: "0.5" },
    { label: "0.75x", value: "0.75" },
    { label: "1x", value: "1" },
    { label: "1.25x", value: "1.25" },
    { label: "1.5x", value: "1.5" },
  ];

  return (
    <Animated.View entering={SlideInUp} exiting={SlideOutUp} style={[styles.animatedContainer, { pointerEvents: "box-none" }]}>
      <ModalContainer
        showCloseButton
        onClose={onClose}
        title={t("settingsPageTitle")}
        containerStyle={styles.modalContainer}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Account Settings Section */}
          {session && (
            <>
              <Typography fontSize="sizeMd" fontWeight="Bold" color={colors.theme950}>
                {t("accountSettings")}
              </Typography>
              <Spacer height={spacing.md} />

              <View style={{ alignSelf: "flex-start" }}>
                <Button
                  onPress={() => {
                    onClose();
                    router.push({ pathname: `/(home)/${ROUTES.PASSWORD_RESET}`, params: { backend } });
                  }}
                  contrast="low"
                  text={t("changePassword")}
                />
              </View>

              <Spacer height={spacing.lg} />
              <Separator />
              <Spacer height={spacing.lg} />
            </>
          )}

          {/* Playback & Video Settings Section */}
          <Typography fontSize="sizeMd" fontWeight="Bold" color={colors.theme950}>
            {t("playbackVideoSettings")}
          </Typography>
          <Spacer height={spacing.md} />

          <Typography fontSize="sizeSm" fontWeight="SemiBold" color={colors.theme950}>
            {t("defaultVideoQuality")}
          </Typography>
          <Spacer height={spacing.xs} />
          <Picker
            darkTheme={isDarkTheme}
            placeholder={{}}
            value={settings.playback.defaultQuality || "auto"}
            onValueChange={(value) => updatePlaybackSettings({ defaultQuality: value })}
            items={qualityOptions}
          />
          <Spacer height={spacing.md} />

          <Typography fontSize="sizeSm" fontWeight="SemiBold" color={colors.theme950}>
            {t("defaultPlaybackSpeed")}
          </Typography>
          <Spacer height={spacing.xs} />
          <Picker
            darkTheme={isDarkTheme}
            placeholder={{}}
            value={settings.playback.defaultSpeed || "1"}
            onValueChange={(value) => updatePlaybackSettings({ defaultSpeed: value })}
            items={speedOptions}
          />
          <Spacer height={spacing.md} />

          <Checkbox
            isChecked={settings.playback.autoplayEnabled || false}
            label={t("autoplayNextVideo")}
            onToggle={(checked) => updatePlaybackSettings({ autoplayEnabled: checked })}
          />
          <Spacer height={spacing.sm} />

          <Checkbox
            isChecked={settings.playback.subtitlesEnabled || false}
            label={t("enableSubtitlesByDefault")}
            onToggle={(checked) => updatePlaybackSettings({ subtitlesEnabled: checked })}
          />

          <Spacer height={spacing.lg} />
          <Separator />
          <Spacer height={spacing.lg} />

          {/* Downloads & Data Settings Section */}
          <Typography fontSize="sizeMd" fontWeight="Bold" color={colors.theme950}>
            {t("downloadsDataSettings")}
          </Typography>
          <Spacer height={spacing.md} />

          <Typography fontSize="sizeSm" fontWeight="SemiBold" color={colors.theme950}>
            {t("defaultDownloadQuality")}
          </Typography>
          <Spacer height={spacing.xs} />
          <Picker
            darkTheme={isDarkTheme}
            placeholder={{}}
            value={settings.downloads.defaultQuality || "720p"}
            onValueChange={(value) => updateDownloadSettings({ defaultQuality: value })}
            items={qualityOptions.filter(q => q.value !== "auto")}
          />
          <Spacer height={spacing.md} />

          <Checkbox
            isChecked={settings.downloads.cellularDataLimit || false}
            label={t("wifiOnlyMode")}
            onToggle={(checked) => updateDownloadSettings({ cellularDataLimit: checked })}
          />
          <Typography color={colors.themeDesaturated500} fontWeight="Regular" fontSize="sizeXS" style={{ marginLeft: spacing.xxl }}>
            {t("wifiOnlyModeDescription")}
          </Typography>

          <Spacer height={spacing.lg} />
          <Separator />
          <Spacer height={spacing.lg} />

          {/* Device & Language Settings Section */}
          <Typography fontSize="sizeMd" fontWeight="Bold" color={colors.theme950}>
            {t("deviceLanguageSettings")}
          </Typography>
          <Spacer height={spacing.md} />

          {__DEV__ && (
            <>
              <DeviceCapabilities />
              <Spacer height={spacing.md} />
            </>
          )}

          <Typography fontSize="sizeSm" fontWeight="SemiBold" color={colors.theme950}>
            {t("settingsPageUiLanguageHeading")}
          </Typography>
          <Spacer height={spacing.xs} />
          <Picker
            darkTheme={isDarkTheme}
            placeholder={{}}
            value={currentLang}
            onValueChange={handleSelectLanguage}
            items={LANGUAGE_OPTIONS}
          />

          {!primaryBackend && (
            <>
              <Spacer height={spacing.lg} />
              <Separator />
              <Spacer height={spacing.lg} />
              <View style={{ alignSelf: "flex-start" }}>
                <Button
                  onPress={handleLeaveInstance}
                  contrast="none"
                  icon="Exit"
                  text={t("leaveInstance", {
                    instance: currentInstanceConfig?.customizations?.pageTitle || instanceInfo?.name,
                  })}
                />
              </View>
              <Spacer height={spacing.md} />
              <Typography color={colors.themeDesaturated500} fontWeight="Regular" fontSize="sizeXS">
                {t("leaveInstanceDescription", { appName: Constants.expoConfig?.name })}
              </Typography>
            </>
          )}

          <Spacer height={spacing.xl} />
        </ScrollView>
      </ModalContainer>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animatedContainer: { alignItems: "center", flex: 1, justifyContent: "center" },
  modalContainer: { maxHeight: "90%", maxWidth: "90%", width: 500 },
});
