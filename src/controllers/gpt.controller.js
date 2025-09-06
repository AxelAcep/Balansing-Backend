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

module.exports = { getAnalisisGizi };
