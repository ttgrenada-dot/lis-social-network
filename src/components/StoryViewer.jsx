import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

export default function StoryViewer({
  stories,
  currentIndex,
  onClose,
  onNext,
  onPrev,
}) {
  const { currentUser } = useAuth();
  const [progress, setProgress] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const currentStory = stories[currentStoryIndex];

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentStoryIndex]);

  useEffect(() => {
    if (currentStory && !currentStory.viewers?.includes(currentUser.uid)) {
      const markViewed = async () => {
        try {
          await updateDoc(doc(db, "stories", currentStory.id), {
            viewers: arrayUnion(currentUser.uid),
          });
        } catch (error) {
          console.error("Ошибка отметки просмотра:", error);
        }
      };
      markViewed();
    }
  }, [currentStory, currentUser.uid]);

  const handleNext = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
    } else {
      onNext();
    }
  }, [currentStoryIndex, stories.length, onNext]);

  const handlePrev = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
    } else {
      onPrev();
    }
  }, [currentStoryIndex, onPrev]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {stories.map((story, idx) => (
          <div
            key={story.id}
            className="flex-1 h-1 bg-gray-600 rounded overflow-hidden"
          >
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width:
                  idx < currentStoryIndex
                    ? "100%"
                    : idx === currentStoryIndex
                      ? `${progress}%`
                      : "0%",
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-3xl z-10 hover:text-gray-300"
      >
        ×
      </button>

      <div className="relative w-full h-full flex items-center justify-center">
        {currentStory.mediaType === "video" ? (
          <video
            src={currentStory.mediaUrl}
            className="max-w-full max-h-full object-contain"
            autoPlay
            muted
          />
        ) : (
          <img
            src={currentStory.mediaUrl}
            alt="Story"
            className="max-w-full max-h-full object-contain"
          />
        )}

        <div className="absolute top-12 left-4 flex items-center gap-3">
          <img
            src={currentStory.userAvatar}
            alt={currentStory.username}
            className="w-10 h-10 rounded-full border-2 border-white"
          />
          <span className="text-white font-semibold drop-shadow-lg">
            {currentStory.username}
          </span>
          <span className="text-white/70 text-sm">
            {new Date(currentStory.timestamp).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="absolute inset-0 flex">
          <div className="w-1/3 h-full" onClick={handlePrev} />
          <div className="w-1/3 h-full" onClick={() => {}} />
          <div className="w-1/3 h-full" onClick={handleNext} />
        </div>

        {currentStoryIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl opacity-50 hover:opacity-100"
          >
            ‹
          </button>
        )}
        {currentStoryIndex < stories.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl opacity-50 hover:opacity-100"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
