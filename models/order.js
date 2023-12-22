const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  client_first_name: {
    type: String,
  },
  client_last_name: {
    type: String,
  },
  client_email: {
    type: String,
  },
  client_phone: {
    type: String,
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    require: false,
  },
  currency: {
    type: String,
  },
  type: {
    type: String,
    default:"delivery"
  },
  status: {
    type: String,
    default: "pending",
  },
  source: String,
  price_total: {
    type:Number,
  },
  deliveryAdress: {
    type: String,
    default:
      "شارع الملك عبد العزيز آلسعود, كولزي صولة, المنار, معتمدية المنزه, Tunis, 2092, Tunisia",
  },
  table:{
    type:Number
  },
  size:{
    type:String
  },
  items: [
    {
      id: String,
      name: String,
      description: String,
      total_item_price: Number,
      price: Number,
      quantity: Number,
      size:String,
      tax: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Tax",
        },
      ],
      options: [
        {
          id: String,
          name: String,
          price: Number,
          group_name: String,
          quantity: Number,
        },
      ],
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  },
preparedAt: {
    type: Date
  },
});

  const Order = mongoose.model('Order', orderSchema);
  module.exports = Order;