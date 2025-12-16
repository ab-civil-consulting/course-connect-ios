import { View, StyleSheet, TextInput, Modal, Pressable, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Typography } from "../Typography";
import { useTranslation } from "react-i18next";
import { useTheme } from "@react-navigation/native";
import { spacing } from "../../theme";
import { Button } from "../shared";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { ForumCategory } from "../../api/models/forum";
import Picker from "../shared/Picker";

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    slug: string;
    icon?: string;
    order?: number;
    isLocked?: boolean;
  }) => void;
  onDelete?: () => void;
  category?: ForumCategory; // If provided, editing mode
  isLoading?: boolean;
}

const ICON_OPTIONS = [
  { label: "Message Square", value: "message-square" },
  { label: "Users", value: "users" },
  { label: "Book", value: "book" },
  { label: "Help Circle", value: "help-circle" },
  { label: "Tool", value: "tool" },
  { label: "Star", value: "star" },
  { label: "Heart", value: "heart" },
  { label: "Globe", value: "globe" },
  { label: "Zap", value: "zap" },
  { label: "Briefcase", value: "briefcase" },
];

const overlayColor = "rgba(0, 0, 0, 0.5)";

export const EditCategoryModal = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  category,
  isLoading,
}: EditCategoryModalProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("message-square");
  const [order, setOrder] = useState("0");
  const [isLocked, setIsLocked] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string; slug?: string }>({});

  const isEditMode = !!category;

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description);
      setSlug(category.slug);
      setIcon(category.icon || "message-square");
      setOrder(category.order.toString());
      setIsLocked(category.isLocked);
    } else {
      // Reset for create mode
      setName("");
      setDescription("");
      setSlug("");
      setIcon("message-square");
      setOrder("0");
      setIsLocked(false);
    }
  }, [category]);

  // Auto-generate slug from name when creating
  useEffect(() => {
    if (!isEditMode && name && !slug) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(generatedSlug);
    }
  }, [name, isEditMode, slug]);

  const validateAndSubmit = () => {
    const newErrors: { name?: string; description?: string; slug?: string } = {};

    if (!name.trim()) {
      newErrors.name = t("forum.nameRequired");
    }
    if (!description.trim()) {
      newErrors.description = t("forum.descriptionRequired");
    }
    if (!slug.trim()) {
      newErrors.slug = t("forum.slugRequired");
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      slug: slug.trim(),
      icon,
      order: parseInt(order, 10),
      isLocked,
    });
  };

  const handleDelete = () => {
    Alert.alert(t("forum.deleteCategory"), t("forum.deleteCategoryConfirm", { name: category?.name }), [
      { text: t("forum.cancel"), style: "cancel" },
      {
        text: t("forum.delete"),
        style: "destructive",
        onPress: () => onDelete?.(),
      },
    ]);
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
              <Typography fontSize="sizeXL" fontWeight="SemiBold" style={{ color: colors.text, flex: 1 }}>
                {isEditMode ? t("forum.editCategory") : t("forum.createNewCategory")}
              </Typography>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.inputContainer}>
              <Typography fontSize="sizeMd" style={{ color: colors.text, marginBottom: spacing.xs }}>
                {t("forum.categoryName")}
              </Typography>
              <TextInput
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                placeholder={t("forum.categoryNamePlaceholder")}
                placeholderTextColor={colors.text + "60"}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: errors.name ? colors.notification : colors.border,
                  },
                ]}
                maxLength={100}
                editable={!isLoading}
              />
              {errors.name && (
                <Typography fontSize="sizeXS" style={{ color: colors.notification, marginTop: spacing.xs }}>
                  {errors.name}
                </Typography>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Typography fontSize="sizeMd" style={{ color: colors.text, marginBottom: spacing.xs }}>
                {t("forum.categoryDescription")}
              </Typography>
              <TextInput
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  if (errors.description) setErrors({ ...errors, description: undefined });
                }}
                placeholder={t("forum.categoryDescriptionPlaceholder")}
                placeholderTextColor={colors.text + "60"}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: errors.description ? colors.notification : colors.border,
                  },
                ]}
                maxLength={200}
                editable={!isLoading}
              />
              {errors.description && (
                <Typography fontSize="sizeXS" style={{ color: colors.notification, marginTop: spacing.xs }}>
                  {errors.description}
                </Typography>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: spacing.sm }]}>
                <Typography fontSize="sizeMd" style={{ color: colors.text, marginBottom: spacing.xs }}>
                  {t("forum.categorySlug")}
                </Typography>
                <TextInput
                  value={slug}
                  onChangeText={(text) => {
                    setSlug(text.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    if (errors.slug) setErrors({ ...errors, slug: undefined });
                  }}
                  placeholder={t("forum.categorySlugPlaceholder")}
                  placeholderTextColor={colors.text + "60"}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: errors.slug ? colors.notification : colors.border,
                    },
                  ]}
                  maxLength={50}
                  editable={!isLoading}
                />
                {errors.slug && (
                  <Typography fontSize="sizeXS" style={{ color: colors.notification, marginTop: spacing.xs }}>
                    {errors.slug}
                  </Typography>
                )}
              </View>

              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Typography fontSize="sizeMd" style={{ color: colors.text, marginBottom: spacing.xs }}>
                  {t("forum.categoryOrder")}
                </Typography>
                <TextInput
                  value={order}
                  onChangeText={(text) => setOrder(text.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  placeholderTextColor={colors.text + "60"}
                  keyboardType="numeric"
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  maxLength={3}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Typography fontSize="sizeMd" style={{ color: colors.text, marginBottom: spacing.xs }}>
                {t("forum.categoryIcon")}
              </Typography>
              <Picker
                value={icon}
                onValueChange={setIcon}
                items={ICON_OPTIONS}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                enabled={!isLoading}
              />
              <View style={styles.iconPreview}>
                <Feather name={icon as keyof typeof Feather.glyphMap} size={24} color={colors.primary} />
                <Typography fontSize="sizeXS" style={{ color: colors.text, marginLeft: spacing.sm }}>
                  {t("forum.iconPreview")}
                </Typography>
              </View>
            </View>

            {isEditMode && (
              <View style={styles.inputContainer}>
                <Pressable onPress={() => setIsLocked(!isLocked)} style={styles.checkboxRow} disabled={isLoading}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: colors.border, backgroundColor: isLocked ? colors.primary : colors.background },
                    ]}
                  >
                    {isLocked && <Feather name="check" size={16} color={colors.card} />}
                  </View>
                  <Typography fontSize="sizeMd" style={{ color: colors.text, marginLeft: spacing.sm }}>
                    {t("forum.lockCategory")}
                  </Typography>
                </Pressable>
              </View>
            )}

            <View style={styles.modalFooter}>
              {isEditMode && onDelete && (
                <Button
                  onPress={handleDelete}
                  text={t("forum.delete")}
                  contrast="high"
                  style={{ flex: 1, marginRight: spacing.sm }}
                  disabled={isLoading}
                />
              )}
              <View style={{ flexDirection: "row", flex: 1 }}>
                <Button
                  onPress={onClose}
                  text={t("forum.cancel")}
                  contrast="low"
                  style={{ flex: 1, marginRight: spacing.sm }}
                  disabled={isLoading}
                />
                <Button
                  onPress={validateAndSubmit}
                  text={isEditMode ? t("forum.saveChanges") : t("forum.createCategory")}
                  contrast="high"
                  disabled={isLoading || !name.trim() || !description.trim() || !slug.trim()}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  checkbox: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  checkboxRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingVertical: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  iconPreview: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: spacing.sm,
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
    maxHeight: "90%",
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
  row: {
    flexDirection: "row",
  },
});
