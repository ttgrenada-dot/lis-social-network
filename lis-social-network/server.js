// server.js - Express + SQLite (persistent) с полной поддержкой чата

import express from "express";
import cors from "cors";
import { createHash } from "crypto";
import { createRequire } from "module";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { requireAuth, isOwner, allowFields } from "./src/middleware/auth.js";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.API_PORT || process.env.PORT || 3000;

// ─── SQLITE SETUP ──────────────────────────────────────────────────────────

const DB_PATH = join(__dirname, "lis_users.db");
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Создаём все таблицы
db.exec(`
  -- Пользователи
  CREATE TABLE IF NOT EXISTS users (
    uid           TEXT PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL COLLATE NOCASE,
    phone         TEXT UNIQUE NOT NULL,
    email         TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    avatar        TEXT DEFAULT '',
    bio           TEXT DEFAULT '',
    followers     TEXT DEFAULT '[]',
    following     TEXT DEFAULT '[]',
    online        INTEGER DEFAULT 1,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_users_phone    ON users(phone);

  -- Посты
  CREATE TABLE IF NOT EXISTS posts (
    id         TEXT PRIMARY KEY,
    author_id  TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    text       TEXT DEFAULT '',
    image      TEXT DEFAULT '',
    video      TEXT DEFAULT '',
    poll       TEXT DEFAULT NULL,
    likes      TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);

  -- Комментарии
  CREATE TABLE IF NOT EXISTS comments (
    id         TEXT PRIMARY KEY,
    post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id  TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

  -- Сторис
  CREATE TABLE IF NOT EXISTS stories (
    id         TEXT PRIMARY KEY,
    author_id  TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    media      TEXT DEFAULT '',
    media_type TEXT DEFAULT 'image',
    views      TEXT DEFAULT '[]',
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_stories_author  ON stories(author_id);
  CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

  -- Группы
  CREATE TABLE IF NOT EXISTS groups (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    creator_id        TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    avatar            TEXT DEFAULT '',
    participants      TEXT DEFAULT '[]',
    last_message      TEXT DEFAULT '',
    last_message_time TEXT DEFAULT '',
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(creator_id);

  -- 🔥 ЛИЧНЫЕ КОНВЕРСАЦИИ (новое!)
  CREATE TABLE IF NOT EXISTS conversations (
    id                TEXT PRIMARY KEY,
    participants      TEXT NOT NULL,  -- JSON array [uid1, uid2]
    last_message      TEXT DEFAULT '',
    last_message_by   TEXT DEFAULT '',
    last_message_time TEXT DEFAULT '',
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participants);

  -- 🔥 СООБЩЕНИЯ (новое!)
  CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
    group_id        TEXT REFERENCES groups(id) ON DELETE CASCADE,
    sender_id       TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    text            TEXT DEFAULT '',
    file_url        TEXT DEFAULT '',
    file_type       TEXT DEFAULT '',
    file_name       TEXT DEFAULT '',
    read            INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);
  CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
`);

// Миграции: добавляем недостающие колонки
const addColumnIfMissing = (table, column, definition) => {
  try {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    console.log(`✅ Added column ${table}.${column}`);
  } catch (e) {
    if (!e.message.includes("duplicate column name")) throw e;
  }
};
addColumnIfMissing("posts", "video", "TEXT DEFAULT ''");
addColumnIfMissing("posts", "poll", "TEXT DEFAULT NULL");

console.log(`✅ SQLite database ready: ${DB_PATH}`);

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const auth = requireAuth(db);

// ─── HELPERS ───────────────────────────────────────────────────────────────

function hashPassword(pwd) {
  return createHash("sha256")
    .update(pwd || "")
    .digest("hex");
}

