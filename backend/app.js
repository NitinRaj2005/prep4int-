const path=require("path");
const express= require("express");
const app= express();
require("./db/conn");
const Register=require("./models/registers");
const contactus=require("./models/contactus");
const port= process.env.PORT || 8000;

const { json } = require("express");
const staticPath= path.join(__dirname,"../public");
app.use(express.static(staticPath));
app.set("view engine","hbs");
app.use(express.json());
app.use(express.urlencoded({extended: false}));

// -----------------------/register ki jagah / ye kiya hu aur / ki jagah /index
app.get("/", (req,res)=>{
    res.render("register");
    // console.log("mai c hu");
});

app.get("/index", (req,res)=>{
    res.render("index");
});

app.get("/login", (req,res)=>{
    res.render("login");
});

app.post("/login", async (req,res)=>{
    try{
        const email=req.body.mail;
        const password=req.body.pass;
        // console.log(`${email}`);
        // console.log(`${password}`);

        const useremail = await Register.findOne({email:email});
        // console.log(useremail);
        // console.log(useremail.password);
        if(useremail.password === password){
            res.status(201).render("index");
        }else{
            res.status(400).send("invalid data");
        }

    }catch(error){
        res.status(400).send("Invalid data");
    }
});

app.post("/", async (req,res)=>{
     try{
        //  console.log(req.body.fullname);
        //  res.send(req.body.fullname);
        // console.log("aman");
        // res.send("aman");
        const password=req.body.password;
        const cpassword=req.body.confirm;
        if(password===cpassword){
        const registerEmployee = new Register({
            fullname: req.body.fullname,
            username:req.body.username,
            email: req.body.email,
            phone: req.body.phone,
            password: req.body.password,
            // cpassword: req.body.confirm,
        })

        const registered=registerEmployee.save();
        res.render("index");
        }else{
            res.send("password and cpassword must be same");
        }

        
     }catch(error){
        res.send(error);
     }
});

app.post("/index", async (req,res)=>{
    try{
       const registerEmployee = new contactus({
           fname: req.body.fname,
           lname:req.body.lname,
           email: req.body.email,
           phone: req.body.phone,
           message: req.body.message,
       })

       const registered=registerEmployee.save();
       res.render("index");
    }catch(error){
       res.send(error);
    }
});

app.listen(port,()=>{
    console.log("world");
});
