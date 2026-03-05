import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import Post from "../components/Post";

export default function Feed() {
  const { currentUser, userData } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загрузка постов (пока заглушка)
    const mockPosts = [
      {
        id: 1,
        user: {
          username: "test_user",
          avatar:
            "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif",
        },
        content: "Привет! Это первый пост в Lis! 🦊",
        image: "",
        likes: 5,
        comments: 2,
        timestamp: "2 часа назад",
      },
      {
        id: 2,
        user: {
          username: "alex_ddog",
          avatar:
            "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif",
        },
        content: "Отличная социальная сеть! 🔥",
        image: "",
        likes: 12,
        comments: 5,
        timestamp: "5 часов назад",
      },
    ];

    setPosts(mockPosts);
    setLoading(false);
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Лента</h1>
          <p className="text-gray-500">
            Добро пожаловать, {userData?.username || currentUser.email}! 🦊
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Post key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
