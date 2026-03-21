import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import Post from "../components/Post";
import StoriesBar from "../components/StoriesBar";

export default function Feed() {
  const { currentUser, userData } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(100),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const postsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPosts(postsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading posts:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-600 to-white">
        <div className="text-purple-700 text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white">
      <Header />

      {/* ✅ СТОРИС */}
      <StoriesBar />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">
            Лента
          </h1>
          <p className="text-white/90 drop-shadow">
            Добро пожаловать,{" "}
            {userData?.username || currentUser.email?.split("@")[0]}! 🦊
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-600"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-purple-700 text-lg mb-2">Пока нет постов</p>
            <p className="text-purple-500">
              Будьте первым кто создаст пост! 🦊
            </p>
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
