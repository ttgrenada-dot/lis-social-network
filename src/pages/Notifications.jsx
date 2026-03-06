import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  limit,
} from "firebase/firestore";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function Notifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      orderBy("timestamp", "desc"),
      limit(50),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setNotifications(notificationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  async function markAsRead(notificationId) {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      });
    } catch (error) {
      console.error("Ошибка обновления уведомления:", error);
    }
  }

  function handleNotificationClick(notification) {
    markAsRead(notification.id);

    if (notification.type === "follow") {
      navigate(`/profile/${notification.fromUserId}`);
    } else if (
      notification.type === "like" ||
      notification.type === "comment"
    ) {
      navigate("/");
    }
  }

  function getIcon(type) {
    switch (type) {
      case "like":
        return "❤️";
      case "comment":
        return "💬";
      case "follow":
        return "👤";
      default:
        return "🔔";
    }
  }

  function getColor(type) {
    switch (type) {
      case "like":
        return "from-red-400 to-pink-400";
      case "comment":
        return "from-blue-400 to-purple-400";
      case "follow":
        return "from-green-400 to-teal-400";
      default:
        return "from-purple-400 to-pink-400";
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Уведомления</h1>
          {notifications.some((n) => !n.read) && (
            <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full">
              Новые
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-white"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-6xl mb-4">🔔</div>
            <p className="text-white text-lg mb-2">Нет уведомлений</p>
            <p className="text-white/80">
              Когда кто-то лайкнет или прокомментирует - появится здесь
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 cursor-pointer transition-all hover:shadow-lg ${
                  !notification.read ? "border-2 border-purple-400" : ""
                }`}
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${getColor(notification.type)} rounded-full flex items-center justify-center text-white text-xl flex-shrink-0`}
                >
                  {getIcon(notification.type)}
                </div>

                <div className="flex-1">
                  <p className="text-gray-800">
                    <span className="font-semibold">
                      {notification.fromUsername}
                    </span>{" "}
                    {notification.type === "like" && "понравился ваш пост"}
                    {notification.type === "comment" &&
                      "прокомментировал ваш пост"}
                    {notification.type === "follow" && "подписался на вас"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(notification.timestamp).toLocaleString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {!notification.read && (
                  <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
