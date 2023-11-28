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
});

module.exports = mongoose.model('Company', companySchema);
