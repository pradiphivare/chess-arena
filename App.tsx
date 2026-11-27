import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
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
  return { title: game.isCheck() ? `${side} is in check` : `${side} to move`, detail: game.isCheck() ? 'Find a safe square for your king.' : 'Tap a piece, then a highlighted square.', ended: false };
}

// Search scores are positive for Black and negative for White.
function evaluate(game: Chess): number {
  if (game.isCheckmate()) return game.turn() === 'b' ? 100000 : -100000;
  if (game.isDraw()) return 0;
  let score = 0;
  for (const row of game.board()) for (const piece of row) if (piece) score += (piece.color === 'b' ? 1 : -1) * VALUES[piece.type];
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
    if (score > bestScore) { bestScore = score; choices = [move]; }
    else if (score === bestScore) choices.push(move);
  }
  return choices[Math.floor(Math.random() * choices.length)];
}

export default function App() {
  const { width, height } = useWindowDimensions();
  const boardSize = Math.max(180, Math.min(width - 28, height - 238, 560));
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
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [movesVisible, setMovesVisible] = useState(false);

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
    setGame(new Chess()); setSelected(null); setFlipped(false); setPromotion(null); setMovesVisible(false); setScreen('game');
  }

  function makeMove(from: Square, to: Square, promote: Promotion = 'q') {
    const next = new Chess(game.fen());
    try { next.move({ from, to, promotion: promote }); setGame(next); }
    finally { setSelected(null); setPromotion(null); }
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
    setGame(next); setSelected(null); setPromotion(null);
  }

  function startWithName() {
    const name = nameDraft.trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!name) { setNameError('Please enter your name to continue.'); return; }
    setPlayerName(name); setNameError(''); setScreen('setup');
  }

  function player(color: 'w' | 'b') {
    if (mode === 'computer') return color === 'w' ? playerName : 'Chess Bot';
    return color === 'w' ? playerName : friendName.trim() || 'Friend';
  }

  const movePairs: { number: number; white: string; black: string }[] = [];
  for (let i = 0; i < history.length; i += 2) movePairs.push({ number: i / 2 + 1, white: history[i].san, black: history[i + 1]?.san ?? '' });

  if (screen === 'login') return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.centerPage} keyboardShouldPersistTaps="handled">
        <View style={styles.heroMark}><Text style={styles.heroKnight}>♞</Text></View>
        <Text style={styles.kicker}>WELCOME TO</Text><Text style={styles.heroTitle}>Chess Arena</Text>
        <Text style={styles.heroCopy}>A little focus. A little strategy. Your next great game starts here.</Text>
        <View style={styles.card}><Text style={styles.cardTitle}>What should we call you?</Text><Text style={styles.muted}>Choose a name to show on your side of the board.</Text>
          <TextInput accessibilityLabel="Your player name" autoCapitalize="words" autoCorrect={false} maxLength={20} onChangeText={(text) => { setNameDraft(text); setNameError(''); }} onSubmitEditing={startWithName} placeholder="Your name" placeholderTextColor="#748277" returnKeyType="go" style={styles.input} value={nameDraft} />
          {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
          <Pressable accessibilityRole="button" onPress={startWithName} style={styles.primary}><Text style={styles.primaryText}>Continue  →</Text></Pressable>
        </View>
        <Text style={styles.footnote}>Local profile · no password or account needed</Text>
      </ScrollView>
    </SafeAreaView>
  );

  if (screen === 'setup') return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.setupPage} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><View style={styles.logo}><Text style={styles.logoKnight}>♞</Text></View><View style={styles.headerText}><Text style={styles.kickerSmall}>READY TO PLAY</Text><Text style={styles.headerTitle}>Hi, {playerName}!</Text></View>
          <Pressable onPress={() => setScreen('login')} style={styles.headerButton}><Text style={styles.headerButtonText}>Edit name</Text></Pressable></View>
        <Text style={styles.heading}>Choose your opponent</Text><Text style={styles.subheading}>Play a friend on this device or challenge the computer.</Text>
        <Pressable accessibilityRole="button" onPress={() => setMode('friends')} style={[styles.option, mode === 'friends' && styles.optionActive]}><View style={styles.optionIcon}><Text style={styles.optionIconText}>♟♙</Text></View><View style={styles.optionCopy}><Text style={styles.optionTitle}>Play with a friend</Text><Text style={styles.muted}>Take turns and pass the phone.</Text></View><Text style={styles.radio}>{mode === 'friends' ? '●' : '○'}</Text></Pressable>
        {mode === 'friends' && <View style={styles.panel}><Text style={styles.label}>FRIEND'S NAME (OPTIONAL)</Text><TextInput accessibilityLabel="Friend's name" autoCapitalize="words" maxLength={20} onChangeText={setFriendName} placeholder="Friend" placeholderTextColor="#748277" style={styles.input} value={friendName === 'Friend' ? '' : friendName} /></View>}
        <Pressable accessibilityRole="button" onPress={() => setMode('computer')} style={[styles.option, mode === 'computer' && styles.optionActive]}><View style={styles.optionIcon}><Text style={styles.optionIconText}>♞</Text></View><View style={styles.optionCopy}><Text style={styles.optionTitle}>Play with computer</Text><Text style={styles.muted}>Choose a level and test your skills.</Text></View><Text style={styles.radio}>{mode === 'computer' ? '●' : '○'}</Text></Pressable>
        {mode === 'computer' && <View style={styles.panel}><Text style={styles.label}>DIFFICULTY</Text><View style={styles.levelRow}>{(['easy', 'moderate', 'hard'] as Difficulty[]).map((level) => <Pressable key={level} onPress={() => setDifficulty(level)} style={[styles.level, difficulty === level && styles.levelActive]}><Text style={[styles.levelTitle, difficulty === level && styles.levelTitleActive]}>{level.toUpperCase()}</Text><Text style={styles.mutedTiny}>{level === 'easy' ? 'Casual' : level === 'moderate' ? 'Balanced' : 'Challenging'}</Text></Pressable>)}</View><Text style={styles.panelNote}>You play White. The computer plays Black. Works offline.</Text></View>}
        <Pressable accessibilityRole="button" onPress={startGame} style={styles.primary}><Text style={styles.primaryText}>Start game  →</Text></Pressable><Text style={styles.footnote}>No account or internet required.</Text>
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <View style={styles.fullGame}>
      <StatusBar hidden />
      <SafeAreaView style={styles.gameSafe}>
        <View style={styles.gamePage}>
          <View style={styles.gameTop}><View style={styles.gameBrand}><View style={styles.miniLogo}><Text style={styles.miniLogoText}>♞</Text></View><View><Text style={styles.kickerSmall}>CHESS ARENA</Text><Text style={styles.gameMode}>{mode === 'computer' ? `${difficulty.toUpperCase()} MATCH` : 'LOCAL MATCH'}</Text></View></View>
            <Pressable accessibilityLabel="Game settings" accessibilityRole="button" onPress={() => setSettingsVisible(true)} style={styles.iconButton}><Text style={styles.iconButtonText}>☰</Text></Pressable></View>
          <View style={styles.playerBar}><View style={styles.avatarBlack}><Text style={styles.avatarGlyph}>♚</Text></View><View style={styles.playerText}><Text numberOfLines={1} style={styles.playerName}>{player('b')}</Text><Text style={styles.caption}>{thinking ? 'THINKING…' : 'BLACK'}</Text></View><Text style={styles.playerScore}>{game.isCheck() && game.turn() === 'b' ? 'CHECK' : '♟'}</Text></View>
          <View style={styles.boardStage}><View style={[styles.board, { width: boardSize, height: boardSize }]}>
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
          </View></View>
          <View style={styles.playerBar}><View style={styles.avatarWhite}><Text style={[styles.avatarGlyph, styles.whiteGlyph]}>♔</Text></View><View style={styles.playerText}><Text numberOfLines={1} style={styles.playerName}>{player('w')} (You)</Text><Text style={styles.caption}>WHITE</Text></View><Text style={styles.playerScore}>{game.isCheck() && game.turn() === 'w' ? 'CHECK' : '♙'}</Text></View>
          <View style={styles.bottomPanel}><View style={styles.turnStatus}><View style={[styles.statusDot, game.isCheck() && !status.ended && styles.checkDot]} /><View style={styles.statusCopy}><Text style={styles.statusTitle}>{thinking ? 'Chess Bot is thinking' : status.title}</Text><Text numberOfLines={1} style={styles.statusDetail}>{status.ended ? status.detail : thinking ? 'Planning its next move…' : status.detail}</Text></View><Text style={styles.moveCount}>{Math.ceil(history.length / 2)} MOVES</Text></View>
            <View style={styles.gameActions}><Pressable accessibilityRole="button" onPress={undo} disabled={!history.length || thinking} style={[styles.action, (!history.length || thinking) && styles.disabled]}><Text style={styles.actionText}>↶  Undo</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setMovesVisible(true)} style={styles.action}><Text style={styles.actionText}>☷  Moves</Text></Pressable><Pressable accessibilityRole="button" onPress={startGame} style={styles.restart}><Text style={styles.restartText}>New game</Text></Pressable></View></View>
        </View>
      </SafeAreaView>
      <Modal transparent animationType="fade" visible={settingsVisible} onRequestClose={() => setSettingsVisible(false)}><Pressable style={styles.modalBackdrop} onPress={() => setSettingsVisible(false)}><Pressable style={styles.modalCard} onPress={() => undefined}><View style={styles.modalHeading}><Text style={styles.modalTitle}>Game settings</Text><Pressable accessibilityLabel="Close settings" onPress={() => setSettingsVisible(false)}><Text style={styles.closeText}>✕</Text></Pressable></View><Text style={styles.panelNote}>Quick controls for your match.</Text>
        <Pressable style={styles.settingRow} onPress={() => setFlipped((value) => !value)}><Text style={styles.settingIcon}>⇅</Text><View style={styles.settingCopy}><Text style={styles.settingTitle}>Flip board</Text><Text style={styles.settingNote}>Change which side is at the bottom</Text></View><Text style={styles.settingValue}>{flipped ? 'ON' : 'OFF'}</Text></Pressable>
        <Pressable style={styles.settingRow} onPress={() => { setSettingsVisible(false); setMovesVisible(true); }}><Text style={styles.settingIcon}>☷</Text><View style={styles.settingCopy}><Text style={styles.settingTitle}>Move history</Text><Text style={styles.settingNote}>{history.length} half-moves played</Text></View><Text style={styles.settingValue}>OPEN</Text></Pressable>
        <Pressable style={styles.settingRow} onPress={() => { setSettingsVisible(false); setScreen('setup'); }}><Text style={styles.settingIcon}>⚑</Text><View style={styles.settingCopy}><Text style={styles.settingTitle}>Change opponent</Text><Text style={styles.settingNote}>Return to match setup</Text></View><Text style={styles.settingValue}>OPEN</Text></Pressable>
      </Pressable></Pressable></Modal>
      <Modal transparent animationType="slide" visible={movesVisible} onRequestClose={() => setMovesVisible(false)}><Pressable style={styles.modalBackdrop} onPress={() => setMovesVisible(false)}><Pressable style={styles.movesModal} onPress={() => undefined}><View style={styles.modalHeading}><Text style={styles.modalTitle}>Move history</Text><Pressable accessibilityLabel="Close move history" onPress={() => setMovesVisible(false)}><Text style={styles.closeText}>✕</Text></Pressable></View>{movePairs.length ? <ScrollView style={styles.moveList}>{movePairs.map((pair) => <View key={pair.number} style={[styles.moveRow, pair.number % 2 === 0 && styles.alternateMove]}><Text style={styles.moveNumber}>{pair.number}.</Text><Text style={styles.moveSan}>{pair.white}</Text><Text style={styles.moveSan}>{pair.black}</Text></View>)}</ScrollView> : <Text style={styles.panelNote}>Your moves will appear here as you play.</Text>}</Pressable></Pressable></Modal>
      <Modal transparent animationType="fade" visible={promotion !== null} onRequestClose={() => setPromotion(null)}><View style={styles.modalBackdrop}><View style={styles.promotionModal}><Text style={styles.modalTitle}>Promote your pawn</Text><Text style={styles.panelNote}>Choose a piece for {promotion?.color === 'w' ? 'White' : 'Black'}.</Text><View style={styles.promotionRow}>{PROMOTIONS.map((choice) => <Pressable key={choice.value} accessibilityLabel={choice.label} onPress={() => promotion && makeMove(promotion.from, promotion.to, choice.value)} style={styles.promotionChoice}><Text style={[styles.promotionGlyph, { color: promotion?.color === 'w' ? '#f0eee3' : '#17201b' }]}>{choice.icon}</Text><Text style={styles.mutedTiny}>{choice.label}</Text></Pressable>)}</View><Pressable onPress={() => setPromotion(null)} style={styles.cancel}><Text style={styles.headerButtonText}>Cancel</Text></Pressable></View></View></Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#101713' },
  centerPage: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 36 },
  setupPage: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
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
  option: { width: '100%', maxWidth: 472, minHeight: 73, flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8, borderRadius: 16, backgroundColor: '#19231c', borderWidth: 1, borderColor: 'transparent' },
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
  fullGame: { flex: 1, backgroundColor: '#101713' },
  gameSafe: { flex: 1, backgroundColor: '#101713' },
  gamePage: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 4, paddingBottom: 8 },
  gameTop: { width: '100%', maxWidth: 560, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gameBrand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  miniLogo: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#d3efaa', alignItems: 'center', justifyContent: 'center' },
  miniLogoText: { color: '#17221a', fontSize: 23, marginTop: -3 },
  gameMode: { color: '#f2f1e8', fontSize: 12, fontWeight: '900', marginTop: 2 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#202c23', borderWidth: 1, borderColor: '#344238' },
  iconButtonText: { color: '#d3efaa', fontSize: 20, fontWeight: '800' },
  playerBar: { width: '100%', maxWidth: 560, minHeight: 47, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  avatarBlack: { width: 35, height: 35, borderRadius: 12, backgroundColor: '#39453b', alignItems: 'center', justifyContent: 'center' },
  avatarWhite: { width: 35, height: 35, borderRadius: 12, backgroundColor: '#e8e5d9', alignItems: 'center', justifyContent: 'center' },
  avatarGlyph: { color: '#eeeade', fontSize: 23, marginTop: -3 },
  whiteGlyph: { color: '#28352b' },
  playerText: { flex: 1, marginLeft: 10 },
  playerName: { color: '#f0f1e9', fontSize: 12, fontWeight: '800' },
  caption: { color: '#89978b', fontSize: 8, marginTop: 2, letterSpacing: 1 },
  playerScore: { color: '#c4e6a3', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  boardStage: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  board: { overflow: 'hidden', borderRadius: 7, borderWidth: 2, borderColor: '#39483c', backgroundColor: '#718c75' },
  rankRow: { flex: 1, flexDirection: 'row' },
  square: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  piece: { zIndex: 2, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  lastMoveTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(230, 205, 91, .27)' },
  moveDot: { position: 'absolute', width: '27%', height: '27%', borderRadius: 50, backgroundColor: 'rgba(31, 52, 33, .3)', zIndex: 1 },
  captureRing: { position: 'absolute', width: '88%', height: '88%', borderWidth: 4, borderColor: 'rgba(31, 52, 33, .32)', borderRadius: 50, zIndex: 1 },
  coordinate: { position: 'absolute', top: 2, left: 3, fontSize: 8, fontWeight: '900' },
  fileCoordinate: { position: 'absolute', bottom: 1, right: 3, fontSize: 8, fontWeight: '900' },
  bottomPanel: { width: '100%', maxWidth: 560, paddingTop: 5 },
  turnStatus: { minHeight: 43, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderRadius: 13, backgroundColor: '#19231c' },
  statusDot: { width: 9, height: 9, borderRadius: 9, backgroundColor: '#c4e6a3' },
  checkDot: { backgroundColor: '#f29b82' },
  statusCopy: { flex: 1, marginLeft: 9 },
  statusTitle: { color: '#eff1e9', fontSize: 11, fontWeight: '800' },
  statusDetail: { color: '#92a092', fontSize: 9, marginTop: 2 },
  moveCount: { color: '#89978b', fontSize: 8, fontWeight: '900', letterSpacing: .6 },
  gameActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  action: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: '#202c23', alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#d3ddce', fontSize: 10, fontWeight: '800' },
  disabled: { opacity: .4 },
  restart: { flex: 1.2, minHeight: 42, borderRadius: 12, backgroundColor: '#d3efaa', alignItems: 'center', justifyContent: 'center' },
  restartText: { color: '#1b281d', fontSize: 10, fontWeight: '900' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,.72)' },
  modalCard: { width: '100%', maxWidth: 380, borderRadius: 21, padding: 19, backgroundColor: '#19231c', borderWidth: 1, borderColor: '#344238' },
  modalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: '#f1f2eb', fontSize: 17, fontWeight: '900' },
  closeText: { color: '#9bab9b', fontSize: 18, paddingHorizontal: 5 },
  settingRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#2b392f' },
  settingIcon: { width: 38, color: '#d3efaa', fontSize: 22 },
  settingCopy: { flex: 1 },
  settingTitle: { color: '#eef1e8', fontSize: 12, fontWeight: '800' },
  settingNote: { color: '#89978b', fontSize: 9, marginTop: 4 },
  settingValue: { color: '#c4e6a3', fontSize: 8, fontWeight: '900', letterSpacing: .6 },
  movesModal: { width: '100%', maxWidth: 380, maxHeight: '75%', borderRadius: 21, padding: 19, backgroundColor: '#19231c', borderWidth: 1, borderColor: '#344238' },
  moveList: { marginTop: 12 },
  moveRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', borderRadius: 7, paddingHorizontal: 8 },
  alternateMove: { backgroundColor: '#202c23' },
  moveNumber: { width: 38, color: '#839186', fontSize: 10 },
  moveSan: { flex: 1, color: '#e0e5da', fontSize: 10, fontWeight: '700' },
  promotionModal: { width: '100%', maxWidth: 360, borderRadius: 21, padding: 19, backgroundColor: '#19231c', borderWidth: 1, borderColor: '#344238' },
  promotionRow: { flexDirection: 'row', gap: 7, marginTop: 17 },
  promotionChoice: { flex: 1, minHeight: 70, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#263329' },
  promotionGlyph: { fontSize: 25 },
  cancel: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
});
