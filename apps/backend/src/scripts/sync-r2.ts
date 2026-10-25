import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

async function syncImagesToR2() {
  console.log("🚀 Memulai proses sinkronisasi 12 aset gambar ke Cloudflare R2...");
  console.log(`📦 Bucket Target: ${env.R2_BUCKET_NAME}`);

  if (
    !env.CLOUDFLARE_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY
  ) {
    console.warn("\n⚠️ Kredensial Cloudflare R2 belum lengkap di .env:");
    console.warn(`  - CLOUDFLARE_ACCOUNT_ID: ${env.CLOUDFLARE_ACCOUNT_ID ? "Terisi" : "Belum diisi"}`);
    console.warn(`  - R2_ACCESS_KEY_ID: ${env.R2_ACCESS_KEY_ID ? "Terisi" : "Belum diisi"}`);
    console.warn(`  - R2_SECRET_ACCESS_KEY: ${env.R2_SECRET_ACCESS_KEY ? "Terisi" : "Belum diisi"}`);
    console.warn(`  - R2_PUBLIC_URL: ${env.R2_PUBLIC_URL || "Belum diisi (opsional untuk direct URL)"}\n`);
    console.warn("ℹ️ Silakan masukkan kredensial R2 Anda ke apps/backend/.env untuk mengaktifkan koneksi live ke Cloudflare R2.");
    return false;
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  const storageItemsDir = path.resolve(process.cwd(), "storage/items");
  if (!fs.existsSync(storageItemsDir)) {
    throw new Error(`Direktori aset tidak ditemukan: ${storageItemsDir}`);
  }

  const files = fs.readdirSync(storageItemsDir).filter((f) => f.endsWith(".png"));
  console.log(`📁 Ditemukan ${files.length} berkas gambar di ${storageItemsDir}`);

  let uploadedCount = 0;
  for (const filename of files) {
    const filePath = path.join(storageItemsDir, filename);
    const fileBuffer = fs.readFileSync(filePath);
    const r2Key = `items/${filename}`;

    try {
      const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: r2Key,
        Body: fileBuffer,
        ContentType: "image/png",
      });

      await s3.send(command);
      uploadedCount++;
      console.log(`✅ [R2 UPLOAD] Berhasil: ${r2Key} (${fileBuffer.length} bytes)`);
    } catch (err: any) {
      console.error(`❌ [R2 ERROR] Gagal mengunggah ${r2Key}:`, err.message);
    }
  }

  console.log(`\n🎉 Selesai! ${uploadedCount}/${files.length} gambar berhasil terunggah dan terhubung ke Cloudflare R2.`);
  if (env.R2_PUBLIC_URL) {
    console.log(`🔗 Public URL Base: ${env.R2_PUBLIC_URL}/items/`);
  }
  return true;
}

syncImagesToR2()
  .then((success) => {
    process.exit(success ? 0 : 0);
  })
  .catch((err) => {
    console.error("❌ Fatal sync error:", err);
    process.exit(1);
  });
