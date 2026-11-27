# Chess Arena

Chess Arena is an offline React Native and Expo chess game. Enter a player name, then choose a local friend match or play against the computer at Easy, Moderate, or Hard difficulty.

## Install and run

Use Node.js 20.19.x or newer. From the repository directory, install dependencies:

```bash
npm install
```

### Web browser

The app uses Expo's single-page web output (no Expo Router required). Start the dev server:

```bash
npx expo start --web --clear
```

### Android with Expo Go

1. Install/update Expo Go from Google Play.
2. Start Metro from the repository root:
   ```bash
   npx expo start --clear
   ```
3. Scan the QR code using Expo Go. Keep the computer and phone on the same Wi-Fi network. If the network blocks local connections, stop the server and use:
   ```bash
   npx expo start --tunnel --clear
   ```

The computer running Metro must stay on while you play. Do not open the GitHub repository URL as an Expo Go project; Expo Go needs the QR code from a running Expo development server. If it still fails, run `npm run doctor` and share the exact Expo Go error and terminal output.

For an Android emulator, run `npm run android`. For an iOS simulator, run `npm run ios` on macOS with Xcode installed.

## Play

1. Enter a display name. This is a local profile, not a password-based account or online sign-in.
2. Choose **Play with a friend** to pass the device between two local players, or choose **Play with computer**.
3. For computer games, choose Easy (random legal moves), Moderate (two-ply material search), or Hard (three-ply material search). You play White and the computer plays Black.
4. Tap a piece to see its legal moves, then tap a highlighted square. Use Undo, Flip, and Restart as needed; choose a piece when promoting a pawn.

Games are local and work offline; online multiplayer and server-backed accounts are not included.
