const mongoose=require("mongoose");

mongoose.connect("mongodb+srv://Nitin:nitin-123@cluster0.s2jvkgz.mongodb.net/", {useNewUrlParser : true, useUnifiedTopology: true})
.then(()=>console.log("connection success"))
.catch((err)=> console.log(err));
