import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../../config/env.js";
import type { StorageProvider, ObjectMetadata } from "./storage.interface.js";

export class R2StorageProvider implements StorageProvider {
  private s3Client: S3Client | null = null;
  public readonly isConfigured: boolean = false;

  constructor() {
    if (
      env.CLOUDFLARE_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY
    ) {
      this.s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      });
      this.isConfigured = true;
    }
  }

  public async getPresignedPutUrl(
    storagePath: string,
    contentType: string,
    contentLength: number,
    expiresInSeconds: number
  ): Promise<string> {
    if (!this.s3Client) {
      throw new Error("R2 S3Client belum dikonfigurasi");
    }

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: storagePath,
      ContentType: contentType,
      ContentLength: contentLength,
    });

    return await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  public async headObject(key: string): Promise<ObjectMetadata> {
    if (!this.s3Client) {
      throw new Error("R2 S3Client belum dikonfigurasi");
    }

    try {
      const res = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: key,
        })
      );
      return {
        contentLength: res.ContentLength ?? 0,
        contentType: res.ContentType ?? "application/octet-stream",
        exists: true,
      };
    } catch (err: unknown) {
      const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (error?.name === "NotFound" || error?.$metadata?.httpStatusCode === 404) {
        return { contentLength: 0, contentType: "", exists: false };
      }
      throw err;
    }
  }

  public async getObjectHeaderBytes(key: string, byteCount = 16): Promise<Buffer | null> {
    if (!this.s3Client) {
      throw new Error("R2 S3Client belum dikonfigurasi");
    }

    try {
      const res = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: key,
          Range: `bytes=0-${Math.max(0, byteCount - 1)}`,
        })
      );
      if (!res.Body) {
        return null;
      }

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
        totalBytes += chunk.length;
        if (totalBytes >= byteCount) {
          break;
        }
      }
      return Buffer.concat(chunks).subarray(0, byteCount);
    } catch (err: unknown) {
      const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  public async getPresignedReadUrl(
    storagePath: string,
    expiresInSeconds: number
  ): Promise<string> {
    if (env.R2_PUBLIC_URL) {
      return `${env.R2_PUBLIC_URL}/${storagePath}`;
    }

    if (!this.s3Client) {
      throw new Error("R2 S3Client belum dikonfigurasi");
    }

    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: storagePath,
    });

    return await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  public async getObjectStream(
    key: string
  ): Promise<{ body: unknown; contentType: string } | null> {
    if (!this.s3Client) return null;
    try {
      const res = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: key,
        })
      );
      return {
        body: res.Body,
        contentType: res.ContentType || "application/octet-stream",
      };
    } catch {
      return null;
    }
  }

  public async putObject(
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void> {
    if (!this.s3Client) {
      throw new Error("R2 S3Client belum dikonfigurasi");
    }

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }
}

export const r2Provider = new R2StorageProvider();
