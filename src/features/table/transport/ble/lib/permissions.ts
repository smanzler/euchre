import { PermissionsAndroid, Platform } from "react-native";

const ANDROID_12 = 31;

type AndroidPermission = (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS];

const scanPermissions = (): AndroidPermission[] =>
  Number(Platform.Version) >= ANDROID_12
    ? [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

const advertisePermissions = (): AndroidPermission[] =>
  Number(Platform.Version) >= ANDROID_12
    ? [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]
    : [];

const request = async (permissions: AndroidPermission[]): Promise<boolean> => {
  if (Platform.OS !== "android" || permissions.length === 0) return true;
  const granted = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every(
    (permission) => granted[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
};

export const requestScanPermissions = (): Promise<boolean> => request(scanPermissions());

export const requestAdvertisePermissions = (): Promise<boolean> =>
  request(advertisePermissions());
