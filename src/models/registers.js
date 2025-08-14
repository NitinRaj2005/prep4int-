//schema and inserting
const mongoose=require("mongoose");

const employeeSchema= new mongoose.Schema({
    fullname: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    confirm: {
        type: String,
        // required: true
    },
})

const Register =new mongoose.model("Register", employeeSchema);
module.exports= Register;
// const reactPlaylist= new Playlist({
//     name: "aman",
//     ctype : "node",
//     videos: 7,
//     author : "singh",
//     active: true,
// })
// reactPlaylist.save();

// const createDocument =async ()=>{
//     try{
//         const reactPlaylist= new Playlist({
//             name: "kunnu",
//             ctype : "backend",
//             videos: 70,
//             author : "singhaniya",
//             active: true,
//         })

//         const result= await reactPlaylist.save();
//         console.log(result);
//     }catch(err){
//         console.log(err);
//     }
// }
// createDocument();

