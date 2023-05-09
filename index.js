require('./utils.js'); // This is the file where we define the include function
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const usersModel = require('./models/w1user');

const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const expireTime = 60 * 60 * 1000; // 1 hour in milliseconds
const app = express();

const Joi = require('joi');

const ejs = require('ejs');

//MongoDB
const mongodb_host = process.env.MONGODB_HOST
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET

const node_session_secret = process.env.NODE_SESSION_SECRET;

var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: mongodb_session_secret
    }
});

app.use(session({     // session middleware
    secret: node_session_secret,
    store: mongoStore,        // connect-mongo session store
    saveUninitialized: false,
    resave: true
}));

app.use(express.urlencoded({ extended: false })); // for parsing application/x-www-form-urlencoded

app.set('view engine', 'ejs');

app.get('/', (req, res) => {

    if (req.session.username == null) {
        res.render("welcomeNew");
    } else {
        res.render("welcome", {userName: req.session.username});
    }   

});

app.get('/nosql-injection', async (req,res) => {
	var username = req.query.user;

	if (!username) {
		res.send(`<h3>no user provided</h3>`);
		return;
	}

	const schema = Joi.string().max(20).required();
	const validationResult = schema.validate(username);

	if (validationResult.error != null) {  
	   console.log(validationResult.error);
	   res.send("<h1 style='color:red;'>A NoSQL injection attack was detected!!</h1>");
	   return;
	}	

    res.send(`<h1>Hello ${username}</h1>`);
});



app.get('/createUser', (req, res) => {
    var html = `
    <form action="/submitUser" method="post">
        <input type="text" name="username" placeholder='username'/>
        <input type="text" name="password" placeholder='password'/>
        <input type="submit" value="Submit" />
    </form>
    `;
    res.send(html);
});

app.get('/logout', (req,res) => {
	req.session.destroy();
    res.render("logout")
});

app.get('/login', (req, res) => {
    res.render("login")
});

app.post('/submitUser', async (req, res) => {
    var username = req.body.username;
    var password = bcrypt.hashSync(req.body.password, saltRounds);

    const results = await usersModel.findOne({
        username: username
    });

    if (results != null) {
        res.send(`<h1>Username already exists</h1> <br>
        <a href="/createUser">Register</a>`);
        return
    }

    var html = `<ul>Account Created</ul>`;
    res.send(html);

});

app.post('/loggingIn', async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;

    const results = await usersModel.findOne({
        username: username
    });

    if (bcrypt.compareSync(password, results.password)) {
        req.session.authenticated = true;
        req.session.username = username;
        req.session.password = password
        req.session.cookie.maxAge = expireTime;

        console.log(results);
        res.redirect('/loggedIn');
        return
    }

    res.redirect('/login');

});

app.get('/loggedIn', (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
    }

    res.redirect('/');

});

// only for authenticated users
const authenticatedOnly = (req, res, next) => {
    if (!req.session.authenticated) {
        return res.redirect('/login');
    } 
    next();
};
app.use(authenticatedOnly);

// app.use(express.static(__dirname + 'public'));
app.use(express.static('public'));

app.get('/protectedRoute', (req, res) => {
    
    res.render("member", {userName: req.session.username});

});

// only for administrators
const protectedRouteForAdminsOnly = async (req, res, next) => {
    const results = await usersModel.findOne({
        username: req.session.username
    });

    if (results?.type != 'administrator') {
        return res.render("errorPage", {error: 403, message: "You are not an administrator!"});
        // return res.status(401).json({ error: 'not authorized' });
    }
    next();
};
app.use(protectedRouteForAdminsOnly);

app.get('/adminOnly', async (req, res) => {  
    const usersList = await usersModel.find()
    res.render("admin", {userCurrent: req.session.username, users: usersList});
});

app.post('/demote', async (req, res) => {
    const newType = "non-administrator"

    const updatedb = await usersModel.updateOne({
        username: req.body.username
    }, {
        type: newType
    })

    res.redirect('/adminOnly');

})

app.post('/promote', async (req, res) => {
    const newType = "administrator"

    const updatedb = await usersModel.updateOne({
        username: req.body.username
    }, {
        type: newType
    })

    res.redirect('/adminOnly');
})


app.get("*", (req, res) => {
    res.render("errorPage", {error: 404, message: "Page not found!"});

});

module.exports = app;