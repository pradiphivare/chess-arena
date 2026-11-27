# Chess Arena

Chess Arena is an offline React Native and Expo chess game. Enter a player name, then choose a local friend match or play against the computer at Easy, Moderate, or Hard difficulty.

## Run in Expo Go

Use Node.js 20.19.x or newer. From the repository directory:

```bash
npm install
npx expo start --clear
```

Install Expo Go on your phone and scan the QR code. Keep the phone and computer on the same Wi-Fi network. If the connection cannot reach your local network, try `npx expo start --tunnel` (the tunnel needs internet access). If Expo Go still shows an old bundle, close it and restart Expo with the `--clear` option.

For an Android emulator, run `npm run android`. For an iOS simulator, run `npm run ios` on macOS with Xcode installed. Run `npm run web` to open the web build.

## Play

1. Enter a display name. This is a local profile for the game, not a password-based account or online sign-in.
2. Choose **Play with a friend** to pass the device between two local players, or choose **Play with computer**.
3. For computer games, choose Easy (random legal moves), Moderate (two-ply material search), or Hard (three-ply material search). You play White and the computer plays Black.
4. Tap a piece to see its legal moves, then tap a highlighted square. Use Undo, Flip, and Restart as needed; choose a piece when promoting a pawn.

The rules engine handles castling, en passant, check, checkmate, stalemate, repetition, and draws. Games are local and work offline; online multiplayer and server-backed accounts are not included. Run `npm run typecheck` to check TypeScript, or `npm run doctor` to check the Expo project setup.
