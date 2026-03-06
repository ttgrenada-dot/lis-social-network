import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import StoriesBar from "../components/StoriesBar";
import StoryViewer from "../components/StoryViewer";
import Post from "../components/Post";

export default function Feed() {
  const { currentUser, userData } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [followingIds, setFollowingIds] = useState([]);
  const [viewingStories, setViewingStories] = useState(null);
  const [userStoriesData, setUserStoriesData] = useState([]);

  useEffect(() => {
    if (!currentUser) return;

    const loadFollowing = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const following = userDoc.data().following || [];
          setFollowingIds(following);
        }
      } catch (error) {
        console.error("Ошибка загрузки подписок:", error);
      }
    };

    loadFollowing();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "stories"),
      where("expiresAt", ">", new Date().toISOString()),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storiesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const grouped = {};
      storiesData.forEach((story) => {
        if (!grouped[story.userId]) {
          grouped[story.userId] = {
            userId: story.userId,
            username: story.username,
            userAvatar: story.userAvatar,
            stories: [],
            hasUnseen: false,
          };
        }
        grouped[story.userId].stories.push(story);

        if (!story.viewers?.includes(currentUser.uid)) {
          grouped[story.userId].hasUnseen = true;
        }
      });

      setUserStoriesData(Object.values(grouped));
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    let q;

    if (filter === "following" && followingIds.length > 0) {
      if (followingIds.length <= 10) {
        q = query(
          collection(db, "posts"),
          where("userId", "in", followingIds),
          orderBy("timestamp", "desc"),
        );
      } else {
        q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
      }
    } else {
      q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let postsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (filter === "following" && followingIds.length > 10) {
          postsData = postsData.filter((post) =>
            followingIds.includes(post.userId),
          );
        }

        setPosts(postsData);
        setLoading(false);
      },
      (error) => {
        console.error("Ошибка загрузки постов:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser, filter, followingIds]);

  function handleViewStory(userId) {
    const userStories = userStoriesData.find((u) => u.userId === userId);
    if (userStories) {
      setViewingStories(userStories.stories);
    }
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
        <StoriesBar onViewStory={handleViewStory} />

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Лента</h1>

            <div className="flex bg-white/20 rounded-xl p-1">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === "all"
                    ? "bg-white text-purple-600 shadow"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setFilter("following")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === "following"
                    ? "bg-white text-purple-600 shadow"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Подписки
              </button>
            </div>
          </div>

          <p className="text-white/90">
            Добро пожаловать, {userData?.username || currentUser.email}! 🦊
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-white"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-white text-lg mb-2">
              {filter === "following"
                ? "Нет постов от подписок"
                : "Пока нет постов"}
            </p>
            <p className="text-white/80">
              {filter === "following"
                ? "Подпишитесь на пользователей чтобы видеть их посты"
                : "Будьте первым кто создаст пост! 🦊"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Post key={post.id} post={post} />
            ))}
          </div>
        )}

        {viewingStories && (
          <StoryViewer
            stories={viewingStories}
            currentIndex={0}
            onClose={() => setViewingStories(null)}
            onNext={() => setViewingStories(null)}
            onPrev={() => setViewingStories(null)}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
}
