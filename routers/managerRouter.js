const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const { checkClient } = require("../middlewares/authMiddleware.js");
const Store = require("../models/store.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config.js");
const GroupeOption = require("../models/optionGroupe.js");
const order = require("../models/order.js");
const multer = require("multer");
const path = require("path");
const Option = require("../models/productOption.js");
const Menu = require("../models/menu.js");
const Product = require("../models/product.js");
const Category = require("../models/category.js");
const Company = require("../models/company.js");
const mongoose = require("mongoose");
const Tax = require("../models/tax.js");
const fs = require("fs");
const ConsumationMode = require("../models/mode");
const cors = require("cors");
const passport = require("passport");
const { sendWelcomeEmail } = require("../emailService.js");
const Mail = require("nodemailer/lib/mailer/index.js");
const { sendForgetpasswordclient } = require("../emailService.js");
const { sendVerificationClient } = require("../emailService.js");
const optionGroupe = require("../models/optionGroupe.js");
const ProductOption = require("../models/productOption.js");
const schedule = require("node-schedule");
require("../middlewares/passportSetup");

// get stores name by user id
router.get('/getstoresnameandidbyuserid/:id', async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await User.findById({ "_id": userId }).populate('stores');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({
        stores: user.stores,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  //login
  router.post("/login-", (req, res) => {
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          return res.status(404).json({ message: "User not found!" });
        }
        bcrypt
          .compare(req.body.password, user.password)
          .then((valid) => {
            if (!valid) {
              return res.status(404).json({ message: "Incorrect password" });
            }
            const token = jwt.sign(
              { id: user._id, role: user.role },
              config.secret
            );
            res.cookie("token", token);
            return res.status(200).json({
              message: "Login success",
              token,
              user,
            });
          })
          .catch((error) => {
            console.error("Error comparing passwords:", error);
            return res.status(500).json({ message: err?.message });
          });
      })
      .catch((error) => {
        console.error("Error finding user by email:", error);
        return res.status(500).json({ message: err?.message });
      });
  });
  // update status of order by id (from restaurant's owner)
  router.put("/order/updatestatus", async (req, res) => {
    try {
      const { status, _id, preparationTime } = req.body;
      if (status && _id) {
        let data = preparationTime ? {
          status, updatedAt: Date.now(), preparedAt: new Date(Date.now() + preparationTime * 60000)
        } : { status, updatedAt: Date.now() }
        const updateStatus = await order.findOneAndUpdate(
          { _id: _id },
          data,
          { new: true }
        );
        if (!updateStatus) {
          return res.status(404).json({
            message: "Order not found.",
          });
        }
        return res.status(200).json({
          message: "Status does update successfully.",
          order: updateStatus,
        });
      }
      return res.status(400).json({
        message: "No data found. Failed to update order's status.",
      });
    } catch (err) {
      return res.status(500).json({
        message: err?.message,
      });
    }
  });
  //get all orders by store
  router.get("/order/allorders/:storeSelected", async (req, res) => {
    await order.find({ storeId: req.params.storeSelected }).sort({ _id: -1 }).exec().then((response) => {
      return res.status(200).json({
        message: "All orders does got successfully.",
        orders: response
      })
    })
      .catch((err) => {
        return res.status(500).json({
          message: err?.message,
        })
      })
  });
  //get accepted orders by store
  router.get("/order/acceptedorders/:storeSelected", async (req, res) => {
    await order.find({ storeId: req.params.storeSelected, status: 'accepted' }).sort({ _id: -1 }).exec().then((response) => {
      return res.status(200).json({
        message: "Accepted orders does got successfully.",
        orders: response
      })
    })
      .catch((err) => {
        return res.status(500).json({
          message: err?.message,
        })
      })
  });
  //get ready orders by store
  router.get("/order/readydorders/:storeSelected", async (req, res) => {
    await order.find({ storeId: req.params.storeSelected, status: 'ready' }).sort({ _id: -1 }).exec().then((response) => {
      return res.status(200).json({
        message: "Ready orders does got successfully.",
        orders: response
      })
    })
      .catch((err) => {
        return res.status(500).json({
          message: err?.message,
        })
      })
  });
  // active or disactive store
  router.put("/store/changestatus", async (req, res) => {
    const { _id, active } = req.body;
    try {
      if (_id && active !== undefined) {
        const updateStatus = await Store.findOneAndUpdate(
          { _id: _id },
          { active },
          { new: true }
        );
        if (!updateStatus) {
          return res.status(404).json({
            message: "Store not found.",
          });
        }
        return res.status(200).json({
          message: updateStatus.active ? "Store is active" : "Store is disactive",
          store: updateStatus,
        });
      }
      return res.status(400).json({
        message: "No data found. Failed to update store's status.",
      });
    } catch (err) {
      return res.status(500).json({
        message: err?.message,
      });
    }
  });
module.exports = router;
