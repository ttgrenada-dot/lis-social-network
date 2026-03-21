import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getActivePhotoChains,
  createPhotoChain,
  addPhotoToChain,
  deletePhotoChain,
} from "../services/photoChain";
import { uploadPhoto } from "../services/upload";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import Avatar from "../components/Avatar";

export default function PhotoChain() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChain, setSelectedChain] = useState(null);
  const [showParticipateModal, setShowParticipateModal] = useState(false);

  const [theme, setTheme] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [taggedUser, setTaggedUser] = useState("");

  const highlightChainId = searchParams.get("highlight");

  useEffect(() => {
    const unsubscribe = getActivePhotoChains((data) => {
      setChains(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (highlightChainId && chains.length > 0 && !loading) {
      const element = document.getElementById(`chain-${highlightChainId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add(
          "ring-4",
          "ring-purple-400",
          "ring-offset-2",
          "scale-[1.02]",
        );
        element.style.transition = "all 0.3s ease";
        setTimeout(() => {
          element.classList.remove(
            "ring-4",
            "ring-purple-400",
            "ring-offset-2",
            "scale-[1.02]",
          );
        }, 3000);
      }
      navigate("/photo-chain", { replace: true });
    }
  }, [highlightChainId, chains, loading, navigate]);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const MAX_SIZE = 10 * 1024 * 1024; // ✅ 10MB для Yandex Cloud
      if (file.size > MAX_SIZE) {
        alert("Файл слишком большой! Максимум 10MB");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateChain = async () => {
    if (!theme.trim() || !photoPreview) {
      alert("Введите тему и выберите фото!");
      return;
    }
    setUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(30);
      // ✅ Загрузка фото в Yandex Cloud вместо base64
      const photoUrl = await uploadPhoto(photoFile, currentUser.uid);
      setUploadProgress(70);

      const result = await createPhotoChain({
        theme,
        starterId: currentUser.uid,
        starterUsername: userData?.username || currentUser.email?.split("@")[0],
        starterAvatar: userData?.avatar || "",
        firstPhoto: photoUrl, // ✅ Ссылка вместо base64
      });

      setUploadProgress(100);
      if (result.success) {
        alert("Эстафета создана! 📸");
        setShowCreateModal(false);
        setTheme("");
        setPhotoFile(null);
        setPhotoPreview(null);
      } else {
        alert("Ошибка: " + result.error);
      }
    } catch (error) {
      console.error("Error creating chain:", error);
      alert("Ошибка создания: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleParticipate = async () => {
    if (!photoPreview || !selectedChain) {
      alert("Выберите фото!");
      return;
    }
    setUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(30);
      // ✅ Загрузка фото в Yandex Cloud
      const photoUrl = await uploadPhoto(photoFile, currentUser.uid);
      setUploadProgress(70);

      const result = await addPhotoToChain(
        selectedChain.id,
        currentUser.uid,
        userData?.username || currentUser.email?.split("@")[0],
        userData?.avatar || "",
        photoUrl, // ✅ Ссылка вместо base64
        taggedUser || null,
      );

      setUploadProgress(100);
      if (result.success) {
        alert("Фото добавлено в эстафету! 🎉");
        setShowParticipateModal(false);
        setPhotoFile(null);
        setPhotoPreview(null);
        setTaggedUser("");
        setSelectedChain(null);
      } else {
        alert("Ошибка: " + result.error);
      }
    } catch (error) {
      console.error("Error participating:", error);
      alert("Ошибка: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteChain = async (chain) => {
    if (!confirm("Удалить эту эстафету? Это действие нельзя отменить.")) return;
    try {
      const result = await deletePhotoChain(
        chain.id,
        currentUser.uid,
        chain.starter.userId,
      );
      if (result.success) {
        alert("Эстафета удалена! 🗑️");
      } else {
        alert("Ошибка: " + result.error);
      }
    } catch (error) {
      alert("Ошибка удаления: " + error.message);
    }
  };

  const openParticipateModal = (chain) => {
    setSelectedChain(chain);
    setShowParticipateModal(true);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate?.() || new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "только что";
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return date.toLocaleDateString("ru-RU");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400 pb-20">
      <Header />
      <div className="max-w-2xl mx-auto pt-4 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">📸 Фото-эстафета</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-purple-600 px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            + Создать
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-white">Загрузка...</div>
        ) : chains.length === 0 ? (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 text-center">
            <p className="text-white text-lg mb-2">Нет активных эстафет</p>
            <p className="text-white/80 text-sm">
              Будьте первым кто создаст! 🦊
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {chains.map((chain) => (
              <div
                id={`chain-${chain.id}`}
                key={chain.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl"
              >
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white relative">
                  {chain.starter.userId === currentUser.uid && (
                    <button
                      onClick={() => handleDeleteChain(chain)}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/20 hover:bg-red-500 rounded-full flex items-center justify-center transition-all"
                      title="Удалить эстафету"
                    >
                      <span className="text-xl leading-none text-white">×</span>
                    </button>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="pr-8">
                      <h3 className="font-bold text-lg">{chain.theme}</h3>
                      <p className="text-sm opacity-90">
                        Начал: {chain.starter.username}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {chain.photos?.length || 0}/{chain.maxParticipants}
                      </p>
                      <p className="text-xs opacity-80">участников</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {chain.photos?.map((photo, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={photo.photoUrl}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1 rounded-b-xl">
                          <Avatar
                            src={photo.avatar}
                            username={photo.username}
                            size="xs"
                          />
                        </div>
                        {index < (chain.photos?.length || 0) - 1 && (
                          <div className="absolute -right-1 top-1/2 text-white text-lg drop-shadow-lg">
                            →
                          </div>
                        )}
                      </div>
                    ))}
                    {[
                      ...Array(
                        (chain.maxParticipants || 10) -
                          (chain.photos?.length || 0),
                      ),
                    ].map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-2xl"
                      >
                        ?
                      </div>
                    ))}
                  </div>
                  {chain.isActive &&
                    (chain.photos?.length || 0) <
                      (chain.maxParticipants || 10) && (
                      <button
                        onClick={() => openParticipateModal(chain)}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                      >
                        📸 Участвовать в эстафете
                      </button>
                    )}
                  {(chain.photos?.length || 0) >=
                    (chain.maxParticipants || 10) && (
                    <div className="text-center py-3 bg-green-50 rounded-xl text-green-700 font-semibold">
                      ✅ Эстафета завершена!
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Обновлено: {formatTime(chain.updatedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* МОДАЛКА СОЗДАНИЯ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-3xl">📸</span> Создать эстафету
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setTheme("");
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="w-10 h-10 bg-white/20 hover:bg-red-500 rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
              >
                <span className="text-white text-2xl leading-none">×</span>
              </button>
            </div>

            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Тема эстафеты (например: Селфи с кофе ☕)"
              className="w-full p-3 border-2 border-white/30 rounded-xl mb-4 focus:border-white focus:outline-none bg-white/20 text-white placeholder-white/70"
            />

            <div className="mb-4">
              <label className="block text-white font-semibold mb-2">
                Выберите фото (макс. 10MB):
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="w-full p-2 border-2 border-white/30 rounded-xl bg-white/20 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white file:text-purple-600 hover:file:bg-white/90"
              />
              {photoPreview && (
                <div className="mt-3 relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                  >
                    <span className="text-xl leading-none">×</span>
                  </button>
                </div>
              )}
            </div>

            {/* Индикатор загрузки */}
            {uploading && (
              <div className="mb-4 bg-white/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  <span className="text-white text-sm">Загрузка фото...</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 sticky bottom-0 bg-white/10 backdrop-blur-md p-3 rounded-xl mt-4">
              <button
                onClick={handleCreateChain}
                disabled={uploading || !theme || !photoPreview}
                className="flex-1 bg-white text-purple-600 py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {uploading ? "⏳ Загрузка..." : "✨ Создать эстафету"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА УЧАСТИЯ */}
      {showParticipateModal && selectedChain && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-3xl">📸</span> Участвовать
              </h2>
              <button
                onClick={() => {
                  setShowParticipateModal(false);
                  setPhotoFile(null);
                  setPhotoPreview(null);
                  setTaggedUser("");
                  setSelectedChain(null);
                }}
                className="w-10 h-10 bg-white/20 hover:bg-red-500 rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
              >
                <span className="text-white text-2xl leading-none">×</span>
              </button>
            </div>

            <p className="text-white/90 mb-4 font-medium">
              Тема:{" "}
              <span className="font-bold text-white">
                {selectedChain.theme}
              </span>
            </p>

            <div className="mb-4">
              <label className="block text-white font-semibold mb-2">
                Ваше фото (макс. 10MB):
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="w-full p-2 border-2 border-white/30 rounded-xl bg-white/20 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white file:text-purple-600 hover:file:bg-white/90"
              />
              {photoPreview && (
                <div className="mt-3 relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                  >
                    <span className="text-xl leading-none">×</span>
                  </button>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-white font-semibold mb-2">
                Кому передать эстафету? (username)
              </label>
              <input
                type="text"
                value={taggedUser}
                onChange={(e) => setTaggedUser(e.target.value)}
                placeholder="@username (необязательно)"
                className="w-full p-3 border-2 border-white/30 rounded-xl bg-white/20 text-white placeholder-white/70 focus:border-white focus:outline-none"
              />
            </div>

            {/* Индикатор загрузки */}
            {uploading && (
              <div className="mb-4 bg-white/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  <span className="text-white text-sm">Загрузка фото...</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 sticky bottom-0 bg-white/10 backdrop-blur-md p-3 rounded-xl mt-4">
              <button
                onClick={handleParticipate}
                disabled={uploading || !photoPreview}
                className="flex-1 bg-white text-purple-600 py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {uploading ? "⏳ Загрузка..." : "🚀 Отправить фото"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
