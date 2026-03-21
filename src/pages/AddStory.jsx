import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { addStory } from "../services/stories";

export default function AddStory() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [mediaFile, setMediaFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [mediaType, setMediaType] = useState("image");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        alert("Фото слишком большое! Максимум 10MB");
        return;
      }
      setMediaFile(file);
      setPreview(URL.createObjectURL(file));
      setMediaType("image");
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const MAX_SIZE = 100 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        alert("Видео слишком большое! Максимум 100MB");
        return;
      }
      setMediaFile(file);
      setPreview(URL.createObjectURL(file));
      setMediaType("video");
    }
  };

  const handleUpload = async () => {
    if (!mediaFile) {
      alert("Выберите фото или видео!");
      return;
    }

    setUploading(true);
    const result = await addStory(
      currentUser.uid,
      userData?.username || currentUser.email?.split("@")[0],
      userData?.avatar || "",
      mediaFile,
      mediaType,
    );

    setUploading(false);
    if (result.success) {
      alert("✅ Сторис добавлена!");
      navigate("/");
    } else {
      alert("Ошибка: " + result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-full text-white transition-all"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-white ml-4">Добавить сторис</h1>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-lg">
          {/* Выбор типа */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setMediaType("image");
                setMediaFile(null);
                setPreview(null);
              }}
              className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
                mediaType === "image"
                  ? "bg-purple-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              📸 Фото
            </button>
            <button
              type="button"
              onClick={() => {
                setMediaType("video");
                setMediaFile(null);
                setPreview(null);
              }}
              className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
                mediaType === "video"
                  ? "bg-purple-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              🎥 Видео
            </button>
          </div>

          {/* Загрузка */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {mediaType === "image"
                ? "📸 Выберите фото (макс. 10MB)"
                : "🎥 Выберите видео (макс. 100MB, MP4/MOV)"}
            </label>
            <input
              type="file"
              accept={mediaType === "image" ? "image/*" : "video/*"}
              onChange={
                mediaType === "image" ? handleImageChange : handleVideoChange
              }
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
            />
          </div>

          {/* Предпросмотр */}
          {preview && (
            <div className="relative mb-4">
              {mediaType === "image" ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-96 object-cover rounded-xl"
                />
              ) : (
                <video
                  src={preview}
                  controls
                  className="w-full h-96 object-cover rounded-xl bg-black"
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setMediaFile(null);
                  setPreview(null);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-all"
              >
                ✕
              </button>
            </div>
          )}

          {/* Кнопка загрузки */}
          <button
            onClick={handleUpload}
            disabled={uploading || !mediaFile}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {uploading
              ? "⏳ Загрузка..."
              : mediaType === "image"
                ? "📤 Опубликовать фото"
                : "🎬 Опубликовать видео"}
          </button>

          <p className="text-xs text-gray-500 mt-4 text-center">
            ⏰ Сторис будет видна 24 часа
          </p>
        </div>
      </div>
    </div>
  );
}
