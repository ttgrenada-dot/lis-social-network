import { Link, useLocation } from "react-router-dom";

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: "🏠", label: "Главная" },
    { path: "/search", icon: "🔍", label: "Поиск" },
    { path: "/create", icon: "+", label: "Создать", isCreate: true },
    { path: "/notifications", icon: "🔔", label: "Уведомления" },
    { path: "/profile", icon: "👤", label: "Профиль" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-purple-600 via-purple-500 to-purple-400 shadow-lg">
      <div className="max-w-2xl mx-auto px-4 py-2 flex justify-around items-center">
        {navItems.map((item) => {
          if (item.isCreate) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center -mt-8"
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-purple-300 hover:scale-110 transition-transform">
                  <span className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 font-bold">
                    +
                  </span>
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                location.pathname === item.path
                  ? "text-white bg-white/20 backdrop-blur-sm"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
