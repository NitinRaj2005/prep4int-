require("dotenv").config();
const mongoose = require("mongoose");

const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
    throw new Error("MONGODB_URI must be configured.");
}

const connectToDatabase = () => mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 10000
});

module.exports = { mongoURI, connectToDatabase };
