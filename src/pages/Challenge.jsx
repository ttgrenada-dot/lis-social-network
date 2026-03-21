import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getActiveChallenges,
  createChallenge,
  joinChallenge,
  markDayComplete,
  getUserProgress,
  deleteChallenge,
  subscribeToUserProgress,
} from "../services/challenge";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function Challenge() {
  const { currentUser, userData } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  // Для создания челленджа
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(7);
  const [category, setCategory] = useState("other");

  useEffect(() => {
    const unsubscribe = getActiveChallenges((data) => {
      setChallenges(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateChallenge = async () => {
    if (!title.trim()) {
      alert("Введите название челленджа!");
      return;
    }

    try {
      const result = await createChallenge({
        title,
        description,
        creatorId: currentUser.uid,
        creatorUsername: userData?.username || currentUser.email.split("@")[0],
        duration: parseInt(duration),
        category,
      });

      if (result.success) {
        alert("Челлендж создан! 💪");
        setShowCreateModal(false);
        setTitle("");
        setDescription("");
        setDuration(7);
        setCategory("other");
      } else {
        alert("Ошибка: " + result.error);
      }
    } catch (error) {
      alert("Ошибка создания: " + error.message);
    }
  };

  const handleJoinChallenge = async (challenge) => {
    try {
      const result = await joinChallenge(challenge.id, currentUser.uid);
      if (result.success) {
        alert("Ты присоединился к челленджу! 🎯");
      }
    } catch (error) {
      alert("Ошибка: " + error.message);
    }
  };

  const handleMarkDayComplete = async (challenge, currentDay) => {
    try {
      const result = await markDayComplete(
        challenge.id,
        currentUser.uid,
        currentDay + 1,
      );
      if (result.success) {
        alert(`День ${currentDay + 1} завершён! Так держать! 🔥`);
      }
    } catch (error) {
      alert("Ошибка: " + error.message);
    }
  };

  const handleDeleteChallenge = async (challenge) => {
    if (!confirm("Удалить этот челлендж?")) return;

    try {
      const result = await deleteChallenge(
        challenge.id,
        currentUser.uid,
        challenge.creator.userId,
      );

      if (result.success) {
        alert("Челлендж удален! 🗑️");
      } else {
        alert("Ошибка: " + result.error);
      }
    } catch (error) {
      alert("Ошибка удаления: " + error.message);
    }
  };

  const getCategoryEmoji = (cat) => {
    const emojis = {
      sugar: "🍬",
      smoking: "🚭",
      alcohol: "🍷",
      social_media: "📱",
      junk_food: "🍔",
      procrastination: "⏰",
      other: "💪",
    };
    return emojis[cat] || "💪";
  };

  const getCategoryName = (cat) => {
    const names = {
      sugar: "Без сахара",
      smoking: "Без курения",
      alcohol: "Без алкоголя",
      social_media: "Без соцсетей",
      junk_food: "Без фастфуда",
      procrastination: "Без прокрастинации",
      other: "Другое",
    };
    return names[cat] || cat;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400 pb-20">
      <Header />

      <div className="max-w-2xl mx-auto pt-4 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">
            🔄 Челлендж наоборот
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-purple-600 px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            + Создать
          </button>
        </div>

        {/* Инфо блок */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6 text-white">
          <p className="text-sm">
            <strong>💡 Как это работает:</strong> Создай челлендж "7 дней
            без..." и пригласи друзей отказаться от вредной привычки вместе!
          </p>
        </div>

        {loading ? (
          <div className="text-center py-10 text-white">Загрузка...</div>
        ) : challenges.length === 0 ? (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 text-center">
            <p className="text-white text-lg mb-2">Нет активных челленджей</p>
            <p className="text-white/80 text-sm">Будь первым кто создаст! 💪</p>
          </div>
        ) : (
          <div className="space-y-4">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden"
              >
                {/* Заголовок */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white relative">
                  {challenge.creator.userId === currentUser.uid && (
                    <button
                      onClick={() => handleDeleteChallenge(challenge)}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/20 hover:bg-red-500 rounded-full flex items-center justify-center transition-all"
                      title="Удалить челлендж"
                    >
                      <span className="text-xl leading-none text-white">×</span>
                    </button>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="pr-8">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">
                          {getCategoryEmoji(challenge.category)}
                        </span>
                        <h3 className="font-bold text-lg">{challenge.title}</h3>
                      </div>
                      <p className="text-sm opacity-90">
                        Создал: {challenge.creator.username}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {challenge.participants?.length || 1} участника
                      </p>
                      <p className="text-xs opacity-80">
                        {challenge.duration} дней
                      </p>
                    </div>
                  </div>
                </div>

                {/* Описание */}
                <div className="p-4">
                  <p className="text-gray-700 mb-4">{challenge.description}</p>

                  {/* Прогресс (если участвуешь) */}
                  <UserProgress
                    challenge={challenge}
                    onMarkComplete={handleMarkDayComplete}
                  />

                  {/* Кнопка присоединиться */}
                  {!challenge.participants?.includes(currentUser.uid) && (
                    <button
                      onClick={() => handleJoinChallenge(challenge)}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                      🎯 Присоединиться к челленджу
                    </button>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex -space-x-2">
                      {challenge.participants?.slice(0, 5).map((_, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-white flex items-center justify-center text-xs text-white font-bold"
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Завершили: {challenge.completions || 0}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно создания */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">🔄 Создать челлендж</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Название *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: 7 дней без сахара"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500"
                  style={{ color: "#000" }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Категория
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500"
                  style={{ color: "#000" }}
                >
                  <option value="sugar">🍬 Без сахара</option>
                  <option value="smoking">🚭 Без курения</option>
                  <option value="alcohol">🍷 Без алкоголя</option>
                  <option value="social_media">📱 Без соцсетей</option>
                  <option value="junk_food">🍔 Без фастфуда</option>
                  <option value="procrastination">⏰ Без прокрастинации</option>
                  <option value="other">💪 Другое</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Длительность (дней)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500"
                  style={{ color: "#000" }}
                >
                  <option value="7">7 дней</option>
                  <option value="14">14 дней</option>
                  <option value="21">21 день</option>
                  <option value="30">30 дней</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Описание
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Расскажи о своём челлендже..."
                  rows="3"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500"
                  style={{ color: "#000" }}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateChallenge}
                disabled={!title.trim()}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                Создать челлендж
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setTitle("");
                  setDescription("");
                  setDuration(7);
                  setCategory("other");
                }}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

// Компонент прогресса пользователя
function UserProgress({ challenge, onMarkComplete }) {
  const { currentUser } = useAuth();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!challenge.participants?.includes(currentUser.uid)) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToUserProgress(
      challenge.id,
      currentUser.uid,
      (data) => {
        setProgress(data);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [challenge.id, currentUser.uid, challenge.participants]);

  if (loading) return null;
  if (!challenge.participants?.includes(currentUser.uid)) return null;

  const completedDays = progress?.completedDays || [];
  const currentDay = completedDays.length;
  const isCompleted = currentDay >= challenge.duration;

  if (isCompleted) {
    return (
      <div className="bg-green-50 border-2 border-green-400 rounded-xl p-4 text-center mb-4">
        <p className="text-green-700 font-bold text-lg mb-1">🎉 Поздравляем!</p>
        <p className="text-green-600 text-sm">Ты успешно завершил челлендж!</p>
      </div>
    );
  }

  const nextDay = currentDay + 1;
  const canMarkToday =
    completedDays.length === 0 ||
    (completedDays.length > 0 &&
      completedDays[completedDays.length - 1] < nextDay);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">
          Твой прогресс: {currentDay}/{challenge.duration} дней
        </span>
        <span className="text-sm text-gray-500">
          {Math.round((currentDay / challenge.duration) * 100)}%
        </span>
      </div>

      {/* Прогресс бар */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${(currentDay / challenge.duration) * 100}%` }}
        />
      </div>

      {/* Кнопка отметить день */}
      {canMarkToday && (
        <button
          onClick={() => onMarkComplete(challenge, currentDay)}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          ✅ Отметить день {nextDay} как завершённый
        </button>
      )}

      {!canMarkToday && (
        <p className="text-center text-sm text-gray-500 py-2">
          Приходи завтра, чтобы отметить следующий день! 🌟
        </p>
      )}
    </div>
  );
}
