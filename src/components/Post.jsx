import { useState } from "react";

export default function Post({ post }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes);

  function handleLike() {
    if (liked) {
      setLikes(likes - 1);
    } else {
      setLikes(likes + 1);
    }
    setLiked(!liked);
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <img src={post.user.avatar} alt={post.user.username} className="w-10 h-10 rounded-full object-cover" />
        <div>
          <p className="font-semibold text-gray-800">{post.user.username}</p>
          <p className="text-xs text-gray-500">{post.timestamp}</p>
        </div>
      </div>

      <p className="text-gray-800 mb-3">{post.content}</p>

      {post.image && (
        <img src={post.image} alt="Post" className="w-full rounded-xl mb-3" />
      )}

      <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
        <button 
          onClick={handleLike}
          className={`flex items-center gap-2 ${liked ? "text-red-500" : "text-gray-500"}`}
        >
          <span className="text-xl">{liked ? "❤️" : "🤍"}</span>
          <span className="text-sm">{likes}</span>
        </button>
        <button className="flex items-center gap-2 text-gray-500">
          <span className="text-xl">💬</span>
          <span className="text-sm">{post.comments}</span>
        </button>
      </div>
    </div>
  );
}