import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await signup(
        formData.email,
        formData.password,
        formData.username,
      );

      if (result.success) {
        navigate("/login");
      } else {
        setError(result.error || "Ошибка регистрации");
      }
    } catch (err) {
      setError("Произошла ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-8">
          <img
            src="https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
            alt="Lis Logo"
            className="mb-4 w-20 h-20 object-contain mx-auto"
          />
          <h1
            className="text-6xl mb-2"
            style={{
              fontFamily: "'Parisienne', cursive",
              background:
                "linear-gradient(to right, #fb923c, #ef4444, #ec4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Lis
          </h1>
          <p className="text-gray-500 text-sm">Создать аккаунт</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <input
              type="text"
              name="username"
              placeholder="Имя пользователя"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              style={{ color: "#000000" }}
            />
          </div>

          <div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              style={{ color: "#000000" }}
            />
          </div>

          <div>
            <input
              type="password"
              name="password"
              placeholder="Пароль"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              style={{ color: "#000000" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Создание..." : "Создать аккаунт"}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-gray-200">
          <p className="text-gray-600">
            Уже есть аккаунт?{" "}
            <Link
              to="/login"
              className="text-purple-600 font-semibold hover:underline"
            >
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
