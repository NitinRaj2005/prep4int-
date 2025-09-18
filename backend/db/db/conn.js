mongoose.connect("mongodb+srv://Nitin:nitin-123@cluster0.s2jvkgz.mongodb.net/", {useNewUrlParser : true, useUnifiedTopology: true})
const mongoose = require("mongoose");

const mongoURI = process.env.MONGODB_URI || "mongodb+srv://Nitin:nitin-123@cluster0.s2jvkgz.mongodb.net/";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => console.log("connection success"))
	.catch((err) => console.log(err));
