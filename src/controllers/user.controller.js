// controllers/user.controller.js

const { PrismaClient } = require("@prisma/client");
const ClientError = require("../errors/ClientError"); // Sesuaikan path jika ClientError adalah default export
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Jika Anda ingin menggunakan ini
const passport = require('../passport'); // Jika Anda menggunakan passport
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const prisma = new PrismaClient();

// Fungsi ini sebenarnya tidak dibutuhkan jika Anda mengandalkan @default(cuid()) di Prisma
// Tapi saya biarkan jika ada keperluan lain.
const generateRandomId = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < 10; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const registerKader = async (req, res) => {
  const {
    email,
    password,
    namaPuskesmas,
    namaPosyandu,
    provinsi,
    kota,
    kecamatan,
    kelurahan,
    rt,
    rw,
    kodePos,
  } = req.body;

  // Validasi input dasar
  if (!email || !password || !namaPuskesmas || !namaPosyandu || !provinsi || !kota || !kecamatan || !kelurahan || !rt || !rw) {
    return res.status(400).json({ message: 'Semua field wajib diisi kecuali kodePos.' });
  }

  try {
    // 1. Membuat user di autentikasi Supabase
    // Hash password sebelum mendaftar ke Supabase
    const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds 10

    const { data: supabaseUser, error: supabaseError } = await supabase.auth.signUp({
      email: email,
      password: password, // Supabase akan menghash password ini
    });

    if (supabaseError) {
      console.error("Supabase registration error:", supabaseError.message);
      // Tangani error jika email sudah terdaftar di Supabase
      if (supabaseError.message.includes("User already registered")) {
        return res.status(409).json({ message: 'Email sudah terdaftar di Supabase.' });
      }
      return res.status(500).json({ message: 'Gagal mendaftar user di Supabase.', error: supabaseError.message });
    }

    // Jika Supabase berhasil mendaftar (meskipun mungkin perlu verifikasi email)
    // 2. Membuat data User baru ke database Prisma
    let newUser;
    try {
      newUser = await prisma.user.create({
        data: {
          email: email,
          password: hashedPassword, // Simpan password yang sudah di-hash di DB Anda juga
          jenis: 'KADER', // Set jenis user sebagai 'KADER'
        },
      });
    } catch (prismaUserError) {
      // Jika pembuatan User di Prisma gagal, coba hapus user dari Supabase
      console.error("Prisma User creation error:", prismaUserError);
      if (supabaseUser && supabaseUser.user && supabaseUser.user.id) {
        await supabase.auth.admin.deleteUser(supabaseUser.user.id); // Hapus user dari Supabase
      }
      return res.status(500).json({ message: 'Gagal membuat data user di database.', error: prismaUserError.message });
    }

    // 3. Membuat data baru di Kader
    let newKader;
    try {
      newKader = await prisma.kader.create({
        data: {
          id: generateRandomId(), // Menggunakan fungsi generateRandomId untuk ID unik
          email: email, // Email ini akan menjadi foreign key ke model User
          namaPuskesmas: namaPuskesmas,
          namaPosyandu: namaPosyandu,
          provinsi: provinsi,
          kota: kota,
          kecamatan: kecamatan,
          kelurahan: kelurahan,
          rt: rt,
          rw: rw,
          kodePos: kodePos || null, // Jika kodePos tidak ada, set ke null
        },
      });
    } catch (prismaKaderError) {
      // Jika pembuatan Kader di Prisma gagal, coba hapus user dari Supabase dan Prisma User
      console.error("Prisma Kader creation error:", prismaKaderError);
      if (supabaseUser && supabaseUser.user && supabaseUser.user.id) {
        await supabase.auth.admin.deleteUser(supabaseUser.user.id);
      }
      await prisma.user.delete({ where: { email: email } });
      return res.status(500).json({ message: 'Gagal membuat data kader di database.', error: prismaKaderError.message });
    }

    res.status(201).json({
      message: 'Registrasi kader berhasil!',
      user: {
        email: newUser.email,
        jenis: newUser.jenis,
      },
      kader: newKader,
    });

  } catch (error) {
    console.error("General registration error:", error);
    res.status(500).json({ message: 'Terjadi kesalahan server.', error: error.message });
  }
};

const login = async (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error("Passport authentication error:", err);
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        message: info.message || 'Login gagal. Email atau password salah.',
      });
    }

    // Jika autentikasi berhasil
    const secretKey = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Gunakan secret key yang kuat dari .env

    // Membuat JWT TANPA waktu kedaluwarsa (expiresIn)
    const token = jwt.sign(
      {
        email: user.email,
        jenis: user.jenis,
        // Tambahkan data user lain yang relevan ke token jika diperlukan
      },
      secretKey
      // Opsi expiresIn dihapus di sini
    );

    res.status(200).json({
      message: 'Login berhasil!',
      token: token,
      user: {
        email: user.email,
        jenis: user.jenis,
        // Anda bisa menambahkan data user lain yang ingin dikembalikan ke klien
      },
    });

  })(req, res, next);
};

const logout = async (req, res) => {
  // Untuk JWT yang tidak kedaluwarsa, "logout" di sisi server biasanya berarti
  // menginstruksikan klien untuk menghapus token yang tersimpan.
  // Jika Anda memerlukan invalidasi token di sisi server (misalnya, untuk keamanan yang lebih tinggi),
  // Anda perlu mengimplementasikan mekanisme daftar hitam (blacklist) token.
  // Misalnya, menyimpan token yang di-logout ke tabel `InvalidatedTokens` di database,
  // dan setiap request yang diautentikasi harus memeriksa daftar ini.

  // Untuk saat ini, ini hanya respons yang mengindikasikan logout berhasil.
  // Klien bertanggung jawab untuk menghapus token dari penyimpanan lokalnya.
  res.status(200).json({ message: 'Logout berhasil. Mohon hapus token dari perangkat Anda.' });
};

module.exports = {
  login,
  registerKader,
  logout // Pastikan Anda juga mengekspor logout jika ingin digunakan di tempat lain
};