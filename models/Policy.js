const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  policyNumber: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'LOB', required: true },
  carrierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Carrier', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true }
});

module.exports = mongoose.model('Policy', policySchema); 