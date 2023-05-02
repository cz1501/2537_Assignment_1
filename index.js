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

app.use(session({     // session middlewarei
    secret: node_session_secret,
    store: mongoStore,        // connect-mongo session store
    saveUninitialized: false,
    resave: true
}));

app.use(express.urlencoded({ extended: false })); // for parsing application/x-www-form-urlencoded


app.get('/', (req, res) => {
    if (req.session.numPageHits == null) {
        req.session.numPageHits = 0;
    }
    // html to send to /login page
    var html = `
    <h1>You have visited ${++req.session.numPageHits} times this session!</h1>
    <a href="/login">Login</a>
    <a href="/createUser">Register</a>
    <a href="/logout">Log Out</a>
    `

    // html = `
    // <h1>You have visited ${++req.session.numPageHits} times this session!</h1> 
    // button to /login`;
    res.send(html);


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

// app.get('/about', (req, res) => {
//     var color = req.query.color;
//     var bg = req.query.bg;

//     res.send(`<h1 style='color:${color}; background-color:${bg}'>This is the about page. The color is ${color}</h1>`);
// });

// app.get('/contact', (req, res) => {
//     var missingEmail = req.query.missing;
//     var html = `
//         <h1>email address:</h1>
//         <form action="/submitEmail" method="post">
//             <input type="text" name="email" placeholder='email'/>
//             <input type="submit" value="Submit" />
//         </form>
//     `;
//     if (missingEmail) {
//         html += `<h2 style='color:red'>Please enter an email address</h2>`;
//     }

//     res.send(html);

// });

// app.post('/submitEmail', (req, res) => {
//     var email = req.body.email;
//     if (!email) {
//         res.redirect('/contact?missing=1');
//     } else {
//         res.send(`<h1>Thank you for submitting your email address: ${email}</h1>`);
//     }
// });


// app.get('/cat/:id', (req, res) => {

//     var cat = req.params.id;

//     if (cat == 1) {
//         res.send(`<h1>Meow</h1>`);
//     } else if (cat == 2) {
//         res.send(`<h1>Meow Meow</h1>`);
//     } else {
//         res.send(`<h1>Ruff</h1>`);
//     }

// });

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
    var html = `
    You are logged out.
    `;
    res.send(html);
});

app.get('/login', (req, res) => {
    var html = `
    log in
    <form action="/loggingIn" method="post">
        <input type="text" name="username" placeholder='username'/>
        <input type="text" name="password" placeholder='password'/>
        <input type="submit" value="Submit" />
    </form>
    `;
    res.send(html);
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

    res.send(`<h1>You are logged in ${req.session.username}</h1>`);

});

// only for authenticated users
const authenticatedOnly = (req, res, next) => {
    if (!req.session.authenticated) {
        return res.status(401).json({ error: 'not authenticated' });
    } 
    next();
};
app.use(authenticatedOnly);

// app.use(express.static(__dirname + 'public'));
app.use(express.static('public'));

app.get('/protectedRoute', (req, res) => {

    const randomImageNumber = Math.floor(Math.random() * 3) + 1;
    const imageName = `00${randomImageNumber}.jpg`;
    
    res.send(`<h1>You are on the protected page, ${req.session.username}</h1> <br>  <img src="${imageName}" />`);
});

// only for administrators
const protectedRouteForAdminsOnly = async (req, res, next) => {
    const results = await usersModel.findOne({
        username: req.session.username
    });

    if (results?.type != 'administrator') {
        return res.status(401).json({ error: 'not authorized' });
    }
    next();
};
app.use(protectedRouteForAdminsOnly);

app.get('/adminOnly', (req, res) => {  
    res.send(`<h1>You are on the admin page, ${req.session.username}</h1>`);
});


app.get("*", (req, res) => {
    res.status(404);
    res.send(`<h1>Page not found - 404</h1>`);

});

module.exports = app;