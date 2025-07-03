// src/config/passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email', // Default: username. Kita pakai email.
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        // Cari user di database berdasarkan email
        const user = await prisma.user.findUnique({
          where: { email: email },
        });

        // Jika user tidak ditemukan
        if (!user) {
          return done(null, false, { message: 'Email tidak terdaftar.' });
        }

        // Bandingkan password yang diinput dengan password ter-hash di database
        const isMatch = await bcrypt.compare(password, user.password);

        // Jika password tidak cocok
        if (!isMatch) {
          return done(null, false, { message: 'Password salah.' });
        }

        // Jika autentikasi berhasil
        // Anda bisa memilih data user mana yang ingin dikembalikan
        return done(null, user, { message: 'Login berhasil!' });
      } catch (error) {
        console.error("Error during Passport LocalStrategy:", error);
        return done(error); // Mengirim error ke middleware Express
      }
    }
  )
);

// Optional: Serialisasi dan Deserialisasi user (jika Anda menggunakan session)
// passport.serializeUser((user, done) => {
//   done(null, user.email); // Simpan email user di sesi
// });

// passport.deserializeUser(async (email, done) => {
//   try {
//     const user = await prisma.user.findUnique({
//       where: { email: email },
//     });
//     done(null, user);
//   } catch (error) {
//     done(error);
//   }
// });

module.exports = passport; // Ekspor instance passport yang sudah dikonfigurasi