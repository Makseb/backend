  const mongoose = require("mongoose");

  const orderSchema = new mongoose.Schema({
    count: Number,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',  
      required: true,
    },
    orders: [
      {
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
        restaurant_name: {
          type: String,
        },
        currency: {
          type: String,
        },
        type: {
          type: String,
        },
        status: {
          type: String,
          default: "pending",
        },
        source: String,

        items: [
          {
            id: String,
            name: String,
            total_item_price: Number,
            price: Number,
            quantity: Number,
            type: String,
            options: [
              {
                id: Number,
                name: String,
                price: Number,
                group_name: String,
                quantity: Number,
                type: String,
                type_id: Number,
              },
            ],
          },
        ],
      },
    ],
  });

  module.exports = mongoose.model("Order", orderSchema);
