const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  availability: {
    type: Boolean,
    default: true,
  },
  storeId:{
    type:mongoose.Schema.Types.ObjectId,
    required: false,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false,
  },
  price:{
    type:Number,
  },
  image: {
    type: String,
    default: 'images/default.png',
  },
  size :[{
    name:{
        type:String,
    },
    price:{
      type:Number,
    },
    optionGroups: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OptionGroup',
      required: false,
      //select: false,
  }],
  }],
  optionGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OptionGroup',
    required: false,
}],
  taxes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tax',
    required: false,
  }],
});
const Product = mongoose.model('Product', productSchema);
module.exports = Product;