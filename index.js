// index.js (Neon/Postgres + routed login → upload → main)
// -------------------------------------------------------
require('dotenv').config();

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

/* -------------------- DB: Neon Postgres -------------------- */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires SSL; this works locally and on Render:
  ssl: { rejectUnauthorized: false },
});

async function ensureSchema() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  await pool.query(sql);
}

/* -------------------- Middleware -------------------- */
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from /public BUT do NOT auto-serve index.html at "/"
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Tiny auth guard (checks cookie exists). Your /auth sets this cookie.
function requireAuth(req, res, next) {
  const username = req.cookies?.username;
  if (!username) return res.redirect('/login');
  next();
}

/* -------------------- Pages (GET) -------------------- */
// Always show login page at "/" and "/login"
app.get('/', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// After login, user lands on /upload (requires auth)
app.get('/upload', requireAuth, (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// Main editor page (requires auth)
app.get('/home', requireAuth, (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Optional: block direct hits to index.html without login
app.get('/index.html', requireAuth, (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* -------------------- Auth (POST) -------------------- */
// Register
app.post('/signup', async (req, res) => {
  try {
    const { username, password1, password2 } = req.body;
    if (!username || !password1 || !password2) {
      return res.status(400).send('Missing fields');
    }
    if (password1 !== password2) {
      return res.status(401).send('Passwords do not match');
    }

    const hash = await bcrypt.hash(password1, 10);

    await pool.query(
      'INSERT INTO users (name, password_hash) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
      [username, hash]
    );

    // After signup, show login page
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
  } catch (err) {
    console.error(err);
    return res.status(500).send('Signup error');
  }
});

// Login
app.post('/auth', async (req, res) => {
  try {
    const { username, password } = req.body;

    const { rows } = await pool.query(
      'SELECT id, name, password_hash FROM users WHERE name = $1',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).send('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) {
      return res.status(401).send('Invalid credentials');
    }

    // Set a lightweight cookie. (Consider secure:true on HTTPS.)
    res.cookie('username', rows[0].name, {
      httpOnly: true,
      sameSite: 'lax',
      // secure: true, // enable when serving over HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to the upload page after successful login
    return res.redirect('/upload');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Login error');
  }
});

/* -------------------- Boot -------------------- */
app.listen(PORT, async () => {
  try {
    await ensureSchema();
    console.log(`Server running on port ${PORT}`);
    console.log('Connected to Postgres and ensured schema');
  } catch (e) {
    console.error('DB init failed:', e);
  }
});
