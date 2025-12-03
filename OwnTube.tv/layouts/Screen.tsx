import { useTheme } from "@react-navigation/native";
import { PropsWithChildren, FC, useState } from "react";
import { ScrollView, View, StyleSheet, ViewStyle, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCustomDiagnosticsEvents } from "../diagnostics/useCustomDiagnosticEvents";
import { CustomPostHogEvents } from "../diagnostics/constants";

interface ScreenProps extends PropsWithChildren {
  style?: ViewStyle;
  onRefresh?: () => Promise<void>;
  scrollable?: boolean;
}

export const Screen: FC<ScreenProps> = ({ children, style, onRefresh, scrollable = true }) => {
  const [refreshing, setRefreshing] = useState(false);
  const { right } = useSafeAreaInsets();
  const { colors } = useTheme();
  const { captureDiagnosticsEvent } = useCustomDiagnosticsEvents();

  const handleRefresh = async () => {
    if (!onRefresh) return;

    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
    captureDiagnosticsEvent(CustomPostHogEvents.PullToRefresh);
  };

  const content = <View style={[styles.container, { paddingRight: right }, style]}>{children}</View>;

  if (!scrollable) {
    return content;
  }

  return (
    <ScrollView
      refreshControl={
        onRefresh ? (
          <RefreshControl
            colors={[colors.theme500]}
            progressBackgroundColor={colors.theme900}
            tintColor={colors.theme900}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        ) : undefined
      }
    >
      {content}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
});
