import React, { useEffect, useMemo, useState } from 'react';
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
type PlayerMode = 'friends' | 'computer';
type Difficulty = 'easy' | 'moderate' | 'hard';
type Screen = 'login' | 'setup' | 'game';

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
const PIECE_VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

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

// Positive scores favor Black, negative scores favor White. Search is local
// and bounded to a few plies so even the hardest level stays phone-friendly.
function evaluatePosition(game: Chess): number {
  if (game.isCheckmate()) return game.turn() === 'b' ? 100000 : -100000;
  if (game.isDraw()) return 0;
  let score = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const value = PIECE_VALUE[piece.type];
      score += piece.color === 'b' ? value : -value;
    }
  }
  return score;
}

function minimax(game: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || game.isGameOver()) return evaluatePosition(game);
  const moves = game.moves({ verbose: true });
  if (game.turn() === 'b') {
    let best = -Infinity;
    for (const move of moves) {
      const next = new Chess(game.fen());
      next.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
      best = Math.max(best, minimax(next, depth - 1, alpha, beta));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const move of moves) {
    const next = new Chess(game.fen());
    next.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
    best = Math.min(best, minimax(next, depth - 1, alpha, beta));
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function chooseComputerMove(game: Chess, difficulty: Difficulty) {
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
  const depth = difficulty === 'moderate' ? 2 : 3;
  let bestScore = -Infinity;
  let bestMoves = [moves[0]];
  for (const move of moves) {
    const next = new Chess(game.fen());
    next.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
    const score = minimax(next, depth - 1, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

export default function App() {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(440, Math.max(160, width - 56));
  const [screen, setScreen] = useState<Screen>('login');
  const [playerName, setPlayerName] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [opponentName, setOpponentName] = useState('Friend');
  const [mode, setMode] = useState<PlayerMode>('friends');
  const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square; color: 'w' | 'b' } | null>(null);
  const [nameError, setNameError] = useState('');

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
  const computerThinking = screen === 'game' && mode === 'computer' && game.turn() === 'b' && !status.ended;
  const humanTurn = mode === 'friends' || game.turn() === 'w';

  useEffect(() => {
    if (!computerThinking) return undefined;
    const timer = setTimeout(() => {
      const next = new Chess(game.fen());
      const move = chooseComputerMove(next, difficulty);
      if (move) {
        next.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
        setGame(next);
        setSelected(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [computerThinking, difficulty, game]);

  function continueFromLogin() {
    const cleanedName = nameDraft.trim().replace(/\s+/g, ' ');
    if (!cleanedName) {
      setNameError('Enter your name to continue.');
      return;
    }
    setPlayerName(cleanedName.slice(0, 20));
    setNameError('');
    setScreen('setup');
  }

  function startGame() {
    setGame(new Chess());
    setSelected(null);
    setFlipped(false);
    setPromotion(null);
    setScreen('game');
  }

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
    if (status.ended || promotion || !humanTurn) return;
    if (selected && legalTargets.has(square)) {
      const move = legalMoves.find((candidate) => candidate.to === square);
      if (move?.isPromotion()) setPromotion({ from: selected, to: square, color: game.turn() });
      else commitMove(selected, square);
      return;
    }
    const piece = game.get(square);
    setSelected(piece?.color === game.turn() ? square : null);
  }

  function undoMove() {
    if (!history.length) return;
    const next = new Chess(game.fen());
    next.undo();
    if (mode === 'computer' && next.turn() === 'b' && next.history().length) next.undo();
    setGame(next);
    setSelected(null);
    setPromotion(null);
  }

  function displayName(color: 'w' | 'b') {
    if (mode === 'computer') return color === 'w' ? playerName : 'Chess Bot';
    return color === 'w' ? playerName : (opponentName.trim() || 'Friend');
  }

  if (screen === 'login') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.centerScreen} keyboardShouldPersistTaps="handled">
          <View style={styles.logoLarge}><Text style={styles.logoLargeText}>♞</Text></View>
          <Text style={styles.welcomeKicker}>WELCOME TO</Text>
          <Text style={styles.welcomeTitle}>Chess Arena</Text>
          <Text style={styles.welcomeText}>A little focus. A little strategy. Your next great game starts here.</Text>
          <View style={styles.loginCard}>
            <Text style={styles.cardTitle}>What should we call you?</Text>
            <Text style={styles.cardHint}>Choose a name to show on your side of the board.</Text>
            <TextInput accessibilityLabel="Your player name" autoCapitalize="words" autoCorrect={false} maxLength={20} onChangeText={(text) => { setNameDraft(text); setNameError(''); }} onSubmitEditing={continueFromLogin} placeholder="Enter your name" placeholderTextColor="#7d8b7f" returnKeyType="go" value={nameDraft} style={styles.loginInput} />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
            <Pressable accessibilityRole="button" onPress={continueFromLogin} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Continue  →</Text></Pressable>
          </View>
          <Text style={styles.localNote}>Local player profile · no password or account required</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'setup') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.setupScreen} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logo}><Text style={styles.logoText}>♞</Text></View>
            <View style={styles.headerCopy}><Text style={styles.kicker}>READY TO PLAY</Text><Text style={styles.title}>Hi, {playerName}!</Text></View>
            <Pressable accessibilityRole="button" onPress={() => setScreen('login')} style={styles.editNameButton}><Text style={styles.editNameText}>Edit name</Text></Pressable>
          </View>
          <Text style={styles.setupHeading}>Choose your opponent</Text>
          <Text style={styles.setupSubheading}>Play a friend on this device or challenge the computer.</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'friends' }} onPress={() => setMode('friends')} style={[styles.opponentCard, mode === 'friends' && styles.opponentCardActive]}>
            <View style={styles.opponentIcon}><Text style={styles.opponentIconText}>♟♙</Text></View>
            <View style={styles.opponentCopy}><Text style={styles.opponentTitle}>Play with a friend</Text><Text style={styles.opponentDescription}>Take turns and pass the phone.</Text></View>
            <Text style={styles.radio}>{mode === 'friends' ? '●' : '○'}</Text>
          </Pressable>
          {mode === 'friends' && (
            <View style={styles.optionPanel}>
              <Text style={styles.inputLabel}>FRIEND'S NAME (OPTIONAL)</Text>
              <TextInput accessibilityLabel="Friend's name" autoCapitalize="words" maxLength={20} onChangeText={setOpponentName} placeholder="Friend" placeholderTextColor="#7d8b7f" value={opponentName} style={styles.nameInput} />
              <Text style={styles.panelNote}>White moves first. You can play together on one device, offline.</Text>
            </View>
          )}
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'computer' }} onPress={() => setMode('computer')} style={[styles.opponentCard, mode === 'computer' && styles.opponentCardActive]}>
            <View style={styles.opponentIcon}><Text style={styles.opponentIconText}>♞</Text></View>
            <View style={styles.opponentCopy}><Text style={styles.opponentTitle}>Play with computer</Text><Text style={styles.opponentDescription}>Pick a level and test your skills.</Text></View>
            <Text style={styles.radio}>{mode === 'computer' ? '●' : '○'}</Text>
          </Pressable>
          {mode === 'computer' && (
            <View style={styles.optionPanel}>
              <Text style={styles.inputLabel}>DIFFICULTY</Text>
              <View style={styles.difficultyRow}>
                {(['easy', 'moderate', 'hard'] as Difficulty[]).map((level) => (
                  <Pressable key={level} accessibilityRole="button" accessibilityState={{ selected: difficulty === level }} onPress={() => setDifficulty(level)} style={[styles.difficultyButton, difficulty === level && styles.difficultyButtonActive]}>
                    <Text style={[styles.difficultyTitle, difficulty === level && styles.difficultyTitleActive]}>{level[0].toUpperCase() + level.slice(1)}</Text>
                    <Text style={styles.difficultyCaption}>{level === 'easy' ? 'Casual' : level === 'moderate' ? 'Thoughtful' : 'Challenging'}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.panelNote}>You play White. The computer plays Black. Works offline.</Text>
            </View>
          )}
          <Pressable accessibilityRole="button" onPress={startGame} style={styles.startButton}><Text style={styles.startButtonText}>Start game  →</Text></Pressable>
          <Text style={styles.localNote}>No account or internet required to play.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.gameScreen} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logo}><Text style={styles.logoText}>♞</Text></View>
          <View style={styles.headerCopy}><Text style={styles.kicker}>{mode === 'computer' ? `${difficulty.toUpperCase()} COMPUTER` : 'FRIENDLY MATCH'}</Text><Text style={styles.title}>Chess Arena</Text></View>
          <Pressable accessibilityRole="button" onPress={() => setScreen('setup')} style={styles.editNameButton}><Text style={styles.editNameText}>New match</Text></Pressable>
        </View>

        <View style={styles.gameCard}>
          <View style={styles.playerRow}>
            <View style={styles.avatarBlack}><Text style={styles.avatarPiece}>♚</Text></View>
            <View style={styles.playerInfo}><Text numberOfLines={1} style={styles.playerName}>{displayName('b')}</Text><Text style={styles.playerCaption}>BLACK</Text></View>
            {game.turn() === 'b' && !status.ended && <View style={styles.turnPill}><Text style={styles.turnPillText}>{computerThinking ? 'THINKING…' : 'TO MOVE'}</Text></View>}
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
            {game.turn() === 'w' && !status.ended && <View style={styles.turnPill}><Text style={styles.turnPillText}>TO MOVE</Text></View>}
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={[styles.statusIcon, game.isCheck() && !status.ended && styles.checkIcon]}><Text style={styles.statusIconText}>{status.ended ? '✦' : game.isCheck() ? '!' : computerThinking ? '…' : '↗'}</Text></View>
          <View style={styles.statusCopy}><Text style={styles.statusTitle}>{computerThinking ? 'Computer is thinking' : status.title}</Text><Text style={styles.statusDetail}>{computerThinking ? 'Choosing a move…' : status.detail}</Text></View>
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Undo last move" onPress={undoMove} disabled={!history.length || computerThinking} style={[styles.actionButton, (!history.length || computerThinking) && styles.disabledButton]}><Text style={styles.actionText}>↶  Undo</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Flip board" onPress={() => setFlipped((value) => !value)} style={styles.actionButton}><Text style={styles.actionText}>⇅  Flip</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={startGame} style={styles.newGameButton}><Text style={styles.newGameText}>＋  Restart</Text></Pressable>
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
  centerScreen: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 36 },
  setupScreen: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  gameScreen: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  logoLarge: { width: 76, height: 76, borderRadius: 24, backgroundColor: '#d3efaa', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logoLargeText: { color: '#17221a', fontSize: 50, marginTop: -7 },
  welcomeKicker: { color: '#9bab9b', fontSize: 10, fontWeight: '900', letterSpacing: 2.4 },
  welcomeTitle: { color: '#f2f1e8', fontSize: 34, fontWeight: '900', marginTop: 6 },
  welcomeText: { color: '#98a69a', fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 300, marginTop: 10, marginBottom: 26 },
  loginCard: { width: '100%', maxWidth: 400, padding: 18, borderRadius: 20, backgroundColor: '#19231c' },
  cardTitle: { color: '#f1f2eb', fontSize: 16, fontWeight: '800' },
  cardHint: { color: '#94a197', fontSize: 11, lineHeight: 16, marginTop: 5, marginBottom: 14 },
  loginInput: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#344238', backgroundColor: '#121b15', color: '#f1f2eb', paddingHorizontal: 13, fontSize: 14 },
  errorText: { color: '#f29b82', fontSize: 11, marginTop: 7 },
  primaryButton: { minHeight: 48, borderRadius: 13, backgroundColor: '#d3efaa', alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  primaryButtonText: { color: '#1b281d', fontSize: 13, fontWeight: '900' },
  localNote: { color: '#748277', fontSize: 10, textAlign: 'center', marginTop: 17 },
  header: { width: '100%', maxWidth: 472, flexDirection: 'row', alignItems: 'center', marginBottom: 21 },
  logo: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#d3efaa', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#17221a', fontSize: 29, marginTop: -4 },
  headerCopy: { flex: 1, marginLeft: 11 },
  kicker: { color: '#91a092', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#f2f1e8', fontSize: 19, fontWeight: '900', marginTop: 2 },
  editNameButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 11, backgroundColor: '#202c23' },
  editNameText: { color: '#d3efaa', fontSize: 10, fontWeight: '800' },
  setupHeading: { width: '100%', maxWidth: 472, color: '#f1f2eb', fontSize: 24, fontWeight: '900', marginTop: 6 },
  setupSubheading: { width: '100%', maxWidth: 472, color: '#95a297', fontSize: 12, marginTop: 5, marginBottom: 18 },
  opponentCard: { width: '100%', maxWidth: 472, minHeight: 75, flexDirection: 'row', alignItems: 'center', padding: 13, marginBottom: 8, borderRadius: 17, backgroundColor: '#19231c', borderWidth: 1, borderColor: '#19231c' },
  opponentCardActive: { borderColor: '#78925d', backgroundColor: '#202d22' },
  opponentIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2c3c2d' },
  opponentIconText: { color: '#d3efaa', fontSize: 21 },
  opponentCopy: { flex: 1, marginLeft: 11 },
  opponentTitle: { color: '#f0f1e9', fontSize: 13, fontWeight: '900' },
  opponentDescription: { color: '#94a197', fontSize: 10, marginTop: 4 },
  radio: { color: '#d3efaa', fontSize: 19, paddingHorizontal: 4 },
  optionPanel: { width: '100%', maxWidth: 472, padding: 14, marginBottom: 12, borderRadius: 15, backgroundColor: '#19231c' },
  inputLabel: { color: '#89978b', fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginBottom: 7 },
  nameInput: { height: 41, borderRadius: 10, borderWidth: 1, borderColor: '#344238', backgroundColor: '#121b15', color: '#f1f2eb', paddingHorizontal: 11, fontSize: 12 },
  panelNote: { color: '#829084', fontSize: 10, lineHeight: 15, marginTop: 9 },
  difficultyRow: { flexDirection: 'row', gap: 7 },
  difficultyButton: { flex: 1, minHeight: 54, justifyContent: 'center', alignItems: 'center', borderRadius: 11, backgroundColor: '#202c23', borderWidth: 1, borderColor: 'transparent' },
  difficultyButtonActive: { backgroundColor: '#2b3a2c', borderColor: '#78925d' },
  difficultyTitle: { color: '#dce3d8', fontSize: 10, fontWeight: '900' },
  difficultyTitleActive: { color: '#d3efaa' },
  difficultyCaption: { color: '#89978b', fontSize: 8, marginTop: 4 },
  startButton: { width: '100%', maxWidth: 472, minHeight: 49, borderRadius: 14, backgroundColor: '#d3efaa', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  startButtonText: { color: '#1b281d', fontSize: 13, fontWeight: '900' },
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
  turnPillText: { color: '#c4e6a3', fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
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
