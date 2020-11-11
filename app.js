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
//now here we use the  Google Auth
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

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
mongoose.connect(
  "mongodb+srv://SecretUsers:kunboi21@cluster0.ytd1w.mongodb.net/userDB",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);
mongoose.set("useCreateIndex", true);
//we add the new mongoose.Schema for the encryption data
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
});
//set the passport local mongoose with schema
userSchema.plugin(passportLocalmongoose);
//this schema work for the google
userSchema.plugin(findOrCreate);
//that's the way to keeping data encrypt using the mongoose encryption and select the field which need to encrypt

// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ["password"],
// });
//connect the db with collection in mongoDB
const User = new mongoose.model("User", userSchema);
//create a local passport strategy where we serialize and deserialize
passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});
//now the setup for the google \
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      // console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);
//routes for the pages
app.get("/", function (req, res) {
  res.render("home");
});
//google routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect secretpage.
    res.redirect("/secrets");
  }
);
app.get("/login", function (req, res) {
  res.render("login");
});
app.get("/register", function (req, res) {
  res.render("register");
});
app.get("/secrets", function (req, res) {
  //*****check the login status and redirect ********
  // if (req.isAuthenticated()) {
  //   res.render("secrets");
  // } else {
  //   res.redirect("/login");
  // }
  //********** Here we checked from the Database and pass the all data/****** */
  User.find({ secret: { $ne: null } }, function (err, founduser) {
    if (err) {
      console.log(err);
    } else {
      if (founduser) {
        res.render("secrets", { usersWithSecret: founduser });
      }
    }
  });
});
app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
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

app.post("/submit", function (req, res) {
  const submitedSecret = req.body.secret;

  User.findById(req.user.id, function (err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        foundUsers.secret = submitedSecret;
        foundUsers.save(function () {
          res.redirect("/secrets");
        });
      }
    }
  });
});
//set the logout route
app.get("/logout", function (req, res) {
  req.logOut();
  res.redirect("/");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server has started successfully");
});
