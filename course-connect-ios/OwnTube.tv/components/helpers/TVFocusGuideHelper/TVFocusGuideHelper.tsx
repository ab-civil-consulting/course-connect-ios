import { forwardRef } from "react";
import { View, ViewProps } from "react-native";

interface TVFocusGuideHelperProps extends ViewProps {
  autoFocus?: boolean;
  trapFocusUp?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
  trapFocusRight?: boolean;
}

const TVFocusGuideHelper = forwardRef<View, TVFocusGuideHelperProps>(
  ({ _autoFocus, _trapFocusUp, _trapFocusDown, _trapFocusLeft, _trapFocusRight, ...props }, ref) => {
    // TV-specific props are handled by React Native TV internally
    return <View ref={ref} {...props} />;
  }
);

TVFocusGuideHelper.displayName = "TVFocusGuideHelper";

export default TVFocusGuideHelper;
