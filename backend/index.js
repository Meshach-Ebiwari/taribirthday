require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('./lib/cloudinary');
const sql = require('./lib/db');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://192.168.0.106:3000';
const PORT = process.env.PORT || 4000;
const HOST_PIN = process.env.HOST_PIN || 'PARTY2026';

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ─── Game State ───────────────────────────────────────────────────────────────
let gameState = {
  phase: 'idle',        // 'idle' | 'lobby' | 'playing' | 'reveal' | 'ended'
  questions: [],
  currentIndex: -1,
  timeLeft: 30,
  timerInterval: null,
  revealTimeout: null,
  players: {},          // { [socketId]: { sessionId, firstName, lastName, score, answeredCurrent } }
  answers: {},
  hostSocketId: null,
  roundNumber: 0,
};

// Persists across rounds — only cleared manually or when exhausted
const usedQuestionIds = new Set();

// ─── Game Helpers ─────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeAnswer(str) {
  return str.toUpperCase().trim().replace(/\s+/g, '');
}

function getPublicPlayers() {
  return Object.entries(gameState.players)
    .map(([sid, p]) => ({
      socketId: sid,
      firstName: p.firstName,
      lastName: p.lastName,
      score: p.score,
    }))
    .sort((a, b) => b.score - a.score);
}

function getPublicQuestion(q) {
  return { id: q.id, elements: q.elements }; // NO answer field
}

function getPoolStatus() {
  const PUZZLES = require('./data/puzzles');
  return { remaining: PUZZLES.length - usedQuestionIds.size, total: PUZZLES.length };
}

function resetGameState() {
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  if (gameState.revealTimeout) clearTimeout(gameState.revealTimeout);
  gameState.phase = 'lobby';
  gameState.questions = [];
  gameState.currentIndex = -1;
  gameState.timeLeft = 30;
  gameState.timerInterval = null;
  gameState.revealTimeout = null;
  gameState.answers = {};
  gameState.roundNumber += 1;
  // Keep players connected but reset scores
  Object.keys(gameState.players).forEach((sid) => {
    gameState.players[sid].score = 0;
    gameState.players[sid].answeredCurrent = false;
  });
}

function revealQuestion() {
  gameState.phase = 'reveal';
  const q = gameState.questions[gameState.currentIndex];
  const correctAnswer = normalizeAnswer(q.answer);

  const correctSockets = Object.entries(gameState.answers)
    .filter(([, ans]) => normalizeAnswer(ans) === correctAnswer)
    .map(([sid]) => sid);

  // Award points
  correctSockets.forEach((sid) => {
    if (gameState.players[sid]) {
      gameState.players[sid].score += 100;
    }
  });

  io.emit('game:reveal', {
    correctAnswer: q.answer,
    correctSocketIds: correctSockets,
    scores: getPublicPlayers(),
  });

  // After 4 seconds, move to next or end
  gameState.revealTimeout = setTimeout(() => {
    const nextIndex = gameState.currentIndex + 1;
    if (nextIndex < gameState.questions.length) {
      startQuestion(nextIndex);
    } else {
      endGame();
    }
  }, 4000);
}

function startQuestion(index) {
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  gameState.currentIndex = index;
  gameState.phase = 'playing';
  gameState.timeLeft = 30;
  gameState.answers = {};
  Object.keys(gameState.players).forEach((sid) => {
    gameState.players[sid].answeredCurrent = false;
  });

  const q = gameState.questions[index];
  io.emit('game:question', {
    question: getPublicQuestion(q),
    index,
    total: gameState.questions.length,
    timeLeft: 30,
  });

  gameState.timerInterval = setInterval(() => {
    gameState.timeLeft -= 1;
    io.emit('game:tick', { timeLeft: gameState.timeLeft });

    if (gameState.timeLeft <= 0) {
      clearInterval(gameState.timerInterval);
      gameState.timerInterval = null;
      revealQuestion();
    }
  }, 1000);
}

function endGame() {
  gameState.phase = 'ended';
  io.emit('game:end', { scores: getPublicPlayers() });
}

