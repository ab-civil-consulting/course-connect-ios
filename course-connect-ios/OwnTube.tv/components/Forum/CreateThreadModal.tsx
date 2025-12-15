import { View, StyleSheet, TextInput, Modal, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { Typography } from "../Typography";
import { useTranslation } from "react-i18next";
import { useTheme } from "@react-navigation/native";
import { spacing } from "../../theme";
import { Button } from "../shared";
import { useState } from "react";
import { Feather } from "@expo/vector-icons";

interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => void;
  isLoading?: boolean;
}

export const CreateThreadModal = ({ isOpen, onClose, onSubmit, isLoading }: CreateThreadModalProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

  const validateAndSubmit = () => {
    const newErrors: { title?: string; content?: string } = {};

    if (!title.trim()) {
      newErrors.title = t("forum.titleRequired");
    }
    if (!content.trim()) {
      newErrors.content = t("forum.contentRequired");
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(title.trim(), content.trim());
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Typography fontSize="sizeLg" fontWeight="SemiBold" style={{ color: colors.text, flex: 1 }}>
                {t("forum.createNewThread")}
              </Typography>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.inputContainer}>
              <Typography fontSize="sizeMd" style={{ color: colors.text, marginBottom: spacing.xs }}>
                {t("forum.title")}
              </Typography>
              <TextInput
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (errors.title) setErrors({ ...errors, title: undefined });
                }}
                placeholder={t("forum.threadTitlePlaceholder")}
                placeholderTextColor={colors.text + "60"}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: errors.title ? colors.notification : colors.border,
                  },
                ]}
                maxLength={200}
                editable={!isLoading}
              />
              {errors.title && (
                <Typography fontSize="sizeXS" style={{ color: colors.notification, marginTop: spacing.xs }}>
                  {errors.title}
                </Typography>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Typography fontSize="sizeMd" style={{ color: colors.text, marginBottom: spacing.xs }}>
                {t("forum.content")}
              </Typography>
              <TextInput
                value={content}
                onChangeText={(text) => {
                  setContent(text);
                  if (errors.content) setErrors({ ...errors, content: undefined });
                }}
                placeholder={t("forum.threadContentPlaceholder")}
                placeholderTextColor={colors.text + "60"}
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: errors.content ? colors.notification : colors.border,
                  },
                ]}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                maxLength={5000}
                editable={!isLoading}
              />
              {errors.content && (
                <Typography fontSize="sizeXS" style={{ color: colors.notification, marginTop: spacing.xs }}>
                  {errors.content}
                </Typography>
              )}
              <Typography fontSize="sizeXS" style={{ color: colors.text, opacity: 0.6, marginTop: spacing.xs }}>
                {content.length}/5000
              </Typography>
            </View>

            <View style={styles.modalFooter}>
              <Button
                onPress={onClose}
                text={t("forum.cancel")}
                contrast="low"
                style={{ marginRight: spacing.sm }}
                disabled={isLoading}
              />
              <Button
                onPress={validateAndSubmit}
                text={t("forum.createThread")}
                contrast="high"
                disabled={isLoading || !title.trim() || !content.trim()}
              />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const overlayColor = "rgba(0, 0, 0, 0.5)";

const styles = StyleSheet.create({
  closeButton: {
    padding: spacing.xs,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    padding: spacing.sm,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  modalContent: {
    borderRadius: 12,
    maxHeight: "80%",
    maxWidth: 600,
    padding: spacing.lg,
    width: "90%",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.lg,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: overlayColor,
    flex: 1,
    justifyContent: "center",
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 150,
    padding: spacing.sm,
  },
});
