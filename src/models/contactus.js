const mongoose=require("mongoose");

const employeeSchema= new mongoose.Schema({
    fname: {
        type: String,
    },
    lname: {
        type: String,
    },
    email: {
        type: String,
    },
    phone: {
        type: Number,
    },
    message: {
        type: String,
    }
})

const contactus =new mongoose.model("contactus", employeeSchema);
module.exports= contactus;