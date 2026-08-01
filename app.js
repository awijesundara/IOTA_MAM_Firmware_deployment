// Anushka Wijesundara | MIT licenced | Vendor's node web deployment platform
// github.anushkawijesundara.com
// v1.2 modernized

// Development history
// v1.0 -> MAM enabled
// v1.1 -> IPFS enabled
// v1.2 -> dependency/API modernization (see README "Legacy protocol notice")

require('dotenv').config();

var express = require('express');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var expressLayouts = require('express-ejs-layouts');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var { publishFirmwareUpdate } = require('./lib/mamPublisher');

var routes = require('./routes/index');
var devices = require('./routes/devices');
var upload = require('./routes/upload');
var success = require('./routes/success');
var config = require('./config');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);

//uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// config facebook login
app.use(passport.initialize());
app.use(passport.session());
// Use the FacebookStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Facebook
//   profile), and invoke a callback with a user object.
passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID || config.facebook.application_id,
        clientSecret: process.env.FACEBOOK_APP_SECRET || config.facebook.application_secret,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || "http://www.figueiredos.com:3000/auth/facebook/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {
            // To keep the example simple, the user's Facebook profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the Facebook account with a user record in your database,
            // and return that user instead.
            console.log( profile);
            return done(null, profile);
        });
    }
));
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});


app.post("/send", function(req, res){
/*

{ firmware_version: '123',
  file_name: 'NodeMCU ESP Firmware.bin',
  file_size: '461984',
  file_hash: '7587486617442333b43f22438b2edf7fee48ae075f39e63570be03c9ae245a26',
  file_url: 'https://vendor.local/uploads/NodeMCU ESP Firmware.bin',
  device_type: 'Light' }

*/

	// Publish the firmware-announcement packet to the IOTA MAM channel.
	// See lib/mamPublisher.js and the README "Legacy protocol notice" for
	// why this still targets the legacy (pre-Chrysalis) MAM protocol.
	let provider = process.env.IOTA_NODE_PROVIDER || 'https://tangle.anushkawijesundara.com:8443';
	// Please supply a SEED --> 81 chars of A-Z9 //
	let seed = process.env.IOTA_MAM_SEED || 'YOUR IOTA SEED';
	// Length:  AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

	let packet = req.body;

	publishFirmwareUpdate(packet, { provider, seed }).then(({ root, messages }) => {
		console.log('Messages already in the stream:', messages.length);
		console.log('Sending message: ', packet);
		console.log('Root: ', root);
	}).catch(ex => {
		console.log(ex);
	});

	console.log(req.body)
	res.redirect("/success")
});

app.use('/', routes);
app.use('/devices', devices);
app.use('/upload', upload);
app.use('/success', success);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
