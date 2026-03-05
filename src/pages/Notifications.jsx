import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function Notifications() {
  const { currentUser } = useAuth();

  const mockNotifications = [
    {
      id: 1,
      type: "like",
      user: "test_user",
      message: "понравился ваш пост",
      time: "5 мин назад",
    },
    {
      id: 2,
      type: "follow",
      user: "alex_ddog",
      message: "подписался на вас",
      time: "1 час назад",
    },
    {
      id: 3,
      type: "comment",
      user: "user123",
      message: "прокомментировал ваш пост",
      time: "2 часа назад",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Уведомления</h1>

        <div className="space-y-3">
          {mockNotifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xl">
                {notification.type === "like" && "❤️"}
                {notification.type === "follow" && "👤"}
                {notification.type === "comment" && "💬"}
              </div>
              <div className="flex-1">
                <p className="text-gray-800">
                  <span className="font-semibold">{notification.user}</span>{" "}
                  {notification.message}
                </p>
                <p className="text-sm text-gray-500">{notification.time}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
