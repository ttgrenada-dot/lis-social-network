import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../services/notifications";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function Notifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Подписка на real-time обновления
    const unsubscribe = subscribeToNotifications(currentUser.uid, (data) => {
      setNotifications(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleMarkAsRead = async (id) => {
    await markNotificationAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    await markAllNotificationsAsRead(currentUser.uid);
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return "❤️";
      case "comment":
        return "💬";
      case "follow":
        return "👤";
      case "mention":
        return "🔖";
      default:
        return "🔔";
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate?.() || new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "только что";
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400)
      return `${Math.floor(diff / 3600)} час${Math.floor(diff / 3600) > 1 ? "а" : ""} назад`;
    return date.toLocaleDateString("ru-RU");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Уведомления</h1>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-white/90 hover:text-white bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm transition-colors"
            >
              Прочитать все ({unreadCount})
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-white"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10 bg-white/10 rounded-2xl backdrop-blur-sm">
            <p className="text-white text-lg mb-2">🎉 Нет новых уведомлений</p>
            <p className="text-white/80">
              Здесь будут появляться лайки, комментарии и подписки
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-2xl shadow-sm flex items-start gap-4 transition-all ${
                  notification.read
                    ? "bg-white/80"
                    : "bg-white border-l-4 border-purple-500"
                }`}
                onClick={() =>
                  !notification.read && handleMarkAsRead(notification.id)
                }
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xl flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-gray-800">
                    <span className="font-semibold">
                      {notification.senderUsername}
                    </span>{" "}
                    {notification.message}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatTime(notification.createdAt)}
                  </p>

                  {notification.postId && (
                    <p className="text-xs text-purple-600 mt-1">→ Ваш пост</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  {!notification.read && (
                    <span className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    className="text-gray-400 hover:text-red-500 text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
