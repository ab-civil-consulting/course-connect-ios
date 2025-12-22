import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { ModalContainer } from "../ModalContainer";
import { StyleSheet, View } from "react-native";
import { Spacer } from "../shared/Spacer";
import { spacing } from "../../theme";
import { Button } from "../shared";
import { useTheme } from "@react-navigation/native";
import { Typography } from "../Typography";
import { useSelectLocale } from "../../hooks";
import { usePushNotifications } from "../../hooks";
import { usePushNotificationStore } from "../../store";

interface NotificationPromptModalProps {
  onClose: () => void;
}

export const NotificationPromptModal = ({ onClose }: NotificationPromptModalProps) => {
  const { colors } = useTheme();
  const { t } = useSelectLocale();
  const { registerForPushNotifications } = usePushNotifications();
  const { setHasBeenPrompted } = usePushNotificationStore();

  const handleEnableNotifications = async () => {
    await setHasBeenPrompted(true);
    await registerForPushNotifications();
    onClose();
  };

  const handleMaybeLater = async () => {
    await setHasBeenPrompted(true);
    onClose();
  };

  return (
    <Animated.View
      entering={SlideInUp}
      exiting={SlideOutUp}
      style={[styles.animatedContainer, { pointerEvents: "box-none" }]}
    >
      <ModalContainer
        title={t("enableNotifications")}
        onClose={handleMaybeLater}
        containerStyle={styles.modalContainer}
      >
        <View>
          <Typography fontSize="sizeSm" fontWeight="Regular" color={colors.theme950}>
            {t("notificationPromptDescription")}
          </Typography>
          <Spacer height={spacing.lg} />

          <View style={styles.buttonContainer}>
            <Button
              onPress={handleEnableNotifications}
              contrast="high"
              text={t("enableNotifications")}
              style={styles.button}
            />
            <Spacer height={spacing.md} />
            <Button onPress={handleMaybeLater} contrast="low" text={t("maybeLater")} style={styles.button} />
          </View>
        </View>
      </ModalContainer>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animatedContainer: { alignItems: "center", flex: 1, justifyContent: "center" },
  button: { width: "100%" },
  buttonContainer: { alignItems: "stretch" },
  modalContainer: { maxHeight: "90%", maxWidth: "90%", width: 400 },
});
