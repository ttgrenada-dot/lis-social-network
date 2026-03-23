import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-gradient-to-b from-purple-600 via-purple-500 to-purple-400 shadow-sm sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-2 py-2">
        {/* Верхняя панель с быстрым доступом */}
        <div className="flex items-center justify-between">
          {/* Левая часть: Фото-эстафета и Челлендж */}
          <div className="flex items-center gap-1">
            {/* Фото-эстафета */}
            <Link
              to="/photo-chain"
              className={`flex flex-col items-center p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm min-w-[50px] ${
                isActive("/photo-chain") ? "bg-white/30 scale-105" : ""
              }`}
              title="Фото-эстафета"
            >
              <span className="text-xl">📸</span>
              <span className="text-[9px] text-white/90 font-medium leading-tight">
                Эстафета
              </span>
            </Link>

            {/* Челлендж */}
            <Link
              to="/challenge"
              className={`flex flex-col items-center p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm min-w-[50px] ${
                isActive("/challenge") ? "bg-white/30 scale-105" : ""
              }`}
              title="Челлендж наоборот"
            >
              <span className="text-xl">🔄</span>
              <span className="text-[9px] text-white/90 font-medium leading-tight">
                Челлендж
              </span>
            </Link>
          </div>

          {/* Логотип LIS по центру */}
          <Link
            to="/"
            className="text-3xl font-bold px-2"
            style={{
              fontFamily: "'Parisienne', cursive",
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-red-500">
              Lis
            </span>
          </Link>

          {/* Правая часть: ❓ Q&A + 💬 Чат */}
          <div className="flex items-center gap-1">
            {/* ❓ Q&A — ПЕРВАЯ ИКОНКА */}
            <Link
              to="/qa-chain"
              className={`flex flex-col items-center p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm min-w-[50px] ${
                isActive("/qa-chain") ? "bg-white/30 scale-105" : ""
              }`}
              title="Вопрос-ответ"
            >
              <span className="text-xl">❓</span>
              <span className="text-[9px] text-white/90 font-medium leading-tight">
                Q&A
              </span>
            </Link>

            {/* 💬 ЧАТ — ВТОРАЯ ИКОНКА */}
            <button
              onClick={() => navigate("/messages")}
              className={`flex flex-col items-center p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm min-w-[50px] ${
                isActive("/messages") ? "bg-white/30 scale-105" : ""
              }`}
              title="Сообщения"
            >
              <span className="text-xl">💬</span>
              <span className="text-[9px] text-white/90 font-medium leading-tight">
                Чат
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
