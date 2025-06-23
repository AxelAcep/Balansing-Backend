const { PrismaClient } = require("@prisma/client");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");
require("dotenv").config();

passport.use(
  new LocalStrategy(
    { usernameField: "email" }, // pakai 'nidn' sebagai username
    async (email, password, done) => {
      try {
        const User = await prisma.user.findUnique({ where: { email } });

        if (!User) {
          return done(null, false, { message: "User Tidak Ditemukan" });
        }

        const isPasswordValid = User.password === password;
        if (!isPasswordValid) {
          return done(null, false, { message: "Incorrect password" });
        }

        const token = jwt.sign(
          { email: User.email }, // hanya menggunakan nidn
          process.env.JWT_SECRET,
          { expiresIn: "1h" },
        );

        return done(null, { user: User, token });
      } catch (err) {
        return done(err);
      }
    },
  ),
);

function authenticateJWT(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized. Token is missing." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token." });
    }

    req.user = user; // menyimpan informasi dosen di req
    next();
  });
}

module.exports = { passport, authenticateJWT };
