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

type Difficulty = 'easy' | 'moderate' | 'hard';
type Mode = 'friends' | 'computer';
type Screen = 'login' | 'setup' | 'game';
type Promotion = 'q' | 'r' | 'b' | 'n';

const FILES = 'abcdefgh';
const PIECES: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};
const VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const PROMOTIONS: { value: Promotion; label: string; icon: string }[] = [
  { value: 'q', label: 'Queen', icon: '♕' },
  { value: 'r', label: 'Rook', icon: '♖' },
  { value: 'b', label: 'Bishop', icon: '♗' },
  { value: 'n', label: 'Knight', icon: '♘' },
];

function getStatus(game: Chess) {
  if (game.isCheckmate()) return { title: `${game.turn() === 'w' ? 'Black' : 'White'} wins`, detail: 'Checkmate.', ended: true };
  if (game.isStalemate()) return { title: 'Draw by stalemate', detail: 'No legal moves, and the king is safe.', ended: true };
  if (game.isThreefoldRepetition()) return { title: 'Draw by repetition', detail: 'The position occurred three times.', ended: true };
  if (game.isInsufficientMaterial()) return { title: 'Draw', detail: 'There is not enough material to checkmate.', ended: true };
  if (game.isDraw()) return { title: 'Draw', detail: 'The fifty-move rule has been reached.', ended: true };
  const side = game.turn() === 'w' ? 'White' : 'Black';
  return {
    title: game.isCheck() ? `${side} is in check` : `${side} to move`,
    detail: game.isCheck() ? 'Find a safe square for your king.' : 'Tap a piece, then a highlighted square.',
    ended: false,
  };
}

// Search scores are positive for Black and negative for White.
function evaluate(game: Chess): number {
  if (game.isCheckmate()) return game.turn() === 'b' ? 100000 : -100000;
  if (game.isDraw()) return 0;
  let score = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (piece) score += (piece.color === 'b' ? 1 : -1) * VALUES[piece.type];
    }
  }
  return score;
}

