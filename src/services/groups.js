import {
  collection,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const GROUPS_COLLECTION = "groups";

// ✅ Создание группы
export async function createGroup(
  name,
  creatorId,
  creatorUsername,
  creatorAvatar,
  participantIds = [],
) {
  try {
    const groupData = {
      name,
      creatorId,
      creatorUsername,
      creatorAvatar,
      participants: [creatorId, ...participantIds],
      avatar: "",
      createdAt: new Date(),
      lastMessage: "",
      lastMessageTime: new Date(),
      type: "group",
    };

    const docRef = await addDoc(collection(db, GROUPS_COLLECTION), groupData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating group:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Получение групп пользователя
export function getUserGroups(userId, callback) {
  const groupsRef = collection(db, GROUPS_COLLECTION);
  const q = query(groupsRef, where("participants", "array-contains", userId));

  return onSnapshot(q, (snapshot) => {
    const groupsData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(groupsData);
  });
}

// ✅ Добавление участника в группу
export async function addParticipant(groupId, userId) {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      participants: arrayUnion(userId),
    });
    return { success: true };
  } catch (error) {
    console.error("Error adding participant:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Удаление участника из группы
export async function removeParticipant(groupId, userId) {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      participants: arrayRemove(userId),
    });
    return { success: true };
  } catch (error) {
    console.error("Error removing participant:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Обновление аватара группы
export async function updateGroupAvatar(groupId, avatarUrl) {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, { avatar: avatarUrl });
    return { success: true };
  } catch (error) {
    console.error("Error updating group avatar:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Обновление последнего сообщения
export async function updateLastMessage(groupId, messageText, userId) {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      lastMessage: messageText,
      lastMessageTime: new Date(),
      lastMessageBy: userId,
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating last message:", error);
    return { success: false, error: error.message };
  }
}
