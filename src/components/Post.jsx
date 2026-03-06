import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";

export default function Post({ post }) {
  const { currentUser } = useAuth();

  const userLikes = Array.isArray(post.likes) ? post.likes : [];
  const [liked, setLiked] = useState(userLikes.includes(currentUser.uid));
  const [likesCount, setLikesCount] = useState(
    Array.isArray(post.likes) ? post.likes.length : post.likes || 0,
  );

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);

  const isPostOwner = post.userId === currentUser.uid;

  useEffect(() => {
    if (!post.id) return;

    const q = query(collection(db, "comments"), where("postId", "==", post.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      commentsData.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.createdAt);
        const timeB = new Date(b.timestamp || b.createdAt);
        return timeA - timeB;
      });

      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [post.id]);

  async function handleLike() {
    try {
      const postRef = doc(db, "posts", post.id);

      if (liked) {
        await updateDoc(postRef, {
          likes: arrayRemove(currentUser.uid),
        });
        setLikesCount(likesCount - 1);
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.uid),
        });
        setLikesCount(likesCount + 1);

        if (post.userId !== currentUser.uid) {
          await addDoc(collection(db, "notifications"), {
            userId: post.userId,
            fromUserId: currentUser.uid,
            fromUsername: currentUser.email.split("@")[0],
            type: "like",
            postId: post.id,
            read: false,
            timestamp: new Date().toISOString(),
          });
        }
      }

      setLiked(!liked);
    } catch (error) {
      console.error("Ошибка лайка:", error);
    }
  }

  async function handleDeletePost() {
    try {
      await deleteDoc(doc(db, "posts", post.id));
    } catch (error) {
      console.error("Ошибка удаления поста:", error);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();

    if (!commentText.trim() || !post.id) return;

    try {
      const newComment = {
        id: Date.now(),
        postId: post.id,
        userId: currentUser.uid,
        username: currentUser.email.split("@")[0],
        text: commentText,
        timestamp: new Date().toISOString(),
      };

      await addDoc(collection(db, "comments"), newComment);

      if (post.userId !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: post.userId,
          fromUserId: currentUser.uid,
          fromUsername: currentUser.email.split("@")[0],
          type: "comment",
          postId: post.id,
          read: false,
          timestamp: new Date().toISOString(),
        });
      }

      setCommentText("");
    } catch (error) {
      console.error("Ошибка комментария:", error);
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await deleteDoc(doc(db, "comments", commentId));
    } catch (error) {
      console.error("Ошибка удаления комментария:", error);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <img
            src={post.userAvatar || post.user?.avatar}
            alt={post.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold text-gray-800">
              {post.username || post.user?.username}
            </p>
            <p className="text-xs text-gray-500">
              {post.timestamp?.toDate?.()?.toLocaleString() ||
                post.createdAt ||
                "Недавно"}
            </p>
          </div>
        </div>

        {isPostOwner && (
          <button
            onClick={handleDeletePost}
            className="text-gray-400 hover:text-red-500 transition-colors p-2"
            title="Удалить пост"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {post.content && <p className="text-gray-800 mb-3">{post.content}</p>}

      {post.image && (
        <img src={post.image} alt="Post" className="w-full rounded-xl mb-3" />
      )}

      <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 transition-colors ${liked ? "text-red-500" : "text-gray-500 hover:text-red-500"}`}
        >
          <span className="text-xl">{liked ? "❤️" : "🤍"}</span>
          <span className="text-sm">{likesCount}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-gray-500 hover:text-purple-500 transition-colors"
        >
          <span className="text-xl">💬</span>
          <span className="text-sm">{comments.length}</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-gray-400 text-sm text-center">
                Пока нет комментариев
              </p>
            ) : (
              comments.map((comment) => {
                const isCommentOwner = comment.userId === currentUser.uid;

                return (
                  <div key={comment.id} className="flex gap-2 group">
                    <div className="flex-1 bg-gray-50 rounded-xl p-3 relative">
                      <p className="font-semibold text-sm text-gray-700">
                        {comment.username}
                      </p>
                      <p className="text-gray-800 text-sm">{comment.text}</p>

                      {isCommentOwner && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
                          title="Удалить комментарий"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Написать комментарий..."
              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 text-sm"
              style={{ color: "#000000" }}
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-purple-600 transition-colors"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
