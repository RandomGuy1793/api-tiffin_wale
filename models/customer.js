const mongoose=require('mongoose')

const customerSchema=new mongoose.Schema({
    name:{
        type: String,
        minlength: 3,
        maxlength: 50,
        required: true
    },
    email:{
        type: String,
        minlength:3,
        maxlength: 50,
        required: true,
        unique: true
    },
    password:{
        type: String,
        minlength: 3,
        maxlength: 255,
        required: true
    },
    address:{
        area:{
            type: String,
            minlength: 15,
            maxlength: 255,
            required: true
        },
        city:{
            type: String,
            minlength: 3,
            maxlength: 50,
            required: true
        },
        pincode:{
            type: String,
            length: 6,
            required: true
        }
    }
})

const customer=mongoose.model('customer', customerSchema);

module.exports=customer