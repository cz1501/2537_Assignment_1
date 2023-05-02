const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    type: String
});

const usersModel = mongoose.model('w1users', userSchema);

module.exports = usersModel;  // Export the model