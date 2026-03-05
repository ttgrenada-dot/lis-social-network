import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function CreatePost() {
  const { currentUser } = useAuth();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    if (!content.trim()) return;

    setLoading(true);

    // Здесь будет отправка в Firebase
    setTimeout(() => {
      setLoading(false);
      navigate("/");
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-800 ml-4">Новый пост</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-6 shadow-lg"
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="О чём думаете?"
            className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 resize-none"
            style={{ color: "#000000" }}
          />

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">{content.length} / 500</div>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? "Публикация..." : "Опубликовать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
