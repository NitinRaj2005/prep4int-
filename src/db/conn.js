const mongoose=require("mongoose");

mongoose.connect("mongodb+srv://Amansingh:amansingh245172@cluster.za7ia9z.mongodb.net/reg", {useNewUrlParser : true, useUnifiedTopology: true})
.then(()=>console.log("connection success"))
.catch((err)=> console.log(err));
