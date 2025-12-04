const getBuildNumber = ({ platform }: { platform: "ios" | "android" }) => {
  const now = new Date();
  const isAndroid = platform === "android";

  const buildNumber = `${now.getUTCFullYear() % 100}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes() + 20 * Number(!!process.env.EXPO_TV) * Number(isAndroid)).padStart(2, "0")}`;
  const finalBuildNumber = isAndroid ? buildNumber.slice(0, -1) : buildNumber;

  // iOS needs string, Android needs integer
  return isAndroid ? parseInt(finalBuildNumber, 10) : finalBuildNumber;
};

const icon =
  process.env.EXPO_PUBLIC_ICON || (process.env.EXPO_TV ? "./assets/appleTV/icon_1280x768.png" : "./assets/icon.png");

export default {
  slug: process.env.EXPO_PUBLIC_APP_SLUG || "course-connect",
  name: process.env.EXPO_PUBLIC_APP_NAME || "MC Assist",
  icon,
  owner: "adam_bower",
  scheme: "mcassist",
  version: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
  assetBundlePatterns: [
    "assets/fonts/**/*",
    "assets/categories/**/*",
    "assets/*.png",
    "assets/appleTV/**/*",
  ],
  userInterfaceStyle: process.env.EXPO_PUBLIC_USER_INTERFACE_STYLE || "light",

  extra: {
    eas: {
      projectId: "512d37de-e7c0-42f4-912e-ff850d3e9e57",
    },
    primaryBackend: process.env.EXPO_PUBLIC_PRIMARY_BACKEND || undefined,
  },
  updates: {
    url: "https://u.expo.dev/512d37de-e7c0-42f4-912e-ff850d3e9e57",
  },
  runtimeVersion: {
    policy: "appVersion",
  },

  splash: {
    image: process.env.EXPO_PUBLIC_SPLASH_IMAGE || "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: process.env.EXPO_PUBLIC_SPLASH_BG_COLOR || "#FFFFFF",
  },

  adaptiveIcon: {
    foregroundImage: "./assets/adaptive-icon-foreground.png",
    backgroundColor: "#FFFFFF",
  },
  ios: {
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["audio"],
      NSPhotoLibraryAddUsageDescription: "This app needs access to your photo library to save downloaded videos.",
      NSPhotoLibraryUsageDescription: "This app needs access to your photo library to save downloaded videos.",
    },
    buildNumber: getBuildNumber({ platform: "ios" }),
    supportsTablet: true,
    bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER || "com.abcivil.mcassist.v2",
    associatedDomains: process.env.EXPO_PUBLIC_CUSTOM_DEPLOYMENT_URL
      ? [`applinks:${process.env.EXPO_PUBLIC_CUSTOM_DEPLOYMENT_URL}`]
      : undefined,
  },
  experiments: {
    baseUrl: !process.env.EXPO_PUBLIC_CUSTOM_DEPLOYMENT_URL
      ? process.env.EXPO_PUBLIC_BASE_URL || "/web-client"
      : undefined,
  },
  android: {
    blockedPermissions: ["RECORD_AUDIO"],
    permissions: [
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "READ_MEDIA_VIDEO",
      "READ_MEDIA_IMAGES",
    ],
    versionCode: getBuildNumber({ platform: "android" }),
    package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE || "com.abcivil.mcassist.v2",
    intentFilters: process.env.EXPO_PUBLIC_CUSTOM_DEPLOYMENT_URL
      ? [
          {
            action: "VIEW",
            autoVerify: true,
            data: [
              {
                scheme: "https",
                host: process.env.EXPO_PUBLIC_CUSTOM_DEPLOYMENT_URL,
                pathPrefix: "/",
              },
            ],
            category: ["BROWSABLE", "DEFAULT"],
          },
        ]
      : undefined,
  },
  web: {
    output: "static",
    bundler: "metro",
    favicon: process.env.EXPO_PUBLIC_FAVICON_URL || "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-font",
      {
        fonts: ["assets/fonts/icomoon.ttf"],
      },
    ],
    "expo-localization",
    [
      "expo-screen-orientation",
      {
        initialOrientation: "DEFAULT",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          kotlinVersion: "2.1.20",
          kspVersion: "2.1.20-2.0.1",
          targetSdkVersion: 35,
        },
        ios: {
          buildReactNativeFromSource: true,
        },
      },
    ],
    "expo-asset",
    [
      "expo-media-library",
      {
        photosPermission: "Allow MC Assist to save downloaded videos to your photo library.",
        savePhotosPermission: "Allow MC Assist to save downloaded videos to your photo library.",
      },
    ],
    "./plugins/withKotlinJvmTarget.js",
    "react-native-google-cast",
    [
      "./plugins/withReleaseSigningConfig.js",
      {
        storeFile: process.env.EXPO_PUBLIC_ANDROID_RELEASE_SIGNING_STORE_FILE_NAME || "release-key.jks",
        storePassword: process.env.EXPO_PUBLIC_ANDROID_RELEASE_SIGNING_STORE_FILE_PASSWORD,
        keyAlias: process.env.EXPO_PUBLIC_ANDROID_RELEASE_SIGNING_KEY_ALIAS,
        keyPassword: process.env.EXPO_PUBLIC_ANDROID_RELEASE_SIGNING_KEY_PASSWORD,
      },
    ],
    "./plugins/fixAndroidChromecastLib.js",
    "./plugins/withAndroidNotificationControls.js",
  ],
};
