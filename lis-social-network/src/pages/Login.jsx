import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setCurrentUser, setUserData } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          login: identifier,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка входа");
      }

      // ✅ Успешный вход
      if (data.user) {
        localStorage.setItem("currentUser", JSON.stringify(data.user));
        setCurrentUser({ uid: data.user.uid });
        setUserData(data.user);
        console.log("✅ Logged in:", data.user.username);
        navigate("/");
      } else {
        throw new Error("Не удалось получить данные пользователя");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.message || "Ошибка при входе");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/fox.gif" alt="Fox" className="w-20 h-20 mx-auto mb-4" />
          <h1
            className="text-6xl font-bold mb-2"
            style={{
              fontFamily: "'Parisienne', 'Brush Script MT', cursive",
              background:
                "linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 50%, #ffb4b4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "2px 2px 4px rgba(0, 0, 0, 0.1)",
              letterSpacing: "2px",
            }}
          >
            Lis
          </h1>
          <p className="text-gray-600">Социальная сеть</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="📱 Телефон или username"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              style={{ color: "#000000" }}
              required
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              style={{ color: "#000000" }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? "⏳ Вход..." : "🔐 Войти"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Нет аккаунта?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-purple-600 hover:text-purple-700 font-semibold"
            >
              Зарегистрироваться
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
