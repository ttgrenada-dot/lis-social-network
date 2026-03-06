import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function Search() {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function searchUsers() {
      if (!searchQuery.trim()) {
        setUsers([]);
        return;
      }

      setLoading(true);

      try {
        const q = query(
          collection(db, "users"),
          where("username", ">=", searchQuery.toLowerCase()),
          where("username", "<=", searchQuery.toLowerCase() + "\uf8ff"),
          limit(10),
        );

        const querySnapshot = await getDocs(q);
        const usersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const filteredUsers = usersData.filter(
          (user) => user.id !== currentUser.uid,
        );

        setUsers(filteredUsers);
      } catch (error) {
        console.error("Ошибка поиска:", error);
      } finally {
        setLoading(false);
      }
    }

    const timeoutId = setTimeout(searchUsers, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentUser.uid]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold text-white mb-6">Поиск</h1>

        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск пользователей..."
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 shadow-lg"
            style={{ color: "#000000" }}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-white"></div>
          </div>
        ) : users.length === 0 && searchQuery.trim() ? (
          <div className="text-center py-10">
            <p className="text-white/80 text-lg">Пользователи не найдены</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-white/80 text-lg">Введите имя для поиска</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => navigate(`/profile/${user.id}`)}
                className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-lg transition-all"
              >
                <img
                  src={
                    user.avatar ||
                    "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
                  }
                  alt={user.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{user.username}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <button className="text-purple-600 font-semibold text-sm">
                  Перейти →
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
