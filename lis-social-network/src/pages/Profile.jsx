import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getUserById,
  updateUser,
  getPosts,
  updatePost,
  getUserFollowers,
  getUserFollowing,
  addFollower,
  removeFollower,
} from "../services/ydb";
import { uploadFile } from "../services/upload";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import Post from "../components/Post";

export default function Profile() {
  const { userId } = useParams();
  const { currentUser, userData, setUserData, logout } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingAvatar, setChangingAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isFriend, setIsFriend] = useState(false);
  const [showFullAvatar, setShowFullAvatar] = useState(false);

  // 🔷 Списки пользователей
  const [showUserList, setShowUserList] = useState(false);
  const [listType, setListType] = useState("followers");
  const [userList, setUserList] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  const currentUserId = userId || currentUser?.uid;
  const isOwnProfile = !userId || userId === currentUser?.uid;

  // 🔷 Загрузка профиля и постов
  const loadProfile = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      const user = await getUserById(currentUserId);
      if (user) {
        setProfileData(user);
        setBio(user.bio || "");

        // Проверяем дружбу
        if (currentUser && user.followers) {
          setIsFriend(user.followers.includes(currentUser.uid));
        }
      }

      // Загружаем посты пользователя
      const posts = await getPosts(100);
      const userPostsData = posts.filter(
        (post) =>
          post.userId === currentUserId || post.authorId === currentUserId,
      );
      setUserPosts(userPostsData);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadProfile();
    }
  }, [loadProfile, currentUser]);

  // 🔷 Опрос постов для обновления (вместо onSnapshot)
  useEffect(() => {
    if (!currentUser || !currentUserId) return;

    let intervalId;
    const loadPosts = async () => {
      try {
        const posts = await getPosts(100);
        const userPostsData = posts.filter(
          (post) =>
            post.userId === currentUserId || post.authorId === currentUserId,
        );
        setUserPosts(userPostsData);
      } catch (error) {
        console.error("Error loading posts:", error);
      }
    };

    intervalId = setInterval(loadPosts, 5000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentUserId, currentUser]);

  // 🔷 Загрузка списка пользователей
  async function loadUserList(type) {
    if (!profileData) return;

    setListType(type);
    setListLoading(true);
    setShowUserList(true);

    try {
      const userIds = [];

      if (type === "followers" && profileData.followers) {
        userIds.push(...profileData.followers);
      } else if (type === "following" && profileData.following) {
        userIds.push(...profileData.following);
      } else if (type === "friends") {
        const followers = profileData.followers || [];
        const following = profileData.following || [];
        const friends = followers.filter((id) => following.includes(id));
        userIds.push(...friends);
      }

      if (userIds.length === 0) {
        setUserList([]);
        setListLoading(false);
        return;
      }

      // Загружаем данные пользователей
      const usersData = [];
      for (const uid of userIds) {
        try {
          const user = await getUserById(uid);
          if (user) usersData.push({ id: user.uid, ...user });
        } catch (err) {
          console.error("Error loading user", uid, err);
        }
      }

      setUserList(usersData);
    } catch (error) {
      console.error("Error loading user list:", error);
    } finally {
      setListLoading(false);
    }
  }

  // 🔷 Сохранение био
  async function handleSaveBio() {
    try {
      setSaving(true);
      await updateUser(currentUserId, { bio });
      setProfileData({ ...profileData, bio });
      setEditing(false);
    } catch (error) {
      console.error("Error saving bio:", error);
      alert("Ошибка: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  // 🔷 Выбор аватара
  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Фото слишком большое! Максимум 10MB");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  // 🔷 🔥 ЗАГРУЗКА АВАТАРА — ОБНОВЛЕНИЕ ВЕЗДЕ
  async function handleUploadAvatar() {
    if (!avatarFile || !currentUser) return;

    try {
      setChangingAvatar(true);

      // 1. Загружаем файл
      const avatarUrl = await uploadFile(
        avatarFile,
        currentUser.uid,
        "avatars",
      );

      // 2. Обновляем в БД
      await updateUser(currentUserId, { avatar: avatarUrl });

      // 3. 🔥 ОБНОВЛЯЕМ АВТАР ВЕЗДЕ ЧЕРЕЗ КОНТЕКСТ + LOCALSTORAGE
      const updatedUser = { ...userData, avatar: avatarUrl };
      setUserData(updatedUser);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

      // 4. Обновляем локальный стейт
      setProfileData({ ...profileData, avatar: avatarUrl });

      // 5. Очищаем превью
      setAvatarFile(null);
      setAvatarPreview(null);

      alert("✅ Аватар обновлён везде! 🦊");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Ошибка: " + error.message);
    } finally {
      setChangingAvatar(false);
    }
  }

  // 🔷 Добавить в друзья
  async function handleAddFriend() {
    try {
      const currentUid = currentUser.uid;
      const targetUid = profileData.uid;

      await addFollower(targetUid, currentUid);
      await addFollower(currentUid, targetUid);

      setIsFriend(true);
      loadProfile();
      alert("Пользователь добавлен в друзья! ✓");
    } catch (error) {
      console.error("Error adding friend:", error);
      alert("Ошибка: " + error.message);
    }
  }

  // 🔷 Выход из аккаунта
  async function handleLogout() {
    try {
      if (currentUser?.uid) {
        await updateUser(currentUser.uid, { online: false });
      }
      logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Ошибка при выходе: " + error.message);
    }
  }

  const getListTitle = () => {
    const titles = {
      followers: "👥 Подписчики",
      following: "👤 Подписки",
      friends: "🤝 Друзья",
    };
    return titles[listType] || "Список";
  };

  const getListIcon = () => {
    const icons = { followers: "👥", following: "👤", friends: "🤝" };
    return icons[listType] || "";
  };

  const avatarUrl =
    profileData?.avatar ||
    "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif";

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white flex items-center justify-center">
        <div className="text-purple-700 text-xl">Загрузка...</div>
      </div>
    );
  }

  if (loading || !profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />

      <div className="max-w-2xl mx-auto pt-8 px-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-6 border border-purple-100">
          <div className="flex flex-col items-center">
            {/* 🔷 АВАТАР — КЛИКАБЕЛЬНЫЙ */}
            <div className="relative mb-4">
              <Link to={`/profile/${profileData.uid}`} className="block">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-300 shadow-lg hover:scale-105 transition-transform cursor-pointer">
                  <img
                    src={avatarPreview || avatarUrl}
                    alt={profileData.username}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </Link>

              {/* Кнопка загрузки (только в своём профиле) */}
              {isOwnProfile && !avatarPreview && (
                <label className="absolute bottom-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:shadow-lg transition-all hover:scale-110">
                  <span className="text-lg">📷</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Превью нового аватара + кнопки */}
            {avatarPreview && isOwnProfile && (
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={handleUploadAvatar}
                  disabled={changingAvatar}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {changingAvatar ? "⏳ Загрузка..." : "💾 Сохранить"}
                </button>
                <button
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  }}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  ✕ Отмена
                </button>
              </div>
            )}

            {/* 🔷 ИМЯ — КЛИКАБЕЛЬНОЕ */}
            <Link
              to={`/profile/${profileData.uid}`}
              className="hover:underline"
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-1 hover:text-purple-600 transition-colors">
                @{profileData.username || "Пользователь"}
              </h1>
            </Link>

            {/* 🔷 О СЕБЕ */}
            <div className="w-full border-t border-gray-200 pt-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                О себе
              </h2>
              {editing ? (
                <div className="space-y-2">
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Расскажите о себе..."
                    rows="3"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                    style={{ color: "#000" }}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveBio}
                      disabled={saving}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-all"
                    >
                      {saving ? "⏳ Сохранение..." : "✅ Сохранить"}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setBio(profileData.bio || "");
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-all"
                    >
                      ✕ Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {profileData.bio || "Расскажите о себе..."}
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-purple-500 hover:text-purple-600 text-sm font-semibold ml-4"
                    >
                      ✏️ Редактировать
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 🔷 СЧЁТЧИКИ — КЛИКАБЕЛЬНЫЕ */}
            <div className="w-full grid grid-cols-3 gap-4">
              <button
                onClick={() => loadUserList("followers")}
                className="bg-purple-50 rounded-2xl p-4 text-center hover:bg-purple-100 transition-all cursor-pointer"
              >
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {profileData.followers?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Подписчиков</div>
              </button>
              <button
                onClick={() => loadUserList("following")}
                className="bg-pink-50 rounded-2xl p-4 text-center hover:bg-pink-100 transition-all cursor-pointer"
              >
                <div className="text-3xl font-bold text-pink-600 mb-1">
                  {profileData.following?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Подписок</div>
              </button>
              <button
                onClick={() => loadUserList("friends")}
                className="bg-orange-50 rounded-2xl p-4 text-center hover:bg-orange-100 transition-all cursor-pointer"
              >
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {
                    (profileData.followers || []).filter((id) =>
                      (profileData.following || []).includes(id),
                    ).length
                  }
                </div>
                <div className="text-sm text-gray-600">Друзей</div>
              </button>
            </div>

            {/* 🔷 КНОПКИ ДЕЙСТВИЙ */}
            {!isOwnProfile && (
              <div className="w-full space-y-3 mt-6">
                {!isFriend ? (
                  <button
                    onClick={handleAddFriend}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    ➕ Добавить в друзья
                  </button>
                ) : (
                  <div className="w-full bg-green-100 text-green-700 py-3 rounded-xl font-semibold text-center">
                    ✓ В друзьях
                  </div>
                )}
                <button
                  onClick={() => navigate(`/messages/${profileData.uid}`)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  💬 Написать сообщение
                </button>
              </div>
            )}

            {isOwnProfile && (
              <button
                onClick={handleLogout}
                className="w-full mt-6 bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                🚪 Выйти
              </button>
            )}
          </div>
        </div>

        {/* 🔷 ПОСТЫ ПОЛЬЗОВАТЕЛЯ */}
        <div>
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Посты</h2>
          {loading ? (
            <div className="text-center py-8 text-purple-600">Загрузка...</div>
          ) : userPosts.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 text-center border border-purple-100">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-500 text-lg">Пока нет постов</p>
              {isOwnProfile && (
                <button
                  onClick={() => navigate("/create")}
                  className="mt-4 text-purple-600 font-semibold hover:text-purple-700 transition-colors"
                >
                  Создать первый пост →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <Post
                  key={post.postId || post.id}
                  post={post}
                  onUpdate={loadProfile}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🔷 МОДАЛКА: ПРОСМОТР АВАТАРА */}
      {showFullAvatar && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullAvatar(false)}
        >
          <button className="absolute top-4 right-4 text-white/80 hover:text-white text-4xl w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all">
            ×
          </button>
          <div
            className="max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={avatarPreview || avatarUrl}
              alt="Full size avatar"
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
          <p className="absolute bottom-8 text-white/60 text-sm">
            Нажмите чтобы закрыть
          </p>
        </div>
      )}

      {/* 🔷 МОДАЛКА: СПИСОК ПОЛЬЗОВАТЕЛЕЙ */}
      {showUserList && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowUserList(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {getListIcon()} {getListTitle()}
              </h3>
              <button
                onClick={() => setShowUserList(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-2">
              {listLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-purple-600"></div>
                </div>
              ) : userList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg mb-2">Пусто</p>
                  <p className="text-sm">
                    Пока нет {getListTitle().toLowerCase()}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {userList.map((user) => (
                    <Link
                      key={user.id}
                      to={`/profile/${user.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all"
                      onClick={() => setShowUserList(false)}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-300">
                        <img
                          src={
                            user.avatar ||
                            "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
                          }
                          alt={user.username}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          @{user.username || "Пользователь"}
                        </p>
                        {user.bio && (
                          <p className="text-sm text-gray-500 truncate">
                            {user.bio}
                          </p>
                        )}
                      </div>
                      {listType === "friends" && (
                        <span className="text-green-500 text-sm">✓</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
