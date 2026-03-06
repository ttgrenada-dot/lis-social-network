import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-gradient-to-b from-purple-600 via-purple-500 to-purple-400 shadow-sm sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-center">
        <Link
          to="/"
          className="text-3xl font-bold"
          style={{
            fontFamily: "'Parisienne', cursive",
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-red-500">
            Lis
          </span>
        </Link>
      </div>
    </header>
  );
}
