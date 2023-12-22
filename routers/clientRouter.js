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

//signup
router.post("/signup", (req, res) => {
  bcrypt
    .hash(req.body.password, 10)
    .then((hash) => {
      // Create a new User instance with the hashed password
      const user = new User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        password: hash,
        sexe: req.body.sexe,
        role: "client",
      });
      user
        .save()
        .then(() => res.status(201).json({ message: "User created !", user }))
        .catch((error) => {
          console.error("Error saving user:", error);
          res
            .status(500)
            .json({ error: "An error occurred while saving the user." });
        });
    })
    .catch((error) => {
      console.error("Error hashing password:", error);
      res
        .status(500)
        .json({ error: "An error occurred while hashing the password." });
    });
});

//login
router.post("/login", (req, res) => {
  User.findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        return res.status(401).json({ error: "User not found!" });
      }

      bcrypt
        .compare(req.body.password, user.password)
        .then((valid) => {
          if (!valid) {
            return res.status(401).send("Incorrect password");
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
          return res.status(500).json({ error: "Internal server error" });
        });
    })
    .catch((error) => {
      console.error("Error finding user by email:", error);
      return res.status(500).json({ error: "Internal server error" });
    });
});

//api check email
router.post("/checkEmail", async (req, res) => {
  try {
    const email = req.body.email; // Email is now expected in the request body
    const existEmail = await User.findOne({ email });

    console.log(existEmail);
    if (existEmail) {
      return res.status(200).json({ exists: true });
    } else {
      return res.status(200).json({ exists: false });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while checking the email." });
  }
});

//failed login google
router.get("/loginGoogle/failed", (req, res) => {
  res.status(401).json({
    error: true,
    message: "Log in failure",
  });
});

// email verification
router.put("/verification/:id", async (req, res) => {
  try {
    const clientId = req.params.id;
    console.log(clientId);
    // Vérifier si le propriétaire existe
    const client = await User.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "client non trouvé" });
    }

    client.verifid = true;
    await client.save();

    res.json({ message: "client verifie" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Une erreur est survenue lors de la verification du client",
    });
  }
});

//send email verif
router.post("/sendVerification/:id", async (req, res, next) => {
  try {
    const clienId = req.params.id;
    console.log(clienId);

    // Vérifier si l'utilisateur existe
    const user = await User.findById(clienId);
    if (!user) {
      return res.status(404).json({ message: "Propriétaire non trouvé" });
    }

    // Générer un jeton JWT
    const token = jwt.sign({ id: user._id, role: user.role }, config.secret);

    // Envoyer le jeton JWT à l'utilisateur

    res.cookie("user", user);
    res.json({ token, user });
    sendVerificationClient(user.email, user.id, token);
  } catch (error) {
    next(error); // Passer l'erreur au middleware de capture des erreurs
  }
});

//forget password
router.post("/forgetPassword", async (req, res, next) => {
  try {
    const { email } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé" });

    // Générer un jeton JWT
    const token = jwt.sign({ id: user._id, role: user.role }, config.secret);

    // Envoyer le jeton JWT à l'utilisateur
    res.json({ token, user });
    sendForgetpasswordclient(email, user.id, token);
  } catch (error) {
    next(error); // Passer l'erreur au middleware de capture des erreurs
  }
});

