import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getConversations, getUserById } from "../services/ydb";
import { getUserGroups } from "../services/groups";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function Messages() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ Загрузка чатов (опрос каждые 3 секунды вместо onSnapshot)
  useEffect(() => {
    if (!currentUser) return;

    let intervalId;

    const loadConversations = async () => {
      try {
        const convs = await getConversations(currentUser.uid);

        const userConversationsMap = new Map();

        for (const conv of convs) {
          const participants = conv.participants || [];
          const otherUserId = participants.find((id) => id !== currentUser.uid);

          if (otherUserId) {
            try {
              const otherUser = await getUserById(otherUserId);

              if (otherUser) {
                const convData = {
                  id: conv.conversationId || conv.id,
                  ...conv,
                  user: {
                    id: otherUserId,
                    username: otherUser.username || otherUserId,
                    phone: otherUser.phone || "",
                    avatar: otherUser.avatar || "",
                    online: otherUser.online || false,
                  },
                };

                const existing = userConversationsMap.get(otherUserId);
                if (!existing) {
                  userConversationsMap.set(otherUserId, convData);
                } else {
                  const existingTime = existing.lastMessageTime
                    ? new Date(existing.lastMessageTime)
                    : new Date(0);
                  const newTime = convData.lastMessageTime
                    ? new Date(convData.lastMessageTime)
                    : new Date(0);
                  if (newTime > existingTime) {
                    userConversationsMap.set(otherUserId, convData);
                  }
                }
              }
            } catch (err) {
              console.error("Error loading user", otherUserId, err);
            }
          }
        }

        const conversationsData = Array.from(userConversationsMap.values());

        conversationsData.sort((a, b) => {
          const timeA = a.lastMessageTime
            ? new Date(a.lastMessageTime)
            : new Date(0);
          const timeB = b.lastMessageTime
            ? new Date(b.lastMessageTime)
            : new Date(0);
          return timeB - timeA;
        });

        setConversations(conversationsData);
        setLoading(false);
      } catch (error) {
        console.error("Error loading conversations:", error);
        setLoading(false);
      }
    };

    loadConversations(); // Первая загрузка
    intervalId = setInterval(loadConversations, 3000); // Опрос каждые 3 сек

    // Группы (пока оставляем как есть)
    const unsubscribeGroups = getUserGroups(currentUser.uid, (groupsData) => {
      setGroups(groupsData);
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      unsubscribeGroups();
    };
  }, [currentUser]);

  // ✅ Умный поиск
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery || searchQuery.trim() === "") {
      return true;
    }

    const q = searchQuery.toLowerCase();
    const username = conv.user?.username?.toLowerCase() || "";
    const phone = conv.user?.phone?.replace(/\D/g, "") || "";
    const searchClean = q.replace(/\D/g, "");

    if (q.startsWith("@") || q.length >= 2) {
      if (username.includes(q.replace("@", ""))) return true;
    }
    if (searchClean.length >= 10) {
      if (phone.includes(searchClean.slice(-10))) return true;
    }
    if (q.length >= 2 && username.includes(q)) return true;

    return false;
  });

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />
      <div className="max-w-4xl mx-auto pt-4 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">
            💬 Сообщения
          </h1>
          <button
            onClick={() => navigate("/messages/new")}
            className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl font-semibold hover:bg-white/30 transition-all"
          >
            + Новый чат
          </button>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Поиск по @нику или телефону..."
            className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-500"
            style={{ color: "#000" }}
          />
        </div>

        {filteredGroups.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-3 drop-shadow">
              👥 Группы
            </h2>
            <div className="space-y-2">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => navigate(`/messages/group/${group.id}`)}
                  className="bg-white/90 backdrop-blur-sm rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white transition-all shadow-md"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                    {group.avatar ? (
                      <img
                        src={group.avatar}
                        alt={group.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      group.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">
                      {group.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {group.participants?.length || 0} участников
                    </p>
                  </div>
                  {group.lastMessage && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600 truncate max-w-[150px]">
                        {group.lastMessage}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(group.lastMessageTime).toLocaleTimeString(
                          "ru-RU",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-white mb-3 drop-shadow">
            💬 Личные чаты
          </h2>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-600"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 text-center">
              <p className="text-gray-500 text-lg mb-2">
                {searchQuery ? "Ничего не найдено" : "Нет чатов"}
              </p>
              <p className="text-gray-400 text-sm">
                {searchQuery
                  ? "Попробуйте другой запрос"
                  : "Напишите кому-нибудь!"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.user.id}
                  onClick={() => navigate(`/messages/${conv.user.id}`)}
                  className="bg-white/90 backdrop-blur-sm rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white transition-all shadow-md"
                >
                  <div
                    className="relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${conv.user.id}`);
                    }}
                    title="Открыть профиль"
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-purple-300 hover:border-purple-500 transition-all cursor-pointer">
                      <img
                        src={
                          conv.user.avatar ||
                          "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
                        }
                        alt={conv.user.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {conv.user.online && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">
                      {conv.user.username}
                    </h3>
                    {conv.user.phone && (
                      <p className="text-xs text-gray-400 truncate">
                        {conv.user.phone}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 truncate">
                      {conv.lastMessage || "Нет сообщений"}
                    </p>
                  </div>
                  {conv.lastMessageTime && (
                    <p className="text-xs text-gray-400">
                      {new Date(conv.lastMessageTime).toLocaleTimeString(
                        "ru-RU",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
