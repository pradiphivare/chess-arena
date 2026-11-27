# Chess Arena

Chess Arena is an offline React Native and Expo chess game. Play a complete chess match on one device, either casually or with a friend taking turns and passing the phone. Friend mode lets you enter player names; it does not require an account or internet connection. Online multiplayer is not included.

## Run in Expo Go

Use Node.js 20.19.x or newer. From the repository directory:

```bash
npm install
npx expo start --clear
```

Install Expo Go on your phone and scan the QR code. Keep the phone and computer on the same Wi-Fi network. If the connection cannot reach your local network, try `npx expo start --tunnel` (the tunnel needs internet access). If Expo Go still shows an old bundle, close it and restart Expo with the `--clear` option.

For an Android emulator, run `npm run android`. For an iOS simulator, run `npm run ios` on macOS with Xcode installed. Run `npm run web` to open the web build.

## Play

- Select **Quick game** for a local game, or **2 friends** to enter names and pass the same device between players.
- Tap a piece to see legal moves, then tap a highlighted square.
- Use **Undo**, **Flip**, and **New game** as needed.
- When a pawn reaches the last rank, choose its promotion piece.

The rules engine handles castling, en passant, check, checkmate, stalemate, repetition, and draws. Run `npm run typecheck` to check TypeScript, or `npm run doctor` to check the Expo project setup.
