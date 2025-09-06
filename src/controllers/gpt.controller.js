const OpenAI = require("openai");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getAnalisisGizi = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ID is required." });
    }

    // Ambil recap anak berdasarkan ID
    const currentRecap = await prisma.recapAnak.findUnique({
      where: { kodeRecap: id },
      select: {
        anakIbuId: true,
        tanggal: true,
        beratBadan: true,
        tinggiBadan: true,
        usia: true,
        anemia: true,
        stunting: true,
        konjungtivitasNormal: true,
        kukuBersih: true,
        riwayatAnemia: true,
        tampakLemas: true,
        tampakPucat: true,
        rekomendasi: true,
        anakIbu: {
          select: {
            nama: true,
            jenisKelamin: true,
            id: true,
            ibu: {
              select: { nama: true },
            },
          },
        },
      },
    });

    if (!currentRecap) {
      return res.status(404).json({ message: "No recap found with this ID." });
    }

    // Cari recap sebelumnya
    const previousRecap = await prisma.recapAnak.findFirst({
      where: {
        anakIbuId: currentRecap.anakIbuId,
        tanggal: { lt: currentRecap.tanggal },
      },
      orderBy: { tanggal: "desc" },
    });

    // Buat prompt GPT
    const prompt = `
Anda adalah seorang dokter gizi anak yang membuat analisis personal berdasarkan data balita terkini sebagai acuan utama.

Tugas Anda:
1. Gunakan **umur anak (bulan), berat badan, tinggi badan** untuk mengevaluasi kurva pertumbuhan WHO.
   - Jika normal/baik → pujian + rekomendasi mempertahankan.
   - Jika normal tapi mendekati stunting → waspada ringan.
   - Jika kurang → saran nutrisi spesifik.
   - Jika berlebih → kontrol asupan & aktivitas.
2. Evaluasi **status anemia**:
   - Jika normal → apresiasi.
   - Jika anemia → rekomendasi makanan kaya zat besi (daging merah, hati ayam, bayam) & vitamin C.
3. Perhatikan juga faktor kebersihan (kuku, konjungtiva, pucat, lemas).
4. Hubungkan langsung kondisi anak dengan rekomendasi.
5. Gunakan format **Markdown** rapi:
   - ## Informasi Umum
   - ## Analisis Pertumbuhan
   - ## Analisis Anemia
   - ## Analisis Kebersihan & Kondisi Fisik
   - ## Rekomendasi Spesifik
   - ## Kesimpulan

Data terkini:
${JSON.stringify(currentRecap, null, 2)}

Data sebelumnya:
${JSON.stringify(previousRecap, null, 2)}
`;

    // Panggil GPT
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Anda adalah dokter ahli gizi anak." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
    });

    const rekomendasi = completion.choices[0].message.content;

    // Update recap dengan rekomendasi GPT
    const updatedRecap = await prisma.recapAnak.update({
      where: { kodeRecap: id },
      data: { rekomendasi },
    });

   res.status(201).json({
      message: "Anak uploaded successfully and RecapRt created/updated",
      updatedRecap,
      rekomendasi,
    });
  } catch (error) {
    console.error("Error GPT:", error);
    res.status(500).json({ error: "Gagal menghasilkan rekomendasi." });
  }
};

const getAnalisisSanitasi = async (req, res) => {
  try {
    const { quizResult } = req.body;

    const prompt = `
Anda adalah seorang dokter anak dengan fokus pada kebersihan & sanitasi.

Berdasarkan hasil quiz berikut, analisis apakah kebiasaan anak sudah bersih atau masih perlu diperbaiki:
${JSON.stringify(quizResult, null, 2)}

PENTING — instruksi yang HARUS dipenuhi:
1.**JANGAN** menampilkan ulang pertanyaan atau jawaban quiz. Langsung masuk ke **analisis mendalam**.
2. Tulis output **HANYA** dalam format **Markdown** (siap dirender di Flutter). Jangan bungkus dalam code fences 
3. Berikan evaluasi kesimpulan dulu apakah hasil sanitasi baik, waspada, atau buruk. Tiap ya itu 1 poin. Jika poin 6 keatas indikasi Baik, 4-5 Waspada, dan kurang dari itu buruk
4. Bahas lanjut  hasil menjadi empat section jelas dengan heading:
   ## Kesehatan Mulut
   ## Kebersihan Tangan
   ## Higiene Toilet
   ## Penggunaan Air Minum
5. Untuk **masing-masing section** berikan:
   - Satu kalimat penilaian singkat (apresiasi jika baik; peringatan jika kurang).
   - Analisis singkat penyebab/risiko (1-2 paragraf maksimum).
   - Rekomendasi praktis & spesifik (bullet list) yang bisa dilakukan di rumah (usia-balita aware jika ada usia di 'child').
   - Tips monitoring & kapan sebaiknya konsultasi ke tenaga kesehatan.
6. Jika data untuk suatu section **tidak tersedia**, tulis analisis singkat umum + rekomendasi dasar untuk pemeriksaan data tersebut.
7. Gunakan Bahasa Indonesia yang jelas dan ringkas. Fokus pada tindakan praktis.

Hasil markdown harus mudah dibaca & bisa langsung dipakai di Flutter.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Anda adalah dokter anak ahli sanitasi." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
    });

    const hasil = completion.choices[0].message.content;
    res.status(201).json({
      message: "Anak uploaded successfully and RecapRt created/updated",
      rekomendasi: hasil,
    });;
  } catch (error) {
    console.error("Error GPT:", error);
    res.status(500).json({ error: "Gagal menghasilkan analisis sanitasi." });
  }
};

const getAnalisisMakanan = async (req, res) => {
  try {
    const { DDS } = req.body;

    const prompt = `
Anda adalah seorang dokter ahli gizi anak dengan fokus pada keberagaman makanan.

Berdasarkan hasil quiz berikut, analisis apakah keberagaman anak sudah cukup atau belum:
${JSON.stringify(DDS, null, 2)}

PENTING — instruksi yang HARUS dipenuhi:
1. Dari Total 7 Score Keberagaman bandingka berapa total yang ada dan tidak ada. Jika lebih dari 6 maka beragam, 4-5 Cukup Beragam, 3 kebawah kurang
  -Sumber Karbohidrat
  -Kacang legume
  -Produk susu
  -Produk daging
  -Telur
  -Buah dan sayur lainnya
  -Buah dan sayur vitamin A
    
2. Section Pertama bahas kesimpulan dulu apakah sudah beragam, cukup, atau kurang  
3. Section selanjutnya bahas apa saja yang kurang dan apa saja yang sudah terpenuhi
4. Terakhir Bahas dampak pada anak dan rekomendasi berupa aksi
5. Gunakan Bahasa Indonesia yang jelas dan ringkas. Fokus pada tindakan praktis.

Hasil markdown harus mudah dibaca & bisa langsung dipakai di Flutter.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Anda adalah dokter anak ahli gizi anak." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
    });

    const hasil = completion.choices[0].message.content;
    res.status(201).json({
      message: "Analisis makanan berhasil dibuat.",
      rekomendasi: hasil,
    });
  } catch (error) {
    console.error("Error GPT:", error);
    res.status(500).json({ error: "Gagal menghasilkan analisis makanan." });
  }
};

module.exports = { getAnalisisSanitasi, getAnalisisGizi, getAnalisisMakanan };
