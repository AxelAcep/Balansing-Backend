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
const dayjs = require('dayjs');
const isBetween = require('dayjs/plugin/isBetween');
dayjs.extend(isBetween);

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

const getAnakIbubyId = async (req, res) => {
  try{
    const { id } = req.params; // Assuming id is the unique identifier for AnakKader
    if (!id) {
      return res.status(400).json({ error: "ID is required." });
    }

    const recap = await prisma.anakIbu.findUnique({
      where: { id: id }, // Ensure id is parsed to an integer if it's a number
    });

    if (!recap) {
      return res.status(200).json({ message: "No recap found with this ID." });
    }

    res.status(200).json(recap);
  } catch (error) {
    console.error("Error fetching recap by ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const deleteAnakbyId = async (req, res) => {
  try{
    const { id } = req.params; // Assuming id is the unique identifier for AnakKader
    if (!id) {
      return res.status(400).json({ error: "ID is required." });
    }

    const recap = await prisma.anakIbu.delete({
      where: { id: id }, // Ensure id is parsed to an integer if it's a number
    });

    if (!recap) {
      return res.status(200).json({ message: "No recap found with this ID." });
    }

    res.status(200).json(recap);
  } catch (error) {
    console.error("Error fetching recap by ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const addAnak = async (req, res) => {
  try{
    const { email, nama, beratBadan, tinggiBadan, jenisKelamin, usia,
    } = req.body;

    const today = dayjs();
    const birthDate = dayjs(usia);
    const usiaInMonths = today.diff(birthDate, 'month');

    // Panggil API untuk memeriksa stunting
    let stuntingStatus;
    try {
      // Mengubah jenis kelamin menjadi 'l' atau 'p' sebelum dikirim ke API
      let kelaminUntukAPI;
      if (jenisKelamin.toLowerCase() === 'laki-laki') {
        kelaminUntukAPI = 'l';
      } else if (jenisKelamin.toLowerCase() === 'perempuan') {
        kelaminUntukAPI = 'p';
      } else {
        // Fallback jika input tidak sesuai
        console.warn("Invalid 'jenisKelamin' value. Defaulting to 'l'.");
        kelaminUntukAPI = 'l';
      }

      const stuntingResponse = await fetch('http://localhost:4500/stunting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Mengubah key agar sesuai dengan model FastAPI
          usiaBulan: usiaInMonths,
          tinggi: parseFloat(tinggiBadan),
          kelamin: kelaminUntukAPI, // Menggunakan nilai yang sudah diubah
        }),
      });

      if (!stuntingResponse.ok) {
        // Log pesan error dari server Python jika tersedia
        const errorText = await stuntingResponse.text();
        console.error(`API Error Response: ${errorText}`);
        throw new Error(`HTTP error! status: ${stuntingResponse.status}`);
      }

      const stuntingResult = await stuntingResponse.json();
      stuntingStatus = stuntingResult; // Mengambil nilai string dari respons
    } catch (error) {
      console.error("Error calling stunting API:", error);
      // Lempar error untuk menghentikan proses unggah jika API gagal
      throw new Error("Failed to get stunting status from API.");
    }

    console.log(stuntingStatus);

    if(stuntingStatus == "Sangat Pendek"){
      stuntingStatus = "SangatPendek";
    }

    const anakIbuData = {
      nama: nama,
      jenisKelamin: jenisKelamin,
      emailIbu: email,
      usia: usia,
      beratBadan: parseFloat(beratBadan),
      tinggiBadan: parseFloat(tinggiBadan),
      anemia: false, 
      stunting: stuntingStatus, // Nilai diperbarui dari respons API
    };

    // Create AnakKader record
    const anakIbuRecord = await prisma.anakIbu.create({
      data: anakIbuData,
    });

    res.status(201).json({
      message: "Anak uploaded successfully and RecapRt created/updated",
      anakKader: anakIbuRecord,
    });


  }catch (error) {
    console.error("Error updating kader:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const editAnak = async (req, res) => {
  try {
    const {
      id,
      email,
      nama,
      beratBadan,
      tinggiBadan,
      jenisKelamin,
      usia,
    } = req.body;

    const today = dayjs();
    const birthDate = dayjs(usia);
    const usiaInMonths = today.diff(birthDate, 'month');

    // Panggil API untuk memeriksa stunting
    let stuntingStatus;
    try {
      // Mengubah jenis kelamin menjadi 'l' atau 'p' sebelum dikirim ke API
      let kelaminUntukAPI;
      if (jenisKelamin.toLowerCase() === 'laki-laki') {
        kelaminUntukAPI = 'l';
      } else if (jenisKelamin.toLowerCase() === 'perempuan') {
        kelaminUntukAPI = 'p';
      } else {
        // Fallback jika input tidak sesuai
        console.warn("Invalid 'jenisKelamin' value. Defaulting to 'l'.");
        kelaminUntukAPI = 'l';
      }

      const stuntingResponse = await fetch('http://localhost:4500/stunting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Mengubah key agar sesuai dengan model FastAPI
          usiaBulan: usiaInMonths,
          tinggi: parseFloat(tinggiBadan),
          kelamin: kelaminUntukAPI, // Menggunakan nilai yang sudah diubah
        }),
      });

      if (!stuntingResponse.ok) {
        // Log pesan error dari server Python jika tersedia
        const errorText = await stuntingResponse.text();
        console.error(`API Error Response: ${errorText}`);
        throw new Error(`HTTP error! status: ${stuntingResponse.status}`);
      }

      const stuntingResult = await stuntingResponse.json();
      stuntingStatus = stuntingResult; // Mengambil nilai string dari respons
    } catch (error) {
      console.error("Error calling stunting API:", error);
      // Lempar error untuk menghentikan proses unggah jika API gagal
      throw new Error("Failed to get stunting status from API.");
    }

    console.log(stuntingStatus);

    if (stuntingStatus == "Sangat Pendek") {
      stuntingStatus = "SangatPendek";
    }

    const anakIbuData = {
      nama: nama,
      jenisKelamin: jenisKelamin,
      emailIbu: email,
      usia: usia,
      beratBadan: parseFloat(beratBadan),
      tinggiBadan: parseFloat(tinggiBadan),
      stunting: stuntingStatus, // Nilai diperbarui dari respons API
    };

    // Update the AnakIbu record based on the provided ID
    const anakIbuRecord = await prisma.anakIbu.update({
      where: {
        id: id,
      },
      data: anakIbuData,
    });

    res.status(201).json({
      message: "Anak updated successfully and RecapRt created/updated",
      anakKader: anakIbuRecord,
    });
  } catch (error) {
    console.error("Error updating kader:", error);
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
};

const getAllAnak = async (req, res) => {
  try{
    const {email} = req.params;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const recap = await prisma.anakIbu.findMany({
      where: { emailIbu: email },
    });

    res.status(200).json(recap || { message: "No recap found for this Ibu." });


  }catch (error) {
    console.error("Error updating kader:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

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
    addAnak,
    getAllAnak,
    getAnakIbubyId,
    editAnak,
    deleteAnakbyId,
};