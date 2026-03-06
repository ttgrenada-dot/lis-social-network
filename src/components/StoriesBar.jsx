import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function StoriesBar({ onViewStory }) {
  const { currentUser } = useAuth();
  const [userStories, setUserStories] = useState([]);

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

      setUserStories(Object.values(grouped));
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (!userStories || userStories.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border-b border-gray-200 p-4 mb-4">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {userStories.map((user) => (
          <button
            key={user.userId}
            onClick={() => onViewStory(user.userId)}
            className="flex flex-col items-center space-y-1 flex-shrink-0"
          >
            <div
              className={`p-0.5 rounded-full ${
                user.hasUnseen
                  ? "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600"
                  : "bg-gray-300"
              }`}
            >
              <div className="bg-white p-0.5 rounded-full">
                <img
                  src={user.userAvatar}
                  alt={user.username}
                  className="w-16 h-16 rounded-full object-cover"
                />
              </div>
            </div>

            <span className="text-xs text-gray-700 max-w-[72px] truncate">
              {user.username}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
