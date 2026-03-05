import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          to="/"
          className="text-2xl font-cursive"
          style={{ fontFamily: "'Parisienne', cursive" }}
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-pink-600">
            Lis
          </span>
        </Link>
        <div className="flex gap-4">
          <Link to="/create" className="text-2xl hover:opacity-70">
            ➕
          </Link>
        </div>
      </div>
    </header>
  );
}
