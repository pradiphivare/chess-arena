# Chess Arena

A polished, offline, two-player chess game built with React Native and Expo. Play on one device, review the move list, undo a move, or flip the board. The chess.js rules engine validates legal moves and detects check, checkmate, and draws.

## Run it

```bash
npm install
npx expo start
```

Use the Expo Go app to scan the terminal's QR code, or press `a` / `i` to launch an Android / iOS simulator. For web, run `npm run web`.

## Features

- Complete standard chess rules, including castling, en passant, and queen promotion
- Legal-move highlights and check/checkmate/draw status
- Local two-player play, move history, undo, and board flip
- Responsive board with accessible square labels
- No account, payment, or network connection required to play

Run `npm run typecheck` to check the TypeScript types.
