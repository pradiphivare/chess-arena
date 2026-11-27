import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Chess, type Square } from 'chess.js';

type Side = 'w' | 'b';

const PIECES: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};
const FILES = 'abcdefgh';

function gameMessage(game: Chess): { title: string; detail: string; finished: boolean } {
  if (game.isCheckmate()) {
    return { title: `${game.turn() === 'w' ? 'Black' : 'White'} wins`, detail: 'Checkmate — what a game.', finished: true };
  }
  if (game.isStalemate()) return { title: 'Draw', detail: 'Stalemate — no legal moves.', finished: true };
  if (game.isThreefoldRepetition()) return { title: 'Draw', detail: 'Threefold repetition.', finished: true };
  if (game.isInsufficientMaterial()) return { title: 'Draw', detail: 'Not enough material to checkmate.', finished: true };
  if (game.isDraw()) return { title: 'Draw', detail: 'The game is drawn.', finished: true };
  const side = game.turn() === 'w' ? 'White' : 'Black';
  return {
    title: `${side} to move`,
    detail: game.isCheck() ? `${side} is in check` : 'Tap a piece, then tap a highlighted square',
    finished: false,
  };
}

export default function App() {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 440);
  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [, setRevision] = useState(0);
  const status = useMemo(() => gameMessage(game), [game]);
  const legalMoves = selected ? game.moves({ square: selected, verbose: true }) : [];
  const legalTargets = new Set(legalMoves.map((move) => move.to));
  const history = game.history({ verbose: true });
  const lastMove = history[history.length - 1];
  const movePairs: string[][] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push([`${Math.floor(i / 2) + 1}.`, history[i].san, history[i + 1]?.san ?? '']);
  }

  function updateGame(next: Chess) {
    setGame(next);
    setSelected(null);
  }

  function onSquarePress(square: Square) {
    if (status.finished) return;
    const next = new Chess(game.fen());
    if (selected && legalTargets.has(square)) {
      try {
        next.move({ from: selected, to: square, promotion: 'q' });
        updateGame(next);
      } catch {
        setSelected(null);
      }
      return;
    }
    const piece = next.get(square);
    if (piece && piece.color === next.turn()) setSelected(square);
    else setSelected(null);
  }

  function undoMove() {
    if (history.length === 0) return;
    const next = new Chess(game.fen());
    next.undo();
    updateGame(next);
  }

  function newGame() {
    updateGame(new Chess());
  }

  const ranks = flipped ? [...Array(8).keys()].map((i) => i + 1) : [...Array(8).keys()].map((i) => 8 - i);
  const files = flipped ? [...FILES].reverse() : [...FILES];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandMark}><Text style={styles.brandIcon}>♞</Text></View>
          <View style={styles.brandText}>
            <Text style={styles.eyebrow}>THE ROYAL GAME</Text>
            <Text style={styles.appName}>Chess Arena</Text>
          </View>
          <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LOCAL</Text></View>
        </View>

        <View style={styles.gameCard}>
          <View style={styles.playerRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>♚</Text></View>
            <View style={styles.playerInfo}><Text style={styles.playerName}>Black</Text><Text style={styles.playerCaption}>Local player</Text></View>
            {game.turn() === 'b' && !status.finished && <View style={styles.turnPill}><Text style={styles.turnPillText}>TO MOVE</Text></View>}
          </View>

          <View style={[styles.board, { width: boardSize, height: boardSize }]}>
            {ranks.map((rank) => (
              <View key={rank} style={styles.rankRow}>
                {files.map((file) => {
                  const square = `${file}${rank}` as Square;
                  const piece = game.get(square);
                  const isLight = (FILES.indexOf(file) + rank) % 2 === 0;
                  const isSelected = selected === square;
                  const isLastMove = lastMove?.from === square || lastMove?.to === square;
                  const isCheck = piece?.type === 'k' && piece.color === game.turn() && game.isCheck();
                  const isTarget = legalTargets.has(square);
                  return (
                    <Pressable
                      key={square}
                      accessibilityRole="button"
                      accessibilityLabel={`${square}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}${isTarget ? ', legal move' : ''}`}
                      onPress={() => onSquarePress(square)}
                      style={[styles.square, { backgroundColor: isSelected ? '#b7c98b' : isCheck ? '#e87969' : isLight ? '#e8e5d9' : '#68866c' }]}
                    >
                      {isLastMove && !isSelected && <View pointerEvents="none" style={[styles.lastMoveTint, { backgroundColor: isLight ? 'rgba(230, 205, 91, .30)' : 'rgba(230, 205, 91, .24)' }]} />}
                      {isTarget && <View pointerEvents="none" style={piece ? styles.captureRing : styles.moveDot} />}
                      {piece && <Text style={[styles.piece, { fontSize: boardSize / 10.2, color: piece.color === 'w' ? '#fffdf5' : '#17201b' }, piece.color === 'w' ? styles.whitePiece : styles.blackPiece]}>{PIECES[`${piece.color}${piece.type.toUpperCase()}`]}</Text>}
                      {file === files[0] && <Text style={[styles.coordinate, { color: isLight ? '#68866c' : '#f0eee3' }]}>{rank}</Text>}
                      {rank === ranks[ranks.length - 1] && <Text style={[styles.fileCoordinate, { color: isLight ? '#68866c' : '#f0eee3' }]}>{file}</Text>}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.playerRow}>
            <View style={[styles.avatar, styles.whiteAvatar]}><Text style={[styles.avatarText, { color: '#28352b' }]}>♔</Text></View>
            <View style={styles.playerInfo}><Text style={styles.playerName}>White</Text><Text style={styles.playerCaption}>Local player</Text></View>
            {game.turn() === 'w' && !status.finished && <View style={styles.turnPill}><Text style={styles.turnPillText}>TO MOVE</Text></View>}
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={[styles.statusIndicator, status.finished && styles.finishedIndicator]}><Text style={styles.statusIndicatorText}>{status.finished ? '✦' : game.isCheck() ? '!' : '↗'}</Text></View>
          <View style={styles.statusCopy}><Text style={styles.statusTitle}>{status.title}</Text><Text style={styles.statusDetail}>{status.detail}</Text></View>
          {game.isCheck() && !status.finished && <Text style={styles.checkLabel}>CHECK</Text>}
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={undoMove} disabled={!history.length} style={[styles.secondaryButton, !history.length && styles.disabledButton]}><Text style={styles.secondaryButtonText}>↶  Undo</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setFlipped(!flipped); setRevision((n) => n + 1); }} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>⇅  Flip</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={newGame} style={styles.primaryButton}><Text style={styles.primaryButtonText}>＋  New game</Text></Pressable>
        </View>

        <View style={styles.movesCard}>
          <View style={styles.movesHeader}><Text style={styles.sectionTitle}>Move history</Text><Text style={styles.moveCount}>{history.length} {history.length === 1 ? 'MOVE' : 'MOVES'}</Text></View>
          {movePairs.length === 0 ? <Text style={styles.emptyMoves}>Your moves will appear here</Text> : (
            <View style={styles.moveList}>{movePairs.slice(-8).map((pair, index) => (
              <View key={pair[0]} style={[styles.moveRow, index % 2 === 1 && styles.alternateMoveRow]}>
                <Text style={styles.moveNumber}>{pair[0]}</Text><Text style={styles.moveText}>{pair[1]}</Text><Text style={styles.moveText}>{pair[2]}</Text>
              </View>
            ))}</View>
          )}
        </View>
        <Text style={styles.footer}>A GOOD GAME IS ALWAYS ONE MORE MOVE.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#101713' },
  screen: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  header: { width: '100%', maxWidth: 440, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  brandMark: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#d3efaa', alignItems: 'center', justifyContent: 'center' },
  brandIcon: { color: '#17221a', fontSize: 29, marginTop: -3 },
  brandText: { marginLeft: 12, flex: 1 },
  eyebrow: { color: '#98a99a', fontSize: 9, fontWeight: '800', letterSpacing: 2.2 },
  appName: { color: '#f2f1e8', fontSize: 20, fontWeight: '800', marginTop: 1 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, backgroundColor: '#1d2921' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#a9db7a' },
  liveText: { color: '#b8c5b7', fontSize: 9, letterSpacing: 1.2, fontWeight: '800' },
  gameCard: { width: '100%', maxWidth: 472, alignItems: 'center', backgroundColor: '#19231c', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 12 },
  playerRow: { width: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 8 },
  avatar: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#39453b', alignItems: 'center', justifyContent: 'center' },
  whiteAvatar: { backgroundColor: '#e8e5d9' },
  avatarText: { color: '#eeeade', fontSize: 23, marginTop: -2 },
  playerInfo: { marginLeft: 10, flex: 1 },
  playerName: { color: '#f0f1e9', fontSize: 13, fontWeight: '700' },
  playerCaption: { color: '#89978b', fontSize: 10, marginTop: 2 },
  turnPill: { backgroundColor: '#2c3c2d', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 8 },
  turnPillText: { color: '#c4e6a3', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  board: { overflow: 'hidden', borderRadius: 6, marginVertical: 3, borderWidth: 2, borderColor: '#39483c' },
  rankRow: { flex: 1, flexDirection: 'row' },
  square: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  piece: { zIndex: 2, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
  whitePiece: { textShadowColor: '#344334', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  blackPiece: { textShadowColor: 'rgba(255,255,255,.16)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  lastMoveTint: { ...StyleSheet.absoluteFillObject },
  moveDot: { position: 'absolute', width: '28%', height: '28%', borderRadius: 50, backgroundColor: 'rgba(31, 52, 33, .28)', zIndex: 1 },
  captureRing: { position: 'absolute', width: '88%', height: '88%', borderWidth: 4, borderColor: 'rgba(31, 52, 33, .32)', borderRadius: 50, zIndex: 1 },
  coordinate: { position: 'absolute', top: 2, left: 3, fontSize: 8, fontWeight: '800' },
  fileCoordinate: { position: 'absolute', bottom: 1, right: 3, fontSize: 8, fontWeight: '800' },
  statusCard: { width: '100%', maxWidth: 440, flexDirection: 'row', alignItems: 'center', marginTop: 14, padding: 13, borderRadius: 16, backgroundColor: '#19231c' },
  statusIndicator: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2c3c2d' },
  finishedIndicator: { backgroundColor: '#393628' },
  statusIndicatorText: { color: '#c4e6a3', fontSize: 19, fontWeight: '800' },
  statusCopy: { marginLeft: 10, flex: 1 },
  statusTitle: { color: '#eff1e9', fontSize: 13, fontWeight: '800' },
  statusDetail: { color: '#92a092', fontSize: 10, marginTop: 3 },
  checkLabel: { color: '#f29b82', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  actions: { width: '100%', maxWidth: 440, flexDirection: 'row', gap: 8, marginTop: 12 },
  secondaryButton: { flex: 1, minHeight: 44, borderRadius: 13, backgroundColor: '#202c23', alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.45 },
  secondaryButtonText: { color: '#d3ddce', fontSize: 11, fontWeight: '700' },
  primaryButton: { flex: 1.25, minHeight: 44, borderRadius: 13, backgroundColor: '#d3efaa', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#1b281d', fontSize: 11, fontWeight: '800' },
  movesCard: { width: '100%', maxWidth: 440, marginTop: 14, padding: 14, borderRadius: 17, backgroundColor: '#19231c' },
  movesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: '#eef0e8', fontSize: 12, fontWeight: '800' },
  moveCount: { color: '#8e9b90', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  emptyMoves: { color: '#829084', fontSize: 11, paddingVertical: 8 },
  moveList: { gap: 2 },
  moveRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', borderRadius: 7, paddingHorizontal: 8 },
  alternateMoveRow: { backgroundColor: '#202c23' },
  moveNumber: { width: 42, color: '#839186', fontSize: 10 },
  moveText: { flex: 1, color: '#e0e5da', fontSize: 11, fontWeight: '600' },
  footer: { color: '#66766a', fontSize: 8, letterSpacing: 1.7, marginTop: 19, fontWeight: '700' },
});
