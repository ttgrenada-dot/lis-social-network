// server.js - Stable server with error handling

import express from "express";
import cors from "cors";
import { createHash } from "crypto";

const app = express();
const PORT = process.env.API_PORT || process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// База данных
const db = { users: new Map(), posts: new Map() };

// Хеширование
function hashPassword(pwd) {
  return createHash("sha256")
    .update(pwd || "")
    .digest("hex");
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("💥 Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// ─── AUTH ENDPOINTS ───────────────────────────────────────────────────────

app.post("/api/auth/register", (req, res) => {
  try {
    console.log("📝 POST /api/auth/register - Body:", JSON.stringify(req.body));

    const { username, phone, password, email } = req.body;

    if (!username || !phone || !password) {
      console.log("❌ Missing fields");
      return res.status(400).json({ error: "Заполните все обязательные поля" });
    }

    const normUser = username.toLowerCase().trim();
    const normPhone = phone.trim();

    // Check username
    const existingUser = Array.from(db.users.values()).find(
      (u) => u.username === normUser,
    );
    if (existingUser) {
      console.log("❌ Username taken:", normUser);
      return res.status(409).json({ error: "Имя пользователя уже занято" });
    }

    // Check phone
    const existingPhone = Array.from(db.users.values()).find(
      (u) => u.phone === normPhone,
    );
    if (existingPhone) {
      console.log("❌ Phone taken:", normPhone);
      return res.status(409).json({ error: "Этот номер уже зарегистрирован" });
    }

    // Create user
    const uid =
      Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    const user = {
      uid,
      username: normUser,
      phone: normPhone,
      email: email || "",
      passwordHash: hashPassword(password),
      avatar: "",
      bio: "",
      followers: [],
      following: [],
      online: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.set(uid, user);
    console.log(`✅ Registered: ${user.username} (${uid})`);
    console.log(`   Total users: ${db.users.size}`);

    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, uid, user: safeUser });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    console.log("🔐 POST /api/auth/login - Body:", JSON.stringify(req.body));

    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: "Введите логин и пароль" });
    }

    const user = Array.from(db.users.values()).find(
      (u) =>
        u.username === login.toLowerCase().trim() || u.phone === login.trim(),
    );

    if (!user) {
      console.log("❌ User not found:", login);
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    const inputHash = hashPassword(password);
    if (user.passwordHash !== inputHash) {
      console.log("❌ Wrong password for:", user.username);
      return res.status(401).json({ error: "Неверный пароль" });
    }

    user.online = true;
    user.updatedAt = new Date().toISOString();
    console.log("✅ Logged in:", user.username);

    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── OTHER ENDPOINTS ──────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    users: db.users.size,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/users/:uid", (req, res) => {
  try {
    const user = db.users.get(req.params.uid);
    if (!user) return res.json(null);
    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/by-username/:username", (req, res) => {
  try {
    const user = Array.from(db.users.values()).find(
      (u) => u.username === req.params.username.toLowerCase(),
    );
    if (!user) return res.json(null);
    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/by-phone/:phone", (req, res) => {
  try {
    const user = Array.from(db.users.values()).find(
      (u) => u.phone === req.params.phone,
    );
    if (!user) return res.json(null);
    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/users/:uid", (req, res) => {
  try {
    const user = db.users.get(req.params.uid);
    if (!user) return res.status(404).json({ error: "Not found" });
    Object.assign(user, req.body, { updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stubs
app.get("/api/posts", (req, res) => res.json([]));
app.post("/api/posts", (req, res) => res.json({ postId: "1", success: true }));
app.get("/api/posts/:id/comments", (req, res) => res.json([]));
app.post("/api/posts/:id/comments", (req, res) =>
  res.json({ commentId: "1", success: true }),
);
app.get("/api/conversations/:userId", (req, res) => res.json([]));
app.post("/api/conversations", (req, res) =>
  res.json({ conversationId: "1", success: true }),
);
app.get("/api/conversations/:id/messages", (req, res) => res.json([]));
app.post("/api/conversations/:id/messages", (req, res) =>
  res.json({ messageId: "1", success: true }),
);
app.get("/api/groups/:userId", (req, res) => res.json([]));
app.post("/api/groups", (req, res) =>
  res.json({ groupId: "1", success: true }),
);

// 404
app.use((req, res) => {
  console.log("⚠️ 404:", req.method, req.path);
  res.status(404).json({ error: "Not found" });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log("========================================");
  console.log(`🚀 API server running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth: /api/auth/register, /api/auth/login`);
  console.log(`💾 Database: IN-MEMORY`);
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    console.log(
      `🔗 Replit: https://3000-${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`,
    );
  }
  console.log("========================================");
});
