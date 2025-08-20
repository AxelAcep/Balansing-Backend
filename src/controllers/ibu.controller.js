// controllers/user.controller.js

const { PrismaClient } = require("@prisma/client");
const ClientError = require("../errors/ClientError");
const { createClient } = require('@supabase/supabase-js');
// const bcrypt = require('bcryptjs'); // Tidak perlu lagi jika Supabase yang menghash
const crypto = require('crypto');
const passport = require('../passport'); // Jika Anda menggunakan passport
const jwt = require('jsonwebtoken');
const { get } = require("http");
const { register } = require("module");

// Supabase Client untuk sisi client (jika Anda menggunakannya di backend untuk beberapa kasus)
// Biasanya ini untuk operasi yang memerlukan kunci ANON_KEY
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY); // <--- PERBAIKAN: Gunakan ANON_KEY

// Supabase Admin Client untuk operasi backend yang membutuhkan hak akses penuh
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // <--- PERBAIKAN: Gunakan SERVICE_ROLE_KEY
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const prisma = new PrismaClient();

const getIbu = async (req, res) => {
  try {
    const { email } = req.params;

    // Validate email if necessary (e.g., check for valid email format)
    if (!email) {
      return res.status(400).json({ error: "Email parameter is required." });
    }

    const ibu = await prisma.ibuRumah.findUnique({
      where: { email },
    });

    if (!ibu) {
      // If no kader is found with the given email
      return res.status(404).json({ error: "Kader not found." });
    }

    // If kader is found, send it as a JSON response
    res.status(200).json(ibu);

  } catch (error) {
    console.error("Error fetching kader:", error); // Log the error for debugging
    res.status(500).json({ error: "Internal Server Error" });
  }
};    

const editIbu = async (req, res) => {
  try {
    const {
      nama,
      usia,
      noTelp,
      namaPuskesmas,
      namaPosyandu,
      provinsi,
      kota,
      kecamatan,
      kelurahan,
      rt,
      rw,
      alamat,
      email, // Pastikan email ini datang dari body untuk identifikasi user yang akan diupdate
    } = req.body;

    // Pastikan semua field yang ingin diupdate ada di req.body
    // Jika ada field lain seperti 'name', 'phone', 'address' yang juga ingin diupdate,
    // pastikan itu juga disertakan di req.body dan skema Prisma Anda.
    const updatedKader = await prisma.ibuRumah.update({
      where: { email: email }, // Menggunakan email dari req.body sebagai kriteria WHERE
      data: {
        nama: nama,
        usia: usia,
        noTelp: noTelp,
        namaPuskesmas: namaPuskesmas,
        namaPosyandu: namaPosyandu,
        provinsi: provinsi,
        kota: kota,
        kecamatan: kecamatan,
        kelurahan: kelurahan,
        rt: rt,
        rw: rw,
        alamat: alamat,
      },
    });

    res.status(200).json(updatedKader);
  } catch (error) {
    console.error("Error updating kader:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
    
    



module.exports = {
    getIbu,
    editIbu,
};