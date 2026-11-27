# Chess Arena

Chess Arena is an offline React Native and Expo chess game. Enter a player name, then choose a local friend match or play against the computer at Easy, Moderate, or Hard difficulty.

## Install and run

Use a current Node.js LTS release supported by the Expo SDK. From the repository root:

```bash
npm install
npx expo start --clear
```

Scan the QR code with the current Expo Go app. Press `w` for web. Web support uses Expo's single-page Metro output and includes `react-dom` and `react-native-web`. If a device cannot connect over local Wi-Fi, stop Metro and use `npx expo start --tunnel --clear`.

## Upgrade to the latest Expo SDK

The `upgrade:expo` script resolves the current stable Expo package, then asks Expo to align compatible React Native and Expo modules and installs web dependencies. From the repository root:

```bash
git pull
npm install
npm run upgrade:expo
npx expo-doctor
npm run typecheck
```

Review and commit the updated `package.json` and lockfile produced by the upgrade before building. Run `npx expo start --clear`, test web and a real Android device with the matching current Expo Go, and resolve any SDK migration notes shown by Expo. Avoid `npm audit fix --force`; it can introduce unrelated breaking dependency changes. Review `npm audit` findings individually.

## Android internal testing and Play Store

This project includes EAS Build configuration. You need a Google Play Console developer account and an Expo account. Before your first release, confirm the Android package ID in `app.json` (`com.pradiphivare.chessarena`) is available and keep it unchanged after publishing. Change it before your first build if you want a different unique ID.

1. Upgrade and test the Expo SDK using the commands above. Commit the compatible dependency and lockfile updates.
2. Install EAS CLI and sign in:
   ```bash
   npm install --global eas-cli
   eas login
   eas build:configure
   ```
3. Build a Play Store Android App Bundle:
   ```bash
   eas build --platform android --profile production
   ```
   Follow EAS prompts to create/manage Android signing credentials. Download the `.aab` from the build link when it completes.
4. In Google Play Console, create the app and complete the store listing, app icon, screenshots, content rating, Data safety, privacy policy, and any account verification/testing requirements shown for your developer account.
5. Create an **Internal testing** release, upload the `.aab`, add tester accounts, and test the Play-installed app. Fix issues and create a new build when needed.
6. When testing is successful, create a Production release and submit it for Google's review. Follow any closed-testing or production-access requirements displayed in Play Console.

For later releases, rebuild with the production profile; EAS auto-increments Android version codes. Online multiplayer and server-backed accounts are not included; games are local and work offline.
