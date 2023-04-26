const express = require('express');

const session = require('express-session');

const bcrypt = require('bcrypt');

const saltRounds = 12;

const app = express();

const port = process.env.PORT || 3000;

const node_session_secret = '514d2625-d5e5-4379-ae56-92f6a350bf8b'

app.use(session({     // session middleware
    secret: node_session_secret,
    store: mongoStore,        // connect-mongo session store
    saveUninitialized: false, 
    resave: true              
}));

//Users and passwords
var users = [];

app.use(express.urlencoded({ extended: false })); // for parsing application/x-www-form-urlencoded

// var numPageHits = 0;

app.get('/', (req, res) => {
    if (req.session.numPageHits == null) {
        req.session.numPageHits = 0;
    } 
    res.send(`You are visitor number ${++req.session.numPageHits}!`);
});

app.get('/about', (req, res) => {
    var color = req.query.color;
    var bg = req.query.bg;

    res.send(`<h1 style='color:${color}; background-color:${bg}'>This is the about page. The color is ${color}</h1>`);
});

app.get('/contact', (req, res) => {
    var missingEmail = req.query.missing;
    var html = `
        <h1>email address:</h1>
        <form action="/submitEmail" method="post">
            <input type="text" name="email" placeholder='email'/>
            <input type="submit" value="Submit" />
        </form>
    `;
    if (missingEmail) {
        html += `<h2 style='color:red'>Please enter an email address</h2>`;
    }

    res.send(html);

});

app.post('/submitEmail', (req, res) => {
    var email = req.body.email;
    if (!email) {
        res.redirect('/contact?missing=1');
    } else {
        res.send(`<h1>Thank you for submitting your email address: ${email}</h1>`);
    }
});


app.get('/cat/:id', (req, res) => {

    var cat = req.params.id;

    if (cat == 1) {
        res.send(`<h1>Meow</h1>`);
    } else if (cat == 2) {
        res.send(`<h1>Meow Meow</h1>`);
    } else {
        res.send(`<h1>Ruff</h1>`);
    }

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

app.post('/submitUser', (req, res) => {
    var username = req.body.username;
    var password = req.body.password;

    var hashedPassword = bcrypt.hashSync(password, saltRounds);

    users.push({username: username, password: hashedPassword});

    console.log(users);

    var userhtml = ""
    for (var i = 0; i < users.length; i++) {
        userhtml += `<h1>Username: ${users[i].username} Password: ${users[i].password}</h1>`;
    }

    var html = `<ul>${userhtml}</ul>`;
    res.send(html);

});

app.post('/loggingIn', (req, res) => {
    var username = req.body.username;
    var password = req.body.password;

    var usershtml = ""
    for (var i = 0; i < users.length; i++) {
        if (users[i].username == username) {
            if (bcrypt.compareSync(password, users[i].password)) {
                res.redirect('/loggedIn');
                return
            } 
        }
    }

    res.redirect('/login');

});

app.get('/loggedIn', (req, res) => {
    res.send(`<h1>You are logged in</h1>`);

});

// app.use(express.static(__dirname + 'public'));

app.get("*", (req, res) => {
    res.status(404);
    res.send(`<h1>Page not found - 404</h1>`);
    
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
