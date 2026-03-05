import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function Profile() {
  const { currentUser, userData, logout } = useAuth();
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {/* Профиль */}
        <div className="bg-white rounded-3xl p-6 shadow-lg mb-6">
          <div className="text-center mb-6">
            <img
              src={
                userData?.avatar ||
                "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
              }
              alt="Avatar"
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-purple-500"
            />
            <h1 className="text-2xl font-bold text-gray-800">
              {userData?.username || "Пользователь"}
            </h1>
            <p className="text-gray-500">{currentUser.email}</p>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">
                {userData?.posts || 0}
              </div>
              <div className="text-sm text-gray-500">Постов</div>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-xl">
              <div className="text-2xl font-bold text-pink-600">
                {userData?.followers?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Подписчиков</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <div className="text-2xl font-bold text-orange-600">
                {userData?.following?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Подписок</div>
            </div>
          </div>

          {/* Кнопка выхода */}
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? "Выход..." : "Выйти"}
          </button>
        </div>

        {/* Мои посты */}
        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Мои посты</h2>
          <p className="text-gray-500 text-center py-8">Пока нет постов</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
