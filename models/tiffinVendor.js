const mongoose=require('mongoose')
const config=require('config')
const jwt=require('jsonwebtoken')
const Joi = require('joi')
Joi.objectId = require('joi-objectid')(Joi)

const tiffinVendorSchema=new mongoose.Schema({
    businessName:{
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
    },
    phone:{
        type: String,
        length: 10,
        required: true
    },
    rating:{
        numberOfRatings: {type: Number, required : true},
        currentRating: {type :Number, required : true},
        customerRatings: [{
            rating:{type: Number},
            customerId: {type: mongoose.Schema.Types.ObjectId},
            review: {
                title:{
                    type: String,
                    minlength: 3,
                    maxlength: 50,
                },
                text:{
                    type: String,
                    minlength: 3,
                    maxlength: 255,
                }
            }
        }]
    },
    monthRate:{
        oldRate:{
            type: Number,
            min: 100,
            max: 200000
        },
        discountRate:{
            type: Number,
            min: 100,
            max: 200000
        },
        minMonthForNewRate:{
            type: Number,
            min:2,
            max: 12
        }
    },
    routine:{
        breakfast:{
            type: String,
            minlength: 3,
            maxlength: 50
        },
        lunch:{
            type: String,
            minlength: 3,
            maxlength: 50
        },
        dinner:{
            type: String,
            minlength: 3,
            maxlength: 50
        }
    },
    pending:[
        {
            type: mongoose.Schema.Types.ObjectId
        }
    ],
    hasVeg: {
        type: Boolean,
        default: false
    }
})

const jwtKey=config.get('jwtKey');

tiffinVendorSchema.methods.generateAuthToken=function(){
    return jwt.sign({_id:this._id}, jwtKey)
}

const tiffinVendor=mongoose.model('tiffinVendor', tiffinVendorSchema);


const addressObjJoi={
    area: Joi.string().min(15).max(255).required(),
    city: Joi.string().min(3).max(50).required(),
    pincode: Joi.string().length(6).regex(/^[0-9]+$/).required()
}

function validateTiffinVendor(vendor){
    const addressSchema=Joi.object({
        ...addressObjJoi
    })
    const rateSchema=Joi.object({
        oldRate: Joi.number().min(100).max(200000).required(),
        discountRate: Joi.number().min(100).max(200000).required(),
        minMonthForNewRate: Joi.number().min(2).max(12).required()
    })
    const routineSchema=Joi.object({
        breakfast: Joi.string().min(3).max(50).required(),
        lunch: Joi.string().min(3).max(50).required(),
        dinner: Joi.string().min(3).max(50).required()
    })
    const vendorSchema=Joi.object({
        businessName: Joi.string().min(3).max(50).required(),
        email: Joi.string().email().min(3).max(50).required(),
        password: Joi.string().min(3).max(255).required(),
        address: addressSchema.required(),
        phone: Joi.string().length(10).required(),
        monthRate: rateSchema.required(),
        routine: routineSchema.required(),
        hasVeg: Joi.boolean().required()
    })
    return vendorSchema.validate(vendor).error
}

function validateLogin(vendor){
    const schema=Joi.object({
        email: Joi.string().email().min(3).max(50).required(),
        password: Joi.string().min(3).max(255).required(),
    })
    return schema.validate(vendor).error
}

function validateRating(customerRating){
    const ratingSchema=Joi.object({
        vendorId: Joi.objectId(),
        rating:Joi.number().integer().required(),
        review: Joi.object({
            title: Joi.string().min(3).max(50),
            text: Joi.string().min(3).max(255)
        })
    })
    return ratingSchema.validate(customerRating).error
}

exports.vendorModel=tiffinVendor
exports.addressObjJoi=addressObjJoi
exports.vendorLoginValidate=validateLogin
exports.vendorValidate=validateTiffinVendor
exports.ratingValidate=validateRating