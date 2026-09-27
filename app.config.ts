import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Euchre",
  slug: "euchre",
  scheme: "euchre",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "dev.p0.euchre",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["bluetooth-central", "bluetooth-peripheral"],
    },
  },
  android: {
    package: "dev.p0.euchre",
    adaptiveIcon: {
      backgroundColor: "#0B3D2E",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    permissions: [
      "android.permission.BLUETOOTH_ADVERTISE",
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.BLUETOOTH_SCAN",
    ],
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: "metro",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-dev-client",
    [
      "react-native-ble-plx",
      {
        isBackgroundEnabled: true,
        modes: ["peripheral", "central"],
        bluetoothAlwaysPermission:
          "Euchre uses Bluetooth to find and join nearby tables.",
      },
    ],
    "expo-sqlite",
    "./plugins/withReleaseSigning",
  ],
  experiments: {
    typedRoutes: true,
  },
});
