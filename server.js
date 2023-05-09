require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./index');
const port = process.env.PORT || 3000;

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;

main().catch(err => console.log(err));

async function main() {

    await mongoose.connect(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/comp2537w1?retryWrites=true&w=majority`);

    console.log("Connected to database");

    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });

}
