const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const passwordForBcrypt = require("../../utils/password");

const employeeSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    username: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 30,
        unique: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 254,
        unique: true
    },
    phone: {
        type: String,
        required: true,
        maxlength: 16
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    solvedQuestions: {
        type: [String],
        default: []
    }
});

employeeSchema.pre("save", async function hashPassword() {
    if (!this.isModified("password") || /^\$2[aby]\$/.test(this.password)) {
        return;
    }
    this.password = await bcrypt.hash(passwordForBcrypt(this.password), 12);
});

module.exports = mongoose.model("Register", employeeSchema);
