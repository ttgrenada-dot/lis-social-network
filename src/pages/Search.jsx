import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function Search() {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const mockUsers = [
    {
      id: 1,
      username: "test_user",
      avatar:
        "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif",
    },
    {
      id: 2,
      username: "alex_ddog",
      avatar:
        "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Поиск</h1>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск пользователей..."
          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 mb-6"
          style={{ color: "#000000" }}
        />

        <div className="space-y-3">
          {mockUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4"
            >
              <img
                src={user.avatar}
                alt={user.username}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{user.username}</p>
              </div>
              <button className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                Подписаться
              </button>
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
