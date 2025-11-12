import { PropsWithChildren, useMemo, forwardRef, useCallback } from "react";
import { ViewStyle, Pressable, PressableProps, StyleSheet, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useHoverState } from "../../hooks/useHoverState";
import { borderRadius } from "../../theme";
import { Typography } from "../Typography";
import { IcoMoonIcon } from "../IcoMoonIcon";

interface ButtonProps extends PropsWithChildren<PressableProps> {
  style?: ViewStyle | ((state: { pressed: boolean; focused: boolean }) => ViewStyle | ViewStyle[]);
  contrast?: "high" | "low" | "none";
  icon?: string;
  iconPosition?: "leading" | "trailing";
  text?: string;
  justifyContent?: ViewStyle["justifyContent"];
  isActive?: boolean;
  customColor?: string;
  customHoverColor?: string;
  hideFocusBorder?: boolean;
}

export const Button = forwardRef<View, ButtonProps>(
  (
    {
      contrast = "none",
      text,
      icon,
      iconPosition = "leading",
      justifyContent = "center",
      isActive,
      disabled,
      customColor,
      customHoverColor,
      hideFocusBorder = false,
      ...props
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const { isHovered, toggleHovered } = useHoverState();

    const { regularColor, hoverColor } = useMemo(() => {
      // If custom colors provided, use them
      if (customColor) {
        return {
          regularColor: customColor,
          hoverColor: customHoverColor || customColor,
        };
      }

      // Otherwise use theme colors
      return {
        none: { regularColor: colors.theme50, hoverColor: colors.theme100 },
        low: { regularColor: colors.theme100, hoverColor: colors.theme200 },
        high: { regularColor: colors.theme500, hoverColor: colors.theme600 },
      }[contrast];
    }, [colors, contrast, customColor, customHoverColor]);

    const getBackgroundColor = useCallback(
      (pressed: boolean) => {
        if (disabled) {
          return colors.theme100;
        }

        return isHovered || isActive || pressed ? hoverColor : regularColor;
      },
      [colors, isHovered, hoverColor, isActive, regularColor, disabled],
    );

    const textColor = disabled ? colors.themeDesaturated500 : contrast === "high" ? colors.white94 : colors.theme900;

    return (
      <Pressable
        {...props}
        onHoverIn={(e) => {
          props.onHoverIn?.(e);
          toggleHovered();
        }}
        onHoverOut={(e) => {
          props.onHoverOut?.(e);
          toggleHovered();
        }}
        style={({ pressed, focused }) => {
          // Check if custom style is a function (for state-based styles)
          const customStyle = typeof props.style === 'function' ? props.style({ pressed, focused }) : props.style;
          const customStyleArray = Array.isArray(customStyle) ? customStyle : [customStyle];

          // Extract backgroundColor from custom styles if provided
          const customBackgroundColor = customStyleArray.reduce((acc, style) => {
            return style?.backgroundColor || acc;
          }, null);

          return [
            styles.container,
            // Apply custom style (function or static)
            typeof props.style === 'function' ? props.style({ pressed, focused }) : props.style,
            {
              // Only use theme backgroundColor if no custom backgroundColor is provided
              ...(!customBackgroundColor ? { backgroundColor: getBackgroundColor(pressed) } : {}),
              justifyContent,
              borderWidth: !hideFocusBorder && focused ? 2 : 0,
              borderColor: colors.theme950,
              paddingHorizontal:
                (Number(props.style?.paddingHorizontal) || styles.container.paddingHorizontal || 0) - (!hideFocusBorder && focused ? 2 : 0),
              paddingVertical:
                (Number(props.style?.paddingVertical) || styles.container.paddingVertical || 0) - (!hideFocusBorder && focused ? 2 : 0),
            },
          ];
        }}
        ref={ref}
        disabled={disabled}
      >
        {icon && iconPosition === "leading" && (
          <IcoMoonIcon name={icon} size={24} color={contrast === "high" ? colors.white94 : colors.theme900} />
        )}
        {text && (
          <Typography fontSize="sizeSm" fontWeight="SemiBold" color={textColor}>
            {text}
          </Typography>
        )}
        {icon && iconPosition === "trailing" && (
          <IcoMoonIcon name={icon} size={24} color={contrast === "high" ? colors.white94 : colors.theme900} />
        )}
      </Pressable>
    );
  },
);

Button.displayName = "Button";

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: borderRadius.radiusMd,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 9.5,
  },
});
