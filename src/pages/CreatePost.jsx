import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import imageCompression from "browser-image-compression";

// ✅ ВАШИ ДАННЫЕ CLOUDINARY
const CLOUDINARY_CLOUD_NAME = "dzs54s6s";
const CLOUDINARY_UPLOAD_PRESET = "Lis-app";

export default function CreatePost() {
  const { currentUser, userData } = useAuth();
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      // Проверка размера (макс 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Фото слишком большое! Максимум 5MB");
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  // Сжатие фото
  async function compressImage(file) {
    const options = {
      maxSizeMB: 1, // Максимум 1 MB после сжатия
      maxWidthOrHeight: 1920, // Максимальная ширина/высота
      useWebWorker: true, // Использовать web worker для скорости
      fileType: "image/jpeg", // Конвертировать в JPEG
      initialQuality: 0.8, // Качество 80%
    };

    try {
      const compressedFile = await imageCompression(file, options);
      console.log(
        `Сжато с ${file.size / 1024 / 1024} MB до ${compressedFile.size / 1024 / 1024} MB`,
      );
      return compressedFile;
    } catch (error) {
      console.error("Ошибка сжатия:", error);
      return file; // Вернуть оригинал если ошибка
    }
  }

  // Загрузка фото в Cloudinary
  async function uploadToCloudinary(file) {
    // Сначала сжимаем
    const compressedFile = await compressImage(file);

    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Ошибка загрузки в Cloudinary:", error);
      throw error;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!content.trim() && !image) {
      alert("Введите текст или добавьте фото");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = "";

      // Загрузка фото если есть
      if (image) {
        setUploading(true);
        imageUrl = await uploadToCloudinary(image);
        setUploading(false);
      }

      // Создание поста
      const postData = {
        userId: currentUser.uid,
        username: userData?.username || currentUser.email.split("@")[0],
        userAvatar:
          userData?.avatar ||
          "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif",
        content: content,
        image: imageUrl,
        likes: [],
        comments: [],
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "posts"), postData);

      // Очистка формы
      setContent("");
      setImage(null);
      setImagePreview("");

      // Переход на главную
      navigate("/");
    } catch (error) {
      console.error("Ошибка создания поста:", error);
      alert("Ошибка: " + error.message);
      setUploading(false);
    } finally {
      setLoading(false);
    }
  }

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
          <h1 className="text-xl font-bold text-white ml-4">Новый пост</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-6 shadow-lg"
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Что нового? 🦊"
            maxLength={500}
            className="w-full h-32 p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 resize-none"
            style={{ color: "#000000" }}
          />

          {/* Превью фото */}
          {imagePreview && (
            <div className="mt-4 relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-xl"
              />
              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  setImagePreview("");
                }}
                className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            {/* Кнопка загрузки фото */}
            <label className="cursor-pointer flex items-center gap-2 text-purple-600 hover:text-purple-700">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Фото</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            <button
              type="submit"
              disabled={loading || uploading || (!content.trim() && !image)}
              className="bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading
                ? "📤 Сжатие и загрузка..."
                : loading
                  ? "..."
                  : "Опубликовать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
