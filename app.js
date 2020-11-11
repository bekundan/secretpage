//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalmongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
//express session
app.use(
  session({
    secret: "Our Lil Secret",
    resave: false,
    saveUninitialized: false,
  })
);
//passport setup
app.use(passport.initialize());
app.use(passport.session());
//mongooes connect////
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);
//we add the new mongoose.Schema for the encryption data
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});
//set the passport local mongoose with schema
userSchema.plugin(passportLocalmongoose);
//that's the way to keeping data encrypt using the mongoose encryption and select the field which need to encrypt

// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ["password"],
// });
//connect the db with collection in mongoDB
const User = new mongoose.model("User", userSchema);
//create a local passport strategy where we serialize and deserialize
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
//routes for the pages
app.get("/", function (req, res) {
  res.render("home");
});
app.get("/login", function (req, res) {
  res.render("login");
});
app.get("/register", function (req, res) {
  res.render("register");
});
app.get("/secrets", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});
//register the users
app.post("/register", function (req, res) {
  // ******* all these following code for use in bcrypt and the md5 password encryption ************
  // bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
  //   const Newuser = new User({
  //     email: req.body.username,
  //     password: hash,
  //   });
  //   Newuser.save(function (err) {
  //     if (err) {
  //       console.log(err);
  //     } else {
  //       res.render("secrets");
  //       //   console.log(Newuser);
  //     }
  //   });
  // });
  // **************** Now we using the passport method *****************
  User.register({ username: req.body.username }, req.body.password, function (
    err,
    user
  ) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

///login setup where we match the passwords
app.post("/login", function (req, res) {
  // ******* all these following code for use in bcrypt and the md5 password encryption ************
  // const username = req.body.username;
  // const password = req.body.password;
  // User.findOne({ email: username }, function (err, foundUser) {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     if (foundUser) {
  //       // if (foundUser.password === password) {
  //       //   res.render("secrets");
  //       //   // console.log(foundUser.email);
  //       // }
  //       bcrypt.compare(password, foundUser.password, function (err, result) {
  //         if (result == true) {
  //           res.render("secrets");
  //         }
  //       });
  //     }
  //   }
  // });
  // **************** Now we using the passport method *****************
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.logIn(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});
//set the logout route
app.get("/logout", function (req, res) {
  req.logOut();
  res.redirect("/");
});

app.listen(3000, function () {
  console.log("Server is running on the port 3000");
});
