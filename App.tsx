import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Chess, type Square } from 'chess.js';

type Promotion = 'q' | 'r' | 'b' | 'n';
type PlayerMode = 'casual' | 'friends';

const FILES = 'abcdefgh';
const PIECES: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};
const PROMOTIONS: { value: Promotion; label: string; icon: string }[] = [
  { value: 'q', label: 'Queen', icon: '♕' },
  { value: 'r', label: 'Rook', icon: '♖' },
  { value: 'b', label: 'Bishop', icon: '♗' },
  { value: 'n', label: 'Knight', icon: '♘' },
];

function getStatus(game: Chess) {
  if (game.isCheckmate()) return { title: `${game.turn() === 'w' ? 'Black' : 'White'} wins`, detail: 'Checkmate. Brilliant finish.', ended: true };
  if (game.isStalemate()) return { title: 'Draw by stalemate', detail: 'No legal moves, and the king is safe.', ended: true };
  if (game.isThreefoldRepetition()) return { title: 'Draw by repetition', detail: 'The position occurred three times.', ended: true };
  if (game.isInsufficientMaterial()) return { title: 'Draw', detail: 'There is not enough material to checkmate.', ended: true };
  if (game.isDraw()) return { title: 'Draw', detail: 'The fifty-move rule has been reached.', ended: true };
  const side = game.turn() === 'w' ? 'White' : 'Black';
  return {
    title: game.isCheck() ? `${side} is in check` : `${side} to move`,
    detail: game.isCheck() ? 'Find a safe square for your king.' : 'Tap one of your pieces to see its legal moves.',
    ended: false,
  };
}

