const { PrismaClient } = require("@prisma/client");
const ClientError = require("../errors/ClientError");
const passport = require('passport');
const { get } = require("http");
const prisma = new PrismaClient(); 


const login = async (req, res, next) => {
  passport.authenticate('local', (err, data, info) => {
    if (err) return next(err);
    if (!data) {
      return res.status(401).json({ message: info.message || 'Login failed' });
    }

    const { user, token } = data;

    res.json({
      message: 'Login successful',
      token,
      user: {
        nidn: user.email,
        nama: user.nama, 
      },
    });
  })(req, res, next);
};

const logout = async (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
};



module.exports = {
  login,
};