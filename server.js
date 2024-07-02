const express = require("express");
const mongoose = require("mongoose");
const adminRouter = require("./routers/adminRouter");
const ownerRouter = require("./routers/ownerRouter");
const managerRouter = require("./routers/managerRouter");
const sseRouter = require("./routers/sseRouter");
const deliveryRouter = require("./routers/deliveryRouter");
const statistiqueRouter = require("./routers/statistiqueRouter");
const uberRoute = require("./routers/UberRouter");
const socketRouter = require("./routers/socketRouter");

const fs = require("fs");
const cors = require("cors");
const app = express();
const https = require("https");
const options = {
    key: fs.readFileSync('./key.key'),
    cert: fs.readFileSync('./crt.crt')
};
const server = https.createServer(options,app);
const multer = require("multer");
const path = require("path");
const clientRouter = require("./routers/clientRouter");
const session = require("express-session");
const passport = require("passport");
const passportSetup = require("./middlewares/passportSetup");
const cookieSession = require("cookie-session");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const stripe = require("stripe")(
  "sk_test_51OdqTeD443RzoOO5zes08H5eFoRH1W4Uyv2sZU8YMmpGM7fU9FKqpIDF87xml7omZVugkMmjfW3YhBG7R5ylxQTJ00lH5Qdpji"
);
const { attachIO } = require("./middlewares/attachIO");
const compression = require("compression");

/***************** Gzip copression ****************** */
app.use(compression());
/******************end of copression Gzip ***********/



/******************socket ***********/
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
  origin:["http://localhost:3000","https://dashboard.eatorder.fr","197.238.186.119:3000","http://localhost:4200","http://192.168.1.38:3000","http://192.168.1.49:4200","http://192.168.1.47:3000","http://192.168.1.38:3000","https://localtestdemo.eatorder.fr","*",],
    // credentials: true
  }
})


io.on("connection", (socket) => {
  socket.on("join_room", (data) => {
    console.log(data);
    socket.join(data);
  });
   
   
  socket.on("join_room_orders", (data) => {
    console.log(`User Connected: ${socket.id} id : ${data}`);
    if (data.includes(":mobile")) {
      socket.join(data.split(":")[0])
      io.to(data.split(":")[0]).emit("check_user", { storeId: data.split(":")[0], device: "mobile", socketId: socket.id })
      
    } else {
      socket.join(data);
    }

  });


});

/******************end socket ***********/
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});
app.use("/statistique", statistiqueRouter);
app.use("/uber", uberRoute);
app.use(express.static(path.join(__dirname, "views")));
app.use(express.static("uploads"));
app.use(express.static("uploads2"));
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
app.use(bodyParser.json());
// Passport middleware
app.use(passport.initialize());
app.use(passport.session());
//cors
app.use(
  cors()
);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
// Utilisation des routes
app.use("/admin", adminRouter);
app.use("/owner", ownerRouter);
app.use("/client", clientRouter);
app.use("/manager", managerRouter);
app.use("/sse", sseRouter);
app.use("/delivery", attachIO(io), deliveryRouter);
app.use("/socket", attachIO(io), socketRouter);

let isConnected = false;
require("dotenv").config();


app.use("/combined-uploads", (req, res, next) => {
  // Set cache control headers
  res.setHeader("Cache-Control", "public, max-age=604800"); // Cache for 1 week (604800 seconds)
  next();
});

app.use("/combined-uploads", express.static(path.join(__dirname, "uploads")));
app.use("/combined-uploads", express.static(path.join(__dirname, "uploads2")));

function connectWithRetry() {
  try {
    mongoose.connect(process.env.URI);
    isConnected = true;
    // console.log("Connected to MongoDB DATABASE",mongoose.connection);
  } catch (error) {
    console.error("Failed to connect to MongoDB");
    isConnected = false;
    // Retry the connection after 5 seconds
    setTimeout(connectWithRetry, 5000);
  }
}

connectWithRetry();


// Start the server
const PORT = process.env.PORT || 8001;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
