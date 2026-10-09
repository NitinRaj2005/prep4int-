const mongoose = require("mongoose");

const contactUsSchema = new mongoose.Schema({
    fname: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    lname: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 254
    },
    phone: {
        type: String,
        required: true,
        maxlength: 16
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    }
});

module.exports = mongoose.model("contactus", contactUsSchema);
