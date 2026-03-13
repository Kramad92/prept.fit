import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _s3: S3Client | null = null;

function getS3(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      ...(process.env.S3_ENDPOINT
        ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
        : {}),
    });
  }
  return _s3;
}

function getBucket(): string {
  return process.env.S3_BUCKET_NAME || "";
}

export async function getUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(getS3(), command, { expiresIn: 3600 });

  // Strip checksum params that AWS SDK v3 adds — R2 doesn't support them
  // and they cause CORS preflight failures
  const parsed = new URL(url);
  parsed.searchParams.delete("x-amz-checksum-crc32");
  parsed.searchParams.delete("x-amz-sdk-checksum-algorithm");
  return parsed.toString();
}

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await getS3().send(command);
}

export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });

  await getS3().send(command);
}

export async function getFileUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });

  return getSignedUrl(getS3(), command, { expiresIn: 3600 });
}

export function generateKey(
  tenantId: string,
  folder: string,
  filename: string
): string {
  const timestamp = Date.now();
  const ext = filename.split(".").pop();
  return `${tenantId}/${folder}/${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`;
}

// Resolve S3 keys to signed URLs for an array of photos
export async function resolvePhotoUrls<T extends { url: string }>(
  photos: T[]
): Promise<T[]> {
  return Promise.all(
    photos.map(async (photo) => ({
      ...photo,
      url: await getFileUrl(photo.url),
    }))
  );
}
