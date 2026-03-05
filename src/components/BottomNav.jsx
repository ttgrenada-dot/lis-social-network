import { Link, useLocation } from "react-router-dom";

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: "🏠", label: "Главная" },
    { path: "/search", icon: "🔍", label: "Поиск" },
    { path: "/notifications", icon: "🔔", label: "Уведомления" },
    { path: "/profile", icon: "👤", label: "Профиль" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-2xl mx-auto px-4 py-2 flex justify-around">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center p-2 rounded-xl transition-all ${
              location.pathname === item.path
                ? "text-purple-600 bg-purple-50"
                : "text-gray-500 hover:text-purple-600"
            }`}
          >
            <span className="text-2xl mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
