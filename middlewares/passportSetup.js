const passport = require("passport");
require("dotenv").config();

const GoogleStrategy = require("passport-google-oauth2").Strategy;
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLEClientId,
      clientSecret: process.env.GOOGLEClientSecret,
      callbackURL: process.env.GOOGLECallbackURL,
      passReqToCallback: true,
      scope:["profile","email"]
    },
    function (request, accessToken, refreshToken, profile, done) {
      console.log(profile);
      return done(null, profile);
    }
  )
);
