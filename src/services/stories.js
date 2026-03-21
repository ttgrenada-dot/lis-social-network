import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { uploadPhoto, uploadVideo } from "./upload";

const STORIES_COLLECTION = "stories";
const STORY_LIFETIME_HOURS = 24;

// ✅ Получение активных сторис
export function getActiveStories(callback) {
  const now = new Date();

  const storiesRef = collection(db, STORIES_COLLECTION);
  const q = query(
    storiesRef,
    where("expiresAt", ">", now),
    orderBy("expiresAt", "desc"),
  );

  return onSnapshot(q, (snapshot) => {
    const storiesData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(storiesData);
  });
}

// ✅ Получение сторис конкретного пользователя
export function getUserStories(userId, callback) {
  const now = new Date();

  const storiesRef = collection(db, STORIES_COLLECTION);
  const q = query(
    storiesRef,
    where("userId", "==", userId),
    where("expiresAt", ">", now),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(q, (snapshot) => {
    const storiesData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(storiesData);
  });
}

// ✅ Добавление сторис (фото ИЛИ видео)
export async function addStory(
  userId,
  username,
  avatar,
  file,
  mediaType = "image",
) {
  try {
    let mediaUrl = "";

    // Загрузка в Yandex Cloud
    if (mediaType === "video") {
      mediaUrl = await uploadVideo(file, userId);
    } else {
      mediaUrl = await uploadPhoto(file, userId);
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + STORY_LIFETIME_HOURS * 60 * 60 * 1000,
    );

    const storyData = {
      userId,
      username,
      avatar,
      mediaUrl,
      mediaType, // "image" или "video"
      createdAt: serverTimestamp(),
      expiresAt,
      views: [],
    };

    const docRef = await addDoc(collection(db, STORIES_COLLECTION), storyData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding story:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Удаление сторис
export async function deleteStory(storyId, userId) {
  try {
    await deleteDoc(doc(db, STORIES_COLLECTION, storyId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting story:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Отметка о просмотре
export async function markStoryViewed(storyId, viewerId) {
  try {
    const storyRef = doc(db, STORIES_COLLECTION, storyId);
    const storyDoc = await getDoc(storyRef);

    if (storyDoc.exists()) {
      const views = storyDoc.data().views || [];
      if (!views.includes(viewerId)) {
        await updateDoc(storyRef, {
          views: [...views, viewerId],
        });
      }
    }
    return { success: true };
  } catch (error) {
    console.error("Error marking story viewed:", error);
    return { success: false, error: error.message };
  }
}