function search(game: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || game.isGameOver()) return evaluate(game);
  const moves = game.moves({ verbose: true });
  if (game.turn() === 'b') {
    let best = -Infinity;
    for (const move of moves) {
      const next = new Chess(game.fen());
      next.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
      best = Math.max(best, search(next, depth - 1, alpha, beta));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const move of moves) {
    const next = new Chess(game.fen());
    next.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
    best = Math.min(best, search(next, depth - 1, alpha, beta));
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

function computerMove(game: Chess, difficulty: Difficulty) {
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
  const depth = difficulty === 'moderate' ? 2 : 3;
  let bestScore = -Infinity;
  let choices = [moves[0]];
  for (const move of moves) {
    const next = new Chess(game.fen());
    next.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
    const score = search(next, depth - 1, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      choices = [move];
    } else if (score === bestScore) choices.push(move);
  }
  return choices[Math.floor(Math.random() * choices.length)];
}

export default function App() {
  const { width } = useWindowDimensions();
  const boardSize = Math.max(160, Math.min(440, width - 56));
  const [screen, setScreen] = useState<Screen>('login');
  const [nameDraft, setNameDraft] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [friendName, setFriendName] = useState('Friend');
  const [nameError, setNameError] = useState('');
  const [mode, setMode] = useState<Mode>('friends');
  const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square; color: 'w' | 'b' } | null>(null);

  const status = useMemo(() => getStatus(game), [game]);
  const history = game.history({ verbose: true });
  const lastMove = history[history.length - 1];
  const legalMoves = selected && !status.ended ? game.moves({ square: selected, verbose: true }) : [];
  const legalTargets = new Set(legalMoves.map((move) => move.to));
  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = flipped ? [...FILES].reverse() : [...FILES];
  const thinking = screen === 'game' && mode === 'computer' && game.turn() === 'b' && !status.ended;
  const humanTurn = mode === 'friends' || game.turn() === 'w';

  useEffect(() => {
    if (!thinking) return undefined;
    const timer = setTimeout(() => {
      const next = new Chess(game.fen());
      const move = computerMove(next, difficulty);
      if (!move) return;
      next.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
      setGame(next);
      setSelected(null);
    }, 350);
    return () => clearTimeout(timer);
  }, [thinking, difficulty, game]);

  function startGame() {
    setGame(new Chess());
    setSelected(null);
    setFlipped(false);
    setPromotion(null);
    setScreen('game');
  }

  function makeMove(from: Square, to: Square, promote: Promotion = 'q') {
    const next = new Chess(game.fen());
    try {
      next.move({ from, to, promotion: promote });
      setGame(next);
    } finally {
      setSelected(null);
      setPromotion(null);
    }
  }

  function pressSquare(square: Square) {
    if (status.ended || promotion || thinking || !humanTurn) return;
    if (selected && legalTargets.has(square)) {
      const move = legalMoves.find((candidate) => candidate.to === square);
      if (move?.isPromotion()) setPromotion({ from: selected, to: square, color: game.turn() });
      else makeMove(selected, square);
      return;
    }
    setSelected(game.get(square)?.color === game.turn() ? square : null);
  }

  function undo() {
    if (!history.length || thinking) return;
    const next = new Chess(game.fen());
    next.undo();
    if (mode === 'computer' && next.turn() === 'b' && next.history().length) next.undo();
    setGame(next);
    setSelected(null);
    setPromotion(null);
  }

  function startWithName() {
    const name = nameDraft.trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!name) {
      setNameError('Please enter your name to continue.');
      return;
    }
    setPlayerName(name);
    setNameError('');
    setScreen('setup');
  }

  function player(color: 'w' | 'b') {
    if (mode === 'computer') return color === 'w' ? playerName : 'Chess Bot';
    return color === 'w' ? playerName : friendName.trim() || 'Friend';
  }

  if (screen === 'login') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.centerPage} keyboardShouldPersistTaps="handled">
          <View style={styles.heroMark}><Text style={styles.heroKnight}>♞</Text></View>
          <Text style={styles.kicker}>WELCOME TO</Text>
          <Text style={styles.heroTitle}>Chess Arena</Text>
          <Text style={styles.heroCopy}>A little focus. A little strategy. Your next great game starts here.</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What should we call you?</Text>
            <Text style={styles.muted}>Choose a name to show on your side of the board.</Text>
            <TextInput accessibilityLabel="Your player name" autoCapitalize="words" autoCorrect={false} maxLength={20} onChangeText={(text) => { setNameDraft(text); setNameError(''); }} onSubmitEditing={startWithName} placeholder="Enter your name" placeholderTextColor="#7d8b7f" returnKeyType="go" value={nameDraft} style={styles.input} />
            {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
            <Pressable accessibilityRole="button" onPress={startWithName} style={styles.primary}><Text style={styles.primaryText}>Continue  →</Text></Pressable>
          </View>
          <Text style={styles.footnote}>Local profile · no password or account needed</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'setup') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.setupPage} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logo}><Text style={styles.logoKnight}>♞</Text></View>
            <View style={styles.headerText}><Text style={styles.kickerSmall}>READY TO PLAY</Text><Text style={styles.headerTitle}>Hi, {playerName}!</Text></View>
            <Pressable onPress={() => setScreen('login')} style={styles.headerButton}><Text style={styles.headerButtonText}>Edit name</Text></Pressable>
          </View>
          <Text style={styles.heading}>Choose your opponent</Text>
          <Text style={styles.subheading}>Play a friend on this device or challenge the computer.</Text>
          <Pressable accessibilityRole="button" onPress={() => setMode('friends')} style={[styles.option, mode === 'friends' && styles.optionActive]}>
            <View style={styles.optionIcon}><Text style={styles.optionIconText}>♟♙</Text></View>
            <View style={styles.optionCopy}><Text style={styles.optionTitle}>Play with a friend</Text><Text style={styles.muted}>Take turns and pass the phone.</Text></View>
            <Text style={styles.radio}>{mode === 'friends' ? '●' : '○'}</Text>
          </Pressable>
          {mode === 'friends' && <View style={styles.panel}><Text style={styles.label}>FRIEND'S NAME (OPTIONAL)</Text><TextInput accessibilityLabel="Friend's name" autoCapitalize="words" maxLength={20} onChangeText={setFriendName} placeholder="Friend" placeholderTextColor="#7d8b7f" value={friendName} style={styles.input} /><Text style={styles.panelNote}>White moves first. Play together offline on one device.</Text></View>}
          <Pressable accessibilityRole="button" onPress={() => setMode('computer')} style={[styles.option, mode === 'computer' && styles.optionActive]}>
            <View style={styles.optionIcon}><Text style={styles.optionIconText}>♞</Text></View>
            <View style={styles.optionCopy}><Text style={styles.optionTitle}>Play with computer</Text><Text style={styles.muted}>Choose a level and test your skills.</Text></View>
            <Text style={styles.radio}>{mode === 'computer' ? '●' : '○'}</Text>
          </Pressable>
          {mode === 'computer' && <View style={styles.panel}>
            <Text style={styles.label}>DIFFICULTY</Text>
            <View style={styles.levelRow}>{(['easy', 'moderate', 'hard'] as Difficulty[]).map((level) => <Pressable key={level} onPress={() => setDifficulty(level)} style={[styles.level, difficulty === level && styles.levelActive]}><Text style={[styles.levelTitle, difficulty === level && styles.levelTitleActive]}>{level[0].toUpperCase() + level.slice(1)}</Text><Text style={styles.mutedTiny}>{level === 'easy' ? 'Casual' : level === 'moderate' ? 'Thoughtful' : 'Challenging'}</Text></Pressable>)}</View>
            <Text style={styles.panelNote}>You play White. The computer plays Black. Works offline.</Text>
          </View>}
          <Pressable accessibilityRole="button" onPress={startGame} style={styles.primary}><Text style={styles.primaryText}>Start game  →</Text></Pressable>
          <Text style={styles.footnote}>No account or internet required.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const movePairs: { number: number; white: string; black: string }[] = [];
  for (let i = 0; i < history.length; i += 2) movePairs.push({ number: i / 2 + 1, white: history[i].san, black: history[i + 1]?.san ?? '' });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.gamePage} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logo}><Text style={styles.logoKnight}>♞</Text></View>
          <View style={styles.headerText}><Text style={styles.kickerSmall}>{mode === 'computer' ? `${difficulty.toUpperCase()} COMPUTER` : 'FRIENDLY MATCH'}</Text><Text style={styles.headerTitle}>Chess Arena</Text></View>
          <Pressable onPress={() => setScreen('setup')} style={styles.headerButton}><Text style={styles.headerButtonText}>New match</Text></Pressable>
        </View>

        <View style={styles.boardCard}>
          <View style={styles.playerRow}><View style={styles.blackAvatar}><Text style={styles.avatarGlyph}>♚</Text></View><View style={styles.playerText}><Text numberOfLines={1} style={styles.playerName}>{player('b')}</Text><Text style={styles.caption}>BLACK</Text></View>{game.turn() === 'b' && !status.ended && <Text style={styles.turnPill}>{thinking ? 'THINKING…' : 'TO MOVE'}</Text>}</View>
          <View style={[styles.board, { width: boardSize, height: boardSize }]}>
            {ranks.map((rank) => <View key={rank} style={styles.rankRow}>{files.map((file) => {
              const square = `${file}${rank}` as Square;
              const piece = game.get(square);
              const light = (FILES.indexOf(file) + rank) % 2 !== 0;
              const checkedKing = piece?.type === 'k' && piece.color === game.turn() && game.isCheck();
              const squareColor = selected === square ? '#b9ce8d' : checkedKing ? '#d87565' : light ? '#eeecdf' : '#718c75';
              return <Pressable key={square} accessibilityRole="button" accessibilityLabel={`${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}${legalTargets.has(square) ? ', legal move' : ''}`} onPress={() => pressSquare(square)} style={[styles.square, { backgroundColor: squareColor }]}>
                {(lastMove?.from === square || lastMove?.to === square) && <View pointerEvents="none" style={styles.lastMoveTint} />}
                {legalTargets.has(square) && <View pointerEvents="none" style={piece ? styles.captureRing : styles.moveDot} />}
                {piece && <Text style={[styles.piece, { fontSize: Math.floor(boardSize / 10.1), color: piece.color === 'w' ? '#fffdf5' : '#17201b' }]}>{PIECES[`${piece.color}${piece.type.toUpperCase()}`]}</Text>}
                {file === files[0] && <Text style={[styles.coordinate, { color: light ? '#617b65' : '#f5f1e4' }]}>{rank}</Text>}
                {rank === ranks[ranks.length - 1] && <Text style={[styles.fileCoordinate, { color: light ? '#617b65' : '#f5f1e4' }]}>{file}</Text>}
              </Pressable>;
            })}</View>)}
          </View>
          <View style={styles.playerRow}><View style={styles.whiteAvatar}><Text style={[styles.avatarGlyph, styles.whiteGlyph]}>♔</Text></View><View style={styles.playerText}><Text numberOfLines={1} style={styles.playerName}>{player('w')}</Text><Text style={styles.caption}>WHITE</Text></View>{game.turn() === 'w' && !status.ended && <Text style={styles.turnPill}>TO MOVE</Text>}</View>
        </View>

        <View style={styles.statusCard}><View style={[styles.statusMark, game.isCheck() && !status.ended && styles.checkMark]}><Text style={styles.statusMarkText}>{status.ended ? '✦' : game.isCheck() ? '!' : '↗'}</Text></View><View style={styles.statusCopy}><Text style={styles.statusTitle}>{thinking ? 'Computer is thinking' : status.title}</Text><Text style={styles.statusDetail}>{thinking ? 'Choosing a move…' : status.detail}</Text></View></View>
        <View style={styles.actions}><Pressable accessibilityRole="button" onPress={undo} disabled={!history.length || thinking} style={[styles.action, (!history.length || thinking) && styles.disabled]}><Text style={styles.actionText}>↶  Undo</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setFlipped((value) => !value)} style={styles.action}><Text style={styles.actionText}>⇅  Flip</Text></Pressable><Pressable accessibilityRole="button" onPress={startGame} style={styles.restart}><Text style={styles.restartText}>＋  Restart</Text></Pressable></View>
        <View style={styles.movesCard}><View style={styles.movesHeader}><Text style={styles.sectionTitle}>Moves</Text><Text style={styles.caption}>{history.length} PLIES</Text></View>{movePairs.length === 0 ? <Text style={styles.panelNote}>The opening move is yours.</Text> : movePairs.slice(-6).map((pair, index) => <View key={pair.number} style={[styles.moveRow, index % 2 === 1 && styles.alternateMove]}><Text style={styles.moveNumber}>{pair.number}.</Text><Text style={styles.moveSan}>{pair.white}</Text><Text style={styles.moveSan}>{pair.black}</Text></View>)}</View>
        <Text style={styles.footnote}>THINK AHEAD. ENJOY EVERY MOVE.</Text>
      </ScrollView>

      <Modal transparent animationType="fade" visible={promotion !== null} onRequestClose={() => setPromotion(null)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.cardTitle}>Promote your pawn</Text><Text style={styles.panelNote}>Choose a piece for {promotion?.color === 'w' ? 'White' : 'Black'}.</Text><View style={styles.promotionRow}>{PROMOTIONS.map((choice) => <Pressable key={choice.value} accessibilityRole="button" accessibilityLabel={`Promote to ${choice.label}`} onPress={() => promotion && makeMove(promotion.from, promotion.to, choice.value)} style={styles.promotionChoice}><Text style={styles.promotionGlyph}>{choice.icon}</Text><Text style={styles.mutedTiny}>{choice.label}</Text></Pressable>)}</View><Pressable onPress={() => setPromotion(null)} style={styles.cancel}><Text style={styles.headerButtonText}>Cancel</Text></Pressable></View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#101713' },
  centerPage: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 36 },
  setupPage: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  gamePage: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  heroMark: { width: 76, height: 76, borderRadius: 24, backgroundColor: '#d3efaa', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  heroKnight: { color: '#17221a', fontSize: 50, marginTop: -7 },
  kicker: { color: '#9bab9b', fontSize: 10, fontWeight: '900', letterSpacing: 2.4 },
  heroTitle: { color: '#f2f1e8', fontSize: 34, fontWeight: '900', marginTop: 6 },
  heroCopy: { color: '#98a69a', fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 300, marginTop: 10, marginBottom: 26 },
  card: { width: '100%', maxWidth: 400, padding: 18, borderRadius: 20, backgroundColor: '#19231c' },
  cardTitle: { color: '#f1f2eb', fontSize: 16, fontWeight: '800' },
  muted: { color: '#94a197', fontSize: 11, lineHeight: 16, marginTop: 5 },
  input: { height: 45, borderRadius: 11, borderWidth: 1, borderColor: '#344238', backgroundColor: '#121b15', color: '#f1f2eb', paddingHorizontal: 12, fontSize: 12, marginTop: 12 },
  error: { color: '#f29b82', fontSize: 11, marginTop: 7 },
  primary: { width: '100%', minHeight: 48, borderRadius: 13, backgroundColor: '#d3efaa', alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  primaryText: { color: '#1b281d', fontSize: 13, fontWeight: '900' },
  footnote: { color: '#748277', fontSize: 9, textAlign: 'center', marginTop: 17, letterSpacing: 1 },
  header: { width: '100%', maxWidth: 472, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logo: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#d3efaa', alignItems: 'center', justifyContent: 'center' },
  logoKnight: { color: '#17221a', fontSize: 29, marginTop: -4 },
  headerText: { flex: 1, marginLeft: 11 },
  kickerSmall: { color: '#91a092', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: '#f2f1e8', fontSize: 19, fontWeight: '900', marginTop: 2 },
  headerButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 11, backgroundColor: '#202c23' },
  headerButtonText: { color: '#d3efaa', fontSize: 10, fontWeight: '800' },
  heading: { width: '100%', maxWidth: 472, color: '#f1f2eb', fontSize: 24, fontWeight: '900', marginTop: 6 },
  subheading: { width: '100%', maxWidth: 472, color: '#95a297', fontSize: 12, marginTop: 5, marginBottom: 17 },
  option: { width: '100%', maxWidth: 472, minHeight: 73, flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8, borderRadius: 16, backgroundColor: '#19231c', borderWidth: 1, borderColor: '#19231c' },
  optionActive: { borderColor: '#78925d', backgroundColor: '#202d22' },
  optionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2c3c2d' },
  optionIconText: { color: '#d3efaa', fontSize: 20 },
  optionCopy: { flex: 1, marginLeft: 11 },
  optionTitle: { color: '#f0f1e9', fontSize: 13, fontWeight: '900' },
  radio: { color: '#d3efaa', fontSize: 19, paddingHorizontal: 4 },
  panel: { width: '100%', maxWidth: 472, padding: 13, marginBottom: 11, borderRadius: 15, backgroundColor: '#19231c' },
  label: { color: '#89978b', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  panelNote: { color: '#829084', fontSize: 10, lineHeight: 15, marginTop: 9 },
  levelRow: { flexDirection: 'row', gap: 7, marginTop: 9 },
  level: { flex: 1, minHeight: 53, justifyContent: 'center', alignItems: 'center', borderRadius: 11, backgroundColor: '#202c23', borderWidth: 1, borderColor: 'transparent' },
  levelActive: { backgroundColor: '#2b3a2c', borderColor: '#78925d' },
  levelTitle: { color: '#dce3d8', fontSize: 10, fontWeight: '900' },
  levelTitleActive: { color: '#d3efaa' },
  mutedTiny: { color: '#89978b', fontSize: 8, marginTop: 4 },
  boardCard: { width: '100%', maxWidth: 472, alignItems: 'center', backgroundColor: '#19231c', borderRadius: 22, paddingVertical: 9, paddingHorizontal: 10 },
  playerRow: { width: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3, paddingVertical: 7 },
  blackAvatar: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#39453b', alignItems: 'center', justifyContent: 'center' },
  whiteAvatar: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#e8e5d9', alignItems: 'center', justifyContent: 'center' },
  avatarGlyph: { color: '#eeeade', fontSize: 22, marginTop: -3 },
  whiteGlyph: { color: '#28352b' },
  playerText: { flex: 1, marginLeft: 9 },
  playerName: { color: '#f0f1e9', fontSize: 12, fontWeight: '800' },
  caption: { color: '#89978b', fontSize: 8, marginTop: 2, letterSpacing: 1 },
  turnPill: { color: '#c4e6a3', fontSize: 8, fontWeight: '900', letterSpacing: 0.5, backgroundColor: '#2c3c2d', borderRadius: 8, overflow: 'hidden', paddingVertical: 6, paddingHorizontal: 8 },
  board: { overflow: 'hidden', borderRadius: 6, marginVertical: 3, borderWidth: 2, borderColor: '#39483c' },
  rankRow: { flex: 1, flexDirection: 'row' },
  square: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  piece: { zIndex: 2, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  lastMoveTint: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(230, 205, 91, .27)' },
  moveDot: { position: 'absolute', width: '27%', height: '27%', borderRadius: 50, backgroundColor: 'rgba(31, 52, 33, .3)', zIndex: 1 },
  captureRing: { position: 'absolute', width: '88%', height: '88%', borderWidth: 4, borderColor: 'rgba(31, 52, 33, .32)', borderRadius: 50, zIndex: 1 },
  coordinate: { position: 'absolute', top: 2, left: 3, fontSize: 8, fontWeight: '900' },
  fileCoordinate: { position: 'absolute', bottom: 1, right: 3, fontSize: 8, fontWeight: '900' },
  statusCard: { width: '100%', maxWidth: 472, flexDirection: 'row', alignItems: 'center', marginTop: 11, padding: 12, borderRadius: 15, backgroundColor: '#19231c' },
  statusMark: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2c3c2d' },
  checkMark: { backgroundColor: '#49332e' },
  statusMarkText: { color: '#c4e6a3', fontSize: 18, fontWeight: '900' },
  statusCopy: { flex: 1, marginLeft: 10 },
  statusTitle: { color: '#eff1e9', fontSize: 12, fontWeight: '800' },
  statusDetail: { color: '#92a092', fontSize: 10, marginTop: 3 },
  actions: { width: '100%', maxWidth: 472, flexDirection: 'row', gap: 8, marginTop: 9 },
  action: { flex: 1, minHeight: 43, borderRadius: 12, backgroundColor: '#202c23', alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#d3ddce', fontSize: 10, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  restart: { flex: 1.25, minHeight: 43, borderRadius: 12, backgroundColor: '#d3efaa', alignItems: 'center', justifyContent: 'center' },
  restartText: { color: '#1b281d', fontSize: 10, fontWeight: '900' },
  movesCard: { width: '100%', maxWidth: 472, marginTop: 11, padding: 13, borderRadius: 16, backgroundColor: '#19231c' },
  movesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  sectionTitle: { color: '#eef0e8', fontSize: 12, fontWeight: '800' },
  moveRow: { minHeight: 29, flexDirection: 'row', alignItems: 'center', borderRadius: 7, paddingHorizontal: 8 },
  alternateMove: { backgroundColor: '#202c23' },
  moveNumber: { width: 38, color: '#839186', fontSize: 10 },
  moveSan: { flex: 1, color: '#e0e5da', fontSize: 10, fontWeight: '700' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,.7)' },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: 21, padding: 19, backgroundColor: '#19231c', borderWidth: 1, borderColor: '#344238' },
  promotionRow: { flexDirection: 'row', gap: 7, marginTop: 17 },
  promotionChoice: { flex: 1, minHeight: 70, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#263329' },
  promotionGlyph: { color: '#f0eee3', fontSize: 25 },
  cancel: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
});
