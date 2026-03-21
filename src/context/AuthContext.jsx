import { createContext, useContext, useState, useEffect } from "react";
import { getUserById, updateUser } from "../services/ydb";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ РЕГИСТРАЦИЯ (через YDB)
  async function signup(email, password, username, phone) {
    // Проверка уникальности уже делается в Register.jsx
    // Здесь просто возвращаем данные для сохранения в localStorage
    return { email, username, phone };
  }

  // ✅ ВХОД (через YDB + localStorage)
  async function login(identifier, password) {
    // Поиск пользователя уже делается в Login.jsx
    // Здесь просто возвращаем успех
    return { success: true };
  }

  // ✅ ВЫХОД
  function logout() {
    // Обновляем статус онлайн в YDB
    if (currentUser?.uid) {
      updateUser(currentUser.uid, { online: false });
    }

    // Очищаем localStorage
    localStorage.removeItem("currentUser");
    localStorage.removeItem("userPassword");

    setCurrentUser(null);
    setUserData(null);

    return { success: true };
  }

  // ✅ ЗАГРУЗКА ПОЛЬЗОВАТЕЛЯ ПРИ СТАРТЕ
  useEffect(() => {
    async function loadUser() {
      try {
        // Пробуем загрузить из localStorage
        const storedUser = localStorage.getItem("currentUser");

        if (storedUser) {
          const user = JSON.parse(storedUser);

          // Проверяем актуальность данных в YDB
          const freshUser = await getUserById(user.uid);

          if (freshUser) {
            setCurrentUser({ uid: freshUser.uid });
            setUserData(freshUser);
          } else {
            // Пользователь не найден в БД — очищаем
            localStorage.removeItem("currentUser");
            localStorage.removeItem("userPassword");
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
      setLoading(false);
    }

    loadUser();
  }, []);

  const value = {
    currentUser,
    userData,
    setUserData,
    signup,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
