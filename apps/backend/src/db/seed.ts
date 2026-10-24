import { db, pool } from "./index.js";
import { users, servicePosts, servicePostPhotos, foundItems, itemPhotos } from "./schema.js";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Running clean idempotent seed...");

  const officerEmail = "lostandfound.budiluhur@gmail.com";

  // 1. Check or insert Officer user
  let officer = await db.query.users.findFirst({
    where: eq(users.email, officerEmail),
  });

  if (!officer) {
    const inserted = await db
      .insert(users)
      .values({
        authUserId: "seed-officer-pengajaran-01",
        fullName: "Petugas Pos Pengajaran",
        email: officerEmail,
        role: "OFFICER",
      })
      .returning();
    officer = inserted[0];
    console.log(`✅ Created Officer: ${officer.email} (${officer.userId})`);
  } else {
    console.log(`ℹ️ Officer already exists: ${officer.email} (${officer.userId})`);
  }

  // 2. Check or insert Service Post (Pos Pengajaran)
  let post = await db.query.servicePosts.findFirst({
    where: eq(servicePosts.name, "Pos Pengajaran"),
  });

  if (!post) {
    const inserted = await db
      .insert(servicePosts)
      .values({
        name: "Pos Pengajaran",
        officerUserId: officer.userId,
        locationDescription: "Gedung Pengajaran Lt. 1, Dekat Lobby Utama (Akses Lapangan)",
        openingHours: "Senin - Jumat, 08:00 - 16:00 WIB",
        directions: "Dari gerbang utama jalan lurus ke arah gedung pengajaran samping lapangan.",
        storageLimitDays: 30,
      })
      .returning();
    post = inserted[0];
    console.log(`✅ Created Service Post: ${post.name} (Post ID: ${post.postId})`);
  } else {
    console.log(`ℹ️ Service Post already exists: ${post.name} (Post ID: ${post.postId})`);
  }

  // 3. Check or insert Service Post Photo
  const existingPhoto = await db.query.servicePostPhotos.findFirst({
    where: eq(servicePostPhotos.postId, post.postId),
  });

  if (!existingPhoto) {
    const [photo] = await db
      .insert(servicePostPhotos)
      .values({
        postId: post.postId,
        storagePath: "posts/pos-pengajaran-cover.webp",
        position: 1,
      })
      .returning();
    console.log(`✅ Seeded photo for Post ${post.name} (Photo ID: ${photo.photoId})`);
  } else {
    console.log(`ℹ️ Photo already exists for Post ${post.name}`);
  }

  // 4. Deterministic Seed Items for Catalog Testing (>10 items for pagination testing + privacy tests)
  const itemsToSeed = [
    {
      inventoryCode: "INV-2026-0001",
      itemName: "Laptop Asus Zenbook Biru",
      category: "Elektronik",
      publicDescription: "Laptop Asus warna biru gelap dengan stiker Budi Luhur",
      privateVerificationNotes: "Serial number SN-ASUS-99128, wallpaper gambar kucing",
      foundLocation: "Lab ICT Lt. 3",
      foundOn: "2026-10-15",
      receivedAt: new Date("2026-10-15T09:00:00Z"),
      status: "STORED" as const,
      isVisible: true,
      photoPath: "items/inv-2026-0001.webp",
    },
    {
      inventoryCode: "INV-2026-0002",
      itemName: "KTM Mahasiswa FTI",
      category: "Dokumen/Kartu",
      publicDescription: "Kartu Tanda Mahasiswa atas nama Ahmad",
      privateVerificationNotes: "NIM 2111500001 Program Studi Teknik Informatika",
      foundLocation: "Kantin Pusat",
      foundOn: "2026-10-16",
      receivedAt: new Date("2026-10-16T10:00:00Z"),
      status: "STORED" as const,
      isVisible: true,
      photoPath: "items/inv-2026-0002.webp",
    },
    {
      inventoryCode: "INV-2026-0003",
      itemName: "Botol Minum Hydro Flask Hitam",
      category: "Aksesori",
      publicDescription: "Tumbler warna hitam doff ukuran 32oz",
      privateVerificationNotes: "Terdapat sedikit penyok di bagian bawah botol",
      foundLocation: "Perpustakaan Lt. 2",
      foundOn: "2026-10-17",
      receivedAt: new Date("2026-10-17T11:00:00Z"),
      status: "STORED" as const,
      isVisible: true,
      photoPath: "items/inv-2026-0003.webp",
    },
    {
      inventoryCode: "INV-2026-0004",
      itemName: "Jaket Parka Hijau Army",
      category: "Pakaian",
      publicDescription: "Jaket parka ukuran XL tertinggal di kursi",
      privateVerificationNotes: "Ada kunci lemari di saku kanan",
      foundLocation: "Gazebo Barat",
      foundOn: "2026-10-18",
      receivedAt: new Date("2026-10-18T12:00:00Z"),
      status: "STORED" as const,
      isVisible: true,
      photoPath: "items/inv-2026-0004.webp",
    },
    {
      inventoryCode: "INV-2026-0005",
      itemName: "Flashdisk SanDisk 64GB",
      category: "Elektronik",
      publicDescription: "Flashdisk USB 3.0 gantungan tali merah",
      privateVerificationNotes: "Berisi folder Skripsi_Final_Rev",
      foundLocation: "Lab Multimedia Lt. 4",
      foundOn: "2026-10-19",
      receivedAt: new Date("2026-10-19T08:30:00Z"),
      status: "STORED" as const,
      isVisible: true,
      photoPath: "items/inv-2026-0005.webp",
    },
    {
      inventoryCode: "INV-2026-0006",
      itemName: "Kacamata Frame Hitam Rayban",
      category: "Aksesori",
      publicDescription: "Kacamata baca dalam tempat kacamata kulit cokelat",
      privateVerificationNotes: "Lensa minus 2.5 silinder 0.5",
      foundLocation: "Masjid Al-Uswah",
      foundOn: "2026-10-19",
      receivedAt: new Date("2026-10-19T13:00:00Z"),
      status: "STORED" as const,
      isVisible: true,
      photoPath: "items/inv-2026-0006.webp",
    },
    {
      inventoryCode: "INV-2026-0007",
      itemName: "Kunci Motor Honda Beat",
      category: "Aksesori",
      publicDescription: "Kunci motor dengan gantungan anime Naruto",
      privateVerificationNotes: "Kunci ada tulisan remote alarm merah",
      foundLocation: "Parkiran Motor Bawah",
      foundOn: "2026-10-20",
      receivedAt: new Date("2026-10-20T09:15:00Z"),
      status: "STORED" as const,
      isVisible: true,
      photoPath: "items/inv-2026-0007.webp",
    },
    {
      inventoryCode: "INV-2026-0008",
      itemName: "Kalkulator Ilmiah Casio",
      category: "Alat Tulis",
      publicDescription: "Kalkulator scientific fx-991EX cover hitam",
      privateVerificationNotes: "Ada coretan nama 'Rian' di tutup baterai",
      foundLocation: "Ruang Kelas 6.3.1",
      foundOn: "2026-10-20",
      receivedAt: new Date("2026-10-20T14:45:00Z"),
      status: "STORED" as const,
      isVisible: true,
      photoPath: "items/inv-2026-0008.webp",
    },
    {
      inventoryCode: "INV-2026-0009",
      itemName: "Buku Catatan Algoritma",
      category: "Alat Tulis",
      publicDescription: "Buku tulis spiral sampul biru bertuliskan Algoritma",
      privateVerificationNotes: "Terdapat tulisan dosen pengampu Dr. Ir.",
      foundLocation: "Lobby Gedung Pengajaran",
      foundOn: "2026-10-21",
      receivedAt: new Date("2026-10-21T11:20:00Z"),
      status: "STORED" as const,
      isVisible: true,
      photoPath: "items/inv-2026-0009.webp",
    },
    {
      inventoryCode: "INV-2026-0010",
      itemName: "Headphone Sony WH-1000XM4",
      category: "Elektronik",
      publicDescription: "Headphone wireless warna silver dalam case",
      privateVerificationNotes: "Ada kabel AUX di kantong dalam casing",
      foundLocation: "Auditorium Lt. 3",
      foundOn: "2026-10-21",
      receivedAt: new Date("2026-10-21T16:00:00Z"),
      status: "STORED" as const,
      isVisible: true,
      photoPath: "items/inv-2026-0010.webp",
    },
    {
      inventoryCode: "INV-2026-0011",
      itemName: "Helm Bogo Retro Cokelat",
      category: "Aksesori",
      publicDescription: "Helm bogo kaca cembung tertinggal di spion",
      privateVerificationNotes: "Busa dalam warna cokelat muda",
      foundLocation: "Parkiran Motor Depan",
      foundOn: "2026-10-22",
      receivedAt: new Date("2026-10-22T08:00:00Z"),
      status: "STORED" as const,
      isVisible: true,
      photoPath: "items/inv-2026-0011.webp",
    },
    {
      inventoryCode: "INV-2026-0012",
      itemName: "Payung Lipat Polkadot Biru",
      category: "Aksesori",
      publicDescription: "Payung lipat kecil sarung biru polkadot",
      privateVerificationNotes: "Rangka payung ada sedikit karat di sambungan",
      foundLocation: "Koridor Gedung Serbaguna",
      foundOn: "2026-10-22",
      receivedAt: new Date("2026-10-22T15:30:00Z"),
      status: "STORED" as const,
      isVisible: true,
      photoPath: "items/inv-2026-0012.webp",
    },
    // Negative Privacy Test Fixtures (Hidden, Returned, Distributed)
    {
      inventoryCode: "INV-2026-HIDDEN",
      itemName: "Barang Uji Hidden (Tidak Boleh Terlihat Publik)",
      category: "Aksesori",
      publicDescription: "Barang ini status is_visible false dan dilarang muncul",
      privateVerificationNotes: "Catatan pengujian privacy",
      foundLocation: "Ruang Pengujian",
      foundOn: "2026-10-23",
      receivedAt: new Date("2026-10-23T10:00:00Z"),
      status: "STORED" as const,
      isVisible: false,
      photoPath: "items/inv-2026-hidden.webp",
    },
    {
      inventoryCode: "INV-2026-RET",
      itemName: "Barang Uji Returned (Sudah Diambil Pemilik)",
      category: "Elektronik",
      publicDescription: "Barang ini berstatus RETURNED_TO_OWNER",
      privateVerificationNotes: "Telah dikembalikan pada pemilik sah",
      foundLocation: "Kantin",
      foundOn: "2026-10-10",
      receivedAt: new Date("2026-10-10T10:00:00Z"),
      status: "RETURNED_TO_OWNER" as const,
      isVisible: true,
      photoPath: "items/inv-2026-ret.webp",
    },
    {
      inventoryCode: "INV-2026-DIST",
      itemName: "Barang Uji Distributed (Sudah Disalurkan)",
      category: "Lainnya",
      publicDescription: "Barang ini berstatus DISTRIBUTED",
      privateVerificationNotes: "Telah disalurkan ke panti asuhan rekanan",
      foundLocation: "Bengkel",
      foundOn: "2026-10-05",
      receivedAt: new Date("2026-10-05T10:00:00Z"),
      status: "DISTRIBUTED" as const,
      isVisible: true,
      photoPath: "items/inv-2026-dist.webp",
    },
  ];

  for (const itemData of itemsToSeed) {
    let item = await db.query.foundItems.findFirst({
      where: eq(foundItems.inventoryCode, itemData.inventoryCode),
    });

    if (!item) {
      const [insertedItem] = await db
        .insert(foundItems)
        .values({
          inventoryCode: itemData.inventoryCode,
          recordedByUserId: officer.userId,
          storagePostId: post.postId,
          itemName: itemData.itemName,
          category: itemData.category,
          publicDescription: itemData.publicDescription,
          privateVerificationNotes: itemData.privateVerificationNotes,
          foundLocation: itemData.foundLocation,
          foundOn: itemData.foundOn,
          receivedAt: itemData.receivedAt,
          status: itemData.status,
          isVisible: itemData.isVisible,
        })
        .returning();
      item = insertedItem;
      console.log(`✅ Seeded item: ${item.inventoryCode} (${item.itemName})`);

      // Seed photo
      await db.insert(itemPhotos).values({
        itemId: item.itemId,
        storagePath: itemData.photoPath,
        isPrimary: true,
      });
      console.log(`   📸 Seeded primary photo for ${item.inventoryCode}`);
    } else {
      console.log(`ℹ️ Item already exists: ${item.inventoryCode}`);
    }
  }

  console.log("✨ Seed completed successfully with deterministic test items!");
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
