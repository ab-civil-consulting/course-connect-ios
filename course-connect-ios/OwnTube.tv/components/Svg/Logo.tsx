import { Image, ImageProps } from "react-native";
import { useTheme } from "@react-navigation/native";

// Course Connect logo component
// Uses charcoal logo for light themes, white logo for dark themes
export const Logo = ({ width = "125.5", height = "56", ...props }: Partial<ImageProps> & { width?: string; height?: string }) => {
  const { dark } = useTheme();

  // Use charcoal logo for light themes, white for dark themes
  const logoSource = dark
    ? require("../../assets/course-connect-logo-white.png")
    : require("../../assets/course-connect-logo-charcoal.png");

  return (
    <Image
      source={logoSource}
      style={{
        width: typeof width === "string" ? parseFloat(width) : width,
        height: typeof height === "string" ? parseFloat(height) : height,
      }}
      resizeMode="contain"
      {...props}
    />
  );
};
