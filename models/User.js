const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  dob: { type: Date, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  gender: { type: String, required: true },
  userType: { type: String, required: true }
});

module.exports = mongoose.model('User', userSchema); 