// ─── Socket.io Events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

  // Join game
  socket.on('game:join', ({ sessionId, firstName, lastName }) => {
    gameState.players[socket.id] = {
      sessionId,
      firstName,
      lastName,
      score: 0,
      answeredCurrent: false,
    };
    io.emit('game:players', getPublicPlayers());
    // Send current state to this new joiner
    socket.emit('game:phase', { phase: gameState.phase });
    if (gameState.phase === 'playing' && gameState.currentIndex >= 0) {
      const q = gameState.questions[gameState.currentIndex];
      socket.emit('game:question', {
        question: getPublicQuestion(q),
        index: gameState.currentIndex,
        total: gameState.questions.length,
        timeLeft: gameState.timeLeft,
      });
    }
    if (gameState.phase === 'ended') {
      socket.emit('game:end', { scores: getPublicPlayers() });
    }
  });

  // Host auth
  socket.on('game:auth', ({ pin }) => {
    if (pin === HOST_PIN) {
      gameState.hostSocketId = socket.id;
      socket.emit('game:auth_result', { success: true });
      // Send current state immediately so host sees players who already joined
      socket.emit('game:players', getPublicPlayers());
      socket.emit('game:phase', { phase: gameState.phase });
      socket.emit('game:round', { round: gameState.roundNumber });
      socket.emit('game:pool_status', getPoolStatus());
    } else {
      socket.emit('game:auth_result', { success: false });
    }
  });

  // Host starts game
  socket.on('game:start', ({ questionCount }) => {
    if (socket.id !== gameState.hostSocketId) return;
    const PUZZLES = require('./data/puzzles');
    const count = Math.min(questionCount || 10, PUZZLES.length);

    resetGameState();

    // Pick from unused questions; auto-reset pool if not enough remain
    let unused = PUZZLES.filter((p) => !usedQuestionIds.has(p.id));
    if (unused.length < count) {
      usedQuestionIds.clear();
      unused = [...PUZZLES];
    }
    const selected = shuffle(unused).slice(0, count);
    selected.forEach((p) => usedQuestionIds.add(p.id));
    gameState.questions = selected;

    io.emit('game:phase', { phase: 'lobby' });
    io.emit('game:round', { round: gameState.roundNumber });
    io.emit('game:pool_status', getPoolStatus());

    // 3-second countdown then start
    let cd = 3;
    io.emit('game:countdown', { count: cd });
    const cdInterval = setInterval(() => {
      cd -= 1;
      if (cd > 0) {
        io.emit('game:countdown', { count: cd });
      } else {
        clearInterval(cdInterval);
        startQuestion(0);
      }
    }, 1000);
  });

  // Guest submits answer
  socket.on('game:answer', ({ answer }) => {
    if (gameState.phase !== 'playing') return;
    if (!gameState.players[socket.id]) return;
    if (gameState.players[socket.id].answeredCurrent) return; // already answered

    gameState.players[socket.id].answeredCurrent = true;
    gameState.answers[socket.id] = answer;

    // Tell everyone how many have answered
    const answeredCount = Object.values(gameState.players).filter(
      (p) => p.answeredCurrent
    ).length;
    const totalCount = Object.keys(gameState.players).length;
    io.emit('game:answer_count', { answered: answeredCount, total: totalCount });

    // Tell this socket if their answer was correct (they'll see full reveal soon anyway)
    const correct =
      normalizeAnswer(answer) ===
      normalizeAnswer(gameState.questions[gameState.currentIndex].answer);
    socket.emit('game:answer_ack', { correct, locked: true });
  });

  // Host reset (Play Again) — keeps players connected, transitions everyone to lobby
  socket.on('game:reset', () => {
    if (socket.id !== gameState.hostSocketId) return;
    resetGameState();
    io.emit('game:phase', { phase: 'lobby' });
    io.emit('game:round', { round: gameState.roundNumber });
    io.emit('game:players', getPublicPlayers());
    io.emit('game:pool_status', getPoolStatus());
  });

  // Host manually resets the question pool
  socket.on('game:reset_pool', () => {
    if (socket.id !== gameState.hostSocketId) return;
    usedQuestionIds.clear();
    socket.emit('game:pool_status', getPoolStatus());
  });

  // On disconnect: remove from players
  socket.on('disconnect', () => {
    console.log(`[socket] client disconnected: ${socket.id}`);
    delete gameState.players[socket.id];
    io.emit('game:players', getPublicPlayers());
    if (gameState.hostSocketId === socket.id) gameState.hostSocketId = null;
  });

  // Existing photo:new listener (re-emit on upload via REST)
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// ─── Multer (memory storage) ──────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
});

// ─── Helper: stream buffer to Cloudinary ─────────────────────────────────────
function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Upload photo or video
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { firstName, lastName } = req.body;
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'firstName and lastName are required' });
    }

    const isVideo = req.file.mimetype.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
      folder: 'birthday-event',
      resource_type: resourceType,
      // Generate a thumbnail for videos
      ...(isVideo && {
        eager: [{ format: 'jpg', transformation: [{ width: 400, crop: 'scale' }] }],
        eager_async: false,
      }),
    });

    const thumbnailUrl = isVideo
      ? (cloudinaryResult.eager && cloudinaryResult.eager[0]?.secure_url) || null
      : cloudinary.url(cloudinaryResult.public_id, {
          width: 400,
          crop: 'scale',
          fetch_format: 'auto',
          quality: 'auto',
        });

    // Save to Neon database
    const rows = await sql`
      INSERT INTO photos (
        cloudinary_url,
        cloudinary_public_id,
        thumbnail_url,
        resource_type,
        guest_first_name,
        guest_last_name,
        width,
        height,
        duration
      ) VALUES (
        ${cloudinaryResult.secure_url},
        ${cloudinaryResult.public_id},
        ${thumbnailUrl},
        ${resourceType},
        ${firstName.trim()},
        ${lastName.trim()},
        ${cloudinaryResult.width || null},
        ${cloudinaryResult.height || null},
        ${cloudinaryResult.duration || null}
      )
      RETURNING *
    `;

    const photo = rows[0];

    // Emit real-time event to all connected clients
    io.emit('photo:new', photo);

    console.log(
      `[upload] ${resourceType} uploaded by ${firstName} ${lastName}: ${cloudinaryResult.public_id}`
    );

    return res.status(201).json(photo);
  } catch (error) {
    console.error('[upload] error:', error);
    return res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Get all photos
app.get('/api/photos', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT * FROM photos
      ORDER BY created_at DESC
    `;
    return res.json(rows);
  } catch (error) {
    console.error('[photos] error:', error);
    return res.status(500).json({ error: 'Failed to fetch photos', details: error.message });
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[server] Birthday backend running on port ${PORT}`);
  console.log(`[server] CORS origin: ${CLIENT_URL}`);
  console.log(`[server] Host PIN: ${HOST_PIN}`);
});
