// src/services/ydb.js - Frontend client для API backend
// Все запросы идут через fetch к Express серверу

// 🔧 Определяем правильный API URL
const getApiBaseUrl = () => {
  // Если в .env задан непустой URL — используем его
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    console.log("🔌 Using API URL from .env:", envUrl);
    return envUrl.trim();
  }

  // Для браузера
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // Replit (НОВЫЙ формат 2024-2025: d06e9d6d-...pike.replit.dev)
    if (hostname.includes("replit.dev") || hostname.includes("repl.co")) {
      console.log("🔌 Replit detected — using relative paths (/api/...)");
      return ""; // Относительные запросы: fetch('/api/users')
    }

    // Localhost для разработки
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log("🔌 Localhost — using http://localhost:3000");
      return "http://localhost:3000";
    }
  }

  // Fallback
  console.log("🔌 Using empty base URL (relative paths)");
  return "";
};

const API_BASE = getApiBaseUrl();
console.log("🔌 API_BASE initialized:", API_BASE || "(relative)");

// 🔧 Универсальный fetch с обработкой ошибок
async function apiRequest(endpoint, options = {}) {
  const url = API_BASE ? `${API_BASE}${endpoint}` : endpoint;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Для cookies если нужно
    });

    // Читаем ответ как текст сначала (для отладки)
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`❌ API Error ${response.status}:`, responseText);
      let errorData = { error: `HTTP ${response.status}` };
      try {
        errorData = JSON.parse(responseText);
      } catch {}
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    // Пустой ответ
    if (!responseText.trim()) {
      return { success: true };
    }

    // Парсим JSON
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse JSON:", responseText);
      throw new Error("Invalid JSON response from server");
    }
  } catch (error) {
    console.error(`❌ Fetch error for ${endpoint}:`, error);

    // Проверяем сетевые ошибки
    if (
      error.message.includes("Failed to fetch") ||
      error.name === "TypeError"
    ) {
      throw new Error(
        `Cannot connect to API server at ${API_BASE || window.location.origin}. Is the backend running?`,
      );
    }
    throw error;
  }
}

// ─── INIT ──────────────────────────────────────────────────────────────────

export async function initYDB() {
  // Проверяем здоровье сервера
  try {
    const health = await apiRequest("/api/health");
    console.log("✅ API server health:", health);
    return health;
  } catch (error) {
    console.warn("⚠️ Could not check API health:", error.message);
    // Не блокируем приложение
    return { success: true };
  }
}

export async function createTables() {
  try {
    return await apiRequest("/api/init-tables", { method: "POST" });
  } catch (error) {
    console.warn(
      "⚠️ Could not create tables (may already exist):",
      error.message,
    );
    return { success: true };
  }
}

// ─── USERS ─────────────────────────────────────────────────────────────────

export async function getUserById(uid) {
  return apiRequest(`/api/users/${encodeURIComponent(uid)}`);
}

export async function getUserByUsername(username) {
  return apiRequest(
    `/api/users/by-username/${encodeURIComponent(username.toLowerCase())}`,
  );
}

export async function getUserByPhone(phone) {
  return apiRequest(`/api/users/by-phone/${encodeURIComponent(phone)}`);
}

export async function createUser(userData) {
  return apiRequest("/api/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export async function updateUser(uid, data) {
  return apiRequest(`/api/users/${encodeURIComponent(uid)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ─── POSTS ─────────────────────────────────────────────────────────────────

export async function getPosts(limit = 50) {
  return apiRequest(`/api/posts?limit=${limit}`);
}

export async function getPostsByUser(userId, limit = 50) {
  return apiRequest(
    `/api/posts/by-user/${encodeURIComponent(userId)}?limit=${limit}`,
  );
}

export async function createPost(postData) {
  return apiRequest("/api/posts", {
    method: "POST",
    body: JSON.stringify(postData),
  });
}

export async function updatePost(postId, data) {
  return apiRequest(`/api/posts/${encodeURIComponent(postId)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePost(postId) {
  return apiRequest(`/api/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
  });
}

export async function likePost(postId, userId) {
  return apiRequest(`/api/posts/${encodeURIComponent(postId)}/like`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function unlikePost(postId, userId) {
  return apiRequest(`/api/posts/${encodeURIComponent(postId)}/unlike`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

// ─── COMMENTS ──────────────────────────────────────────────────────────────

export async function getComments(postId) {
  return apiRequest(`/api/posts/${encodeURIComponent(postId)}/comments`);
}

export async function addComment(postId, commentData) {
  return apiRequest(`/api/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    body: JSON.stringify(commentData),
  });
}

export async function deleteComment(commentId, postId) {
  return apiRequest(
    `/api/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    { method: "DELETE" },
  );
}

export async function deleteCommentsByPost(postId) {
  // Bulk delete not implemented on server — skip silently
  return { success: true };
}

// ─── CONVERSATIONS ─────────────────────────────────────────────────────────

export async function getConversations(userId) {
  return apiRequest(`/api/conversations/${encodeURIComponent(userId)}`);
}

export async function createConversation(data) {
  return apiRequest("/api/conversations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateConversation(conversationId, data) {
  return apiRequest(
    `/api/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
}

// ─── MESSAGES ──────────────────────────────────────────────────────────────

export async function getMessages(conversationId) {
  return apiRequest(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
  );
}

export async function addMessage(conversationId, messageData) {
  return apiRequest(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify(messageData),
    },
  );
}

// ─── GROUPS ────────────────────────────────────────────────────────────────

export async function getGroups(userId) {
  return apiRequest(`/api/groups/${encodeURIComponent(userId)}`);
}

export async function createGroup(data) {
  return apiRequest("/api/groups", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── FOLLOWERS / FOLLOWING ─────────────────────────────────────────────────

export async function getUserFollowers(userId) {
  const user = await getUserById(userId).catch(() => null);
  if (!user?.followers) return [];
  if (Array.isArray(user.followers)) return user.followers;
  try {
    return JSON.parse(user.followers);
  } catch {
    return [];
  }
}

export async function getUserFollowing(userId) {
  const user = await getUserById(userId).catch(() => null);
  if (!user?.following) return [];
  if (Array.isArray(user.following)) return user.following;
  try {
    return JSON.parse(user.following);
  } catch {
    return [];
  }
}

export async function addFollower(userId, followerId) {
  const followers = await getUserFollowers(userId);
  if (!followers.includes(followerId)) {
    await updateUser(userId, { followers: [...followers, followerId] });
  }
  return { success: true };
}

export async function removeFollower(userId, followerId) {
  const followers = await getUserFollowers(userId);
  await updateUser(userId, {
    followers: followers.filter((f) => f !== followerId),
  });
  return { success: true };
}

export async function addFollowing(userId, followingId) {
  const following = await getUserFollowing(userId);
  if (!following.includes(followingId)) {
    await updateUser(userId, { following: [...following, followingId] });
  }
  return { success: true };
}

export async function removeFollowing(userId, followingId) {
  const following = await getUserFollowing(userId);
  await updateUser(userId, {
    following: following.filter((f) => f !== followingId),
  });
  return { success: true };
}

export async function isFollower(userId, potentialFollowerId) {
  const followers = await getUserFollowers(userId).catch(() => []);
  return followers.includes(potentialFollowerId);
}

export async function isFriend(userId1, userId2) {
  const [aFollowsB, bFollowsA] = await Promise.all([
    isFollower(userId2, userId1).catch(() => false),
    isFollower(userId1, userId2).catch(() => false),
  ]);
  return aFollowsB && bFollowsA;
}
