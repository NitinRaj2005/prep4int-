require("dotenv").config();
const mongoose = require("mongoose");

const mongoURI = process.env.MONGODB_URI || "mongodb+srv://Nitin:nitin-123@cluster0.s2jvkgz.mongodb.net/prep4int";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => console.log("✓ MongoDB connection successful"))
	.catch((err) => console.log("✗ MongoDB connection error:", err));
