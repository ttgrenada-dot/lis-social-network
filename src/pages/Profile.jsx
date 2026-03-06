import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function Profile() {
  const { currentUser, userData, logout } = useAuth();
  const { userId } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const profileUserId = userId || currentUser.uid;
  const isOwnProfile = !userId || userId === currentUser.uid;

  useEffect(() => {
    async function loadProfile() {
      try {
        const userDoc = await getDoc(doc(db, "users", profileUserId));
        if (userDoc.exists()) {
          setProfileData(userDoc.data());

          if (!isOwnProfile && currentUser) {
            const currentUserData = await getDoc(
              doc(db, "users", currentUser.uid),
            );
            if (currentUserData.exists()) {
              setIsFollowing(
                currentUserData.data().following?.includes(profileUserId) ||
                  false,
              );
            }
          }
        }
      } catch (error) {
        console.error("Ошибка загрузки профиля:", error);
      }
    }

    loadProfile();
  }, [profileUserId, currentUser, isOwnProfile]);

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      where("userId", "==", profileUserId),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUserPosts(postsData);
    });

    return () => unsubscribe();
  }, [profileUserId]);

  async function handleFollow() {
    if (!currentUser || isOwnProfile) return;

    setLoading(true);

    try {
      const currentUserRef = doc(db, "users", currentUser.uid);
      const profileUserRef = doc(db, "users", profileUserId);

      if (isFollowing) {
        await updateDoc(currentUserRef, {
          following: arrayRemove(profileUserId),
        });
        await updateDoc(profileUserRef, {
          followers: arrayRemove(currentUser.uid),
        });
        setIsFollowing(false);
      } else {
        await updateDoc(currentUserRef, {
          following: arrayUnion(profileUserId),
        });
        await updateDoc(profileUserRef, {
          followers: arrayUnion(currentUser.uid),
        });

        await addDoc(collection(db, "notifications"), {
          userId: profileUserId,
          fromUserId: currentUser.uid,
          fromUsername: currentUser.email.split("@")[0],
          type: "follow",
          read: false,
          timestamp: new Date().toISOString(),
        });

        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Ошибка подписки:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    await logout();
    setLoading(false);
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <div className="bg-white rounded-3xl p-6 shadow-lg mb-6">
          <div className="text-center mb-6">
            <img
              src={
                profileData?.avatar ||
                "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
              }
              alt="Avatar"
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-purple-500"
            />
            <h1 className="text-2xl font-bold text-gray-800">
              {profileData?.username || "Пользователь"}
            </h1>
            <p className="text-gray-500">{profileData?.email || ""}</p>
            {profileData?.bio && (
              <p className="text-gray-600 mt-2 text-sm">{profileData.bio}</p>
            )}
          </div>

          {/* Кнопка редактирования (только для своего профиля) */}
          {isOwnProfile && (
            <button
              onClick={() => navigate("/profile/edit")}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all mb-3"
            >
              Редактировать профиль
            </button>
          )}

          {/* Кнопка подписки (если не свой профиль) */}
          {!isOwnProfile && (
            <button
              onClick={handleFollow}
              disabled={loading}
              className={`w-full py-3 rounded-xl font-semibold mb-3 transition-all ${
                isFollowing
                  ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg"
              }`}
            >
              {loading ? "..." : isFollowing ? "Отписаться" : "Подписаться"}
            </button>
          )}

          {/* Статистика */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">
                {userPosts.length}
              </div>
              <div className="text-sm text-gray-500">Постов</div>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-xl">
              <div className="text-2xl font-bold text-pink-600">
                {profileData?.followers?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Подписчиков</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <div className="text-2xl font-bold text-orange-600">
                {profileData?.following?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Подписок</div>
            </div>
          </div>

          {/* Кнопка выхода (только для своего профиля) */}
          {isOwnProfile && (
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? "Выход..." : "Выйти"}
            </button>
          )}
        </div>

        {/* Посты пользователя */}
        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {isOwnProfile ? "Мои посты" : "Посты пользователя"}
          </h2>

          {userPosts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Пока нет постов</p>
          ) : (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <div
                  key={post.id}
                  className="border-b border-gray-200 pb-4 last:border-0"
                >
                  <p className="text-gray-800 mb-2">{post.content}</p>
                  {post.image && (
                    <img
                      src={post.image}
                      alt="Post"
                      className="w-full rounded-xl mb-2"
                    />
                  )}
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>❤️ {post.likes?.length || 0}</span>
                    <span>💬 {post.comments?.length || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
