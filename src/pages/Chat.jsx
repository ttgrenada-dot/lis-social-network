import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getUserById,
  getMessages,
  addMessage,
  getConversations,
  createConversation,
  updateConversation,
} from "../services/ydb";
import { uploadFile } from "../services/upload";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function Chat() {
  const { userId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // ✅ Загрузка данных собеседника
  useEffect(() => {
    const getUser = async () => {
      try {
        const user = await getUserById(userId);
        if (user) setOtherUser({ id: user.uid, ...user });
      } catch (error) {
        console.error("Error getting user:", error);
      }
    };
    if (userId) getUser();
  }, [userId]);

  // ✅ Поиск или создание разговора
  useEffect(() => {
    if (!userId || !currentUser) return;
    const findOrCreateConversation = async () => {
      try {
        const conversations = await getConversations(currentUser.uid);

        // Ищем существующий разговор
        let existingConv = conversations.find((conv) => {
          const participants = conv.participants || [];
          return (
            participants.includes(userId) &&
            participants.includes(currentUser.uid)
          );
        });

        if (existingConv) {
          setConversationId(existingConv.conversationId || existingConv.id);
        } else {
          // Создаём новый разговор
          const result = await createConversation({
            participants: [currentUser.uid, userId].sort(),
            lastMessage: "",
            lastMessageBy: "",
          });
          setConversationId(result.conversationId);
        }
      } catch (error) {
        console.error("Error creating conversation:", error);
      }
    };
    findOrCreateConversation();
  }, [userId, currentUser]);

  // ✅ Загрузка сообщений (опрос каждые 3 секунды вместо onSnapshot)
  useEffect(() => {
    if (!conversationId) return;

    let intervalId;

    const loadMessages = async () => {
      try {
        const msgs = await getMessages(conversationId);
        setMessages(msgs);
        setLoading(false);
      } catch (error) {
        console.error("Error loading messages:", error);
        setLoading(false);
      }
    };

    loadMessages(); // Первая загрузка
    intervalId = setInterval(loadMessages, 3000); // Опрос каждые 3 сек

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [conversationId]);

  // ✅ Автопрокрутка вниз
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Отправка сообщения
  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedFile) || !conversationId || sending)
      return;
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

      await addMessage(conversationId, {
        senderId: currentUser.uid,
        text: newMessage.trim(),
        fileUrl,
        fileType,
        fileName,
        read: false,
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

  // ✅ Форматирование времени (обычный Date вместо Firebase Timestamp)
  const formatTime = (ts) => {
    if (!ts) return "";
    const date = ts instanceof Date ? ts : new Date(ts);
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  if (!otherUser)
    return (
      <div className="min-h-screen flex items-center justify-center text-purple-700">
        Загрузка...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />
      {/* ✅ ШАПКА С ПЕРЕХОДОМ В ПРОФИЛЬ */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-purple-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/messages")}
            className="p-2 hover:bg-purple-100 rounded-full"
          >
            ←
          </button>
          <div
            className="relative cursor-pointer"
            onClick={() => navigate(`/profile/${otherUser.id}`)}
            title="Открыть профиль"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-300 hover:border-purple-500 transition-all">
              <img
                src={
                  otherUser.avatar ||
                  "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
                }
                alt={otherUser.username}
                className="w-full h-full object-cover"
              />
            </div>
            {otherUser.online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div
            className="flex-1 cursor-pointer"
            onClick={() => navigate(`/profile/${otherUser.id}`)}
          >
            <h2 className="font-bold text-gray-900 hover:text-purple-600 transition-colors">
              {otherUser.username}
            </h2>
            <p className="text-xs text-gray-500">
              {otherUser.online ? "онлайн" : "офлайн"}
            </p>
          </div>
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
            <p className="text-purple-500">Напишите первое сообщение!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMy = msg.senderId === currentUser.uid;
            return (
              <div
                key={msg.messageId || msg.id}
                className={`flex ${isMy ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${isMy ? "bg-purple-600 text-white rounded-br-none" : "bg-white/90 text-gray-900 rounded-bl-none shadow-md"}`}
                >
                  {msg.fileUrl && msg.fileType?.startsWith("image/") && (
                    <img
                      src={msg.fileUrl}
                      alt="file"
                      className="rounded-lg mb-2 max-w-full cursor-pointer hover:opacity-90"
                      onClick={() => window.open(msg.fileUrl, "_blank")}
                    />
                  )}
                  {msg.fileUrl && msg.fileType?.startsWith("video/") && (
                    <video
                      src={msg.fileUrl}
                      controls
                      className="rounded-lg mb-2 max-w-full"
                    />
                  )}
                  {msg.fileUrl &&
                    !msg.fileType?.startsWith("image/") &&
                    !msg.fileType?.startsWith("video/") && (
                      <a
                        href={msg.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white/20 p-3 rounded-lg mb-2 text-sm hover:bg-white/30 transition-all"
                      >
                        <span className="text-xl">
                          {getFileIcon(msg.fileType)}
                        </span>
                        <span className="break-all">
                          {msg.fileName || "Файл"}
                        </span>
                      </a>
                    )}
                  {msg.text && (
                    <p className="break-words whitespace-pre-wrap">
                      {renderTextWithLinks(msg.text)}
                    </p>
                  )}
                  <p
                    className={`text-xs mt-1 ${isMy ? "text-purple-200" : "text-gray-400"}`}
                  >
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
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
      <BottomNav />
    </div>
  );
}
