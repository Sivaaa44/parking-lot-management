const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password_hash: String,
  name: String,
});

module.exports = mongoose.model('User', userSchema);