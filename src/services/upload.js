// ✅ Yandex Object Storage (S3-compatible) - Универсальная загрузка
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "ru-central1",
  endpoint: "https://storage.yandexcloud.net", // ✅ Убраны лишние пробелы!
  credentials: {
    accessKeyId: import.meta.env.VITE_YANDEX_ACCESS_KEY,
    secretAccessKey: import.meta.env.VITE_YANDEX_SECRET_KEY,
  },
  forcePathStyle: true,
});

const BUCKET_NAME = "lis-social-media";

// ✅ УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ЗАГРУЗКИ ЛЮБЫХ ФАЙЛОВ
export async function uploadFile(file, userId, folder = "files") {
  if (!file) return "";

  // Лимиты по типам файлов
  const limits = {
    "image/": 10 * 1024 * 1024, // 10MB для фото
    "video/": 100 * 1024 * 1024, // 100MB для видео
    "application/": 50 * 1024 * 1024, // 50MB для документов
    "audio/": 20 * 1024 * 1024, // 20MB для аудио
    "text/": 5 * 1024 * 1024, // 5MB для текста
  };

  // Определяем лимит
  let maxSize = 10 * 1024 * 1024; // Default 10MB
  for (const [type, limit] of Object.entries(limits)) {
    if (file.type.startsWith(type)) {
      maxSize = limit;
      break;
    }
  }

  if (file.size > maxSize) {
    throw new Error(
      `Файл слишком большой! Максимум ${maxSize / 1024 / 1024}MB`,
    );
  }

  try {
    const fileExtension = file.name.split(".").pop();
    const fileName = `${folder}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExtension}`;
    const arrayBuffer = await file.arrayBuffer();

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: arrayBuffer,
      ContentType: file.type || "application/octet-stream",
      ACL: "public-read",
    });

    await s3Client.send(command);

    // ✅ ИСПРАВЛЕНО: убраны пробелы в URL
    return `https://storage.yandexcloud.net/${BUCKET_NAME}/${fileName}`;
  } catch (error) {
    console.error("Yandex upload error:", error);
    throw new Error("Ошибка загрузки: " + error.message);
  }
}

// ✅ Алиасы для обратной совместимости
export const uploadPhoto = (file, userId) => uploadFile(file, userId, "photos");
export const uploadVideo = (file, userId) => uploadFile(file, userId, "videos");
