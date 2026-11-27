# Chess Arena

Chess Arena is an offline React Native and Expo chess game. Enter a player name, then play a local friend or the computer at Easy, Moderate, or Hard difficulty.

## Install and run

Use Node.js 20.19.x or newer. From the repository root:

```bash
npm install
npx expo start --clear
```

Scan the QR code using the matching current Expo Go app. Press `w` for web. To check dependencies and TypeScript:

```bash
npm run doctor
npm run typecheck
```

## Play Store Android release

The project targets Expo SDK 58 and includes EAS Build configuration. Make sure `com.pradiphivare.chessarena` in `app.json` is available before the first Play Store upload; once published, the Android package ID must not change.

1. Pull the latest source and install the aligned dependencies. Commit the generated `package-lock.json` together with `package.json`:
   ```bash
   git pull
   npm install
   npm run doctor
   npm run typecheck
   ```
2. Test the app in Expo Go and in a production build before publishing. Install EAS CLI and sign in:
   ```bash
   npm install --global eas-cli
   eas login
   ```
3. Create the production Android App Bundle:
   ```bash
   eas build --platform android --profile production
   ```
   Follow EAS prompts to create or select Android signing credentials. Download the `.aab` from the build URL.
4. In Google Play Console, create the app and complete the store listing, icon, screenshots, content rating, Data safety, privacy-policy link, and any account verification/testing steps shown in Console.
5. Upload the `.aab` to an **Internal testing** release, add testers, and install/test through the Play Store testing link. After successful testing, create a **Production** release and submit for review. Meet any closed-testing or production-access requirements shown in Console.

For subsequent releases, build a new `.aab` with EAS; the production profile auto-increments the Android version code. This app has local play only: it does not include online multiplayer or server-backed accounts.