export default function App() {
  const { width } = useWindowDimensions();
  // Leave room for the card padding as well as the screen gutter, so the board
  // never gets clipped on narrow Expo Go devices.
  const boardSize = Math.max(240, Math.min(width - 56, 440));
  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<PlayerMode>('casual');
  const [whiteName, setWhiteName] = useState('Player 1');
  const [blackName, setBlackName] = useState('Player 2');
  const [promotion, setPromotion] = useState<{ from: Square; to: Square; color: 'w' | 'b' } | null>(null);

  const status = useMemo(() => getStatus(game), [game]);
  const history = game.history({ verbose: true });
  const lastMove = history[history.length - 1];
  const legalMoves = selected && !status.ended ? game.moves({ square: selected, verbose: true }) : [];
  const legalTargets = new Set(legalMoves.map((move) => move.to));
  const movePairs: { number: number; white: string; black: string }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({ number: Math.floor(i / 2) + 1, white: history[i].san, black: history[i + 1]?.san ?? '' });
  }
  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = flipped ? [...FILES].reverse() : [...FILES];
  const displayName = (color: 'w' | 'b') => {
    const name = color === 'w' ? whiteName.trim() : blackName.trim();
    return name || (color === 'w' ? 'Player 1' : 'Player 2');
  };

  function commitMove(from: Square, to: Square, promoteTo: Promotion = 'q') {
    const next = new Chess(game.fen());
    try {
      next.move({ from, to, promotion: promoteTo });
      setGame(next);
      setSelected(null);
      setPromotion(null);
    } catch {
      setSelected(null);
      setPromotion(null);
    }
  }

  function onSquarePress(square: Square) {
    if (status.ended || promotion) return;
    if (selected && legalTargets.has(square)) {
      const move = legalMoves.find((candidate) => candidate.to === square);
      if (move?.isPromotion()) {
        setPromotion({ from: selected, to: square, color: game.turn() });
      } else {
        commitMove(selected, square);
      }
      return;
    }
    const piece = game.get(square);
    setSelected(piece?.color === game.turn() ? square : null);
  }

  function undoMove() {
    if (!history.length) return;
    const next = new Chess(game.fen());
    next.undo();
    setGame(next);
    setSelected(null);
    setPromotion(null);
  }

  function startNewGame() {
    setGame(new Chess());
    setSelected(null);
    setPromotion(null);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logo}><Text style={styles.logoText}>♞</Text></View>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>YOUR NEXT GREAT GAME</Text>
            <Text style={styles.title}>Chess Arena</Text>
          </View>
          <View style={styles.offlineBadge}><View style={styles.onlineDot} /><Text style={styles.badgeText}>READY</Text></View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.introTitle}>Make your move.</Text>
          <Text style={styles.introText}>A complete chess game, right here on your phone.</Text>
        </View>

        <View style={styles.modeCard}>
          <Text style={styles.label}>CHOOSE YOUR GAME</Text>
          <View style={styles.modeOptions}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'casual' }} onPress={() => setMode('casual')} style={[styles.modeButton, mode === 'casual' && styles.modeButtonActive]}>
              <Text style={[styles.modeTitle, mode === 'casual' && styles.modeTitleActive]}>Quick game</Text>
              <Text style={[styles.modeCaption, mode === 'casual' && styles.modeCaptionActive]}>Play a casual match</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'friends' }} onPress={() => setMode('friends')} style={[styles.modeButton, mode === 'friends' && styles.modeButtonActive]}>
              <Text style={[styles.modeTitle, mode === 'friends' && styles.modeTitleActive]}>2 friends</Text>
              <Text style={[styles.modeCaption, mode === 'friends' && styles.modeCaptionActive]}>Pass the same phone</Text>
            </Pressable>
          </View>
          {mode === 'friends' ? (
            <View style={styles.nameFields}>
              <View style={styles.nameField}><Text style={styles.inputLabel}>WHITE</Text><TextInput accessibilityLabel="White player name" value={whiteName} onChangeText={setWhiteName} placeholder="Player 1" placeholderTextColor="#7d8b7f" maxLength={18} returnKeyType="next" style={styles.nameInput} /></View>
              <View style={styles.nameField}><Text style={styles.inputLabel}>BLACK</Text><TextInput accessibilityLabel="Black player name" value={blackName} onChangeText={setBlackName} placeholder="Player 2" placeholderTextColor="#7d8b7f" maxLength={18} returnKeyType="done" style={styles.nameInput} /></View>
            </View>
          ) : (
            <Text style={styles.modeNote}>Two players take turns on this device. No account or internet required.</Text>
          )}
        </View>

        <View style={styles.gameCard}>
          <View style={styles.playerRow}>
            <View style={styles.avatarBlack}><Text style={styles.avatarPiece}>♚</Text></View>
            <View style={styles.playerInfo}><Text numberOfLines={1} style={styles.playerName}>{displayName('b')}</Text><Text style={styles.playerCaption}>BLACK</Text></View>
            {game.turn() === 'b' && !status.ended && <View style={styles.turnPill}><Text style={styles.turnPillText}>YOUR TURN</Text></View>}
          </View>

          <View style={[styles.board, { width: boardSize, height: boardSize }]}>
            {ranks.map((rank) => (
              <View key={rank} style={styles.rankRow}>
                {files.map((file) => {
                  const square = `${file}${rank}` as Square;
                  const piece = game.get(square);
                  const light = (FILES.indexOf(file) + rank) % 2 !== 0;
                  const isSelected = selected === square;
                  const isLast = lastMove?.from === square || lastMove?.to === square;
                  const isCheck = piece?.type === 'k' && piece.color === game.turn() && game.isCheck();
                  const isTarget = legalTargets.has(square);
                  return (
                    <Pressable key={square} accessibilityRole="button" accessibilityLabel={`${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}${isTarget ? ', legal move' : ''}`} onPress={() => onSquarePress(square)} style={[styles.square, { backgroundColor: isSelected ? '#b9ce8d' : isCheck ? '#d87565' : light ? '#eeecdf' : '#718c75' }]}>
                      {isLast && <View pointerEvents="none" style={styles.lastMoveTint} />}
                      {isTarget && <View pointerEvents="none" style={piece ? styles.captureRing : styles.moveDot} />}
                      {piece && <Text style={[styles.piece, { fontSize: Math.floor(boardSize / 10.1), color: piece.color === 'w' ? '#fffdf5' : '#17201b' }]}>{PIECES[`${piece.color}${piece.type.toUpperCase()}`]}</Text>}
                      {file === files[0] && <Text style={[styles.coordinate, { color: light ? '#617b65' : '#f5f1e4' }]}>{rank}</Text>}
                      {rank === ranks[ranks.length - 1] && <Text style={[styles.fileCoordinate, { color: light ? '#617b65' : '#f5f1e4' }]}>{file}</Text>}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.playerRow}>
            <View style={styles.avatarWhite}><Text style={[styles.avatarPiece, styles.avatarWhitePiece]}>♔</Text></View>
            <View style={styles.playerInfo}><Text numberOfLines={1} style={styles.playerName}>{displayName('w')}</Text><Text style={styles.playerCaption}>WHITE</Text></View>
            {game.turn() === 'w' && !status.ended && <View style={styles.turnPill}><Text style={styles.turnPillText}>YOUR TURN</Text></View>}
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={[styles.statusIcon, game.isCheck() && !status.ended && styles.checkIcon]}><Text style={styles.statusIconText}>{status.ended ? '✦' : game.isCheck() ? '!' : '↗'}</Text></View>
          <View style={styles.statusCopy}><Text style={styles.statusTitle}>{status.title}</Text><Text style={styles.statusDetail}>{status.detail}</Text></View>
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Undo last move" onPress={undoMove} disabled={!history.length} style={[styles.actionButton, !history.length && styles.disabledButton]}><Text style={styles.actionText}>↶  Undo</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Flip board" onPress={() => setFlipped((value) => !value)} style={styles.actionButton}><Text style={styles.actionText}>⇅  Flip</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={startNewGame} style={styles.newGameButton}><Text style={styles.newGameText}>＋  New game</Text></Pressable>
        </View>

        <View style={styles.movesCard}>
          <View style={styles.movesHeader}><Text style={styles.sectionTitle}>Moves</Text><Text style={styles.moveCount}>{history.length} PLIES</Text></View>
          {movePairs.length === 0 ? <Text style={styles.emptyMoves}>The opening move is yours.</Text> : (
            <View style={styles.moveList}>{movePairs.slice(-6).map((pair, index) => (
              <View key={pair.number} style={[styles.moveRow, index % 2 === 1 && styles.alternateMoveRow]}>
                <Text style={styles.moveNumber}>{pair.number}.</Text><Text style={styles.moveText}>{pair.white}</Text><Text style={styles.moveText}>{pair.black}</Text>
              </View>
            ))}</View>
          )}
        </View>
        <Text style={styles.footer}>THINK AHEAD. ENJOY EVERY MOVE.</Text>
      </ScrollView>

      <Modal transparent animationType="fade" visible={promotion !== null} onRequestClose={() => setPromotion(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.promotionCard}>
            <Text style={styles.promotionTitle}>Promote your pawn</Text>
            <Text style={styles.promotionSubtitle}>Choose a piece for {promotion?.color === 'w' ? 'White' : 'Black'}.</Text>
            <View style={styles.promotionOptions}>
              {PROMOTIONS.map((choice) => (
                <Pressable key={choice.value} accessibilityRole="button" accessibilityLabel={`Promote to ${choice.label}`} onPress={() => promotion && commitMove(promotion.from, promotion.to, choice.value)} style={styles.promotionButton}>
                  <Text style={styles.promotionPiece}>{choice.icon}</Text><Text style={styles.promotionLabel}>{choice.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={() => setPromotion(null)} style={styles.cancelPromotion}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#101713' },
  screen: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  header: { width: '100%', maxWidth: 472, flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  logo: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#d3efaa', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#17221a', fontSize: 30, marginTop: -4 },
  headerCopy: { flex: 1, marginLeft: 12 },
  kicker: { color: '#91a092', fontSize: 9, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: '#f2f1e8', fontSize: 21, fontWeight: '800', marginTop: 2 },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1d2921' },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#a9db7a' },
  badgeText: { color: '#b8c5b7', fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  intro: { width: '100%', maxWidth: 472, marginBottom: 14 },
  introTitle: { color: '#f1f2eb', fontSize: 23, fontWeight: '800', letterSpacing: -0.5 },
  introText: { color: '#95a297', fontSize: 12, marginTop: 4 },
  modeCard: { width: '100%', maxWidth: 472, backgroundColor: '#19231c', borderRadius: 19, padding: 14, marginBottom: 12 },
  label: { color: '#91a092', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  modeOptions: { flexDirection: 'row', gap: 8 },
  modeButton: { flex: 1, minHeight: 55, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 11, backgroundColor: '#202c23', borderWidth: 1, borderColor: 'transparent' },
  modeButtonActive: { backgroundColor: '#2b3a2c', borderColor: '#66814f' },
  modeTitle: { color: '#dce3d8', fontSize: 12, fontWeight: '800' },
  modeTitleActive: { color: '#d3efaa' },
  modeCaption: { color: '#89978b', fontSize: 9, marginTop: 3 },
  modeCaptionActive: { color: '#b3c3ad' },
  modeNote: { color: '#91a092', fontSize: 10, lineHeight: 15, marginTop: 10 },
  nameFields: { flexDirection: 'row', gap: 10, marginTop: 12 },
  nameField: { flex: 1 },
  inputLabel: { color: '#89978b', fontSize: 8, fontWeight: '800', letterSpacing: 1.2, marginBottom: 5 },
  nameInput: { height: 39, borderRadius: 10, borderWidth: 1, borderColor: '#344238', backgroundColor: '#121b15', color: '#f1f2eb', paddingHorizontal: 10, fontSize: 12 },
  gameCard: { width: '100%', maxWidth: 472, alignItems: 'center', backgroundColor: '#19231c', borderRadius: 23, paddingVertical: 10, paddingHorizontal: 12 },
  playerRow: { width: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 7 },
  avatarBlack: { width: 35, height: 35, borderRadius: 12, backgroundColor: '#39453b', alignItems: 'center', justifyContent: 'center' },
  avatarWhite: { width: 35, height: 35, borderRadius: 12, backgroundColor: '#e8e5d9', alignItems: 'center', justifyContent: 'center' },
  avatarPiece: { color: '#eeeade', fontSize: 23, marginTop: -3 },
  avatarWhitePiece: { color: '#28352b' },
  playerInfo: { flex: 1, marginLeft: 10 },
  playerName: { color: '#f0f1e9', fontSize: 12, fontWeight: '800' },
  playerCaption: { color: '#89978b', fontSize: 8, marginTop: 2, letterSpacing: 1 },
  turnPill: { backgroundColor: '#2c3c2d', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 9 },
  turnPillText: { color: '#c4e6a3', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  board: { overflow: 'hidden', borderRadius: 6, marginVertical: 3, borderWidth: 2, borderColor: '#39483c' },
  rankRow: { flex: 1, flexDirection: 'row' },
  square: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  piece: { zIndex: 2, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  lastMoveTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(230, 205, 91, .27)' },
  moveDot: { position: 'absolute', width: '27%', height: '27%', borderRadius: 50, backgroundColor: 'rgba(31, 52, 33, .3)', zIndex: 1 },
  captureRing: { position: 'absolute', width: '88%', height: '88%', borderWidth: 4, borderColor: 'rgba(31, 52, 33, .32)', borderRadius: 50, zIndex: 1 },
  coordinate: { position: 'absolute', top: 2, left: 3, fontSize: 8, fontWeight: '900' },
  fileCoordinate: { position: 'absolute', bottom: 1, right: 3, fontSize: 8, fontWeight: '900' },
  statusCard: { width: '100%', maxWidth: 472, flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 13, borderRadius: 16, backgroundColor: '#19231c' },
  statusIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2c3c2d' },
  checkIcon: { backgroundColor: '#49332e' },
  statusIconText: { color: '#c4e6a3', fontSize: 18, fontWeight: '900' },
  statusCopy: { flex: 1, marginLeft: 10 },
  statusTitle: { color: '#eff1e9', fontSize: 12, fontWeight: '800' },
  statusDetail: { color: '#92a092', fontSize: 10, marginTop: 3 },
  actions: { width: '100%', maxWidth: 472, flexDirection: 'row', gap: 8, marginTop: 10 },
  actionButton: { flex: 1, minHeight: 44, borderRadius: 13, backgroundColor: '#202c23', alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.4 },
  actionText: { color: '#d3ddce', fontSize: 11, fontWeight: '800' },
  newGameButton: { flex: 1.3, minHeight: 44, borderRadius: 13, backgroundColor: '#d3efaa', alignItems: 'center', justifyContent: 'center' },
  newGameText: { color: '#1b281d', fontSize: 11, fontWeight: '900' },
  movesCard: { width: '100%', maxWidth: 472, marginTop: 12, padding: 14, borderRadius: 17, backgroundColor: '#19231c' },
  movesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { color: '#eef0e8', fontSize: 12, fontWeight: '800' },
  moveCount: { color: '#8e9b90', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  emptyMoves: { color: '#829084', fontSize: 11, paddingVertical: 7 },
  moveList: { gap: 2 },
  moveRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', borderRadius: 7, paddingHorizontal: 8 },
  alternateMoveRow: { backgroundColor: '#202c23' },
  moveNumber: { width: 40, color: '#839186', fontSize: 10 },
  moveText: { flex: 1, color: '#e0e5da', fontSize: 11, fontWeight: '700' },
  footer: { color: '#66766a', fontSize: 8, letterSpacing: 1.5, marginTop: 17, fontWeight: '800' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,.7)' },
  promotionCard: { width: '100%', maxWidth: 360, borderRadius: 22, padding: 20, backgroundColor: '#19231c', borderWidth: 1, borderColor: '#344238' },
  promotionTitle: { color: '#f2f1e8', fontSize: 19, fontWeight: '900' },
  promotionSubtitle: { color: '#92a092', fontSize: 11, marginTop: 5 },
  promotionOptions: { flexDirection: 'row', gap: 7, marginTop: 18 },
  promotionButton: { flex: 1, minHeight: 75, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#263329' },
  promotionPiece: { color: '#f0eee3', fontSize: 27 },
  promotionLabel: { color: '#c5d0c3', fontSize: 8, fontWeight: '700', marginTop: 3 },
  cancelPromotion: { alignItems: 'center', paddingVertical: 12, marginTop: 5 },
  cancelText: { color: '#aeb9ad', fontSize: 11, fontWeight: '700' },
});
