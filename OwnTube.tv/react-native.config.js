module.exports = {
  dependencies: {
    // Disable Google Cast on iOS - it causes crashes without proper configuration
    // Google Cast is only supported on Android for this app
    'react-native-google-cast': {
      platforms: {
        ios: null, // Disable autolinking for iOS
      },
    },
  },
};