//reset password
router.put("/resetPassword/:id", checkClient, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const saltRounds = 10;
  console.log(id);
  console.log(password);
  try {
    // Retrieve user from the database based on the provided ID
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify if the provided current password matches the one stored in the database

    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Assigner le mot de passe haché à l'admin

    // Hash the new password

    // Update the user's password in the database
    user.password = hashedPassword;
    await user.save();

    // Return a success response
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//login with google
router.get("/google", passport.authenticate("google", ["profile", "email"]));
//callback login with google
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/loginGoogle/failed",
  }),
  async (req, res) => {
    if (!req.user) {
      return res.redirect("http://localhost:3000");
    }

    const googleProfile = req.user;

    try {
      const user = await User.findOne({ email: googleProfile.email });

      if (!user) {
        const userData = {
          firstName: googleProfile.name.givenName,
          lastName: googleProfile.name.familyName,
          email: googleProfile.email,
          role: "client",
        };
        const newUser = new User(userData);
        await newUser.save();
      }

      const existUser = await User.findOne({ email: googleProfile.email });
      const userId = existUser._id;
      const accessToken = jwt.sign(
        { id: userId, role: existUser.role },
        config.secret
      );

      if (existUser.phoneNumber == null) {
        res.redirect(
          `http://localhost:3000/verify-phone/${userId}?token=${accessToken}`
        );
      } else {
        res.cookie("token", accessToken);
        res.cookie("user", JSON.stringify(user));
        res.redirect("http://localhost:3000");
      }
    } catch (err) {
      console.error("Error saving user data:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Route to handle phone number verification
router.post("/verify-phone/:userId", async (req, res) => {
  const userId = req.params.userId;
  const phoneNumber = req.body.phoneNumber;
  const sexe = req.body.gender;
  const token = req.query.token;

  console.log("Phone number:", phoneNumber);
  console.log("Gender:", sexe);

  try {
    const user = await User.findById(userId);

    console.log("User:", user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.phoneNumber = phoneNumber;
    user.sexe = sexe;
    user.verifid = true;
    await user.save();

    console.log("User saved successfully");
    res.status(200).json({
      message: "Phone number and gender verified and updated successfully",
    });
  } catch (err) {
    console.error("Error updating user data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//get all stores
router.get("/stores", async (req, res) => {
  const stores = await Store.find();
  res.send(stores);
});
//get All owners
router.get("/owners", async (req, res) => {
  const owners = await User.find({ role: "owner" });
  res.send(owners);
});
//get all companies
router.get("/companies", async (req, res) => {
  const companies = await Company.find();
  res.send(companies);
});
//get storeByid
router.get("/store/:storeId",async (req,res)=>{
  const storeId=req.params.storeId
  try{
    const store = await Store.findById(storeId)
    
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.status(200).json(store)
  }catch (err) {
    console.error("Error fetching store: ", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
})
// get store by company
router.get("/storeByCompany/:companyId", async (req, res) => {
  const companyId = req.params.companyId;
  try {
    const stores = await Store.find({ company: companyId }).populate(
      "categories products"
    );
    if (stores.length === 0) {
      return res
        .status(404)
        .json({ message: "No stores found for this owner" });
    }
    res.status(200).json(stores);
  } catch (err) {
    console.error("Error fetching stores: ", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//get store by owner
router.get("/storeByOwner/:ownerId", async (req, res) => {
  const ownerId = req.params.ownerId;
  try {
    const stores = await Store.find({ owner: ownerId }).populate(
      "categories products"
    );
    if (stores.length === 0) {
      return res
        .status(404)
        .json({ message: "No stores found for this owner" });
    }
    res.status(200).json(stores);
  } catch (err) {
    console.error("Error fetching stores: ", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//get menu by store
router.get("/getMenuByStore/:storeId", async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const menu = await Menu.find({ store: storeId })
      .populate({
        path: "categorys",
        populate: [
          {
            path: "products",
            model: "Product",
            populate: [
              {
                path: "size.optionGroups",
                model: "OptionGroup",
              },
              {
                path: "optionGroups",
                model: "OptionGroup",
              },
              {
                path: "taxes",
                model: "Tax",
              },
            ],
          },
        ],
      })
      .exec();
    res.json(menu);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//get product ByStore
router.get("/productByStore/:storeId", async (req, res) => {
  const storeId = req.params.storeId;

  try {
    const products = await Product.find({ storeId })
      .populate({
        path: "size.optionGroups",
        populate: {
          path: "options.subOptionGroup",
        },
      })
      .populate({
        path: "optionGroups",
        populate: {
          path: "options.subOptionGroup",
        },
      });

    if (!products) {
      return res
        .status(404)
        .json({ message: "No products found for this store" });
    }

    res.status(200).json(products);
  } catch (err) {
    console.error("Error fetching product details:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//get category ByStore
router.get("/categoryByStore/:id", async (req, res) => {
  const id = req.params.id;

  // Validate if the 'id' is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid ObjectId" });
  }

  // Use the valid 'id' in your query
  try {
    const category = await Category.find({ store: id });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
//get product By Category
router.get("/productByCategory/:categoryId", async (req, res) => {
  const categoryId = req.params.categoryId;

  if (!categoryId) {
    return res.status(400).json({
      message: "category ID Not found .",
    });
  }
  const product = await Product.find({ category: categoryId }).populate({
    path: "size.optionGroups",
  });

  if (!product) {
    return res.status(404).json({
      message: "Product not found.",
    });
  }

  return res.json(product);
});

//create order
router.post("/orders", async (req, res) => {
  console.log(req.body);
  try {
    const items = req.body;
    const newOrder = await new order(items);

    const validationError = newOrder.validateSync();
    if (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    const data = await newOrder.save();

    const newDate = new Date(data.createdAt.getTime() + 180 * 1000);

    const formattedDate = newDate
      .toISOString()
      .replace(/\.(\d{3})Z$/, ".$1+00:00");

    const finalDate = new Date(formattedDate);

    const job = schedule.scheduleJob(finalDate, function () {
      const lastData = async () => {
        const lastOrder = await order.findOne({ _id: data._id });
        if (lastOrder.status === "pending") {
          await order.findOneAndUpdate(
            { _id: data._id },
            { status: "missed", updatedAt: Date.now() },
            { new: true }
          );
          console.log("updated");
        }
      };
      lastData();
    });

    res.status(201).json(newOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});
// update status of order by id (from restaurant's owner)
router.put("/order/updatestatus", async (req, res) => {
  try {
    const { status, _id } = req.body;
    if (status && _id) {
      const updateStatus = await order.findOneAndUpdate(
        { _id: _id },
        { status, updatedAt: Date.now() },
        { new: true }
      );
      if (!updateStatus) {
        return res.status(404).json({
          message: "Order not found.",
        });
      }
      return res.status(200).json({
        message: "Status of order does modify successfully.",
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

//get orders history
router.get("/orderHistory", checkClient, async (req, res) => {
  try {
    const userId = req.user.id;
    const orderHistory = await order.find({ userId: userId });
    res.json(orderHistory);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching order history." });
  }
});

//api to reorder
router.post("/reorder/:orderId", checkClient, async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.orderId;

    const originalOrder = await order.findOne({ _id: orderId, userId: userId });

    if (!originalOrder) {
      return res.status(404).json({ error: "Original order not found." });
    }

    const newOrder = new order({
      userId,
      orders: originalOrder.orders,
    });

    await newOrder.save();

    res.status(201).json(newOrder);
  } catch (error) {
    console.error("Error creating reorder:", error);
    res.status(500).json({ error: "Failed to create reorder." });
  }
});

//create company
router.post("/createCompany", async (req, res) => {
  try {
    const name = req.body.name;
    const company = new Company({
      name: name,
    });
    await company.save();

    res.status(201).json({ message: "Company créé avec succès", company });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Une erreur est survenue lors de la création du company",
    });
  }
});
//get user information by email
router.get("/userInformation/:email", async (req, res) => {
  try {
    const email = req.params.email;
    console.log(email);
    const userInformation = await User.findOne({ email });
    res.status(201).json({ userInformation });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Une erreur est survenue lors de get user information ",
    });
  }
});

router.get("/stores/:storeId/colors", async (req, res) => {
  const storeId = req.params.storeId;
  try {
    //const storeId = req.params.storeId;
    // console.log("Requested storeId:", storeId);
    const store = await Store.findById(storeId);
    // console.log("Retrieved store:", store);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }
    res.status(200).json({
      primairecolor: store.primairecolor,
      secondairecolor: store.secondairecolor,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//storebyMode
router.get("/storeByMode/:modeId", async (req, res) => {
  try {
    const modeId = req.params.modeId;

    // Find stores that have the specified consumationMode enabled
    const stores = await Store.find({
      "consumationModes.mode": modeId,
      "consumationModes.enabled": true,
    }).populate("consumationModes.mode");

    res.json({ stores });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//mode conso store
router.get("/modeConsomation/:storeid", async (req, res) => {
  const id = req.params.storeid;
  try {
    const store = await Store.findById(id).populate("consumationModes.mode");
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Extract consumationModes from the store
    const consumationModes = store.consumationModes;

    res.json({ consumationModes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// product by mode
router.get("/products-by-store/:storeId/:modeId", async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const modeId = req.params.modeId;
    const products = await Product.find({ storeId: storeId })
      .populate({
        path: "size.optionGroups",
      })
      .populate("optionGroups")
      .populate({
        path: "taxes",
        match: { mode: modeId },
        select: "mode",
      })
      .populate({
        path: "availabilitys",
        match: { mode: modeId },
        select: "mode",
      })
      .exec();
    // Filter products based on the specified mode ID
    const filteredProducts = products.map((product) => {
      const {
        _id,
        name,
        description,
        availability,
        availabilitys,
        size,
        optionGroups,
        storeId,
        category,
        price,
        image,
        taxes,
      } = product;
      return {
        _id,
        name,
        description,
        availability,
        availabilitys: availabilitys.filter(
          (avail) => avail.mode.toString() === modeId
        ),
        size,
        optionGroups,
        storeId,
        category,
        price,
        image,
        // taxes: taxes.filter(tax => tax.mode.toString() === modeId),
      };
    });
    res.status(200).json(filteredProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
