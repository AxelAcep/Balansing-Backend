// controllers/user.controller.js

const { PrismaClient } = require("@prisma/client");
const ClientError = require("../errors/ClientError");
const { createClient } = require('@supabase/supabase-js');
// const bcrypt = require('bcryptjs'); // Tidak perlu lagi jika Supabase yang menghash
const crypto = require('crypto');
const passport = require('../passport'); // Jika Anda menggunakan passport
const jwt = require('jsonwebtoken');
const { get } = require("http");

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


const getKader = async (req, res) => {
  try {
    const { email } = req.params;

    // Validate email if necessary (e.g., check for valid email format)
    if (!email) {
      return res.status(400).json({ error: "Email parameter is required." });
    }

    const kader = await prisma.kader.findUnique({
      where: { email },
    });

    if (!kader) {
      // If no kader is found with the given email
      return res.status(404).json({ error: "Kader not found." });
    }

    // If kader is found, send it as a JSON response
    res.status(200).json(kader);

  } catch (error) {
    console.error("Error fetching kader:", error); // Log the error for debugging
    res.status(500).json({ error: "Internal Server Error" });
  }
};    

const editKader = async (req, res) => {
  try {
    const {
      namaPuskesmas,
      namaPosyandu,
      provinsi,
      kota,
      kecamatan,
      kelurahan,
      rt,
      rw,
      email, // Pastikan email ini datang dari body untuk identifikasi user yang akan diupdate
    } = req.body;

    // Pastikan semua field yang ingin diupdate ada di req.body
    // Jika ada field lain seperti 'name', 'phone', 'address' yang juga ingin diupdate,
    // pastikan itu juga disertakan di req.body dan skema Prisma Anda.
    const updatedKader = await prisma.kader.update({
      where: { email: email }, // Menggunakan email dari req.body sebagai kriteria WHERE
      data: {
        namaPuskesmas: namaPuskesmas,
        namaPosyandu: namaPosyandu,
        provinsi: provinsi,
        kota: kota,
        kecamatan: kecamatan,
        kelurahan: kelurahan,
        rt: rt,
        rw: rw,
      },
    });

    res.status(200).json(updatedKader);
  } catch (error) {
    console.error("Error updating kader:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getRecap = async (req, res) => {
  try {
    const { email } = req.params; // Assuming email is available in req.user from JWT authentication
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const recap = await prisma.anakKader.findMany({
      where: { kaderEmail: email },
    });

    res.status(200).json(recap || { message: "No recap found for this kader." });
  } catch (error) {
    console.error("Error fetching recap:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const unggahAnak = async (req, res) => {
  try {
    const {
      email, // This will be kader's email for RecapRt
      tanggalPemeriksaan,
      namaIbu,
      namaAnak,
      umurTahun,
      umurBulan,
      beratBadan,
      tinggiBadan, // Added based on AnakKader schema
      jenisKelamin,
      konjungtivitaNormal,
      kukuBersih,
      tampakLemas,
      tampakPucat,
      riwayatAnemia,
      // Capturing any other fields sent in the request body that are not explicitly used
    } = req.body;

    console.log(konjungtivitaNormal, kukuBersih, tampakLemas, tampakPucat, riwayatAnemia);

    // --- Data Preparation for AnakKader ---
    // Convert age to total months
    const usiaInMonths = (parseInt(umurTahun) * 12) + parseInt(umurBulan);

    const anakKaderData = {
      nama: namaAnak,
      jenisKelamin: jenisKelamin, // Assuming 'L' for
      namaIbu: namaIbu,
      usia: usiaInMonths, // Age in total months
      beratBadan: parseFloat(beratBadan),
      tinggiBadan: parseFloat(tinggiBadan), // Using tinggiBadan from req.body
      anemia: true, // Temporarily set to true as requested
      stunting: true, // Temporarily set to true as requested
      tanggal: new Date(tanggalPemeriksaan), // Ensure it's a Date object
      kaderEmail: email, // Kader's email for linking
    };

    // Create AnakKader record
    const anakKaderRecord = await prisma.anakKader.create({
      data: anakKaderData,
    });


    res.status(201).json({
      message: "Anak uploaded successfully and RecapRt created/updated",
      anakKader: anakKaderRecord,
    });
  } catch (error) {
    console.error("Error uploading anak:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
    getKader,
    editKader,
    unggahAnak,
    getRecap,
};