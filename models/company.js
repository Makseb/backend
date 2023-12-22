const mongoose = require('mongoose');
const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
      },
      owners: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],
      stores:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Store'
      }],
      verified: {
        type: Boolean,
        default: 'false',
      },
      legalstatus: {
        type: String,
        default: "pending",
      },
      duns: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      phone: {
        type: Number,
      },
      email: {
        type: String,
      },
      website: {
        type: String,
      },
});
module.exports = mongoose.model('Company', companySchema);