function rowToSafeUser(row) {
  if (!row) return null;
  return {
    uid: row.uid,
    username: row.username,
    phone: row.phone,
    email: row.email || "",
    avatar: row.avatar || "",
    bio: row.bio || "",
    followers: safeParseJson(row.followers, []),
    following: safeParseJson(row.following, []),
    online: Boolean(row.online),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPost(row, author) {
  if (!row) return null;
  const poll = row.poll ? safeParseJson(row.poll, null) : null;
  return {
    id: row.id,
    postId: row.id,
    authorId: row.author_id,
    userId: row.author_id,
    username: author?.username || "Пользователь",
    avatar: author?.avatar || "",
    text: row.text || "",
    content: row.text || "",
    image: row.image || "",
    video: row.video || "",
    poll,
    isPoll: !!poll,
    likedBy: safeParseJson(row.likes, []),
    likeCount: safeParseJson(row.likes, []).length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToStory(row) {
  if (!row) return null;
  return {
    id: row.id,
    authorId: row.author_id,
    media: row.media || "",
    mediaType: row.media_type || "image",
    views: safeParseJson(row.views, []),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function rowToGroup(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    creatorId: row.creator_id,
    avatar: row.avatar || "",
    participants: safeParseJson(row.participants, []),
    lastMessage: row.last_message || "",
    lastMessageTime: row.last_message_time || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToComment(row) {
  if (!row) return null;
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    text: row.text,
    createdAt: row.created_at,
  };
}

function rowToConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.id,
    participants: safeParseJson(row.participants, []),
    lastMessage: row.last_message || "",
    lastMessageBy: row.last_message_by || "",
    lastMessageTime: row.last_message_time || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    messageId: row.id,
    conversationId: row.conversation_id,
    groupId: row.group_id,
    senderId: row.sender_id,
    text: row.text || "",
    fileUrl: row.file_url || "",
    fileType: row.file_type || "",
    fileName: row.file_name || "",
    read: Boolean(row.read),
    createdAt: row.created_at,
  };
}

function safeParseJson(val, fallback = []) {
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ─── AUTH: REGISTER ────────────────────────────────────────────────────────

app.post("/api/auth/register", (req, res) => {
  try {
    console.log("📝 POST /api/auth/register");
    const { username, phone, password, email } = req.body;

    if (!username || !phone || !password) {
      return res.status(400).json({ error: "Заполните все обязательные поля" });
    }

    const normUser = username.toLowerCase().trim();
    const normPhone = phone.trim();

    const existingUser = db
      .prepare(
        "SELECT uid FROM users WHERE username = ? COLLATE NOCASE LIMIT 1",
      )
      .get(normUser);
    if (existingUser) {
      return res.status(409).json({ error: "Имя пользователя уже занято" });
    }

    const existingPhone = db
      .prepare("SELECT uid FROM users WHERE phone = ? LIMIT 1")
      .get(normPhone);
    if (existingPhone) {
      return res.status(409).json({ error: "Этот номер уже зарегистрирован" });
    }

    const uid = genId();
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

    db.prepare(
      `
      INSERT INTO users (uid, username, phone, email, password_hash, avatar, bio, followers, following, online, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, '', '', '[]', '[]', 1, ?, ?)
    `,
    ).run(uid, normUser, normPhone, email || "", passwordHash, now, now);

    const safeUser = rowToSafeUser(
      db.prepare("SELECT * FROM users WHERE uid = ?").get(uid),
    );
    console.log(`✅ Registered: ${normUser} (uid=${uid})`);
    res.json({ success: true, uid, user: safeUser });
  } catch (error) {
    console.error("❌ Register error:", error);
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "Пользователь с таким именем или телефоном уже существует",
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// ─── AUTH: LOGIN ───────────────────────────────────────────────────────────

app.post("/api/auth/login", (req, res) => {
  try {
    console.log("🔐 POST /api/auth/login");
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: "Введите логин и пароль" });
    }

    const normLogin = login.trim().toLowerCase();
    const passwordHash = hashPassword(password);

    const user = db
      .prepare(
        "SELECT * FROM users WHERE username = ? COLLATE NOCASE OR phone = ? LIMIT 1",
      )
      .get(normLogin, login.trim());

    if (!user) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    if (user.password_hash !== passwordHash) {
      return res.status(401).json({ error: "Неверный пароль" });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE users SET online = 1, updated_at = ? WHERE uid = ?").run(
      now,
      user.uid,
    );

    const updatedUser = db
      .prepare("SELECT * FROM users WHERE uid = ?")
      .get(user.uid);
    console.log(`✅ Logged in: ${user.username}`);
    res.json({ success: true, user: rowToSafeUser(updatedUser) });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── HEALTH ────────────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
  const postCount = db.prepare("SELECT COUNT(*) as count FROM posts").get();
  const convCount = db
    .prepare("SELECT COUNT(*) as count FROM conversations")
    .get();
  const msgCount = db.prepare("SELECT COUNT(*) as count FROM messages").get();
  res.json({
    status: "ok",
    storage: "SQLite",
    users: userCount.count,
    posts: postCount.count,
    conversations: convCount.count,
    messages: msgCount.count,
    dbPath: DB_PATH,
    timestamp: new Date().toISOString(),
  });
});

// ─── USERS ─────────────────────────────────────────────────────────────────

app.get("/api/users/search", (req, res) => {
  try {
    const q = (req.query.q || "").toLowerCase().trim();
    if (q.length < 2) return res.json([]);
    const rows = db
      .prepare(
        "SELECT * FROM users WHERE username LIKE ? COLLATE NOCASE LIMIT 20",
      )
      .all(`${q}%`);
    res.json(rows.map(rowToSafeUser));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/:uid", (req, res) => {
  try {
    const user = db
      .prepare("SELECT * FROM users WHERE uid = ?")
      .get(req.params.uid);
    res.json(rowToSafeUser(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/by-username/:username", (req, res) => {
  try {
    const user = db
      .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE LIMIT 1")
      .get(req.params.username.toLowerCase());
    res.json(rowToSafeUser(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/by-phone/:phone", (req, res) => {
  try {
    const user = db
      .prepare("SELECT * FROM users WHERE phone = ? LIMIT 1")
      .get(req.params.phone);
    res.json(rowToSafeUser(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users", (req, res) => {
  try {
    const data = req.body;
    const uid = data.uid || genId();
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT OR REPLACE INTO users (uid, username, phone, email, password_hash, avatar, bio, followers, following, online, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      uid,
      (data.username || "").toLowerCase(),
      data.phone || "",
      data.email || "",
      data.passwordHash || hashPassword(data.password || ""),
      data.avatar || "",
      data.bio || "",
      JSON.stringify(data.followers || []),
      JSON.stringify(data.following || []),
      data.online ? 1 : 0,
      data.createdAt || now,
      now,
    );
    res.json({ success: true, uid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put(
  "/api/users/:uid",
  auth,
  isOwner((req) => req.params.uid),
  allowFields(
    "username",
    "phone",
    "email",
    "avatar",
    "bio",
    "followers",
    "following",
    "online",
  ),
  (req, res) => {
    try {
      const { uid } = req.params;
      const updates = req.body;
      const now = new Date().toISOString();
      const setClauses = [];
      const values = [];

      for (const key of Object.keys(updates)) {
        setClauses.push(`${key} = ?`);
        if (key === "followers" || key === "following") {
          values.push(
            Array.isArray(updates[key])
              ? JSON.stringify(updates[key])
              : updates[key],
          );
        } else if (key === "online") {
          values.push(updates[key] ? 1 : 0);
        } else {
          values.push(updates[key]);
        }
      }

      if (setClauses.length > 0) {
        setClauses.push("updated_at = ?");
        values.push(now, uid);
        db.prepare(
          `UPDATE users SET ${setClauses.join(", ")} WHERE uid = ?`,
        ).run(...values);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ─── POSTS ─────────────────────────────────────────────────────────────────

app.get("/api/posts", (req, res) => {
  try {
    const rows = db
      .prepare("SELECT * FROM posts ORDER BY created_at DESC LIMIT 100")
      .all();
    res.json(rows.map(rowToPost));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/posts/by-user/:userId", (req, res) => {
  try {
    const rows = db
      .prepare(
        "SELECT * FROM posts WHERE author_id = ? ORDER BY created_at DESC",
      )
      .all(req.params.userId);
    res.json(rows.map(rowToPost));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(
  "/api/posts",
  auth,
  allowFields("text", "image", "video", "poll"),
  (req, res) => {
    try {
      const { text, image, video, poll } = req.body;
      if (!text && !image && !video && !poll) {
        return res.status(400).json({ error: "Пост не может быть пустым" });
      }
      const id = genId();
      const now = new Date().toISOString();
      db.prepare(
        `
        INSERT INTO posts (id, author_id, text, image, video, poll, likes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?)
      `,
      ).run(
        id,
        req.uid,
        text || "",
        image || "",
        video || "",
        poll ? JSON.stringify(poll) : null,
        now,
        now,
      );
      const post = rowToPost(
        db.prepare("SELECT * FROM posts WHERE id = ?").get(id),
      );
      console.log(`📄 Post created: ${id} by ${req.uid}`);
      res.json({ success: true, postId: id, post });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

app.put("/api/posts/:id", auth, allowFields("text", "image"), (req, res) => {
  try {
    const post = db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .get(req.params.id);
    if (!post) return res.status(404).json({ error: "Пост не найден" });
    if (post.author_id !== req.uid) {
      return res.status(403).json({ error: "Нет прав: вы не автор поста" });
    }
    const now = new Date().toISOString();
    const { text, image } = req.body;
    db.prepare(
      `
        UPDATE posts SET text = ?, image = ?, updated_at = ? WHERE id = ?
      `,
    ).run(
      text !== undefined ? text : post.text,
      image !== undefined ? image : post.image,
      now,
      req.params.id,
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/posts/:id", auth, (req, res) => {
  try {
    const post = db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .get(req.params.id);
    if (!post) return res.status(404).json({ error: "Пост не найден" });
    if (post.author_id !== req.uid) {
      return res.status(403).json({ error: "Нет прав: вы не автор поста" });
    }
    db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
    console.log(`🗑️ Post deleted: ${req.params.id} by ${req.uid}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/like", auth, (req, res) => {
  try {
    const post = db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .get(req.params.id);
    if (!post) return res.status(404).json({ error: "Пост не найден" });
    const likes = safeParseJson(post.likes, []);
    if (!likes.includes(req.uid)) {
      likes.push(req.uid);
      db.prepare("UPDATE posts SET likes = ?, updated_at = ? WHERE id = ?").run(
        JSON.stringify(likes),
        new Date().toISOString(),
        req.params.id,
      );
    }
    res.json({ success: true, likes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/unlike", auth, (req, res) => {
  try {
    const post = db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .get(req.params.id);
    if (!post) return res.status(404).json({ error: "Пост не найден" });
    const likes = safeParseJson(post.likes, []).filter(
      (uid) => uid !== req.uid,
    );
    db.prepare("UPDATE posts SET likes = ?, updated_at = ? WHERE id = ?").run(
      JSON.stringify(likes),
      new Date().toISOString(),
      req.params.id,
    );
    res.json({ success: true, likes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── COMMENTS ──────────────────────────────────────────────────────────────

app.get("/api/posts/:id/comments", (req, res) => {
  try {
    const rows = db
      .prepare(
        "SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC",
      )
      .all(req.params.id);
    res.json(rows.map(rowToComment));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/comments", auth, allowFields("text"), (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ error: "Комментарий не может быть пустым" });
    }
    const post = db
      .prepare("SELECT id FROM posts WHERE id = ?")
      .get(req.params.id);
    if (!post) return res.status(404).json({ error: "Пост не найден" });

    const id = genId();
    const now = new Date().toISOString();
    db.prepare(
      `
        INSERT INTO comments (id, post_id, author_id, text, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
    ).run(id, req.params.id, req.uid, text.trim(), now);
    const comment = rowToComment(
      db.prepare("SELECT * FROM comments WHERE id = ?").get(id),
    );
    res.json({ success: true, commentId: id, comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/posts/:id/comments/:cid", auth, (req, res) => {
  try {
    const comment = db
      .prepare("SELECT * FROM comments WHERE id = ? AND post_id = ?")
      .get(req.params.cid, req.params.id);
    if (!comment)
      return res.status(404).json({ error: "Комментарий не найден" });
    if (comment.author_id !== req.uid) {
      return res
        .status(403)
        .json({ error: "Нет прав: вы не автор комментария" });
    }
    db.prepare("DELETE FROM comments WHERE id = ?").run(req.params.cid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── STORIES ───────────────────────────────────────────────────────────────

app.get("/api/stories", (req, res) => {
  try {
    const now = new Date().toISOString();
    const rows = db
      .prepare(
        "SELECT * FROM stories WHERE expires_at > ? ORDER BY created_at DESC",
      )
      .all(now);
    const stories = rows.map(rowToStory);
    const enriched = stories.map((s) => {
      const author = rowToSafeUser(
        db.prepare("SELECT * FROM users WHERE uid = ?").get(s.authorId),
      );
      return {
        ...s,
        author: author
          ? {
              uid: author.uid,
              username: author.username,
              avatar: author.avatar,
            }
          : null,
      };
    });
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(
  "/api/stories",
  auth,
  allowFields("media", "mediaType"),
  (req, res) => {
    try {
      const { media, mediaType = "image" } = req.body;
      if (!media) return res.status(400).json({ error: "Медиа обязательно" });
      const id = genId();
      const now = new Date().toISOString();
      const expiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString();
      db.prepare(
        `
      INSERT INTO stories (id, author_id, media, media_type, views, expires_at, created_at)
      VALUES (?, ?, ?, ?, '[]', ?, ?)
    `,
      ).run(id, req.uid, media, mediaType, expiresAt, now);
      const story = rowToStory(
        db.prepare("SELECT * FROM stories WHERE id = ?").get(id),
      );
      console.log(`📸 Story created: ${id} by ${req.uid}`);
      res.json({ success: true, storyId: id, story });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

app.delete("/api/stories/:id", auth, (req, res) => {
  try {
    const story = db
      .prepare("SELECT * FROM stories WHERE id = ?")
      .get(req.params.id);
    if (!story) return res.status(404).json({ error: "Сторис не найдена" });
    if (story.author_id !== req.uid)
      return res.status(403).json({ error: "Нет прав" });
    db.prepare("DELETE FROM stories WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/stories/:id/view", auth, (req, res) => {
  try {
    const story = db
      .prepare("SELECT * FROM stories WHERE id = ?")
      .get(req.params.id);
    if (!story) return res.status(404).json({ error: "Сторис не найдена" });
    const views = safeParseJson(story.views, []);
    if (!views.includes(req.uid)) {
      views.push(req.uid);
      db.prepare("UPDATE stories SET views = ? WHERE id = ?").run(
        JSON.stringify(views),
        req.params.id,
      );
    }
    res.json({ success: true, views });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GROUPS ────────────────────────────────────────────────────────────────

app.get("/api/groups", auth, (req, res) => {
  try {
    const rows = db
      .prepare("SELECT * FROM groups ORDER BY updated_at DESC")
      .all();
    const groups = rows
      .map(rowToGroup)
      .filter((g) => g.participants.includes(req.uid));
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/groups/:userId", (req, res) => {
  try {
    const rows = db
      .prepare("SELECT * FROM groups ORDER BY updated_at DESC")
      .all();
    const groups = rows
      .map(rowToGroup)
      .filter((g) => g.participants.includes(req.params.userId));
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(
  "/api/groups",
  auth,
  allowFields("name", "participants", "avatar"),
  (req, res) => {
    try {
      const { name, participants = [], avatar = "" } = req.body;
      if (!name || !name.trim())
        return res.status(400).json({ error: "Название группы обязательно" });
      const allParticipants = [...new Set([req.uid, ...participants])];
      const id = genId();
      const now = new Date().toISOString();
      db.prepare(
        `
        INSERT INTO groups (id, name, creator_id, avatar, participants, last_message, last_message_time, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, '', '', ?, ?)
      `,
      ).run(
        id,
        name.trim(),
        req.uid,
        avatar,
        JSON.stringify(allParticipants),
        now,
        now,
      );
      const group = rowToGroup(
        db.prepare("SELECT * FROM groups WHERE id = ?").get(id),
      );
      console.log(`👥 Group created: ${id} (${name}) by ${req.uid}`);
      res.json({ success: true, groupId: id, id, group });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

app.put(
  "/api/groups/:id",
  auth,
  allowFields(
    "name",
    "avatar",
    "participants",
    "lastMessage",
    "lastMessageTime",
  ),
  (req, res) => {
    try {
      const group = db
        .prepare("SELECT * FROM groups WHERE id = ?")
        .get(req.params.id);
      if (!group) return res.status(404).json({ error: "Группа не найдена" });
      const now = new Date().toISOString();
      const updates = req.body;
      const fields = [];
      const values = [];
      if ("name" in updates) {
        fields.push("name = ?");
        values.push(updates.name);
      }
      if ("avatar" in updates) {
        fields.push("avatar = ?");
        values.push(updates.avatar);
      }
      if ("participants" in updates) {
        fields.push("participants = ?");
        values.push(JSON.stringify(updates.participants));
      }
      if ("lastMessage" in updates) {
        fields.push("last_message = ?");
        values.push(updates.lastMessage);
      }
      if ("lastMessageTime" in updates) {
        fields.push("last_message_time = ?");
        values.push(updates.lastMessageTime);
      }
      if (fields.length > 0) {
        fields.push("updated_at = ?");
        values.push(now, req.params.id);
        db.prepare(`UPDATE groups SET ${fields.join(", ")} WHERE id = ?`).run(
          ...values,
        );
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// 🔥 🔴 УДАЛЕНИЕ ГРУППЫ (только создателем)
app.delete("/api/groups/:id", auth, (req, res) => {
  try {
    const { id } = req.params;
    const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(id);

    if (!group) {
      return res.status(404).json({ error: "Группа не найдена" });
    }

    // Проверяем что пользователь — создатель
    if (group.creator_id !== req.uid) {
      return res
        .status(403)
        .json({ error: "Только создатель может удалить группу" });
    }

    // Удаляем все сообщения группы
    db.prepare("DELETE FROM messages WHERE group_id = ?").run(id);

    // Удаляем группу
    db.prepare("DELETE FROM groups WHERE id = ?").run(id);

    console.log(`🗑️ Group deleted: ${id} by ${req.uid}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔥 СООБЩЕНИЯ В ГРУППАХ
app.get("/api/groups/:groupId/messages", (req, res) => {
  try {
    const { groupId } = req.params;
    const rows = db
      .prepare(
        "SELECT * FROM messages WHERE group_id = ? ORDER BY created_at ASC LIMIT 100",
      )
      .all(groupId);
    const messages = rows.map(rowToMessage);

    // Добавляем данные отправителей
    const enriched = messages.map((msg) => {
      const sender = rowToSafeUser(
        db.prepare("SELECT * FROM users WHERE uid = ?").get(msg.senderId),
      );
      return {
        ...msg,
        username: sender?.username || "Пользователь",
        avatar: sender?.avatar || "",
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(
  "/api/groups/:groupId/messages",
  auth,
  allowFields("text", "fileUrl", "fileType", "fileName"),
  (req, res) => {
    try {
      const { groupId } = req.params;
      const { text, fileUrl, fileType, fileName } = req.body;

      if (!text && !fileUrl) {
        return res
          .status(400)
          .json({ error: "Сообщение не может быть пустым" });
      }

      // Проверяем что пользователь в группе
      const group = db
        .prepare("SELECT * FROM groups WHERE id = ?")
        .get(groupId);
      if (!group) return res.status(404).json({ error: "Группа не найдена" });

      const participants = safeParseJson(group.participants, []);
      if (!participants.includes(req.uid)) {
        return res.status(403).json({ error: "Вы не участник этой группы" });
      }

      const id = genId();
      const now = new Date().toISOString();

      db.prepare(
        `
        INSERT INTO messages (id, group_id, sender_id, text, file_url, file_type, file_name, read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      `,
      ).run(
        id,
        groupId,
        req.uid,
        text || "",
        fileUrl || "",
        fileType || "",
        fileName || "",
        now,
      );

      // Обновляем last_message в группе
      const preview = text
        ? text.length > 50
          ? text.slice(0, 50) + "..."
          : text
        : fileName
          ? `${fileType?.startsWith("image/") ? "🖼️" : "📎"} ${fileName}`
          : "";
      db.prepare(
        "UPDATE groups SET last_message = ?, last_message_time = ?, updated_at = ? WHERE id = ?",
      ).run(preview, now, now, groupId);

      const message = rowToMessage(
        db.prepare("SELECT * FROM messages WHERE id = ?").get(id),
      );
      const sender = rowToSafeUser(
        db.prepare("SELECT * FROM users WHERE uid = ?").get(req.uid),
      );

      res.json({
        success: true,
        message: {
          ...message,
          username: sender?.username || "Пользователь",
          avatar: sender?.avatar || "",
        },
      });
    } catch (error) {
      console.error("Error sending group message:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// 🔥 🔴 УДАЛЕНИЕ СООБЩЕНИЯ В ГРУППЕ (только автором)
app.delete("/api/groups/:groupId/messages/:messageId", auth, (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const message = db
      .prepare("SELECT * FROM messages WHERE id = ? AND group_id = ?")
      .get(messageId, groupId);

    if (!message) {
      return res.status(404).json({ error: "Сообщение не найдено" });
    }

    // Проверяем что пользователь — автор сообщения
    if (message.sender_id !== req.uid) {
      return res
        .status(403)
        .json({ error: "Можно удалять только свои сообщения" });
    }

    // Удаляем сообщение
    db.prepare("DELETE FROM messages WHERE id = ?").run(messageId);

    console.log(`🗑️ Message deleted: ${messageId} by ${req.uid}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── CONVERSATIONS (ЛИЧНЫЕ ЧАТЫ) ───────────────────────────────────────────

// Получить список личных чатов пользователя
app.get("/api/conversations/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const rows = db
      .prepare("SELECT * FROM conversations ORDER BY updated_at DESC")
      .all();

    // Фильтруем чаты где есть этот пользователь
    const userConversations = rows
      .map(rowToConversation)
      .filter((conv) => conv.participants.includes(userId));

    // Добавляем данные собеседников
    const enriched = userConversations.map((conv) => {
      const otherId = conv.participants.find((p) => p !== userId);
      if (otherId) {
        const otherUser = rowToSafeUser(
          db.prepare("SELECT * FROM users WHERE uid = ?").get(otherId),
        );
        return { ...conv, otherUser };
      }
      return conv;
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создать новый личный чат
app.post("/api/conversations", auth, (req, res) => {
  try {
    const { participants } = req.body;
    if (!participants || participants.length !== 2) {
      return res
        .status(400)
        .json({ error: "Личный чат должен иметь ровно 2 участника" });
    }

    // Проверяем не существует ли уже такой чат
    const existing = db
      .prepare("SELECT * FROM conversations")
      .all()
      .find((conv) => {
        const convParticipants = safeParseJson(conv.participants, []);
        return (
          convParticipants.length === 2 &&
          convParticipants.includes(participants[0]) &&
          convParticipants.includes(participants[1])
        );
      });

    if (existing) {
      return res.json({
        success: true,
        conversationId: existing.id,
        id: existing.id,
        conversation: rowToConversation(existing),
      });
    }

    const id = genId();
    const now = new Date().toISOString();

    db.prepare(
      `
      INSERT INTO conversations (id, participants, last_message, last_message_by, last_message_time, created_at, updated_at)
      VALUES (?, ?, '', '', '', ?, ?)
    `,
    ).run(id, JSON.stringify(participants.sort()), now, now);

    const conversation = rowToConversation(
      db.prepare("SELECT * FROM conversations WHERE id = ?").get(id),
    );
    console.log(`💬 Conversation created: ${id}`);

    res.json({ success: true, conversationId: id, id, conversation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обновить чат (последнее сообщение)
app.put("/api/conversations/:id", auth, (req, res) => {
  try {
    const { id } = req.params;
    const { lastMessage, lastMessageBy } = req.body;
    const now = new Date().toISOString();

    db.prepare(
      `
      UPDATE conversations 
      SET last_message = ?, last_message_by = ?, last_message_time = ?, updated_at = ?
      WHERE id = ?
    `,
    ).run(lastMessage || "", lastMessageBy || "", now, now, id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить сообщения личного чата
app.get("/api/conversations/:id/messages", (req, res) => {
  try {
    const { id } = req.params;
    const rows = db
      .prepare(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 100",
      )
      .all(id);

    const messages = rows.map(rowToMessage);

    // Добавляем данные отправителей
    const enriched = messages.map((msg) => {
      const sender = rowToSafeUser(
        db.prepare("SELECT * FROM users WHERE uid = ?").get(msg.senderId),
      );
      return {
        ...msg,
        username: sender?.username || "Пользователь",
        avatar: sender?.avatar || "",
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отправить сообщение в личный чат
app.post(
  "/api/conversations/:id/messages",
  auth,
  allowFields("text", "fileUrl", "fileType", "fileName"),
  (req, res) => {
    try {
      const { id } = req.params;
      const { text, fileUrl, fileType, fileName } = req.body;

      if (!text && !fileUrl) {
        return res
          .status(400)
          .json({ error: "Сообщение не может быть пустым" });
      }

      // Проверяем что пользователь участник чата
      const conv = db
        .prepare("SELECT * FROM conversations WHERE id = ?")
        .get(id);
      if (!conv) return res.status(404).json({ error: "Чат не найден" });

      const participants = safeParseJson(conv.participants, []);
      if (!participants.includes(req.uid)) {
        return res.status(403).json({ error: "Вы не участник этого чата" });
      }

      const messageId = genId();
      const now = new Date().toISOString();

      db.prepare(
        `
        INSERT INTO messages (id, conversation_id, sender_id, text, file_url, file_type, file_name, read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      `,
      ).run(
        messageId,
        id,
        req.uid,
        text || "",
        fileUrl || "",
        fileType || "",
        fileName || "",
        now,
      );

      // Обновляем last_message в чате
      const preview = text
        ? text.length > 50
          ? text.slice(0, 50) + "..."
          : text
        : fileName
          ? `${fileType?.startsWith("image/") ? "🖼️" : "📎"} ${fileName}`
          : "";
      db.prepare(
        "UPDATE conversations SET last_message = ?, last_message_by = ?, last_message_time = ?, updated_at = ? WHERE id = ?",
      ).run(preview, req.uid, now, now, id);

      const message = rowToMessage(
        db.prepare("SELECT * FROM messages WHERE id = ?").get(messageId),
      );
      const sender = rowToSafeUser(
        db.prepare("SELECT * FROM users WHERE uid = ?").get(req.uid),
      );

      res.json({
        success: true,
        messageId,
        message: {
          ...message,
          username: sender?.username || "Пользователь",
          avatar: sender?.avatar || "",
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// 🔥 🔴 УДАЛЕНИЕ СООБЩЕНИЯ В ЛИЧНОМ ЧАТЕ (только автором)
app.delete(
  "/api/conversations/:conversationId/messages/:messageId",
  auth,
  (req, res) => {
    try {
      const { conversationId, messageId } = req.params;
      const message = db
        .prepare("SELECT * FROM messages WHERE id = ? AND conversation_id = ?")
        .get(messageId, conversationId);

      if (!message) {
        return res.status(404).json({ error: "Сообщение не найдено" });
      }

      // Проверяем что пользователь — автор сообщения
      if (message.sender_id !== req.uid) {
        return res
          .status(403)
          .json({ error: "Можно удалять только свои сообщения" });
      }

      // Удаляем сообщение
      db.prepare("DELETE FROM messages WHERE id = ?").run(messageId);

      console.log(`🗑️ Message deleted: ${messageId} by ${req.uid}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// ─── MISC ──────────────────────────────────────────────────────────────────

app.post("/api/init-tables", (req, res) => {
  res.json({ success: true, message: "SQLite tables already initialized" });
});

// ─── 404 / ERROR ───────────────────────────────────────────────────────────

app.use((req, res) => {
  console.log("⚠️ 404:", req.method, req.path);
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error("💥 Server error:", err);
  res
    .status(500)
    .json({ error: "Internal server error", message: err.message });
});

// ─── START ─────────────────────────────────────────────────────────────────

app.listen(PORT, "0.0.0.0", () => {
  console.log("========================================");
  console.log(`🚀 Lis API server running on port ${PORT}`);
  console.log(`💾 Storage: SQLite (${DB_PATH})`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat: /api/conversations, /api/groups/:id/messages`);
  console.log(
    `🗑️ Delete: /api/groups/:id, /api/conversations/:id/messages/:msgId, /api/groups/:gid/messages/:msgId`,
  );
  console.log("========================================");
});
