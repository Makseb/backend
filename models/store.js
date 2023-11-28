const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  address: {
    type: String,
    required: true,
  },
  longitude: {
    type: Number,
    required: false,
  },
  latitude: {
    type: Number,
    required: false,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending', 'rejected'],
    default: 'pending',
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  acceptedCurrencies: [{
    type: String,
    required: false,
  }],
  banners: [{
    imageUrl: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    link: {
      type: String,
      required: false,
    },
  }],
  consumationModes: [{
    mode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ConsumationMode', // You need to define this model
      required: true,
    },
    enabled: {
      type: Boolean,
      default: false, // Set to true if you want it to be enabled by default
    },

    menu: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu'

    },
  }
  ],


});

module.exports = mongoose.model('Store', storeSchema);

