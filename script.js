const boardEl = document.getElementById('board');
const turnText = document.getElementById('turnText');
const scoreXEl = document.getElementById('scoreX');
const scoreOEl = document.getElementById('scoreO');
const scoreDrawEl = document.getElementById('scoreDraw');
const restartBtn = document.getElementById('restartBtn');
const newMatchBtn = document.getElementById('newMatchBtn');
const toastEl = document.getElementById('toast');
const modeSelect = document.getElementById('modeSelect');
const themeSelect = document.getElementById('themeSelect');

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const STORAGE_KEY = 'neon-ttt-state-v2';

let cells = Array(9).fill('');
let turn = 'X';
let gameOver = false;
let mode = 'pvp';
let theme = 'neon';
let scores = { X: 0, O: 0, draw: 0 };

const audio = {
  move: createTone(520, 0.06),
  win: createTone(780, 0.15),
  draw: createTone(220, 0.15),
};

function createTone(freq, duration) {
  return () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'triangle';
    gain.gain.value = 0.02;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, duration * 1000);
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ scores, mode, theme }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const data = JSON.parse(raw);
  scores = data.scores || scores;
  mode = data.mode || mode;
  theme = data.theme || theme;
}

function renderBoard(highlight = [], lastMove = -1) {
  boardEl.innerHTML = '';
  cells.forEach((value, index) => {
    const btn = document.createElement('button');
    const pop = index === lastMove ? 'pop' : '';
    btn.className = `cell ${value ? value.toLowerCase() : ''} ${highlight.includes(index) ? 'win' : ''} ${pop}`;
    btn.textContent = value;
    btn.disabled = gameOver || Boolean(value) || (mode === 'ai' && turn === 'O');
    btn.addEventListener('click', () => play(index));
    boardEl.appendChild(btn);
  });

  turnText.textContent = gameOver ? 'Round finished' : `Turn: ${turn}`;
  if (mode === 'ai' && !gameOver && turn === 'O') turnText.textContent = 'AI is thinking...';
  scoreXEl.textContent = scores.X;
  scoreOEl.textContent = scores.O;
  scoreDrawEl.textContent = scores.draw;
}

function findWin(board = cells) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) return { winner: board[a], line };
  }
  return null;
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => toastEl.classList.remove('show'), 1500);
}

function minimax(board, currentTurn) {
  const result = findWin(board);
  if (result?.winner === 'O') return { score: 1 };
  if (result?.winner === 'X') return { score: -1 };
  if (board.every(Boolean)) return { score: 0 };

  const moves = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i]) continue;
    board[i] = currentTurn;
    const evalResult = minimax(board, currentTurn === 'O' ? 'X' : 'O');
    moves.push({ index: i, score: evalResult.score });
    board[i] = '';
  }

  if (currentTurn === 'O') {
    return moves.reduce((best, move) => move.score > best.score ? move : best, { score: -Infinity });
  }
  return moves.reduce((best, move) => move.score < best.score ? move : best, { score: Infinity });
}

function checkRoundEnd(lastMove) {
  const winData = findWin();
  if (winData) {
    gameOver = true;
    scores[winData.winner] += 1;
    renderBoard(winData.line, lastMove);
    showToast(`Player ${winData.winner} wins!`);
    audio.win();
    saveState();
    return true;
  }
  if (cells.every(Boolean)) {
    gameOver = true;
    scores.draw += 1;
    renderBoard([], lastMove);
    showToast('Draw! No winners this round.');
    audio.draw();
    saveState();
    return true;
  }
  return false;
}

function aiMove() {
  if (gameOver || mode !== 'ai' || turn !== 'O') return;
  const best = minimax([...cells], 'O');
  if (best.index === undefined) return;
  cells[best.index] = 'O';
  audio.move();
  if (!checkRoundEnd(best.index)) {
    turn = 'X';
    renderBoard([], best.index);
  }
}

function play(index) {
  if (gameOver || cells[index] || (mode === 'ai' && turn === 'O')) return;
  cells[index] = turn;
  audio.move();

  if (checkRoundEnd(index)) return;

  turn = turn === 'X' ? 'O' : 'X';
  renderBoard([], index);

  if (mode === 'ai' && turn === 'O') setTimeout(aiMove, 280);
}

function restartRound() {
  cells = Array(9).fill('');
  turn = 'X';
  gameOver = false;
  renderBoard();
}

function newMatch() {
  scores = { X: 0, O: 0, draw: 0 };
  restartRound();
  saveState();
  showToast('New match started');
}

modeSelect.addEventListener('change', (e) => {
  mode = e.target.value;
  restartRound();
  saveState();
  showToast(mode === 'ai' ? 'Mode: Player vs AI' : 'Mode: Player vs Player');
});

themeSelect.addEventListener('change', (e) => {
  theme = e.target.value;
  document.body.dataset.theme = theme;
  saveState();
});

restartBtn.addEventListener('click', restartRound);
newMatchBtn.addEventListener('click', newMatch);

loadState();
modeSelect.value = mode;
themeSelect.value = theme;
document.body.dataset.theme = theme;
renderBoard();
