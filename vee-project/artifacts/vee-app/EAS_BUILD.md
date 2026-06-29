# EAS Build Guide — Vee Voice Room

This guide covers building production binaries with **Expo Application Services (EAS)** so that ZEGOCLOUD voice and OneSignal push notifications work (both are lazy-loaded and require a native build).

## Prerequisites

| Requirement | Command |
|---|---|
| Expo account | [expo.dev/signup](https://expo.dev/signup) |
| EAS CLI installed | `npm install -g eas-cli` |
| Logged in | `eas login` |

---

## 1. Configure `app.json`

Ensure these fields are set in `artifacts/vee-app/app.json`:

```json
{
  "expo": {
    "name": "Vee",
    "slug": "vee-voice-room",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0A0A1A"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.vee",
      "supportsTablet": false,
      "infoPlist": {
        "NSMicrophoneUsageDescription": "Vee needs microphone access for voice rooms.",
        "NSCameraUsageDescription": "Vee needs camera access to update your profile photo.",
        "NSPhotoLibraryUsageDescription": "Vee needs photo library access to update your profile photo."
      }
    },
    "android": {
      "package": "com.yourcompany.vee",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0A0A1A"
      },
      "permissions": [
        "android.permission.RECORD_AUDIO",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      "expo-router",
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow Vee to access your photos to update your profile picture."
        }
      ]
    ]
  }
}
```

---

## 2. Create `eas.json`

Create `artifacts/vee-app/eas.json`:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 3. Set EAS secrets

These secrets must be set in the EAS dashboard or via CLI before building.  
Never put them in code or committed files.

```bash
# Set each secret via EAS CLI
eas secret:create --scope project --name ZEGOCLOUD_APP_ID    --value "YOUR_ZEGOCLOUD_APP_ID"
eas secret:create --scope project --name ZEGOCLOUD_APP_SIGN  --value "YOUR_ZEGOCLOUD_APP_SIGN"
eas secret:create --scope project --name ONESIGNAL_APP_ID    --value "YOUR_ONESIGNAL_APP_ID"
eas secret:create --scope project --name CLOUDINARY_CLOUD_NAME  --value "YOUR_CLOUDINARY_CLOUD_NAME"
eas secret:create --scope project --name CLOUDINARY_API_KEY  --value "YOUR_CLOUDINARY_API_KEY"
eas secret:create --scope project --name CLOUDINARY_UPLOAD_PRESET --value "YOUR_UPLOAD_PRESET"
```

---

## 4. ZEGOCLOUD setup

1. Create an account at [zegocloud.com](https://www.zegocloud.com/)
2. Create a new project → choose **Voice Call** or **Live Audio Room** template
3. Copy **App ID** and **App Sign** from the project settings
4. Update `artifacts/vee-app/constants/config.ts`:

```ts
export const ZEGOCLOUD = {
  appId: parseInt(process.env.EXPO_PUBLIC_ZEGOCLOUD_APP_ID ?? "0"),
  appSign: process.env.EXPO_PUBLIC_ZEGOCLOUD_APP_SIGN ?? "",
};
```

5. Add to `app.json` plugins (required for native module):

```json
"plugins": [
  ...,
  "@zegocloud/zego-uikit-prebuilt-call-rn"
]
```

---

## 5. OneSignal setup

1. Create an account at [onesignal.com](https://onesignal.com)
2. Create a new app → configure for iOS and Android
3. Copy the **App ID**
4. For iOS: upload your **APNs certificate** or **Auth Key** in OneSignal dashboard
5. For Android: paste your **FCM Server Key** in OneSignal dashboard
6. Update `artifacts/vee-app/constants/config.ts`:

```ts
export const ONESIGNAL = {
  appId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? "",
};
```

7. Add to `app.json` plugins:

```json
"plugins": [
  ...,
  ["onesignal-expo-plugin", { "mode": "production" }]
]
```

---

## 6. Build commands

Run from inside `artifacts/vee-app/`:

```bash
# Development build (Expo Dev Client — supports all native modules)
eas build --platform ios --profile development
eas build --platform android --profile development

# Preview APK (Android only, easy to share via QR)
eas build --platform android --profile preview

# Production build (App Store / Google Play)
eas build --platform ios --profile production
eas build --platform android --profile production
```

---

## 7. Submit to stores

```bash
# iOS — App Store Connect (requires Apple Developer account $99/yr)
eas submit --platform ios

# Android — Google Play Console (requires $25 one-time fee)
eas submit --platform android
```

---

## 8. OTA Updates (no store review required)

For JS-only changes (no native code changed), push instantly:

```bash
eas update --branch production --message "Fix profile photo upload"
```

Users running the production build will receive the update automatically.

---

## 9. Checklist before production build

- [ ] `app.json` `bundleIdentifier` / `package` set to your company domain
- [ ] App icon (`assets/icon.png`) is 1024×1024 PNG, no alpha channel
- [ ] Splash screen (`assets/splash.png`) exists
- [ ] All EAS secrets set (`eas secret:list` to verify)
- [ ] Firebase RTDB security rules deployed (see `FIREBASE_SECURITY_RULES.md`)
- [ ] ZEGOCLOUD project created and App ID + Sign configured
- [ ] OneSignal project created and APNs/FCM configured
- [ ] `expo-system-ui` updated to `~6.0.9` (currently pinned to `4.0.9`)
- [ ] Tested on a real device with `development` build profile

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Voice rooms silent in Expo Go | Expected — ZEGOCLOUD needs EAS build. Use `development` profile. |
| Push not received | Check OneSignal dashboard logs. Confirm APNs/FCM keys are valid. |
| Build fails: missing native module | Ensure all plugins listed in `app.json`. Clean build: `eas build --clear-cache` |
| `expo-system-ui` version warning | Run: `pnpm --filter @workspace/vee-app add expo-system-ui@~6.0.9` |
| Firebase auth not persisting | Verify `initializeAuth` with `getReactNativePersistence(AsyncStorage)` is used (not `getAuth`) |
