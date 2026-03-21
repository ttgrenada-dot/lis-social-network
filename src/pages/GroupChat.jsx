import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  getDocs,
} from "firebase/firestore";
import { uploadFile } from "../services/upload";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function GroupChat() {
  const { groupId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [addingUsers, setAddingUsers] = useState([]);
  const [senderAvatars, setSenderAvatars] = useState({});

  useEffect(() => {
    const getGroup = async () => {
      try {
        const groupRef = doc(db, "groups", groupId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists())
          setGroup({ id: groupSnap.id, ...groupSnap.data() });
      } catch (error) {
        console.error("Error getting group:", error);
      }
    };
    if (groupId) getGroup();
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    const messagesRef = collection(db, "groups", groupId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [groupId]);

  // ✅ Загружаем аватарки отправителей
  useEffect(() => {
    const loadSenderAvatars = async () => {
      const avatars = {};
      for (const msg of messages) {
        if (
          msg.senderId &&
          msg.senderId !== "system" &&
          !avatars[msg.senderId]
        ) {
          try {
            const userRef = doc(db, "users", msg.senderId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists())
              avatars[msg.senderId] = userSnap.data().avatar;
          } catch (e) {}
        }
      }
      setSenderAvatars(avatars);
    };
    if (messages.length > 0) loadSenderAvatars();
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ ПОИСК: по username ИЛИ по телефону
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const searchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        // 1. Поиск по username (частичный)
        let q = query(
          usersRef,
          where("username", ">=", searchQuery.toLowerCase()),
          where("username", "<=", searchQuery.toLowerCase() + "\uf8ff"),
        );
        let snapshot = await getDocs(q);

        // 2. Если не нашли и введен номер телефона (10+ цифр) - точный поиск
        if (snapshot.empty && searchQuery.replace(/\D/g, "").length >= 10) {
          const cleanedPhone = searchQuery.replace(/\D/g, "");
          const phoneQueries = [
            query(usersRef, where("phone", "==", cleanedPhone)),
            query(
              usersRef,
              where("phone", "==", "+7" + cleanedPhone.slice(-10)),
            ),
            query(
              usersRef,
              where("phone", "==", "8" + cleanedPhone.slice(-10)),
            ),
          ];
          for (const pq of phoneQueries) {
            const ps = await getDocs(pq);
            if (!ps.empty) {
              snapshot = ps;
              break;
            }
          }
        }

        const usersData = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter(
            (user) =>
              !group?.participants?.includes(user.id) &&
              user.id !== currentUser.uid,
          );
        setSearchResults(usersData);
      } catch (error) {
        console.error("Search error:", error);
      }
    };
    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, group?.participants, currentUser.uid]);

  const handleAddParticipants = async () => {
    if (selectedUsers.length === 0) {
      setShowAddParticipants(false);
      return;
    }
    try {
      setAddingUsers(selectedUsers);
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, { participants: arrayUnion(...selectedUsers) });
      const messagesRef = collection(db, "groups", groupId, "messages");
      await addDoc(messagesRef, {
        text: `➕ Добавлено участников: ${selectedUsers.length}`,
        senderId: "system",
        senderName: "Система",
        type: "system",
        createdAt: serverTimestamp(),
      });
      setGroup({
        ...group,
        participants: [...(group?.participants || []), ...selectedUsers],
      });
      setSelectedUsers([]);
      setSearchQuery("");
      setShowAddParticipants(false);
      alert("✅ Участники добавлены!");
    } catch (error) {
      console.error("Error adding participants:", error);
      alert("Ошибка: " + error.message);
    } finally {
      setAddingUsers([]);
    }
  };

  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId))
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    else setSelectedUsers([...selectedUsers, userId]);
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedFile) || !groupId || sending) return;
    setSending(true);
    try {
      let fileUrl = "",
        fileType = "",
        fileName = "";
      if (selectedFile) {
        const folder = selectedFile.type.startsWith("image/")
          ? "photos"
          : selectedFile.type.startsWith("video/")
            ? "videos"
            : "files";
        fileUrl = await uploadFile(selectedFile, currentUser.uid, folder);
        fileType = selectedFile.type;
        fileName = selectedFile.name;
      }
      const messagesRef = collection(db, "groups", groupId, "messages");
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        fileUrl,
        fileType,
        fileName,
        senderId: currentUser.uid,
        senderName: currentUser.username || currentUser.email?.split("@")[0],
        createdAt: serverTimestamp(),
      });
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        lastMessage: selectedFile ? `📎 ${fileName}` : newMessage.trim(),
        lastMessageTime: serverTimestamp(),
        lastMessageBy: currentUser.uid,
      });
      setNewMessage("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error sending:", error);
      alert("Ошибка отправки: " + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const limits = {
        "image/": 10,
        "video/": 100,
        "application/": 50,
        "audio/": 20,
      };
      let maxMB = 10;
      for (const [type, mb] of Object.entries(limits)) {
        if (file.type.startsWith(type)) {
          maxMB = mb;
          break;
        }
      }
      if (file.size > maxMB * 1024 * 1024) {
        alert(`Файл слишком большой! Максимум ${maxMB}MB`);
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatTime = (ts) =>
    ts
      ? new Date(ts.toDate?.() || ts).toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
  const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) =>
      urlRegex.test(part) ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-300 underline break-all"
        >
          {part}
        </a>
      ) : (
        part
      ),
    );
  };
  const getFileIcon = (type) => {
    if (!type) return "📄";
    if (type.startsWith("image/")) return "🖼️";
    if (type.startsWith("video/")) return "🎬";
    if (type.startsWith("audio/")) return "🎵";
    if (type.includes("pdf")) return "📕";
    if (type.includes("word") || type.includes("document")) return "📝";
    if (type.includes("excel") || type.includes("sheet")) return "📊";
    if (type.includes("zip") || type.includes("rar")) return "🗜️";
    return "📎";
  };

  if (!group)
    return (
      <div className="min-h-screen flex items-center justify-center text-purple-700">
        Загрузка...
      </div>
    );
  const isCreator = group.creatorId === currentUser.uid;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />
      {/* Шапка группы */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-purple-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/messages")}
            className="p-2 hover:bg-purple-100 rounded-full"
          >
            ←
          </button>
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate(`/group/${groupId}`)}
            title="Информация о группе"
          >
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
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">{group.name}</h2>
            <p className="text-xs text-gray-500">
              {group.participants?.length || 0} участников
            </p>
          </div>
          {isCreator && (
            <button
              onClick={() => setShowAddParticipants(true)}
              className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:shadow-lg transition-all"
              title="Добавить участников"
            >
              <span className="text-xl">➕</span>
            </button>
          )}
        </div>
      </div>

      {/* Сообщения */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-purple-700 text-lg mb-2">Нет сообщений</p>
            <p className="text-purple-500">Будьте первым кто напишет!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMyMessage = message.senderId === currentUser.uid;
            const isSystemMessage = message.type === "system";
            return (
              <div
                key={message.id}
                className={`flex ${isMyMessage ? "justify-end" : "justify-start"} ${isSystemMessage ? "justify-center" : ""}`}
              >
                {isSystemMessage ? (
                  <div className="bg-gray-200/80 backdrop-blur-sm text-gray-700 rounded-full px-4 py-2 text-sm">
                    {message.text}
                  </div>
                ) : (
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${isMyMessage ? "bg-purple-600 text-white rounded-br-none" : "bg-white/90 text-gray-900 rounded-bl-none shadow-md"}`}
                  >
                    {!isMyMessage && (
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-6 h-6 rounded-full overflow-hidden cursor-pointer hover:scale-110 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${message.senderId}`);
                          }}
                          title="Открыть профиль"
                        >
                          <img
                            src={
                              senderAvatars[message.senderId] ||
                              "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
                            }
                            alt={message.senderName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p
                          className="text-xs font-semibold text-purple-600 cursor-pointer hover:text-purple-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${message.senderId}`);
                          }}
                        >
                          {message.senderName}
                        </p>
                      </div>
                    )}
                    {message.fileUrl &&
                      message.fileType?.startsWith("image/") && (
                        <img
                          src={message.fileUrl}
                          alt="file"
                          className="rounded-lg mb-2 max-w-full cursor-pointer hover:opacity-90"
                          onClick={() => window.open(message.fileUrl, "_blank")}
                        />
                      )}
                    {message.fileUrl &&
                      message.fileType?.startsWith("video/") && (
                        <video
                          src={message.fileUrl}
                          controls
                          className="rounded-lg mb-2 max-w-full"
                        />
                      )}
                    {message.fileUrl &&
                      !message.fileType?.startsWith("image/") &&
                      !message.fileType?.startsWith("video/") && (
                        <a
                          href={message.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-white/20 p-3 rounded-lg mb-2 text-sm hover:bg-white/30 transition-all"
                        >
                          <span className="text-xl">
                            {getFileIcon(message.fileType)}
                          </span>
                          <span className="break-all">
                            {message.fileName || "Файл"}
                          </span>
                        </a>
                      )}
                    {message.text && (
                      <p className="break-words whitespace-pre-wrap">
                        {renderTextWithLinks(message.text)}
                      </p>
                    )}
                    <p
                      className={`text-xs mt-1 ${isMyMessage ? "text-purple-200" : "text-gray-400"}`}
                    >
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <div className="fixed bottom-20 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-purple-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {selectedFile && (
            <div className="mb-2 flex items-center justify-between bg-purple-50 p-2 rounded-lg">
              <span className="text-sm truncate flex items-center gap-2">
                <span className="text-lg">
                  {getFileIcon(selectedFile.type)}
                </span>
                {selectedFile.name}
              </span>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-red-500 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label
              className="p-2 hover:bg-purple-100 rounded-full cursor-pointer transition-all"
              title="Прикрепить файл"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="text-2xl">📎</span>
            </label>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Введите сообщение..."
              className="flex-1 px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-full focus:outline-none focus:border-purple-500"
              style={{ color: "#000" }}
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={(!newMessage.trim() && !selectedFile) || sending}
              className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "⏳" : "➤"}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            📷 Фото (10MB) • 🎬 Видео (100MB) • 📄 Файлы (50MB)
          </p>
        </div>
      </div>

      {/* Модальное окно: Добавить участников */}
      {showAddParticipants && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowAddParticipants(false);
            setSelectedUsers([]);
            setSearchQuery("");
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                ➕ Добавить участников
              </h3>
              <button
                onClick={() => {
                  setShowAddParticipants(false);
                  setSelectedUsers([]);
                  setSearchQuery("");
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all"
              >
                ✕
              </button>
            </div>
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Поиск по @нику или телефону..."
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                style={{ color: "#000" }}
              />
            </div>
            {selectedUsers.length > 0 && (
              <div className="p-3 bg-purple-50 border-b border-purple-200">
                <p className="text-sm font-medium text-purple-700 mb-2">
                  Выбрано: {selectedUsers.length}
                </p>
                <div className="flex flex-wrap gap-2">
                  {searchResults
                    .filter((user) => selectedUsers.includes(user.id))
                    .map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-purple-200"
                      >
                        <span className="text-sm text-gray-700">
                          {user.username}
                        </span>
                        <button
                          onClick={() => toggleUser(user.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
            <div className="overflow-y-auto max-h-[40vh] p-2">
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p>Пользователи не найдены</p>
                  <p className="text-xs mt-1">
                    Попробуйте ввести @ник или полный номер телефона
                  </p>
                </div>
              )}
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${selectedUsers.includes(user.id) ? "bg-purple-100 border-2 border-purple-500" : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"}`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <img
                      src={
                        user.avatar ||
                        "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
                      }
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">
                      {user.username}
                    </p>
                    <p className="text-xs text-gray-500">{user.phone}</p>
                    {user.bio && (
                      <p className="text-sm text-gray-500 truncate">
                        {user.bio}
                      </p>
                    )}
                  </div>
                  {selectedUsers.includes(user.id) && (
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleAddParticipants}
                disabled={selectedUsers.length === 0 || addingUsers.length > 0}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingUsers.length > 0
                  ? "⏳ Добавление..."
                  : `➕ Добавить (${selectedUsers.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
