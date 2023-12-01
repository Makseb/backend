const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const adminRouter = require("./routers/adminRouter");
const ownerRouter = require("./routers/ownerRouter");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
const multer = require("multer");
const path = require("path");
const clientRouter = require("./routers/clientRouter");
const session = require("express-session");
const passport = require("passport");
const passportSetup = require('./middlewares/passportSetup')
const cookieSession = require("cookie-session")
const cookieParser = require("cookie-parser");
app.use(express.static(path.join(__dirname, "views")));

app.use(express.static("uploads"));

app.use(express.urlencoded({ extended: true, encoding: "utf-8" }));

app.use(cookieParser());
//added middleware
app.use(
  session({
    secret: "your-secret-key",
    resave: true,
    saveUninitialized: true,
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

//cors
app.use(cors({
  origin: "*",
  methods: "GET,POST,PUT,DELETE",
  credentials: true,
}));


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());

// Utilisation des routes
app.use("/admin", adminRouter);
app.use("/owner", ownerRouter);
app.use("/client", clientRouter);

let isConnected = false;
require("dotenv").config();
async function connectWithRetry() {
  try {
    await mongoose.connect(process.env.URI);
    isConnected = true;
    console.log("Connected to MongoDB DATABASE");
  } catch (error) {
    console.error("Failed to connect to MongoDB");
    isConnected = false;
    // Réessayez la connexion après 5 secondes
    setTimeout(connectWithRetry, 5000);
  }
}

connectWithRetry();

// Démarrez le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
