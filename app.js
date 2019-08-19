// Anushka Wijesundara | MIT licenced | Vendor's node web deployment platform 
// github.anushkawijesundara.com
// 16/08/2019 v1.1

// Development history
// v1.0 -> MAM enabled
// v1.1 -> IPFS enabled


var express = require('express');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var engine = require('ejs-locals');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var devices = require('./routes/devices');
var upload = require('./routes/upload');
var success = require('./routes/success');
var config = require('./config');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', engine);
app.set('view engine', 'ejs');

//uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
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
        clientID: config.facebook.application_id,
        clientSecret: config.facebook.application_secret,
        callbackURL: "http://www.figueiredos.com:3000/auth/facebook/callback"
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

	// Sending the JSON array to MAM
	let Mam = require('./lib/mam.node.js');
	let IOTA = require('iota.lib.js');

	// LIVE NODE !
	let iota = new IOTA({ provider: `https://tangle.anushkawijesundara.com:8443` });

	//Passing the JSON value to Message Variable
	//let yourMessage=JSON.stringify(req.body);
	let yourMessage=req.body;
	// Please supply a SEED --> 81 chars of A-Z9 //
	let seed = 'YOUR IOTA SEED';
	// Length:  AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

	let mamState = null;

	async function fetchStartCount(){
    	let trytes = iota.utils.toTrytes('START');
    	let message = Mam.create(mamState, trytes);
    	console.log('The first root:');
    	console.log(message.root);
    	console.log();
    	// Fetch all the messages upward from the first root.
    	return await Mam.fetch(message.root, 'public', null, null);

}

	async function publish(packet){
    	// Create the message.
    	let trytes = iota.utils.toTrytes(JSON.stringify(packet))
    	let message = Mam.create(mamState, trytes);
    	// Set the mam state so we can keep adding messages.
    	mamState = message.state;
    	console.log('Sending message: ', packet);
    	console.log('Root: ', message.root);
    	console.log('Address: ', message.address);
    	console.log();
    	// Attach the message.
    	return await Mam.attach(message.payload, message.address);
}

	// Initiate the mam state with the given seed at index 0.
	mamState = Mam.init(iota, seed, 2, 0);

	// Fetch all the messages in the stream.
	fetchStartCount().then(v => {
    	// Log the messages.
    	let startCount = v.messages.length;
    	console.log('Messages already in the stream:');
    	for (let i = 0; i < v.messages.length; i++){
        let msg = v.messages[i];
        console.log(JSON.parse(iota.utils.fromTrytes(msg)));
    }
    console.log();

    // To add messages at the end we need to set the startCount for the mam state to the current amount of messages.
    mamState = Mam.init(iota, seed, 2, startCount);

	//let newMessage = Date.now() + ' ' + yourMessage;
	let newMessage = yourMessage;
    // Now the mam state is set, we can add the message.
    	publish(newMessage);
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
