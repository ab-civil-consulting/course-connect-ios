// Google Cast / Chromecast is not supported on iOS
// iOS uses AirPlay instead, which is handled natively by react-native-video

import { GoogleCastButtonProps } from "./GoogleCastButton.web";

const GoogleCastButton = (_props: GoogleCastButtonProps) => {
  return null;
};

export default GoogleCastButton;
