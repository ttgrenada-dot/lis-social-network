import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [notificationCount, setNotificationCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);

  const isActive = (path) => location.pathname === path;

  // 🔷 Обновляем счетчики
  useEffect(() => {
    if (!currentUser) return;

    const getCounts = async () => {
      try {
        const [notifRes, chatRes] = await Promise.all([
          fetch("/api/notifications/unread-count"),
          fetch("/api/conversations/unread-total"),
        ]);
        const notifData = await notifRes.json();
        const chatData = await chatRes.json();
        setNotificationCount(notifData.count || 0);
        setChatCount(chatData.total || 0);
      } catch (error) {
        console.error("Error getting counts:", error);
      }
    };

    getCounts();
    const interval = setInterval(getCounts, 10000); // Обновлять каждые 10 сек
    return () => clearInterval(interval);
  }, [currentUser]);

  return (
    <header className="bg-gradient-to-b from-purple-600 via-purple-500 to-purple-400 shadow-sm sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-2 py-2">
        {/* Верхняя панель с быстрым доступом */}
        <div className="flex items-center justify-between">
          {/* Левая часть: Фото-эстафета и Челлендж */}
          <div className="flex items-center gap-1">
            {/* Фото-эстафета */}
            <Link
              to="/photo-chain"
              className={`flex flex-col items-center p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm min-w-[50px] ${
                isActive("/photo-chain") ? "bg-white/30 scale-105" : ""
              }`}
              title="Фото-эстафета"
            >
              <span className="text-xl">📸</span>
              <span className="text-[9px] text-white/90 font-medium leading-tight">
                Эстафета
              </span>
            </Link>

            {/* Челлендж */}
            <Link
              to="/challenge"
              className={`flex flex-col items-center p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm min-w-[50px] ${
                isActive("/challenge") ? "bg-white/30 scale-105" : ""
              }`}
              title="Челлендж наоборот"
            >
              <span className="text-xl">🔄</span>
              <span className="text-[9px] text-white/90 font-medium leading-tight">
                Челлендж
              </span>
            </Link>
          </div>

          {/* Логотип LIS по центру */}
          <Link
            to="/"
            className="text-3xl font-bold px-2"
            style={{
              fontFamily: "'Parisienne', cursive",
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-red-500">
              Lis
            </span>
          </Link>

          {/* Правая часть: 🔔 Уведомления + 💬 Чат */}
          <div className="flex items-center gap-1">
            {/* 🔔 УВЕДОМЛЕНИЯ — ПЕРВАЯ ИКОНКА */}
            <Link
              to="/notifications"
              className={`relative flex flex-col items-center p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm min-w-[50px] ${
                isActive("/notifications") ? "bg-white/30 scale-105" : ""
              }`}
              title="Уведомления"
            >
              <span className="text-xl">🔔</span>
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-purple-500">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
              <span className="text-[9px] text-white/90 font-medium leading-tight mt-0.5">
                Увед.
              </span>
            </Link>

            {/* 💬 ЧАТ — ВТОРАЯ ИКОНКА */}
            <button
              onClick={() => navigate("/messages")}
              className={`relative flex flex-col items-center p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm min-w-[50px] ${
                isActive("/messages") ? "bg-white/30 scale-105" : ""
              }`}
              title="Сообщения"
            >
              <span className="text-xl">💬</span>
              {chatCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-purple-500">
                  {chatCount > 9 ? "9+" : chatCount}
                </span>
              )}
              <span className="text-[9px] text-white/90 font-medium leading-tight mt-0.5">
                Чат
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
