const mongoose=require('mongoose')
const Joi = require('joi')
const _=require('lodash')
Joi.objectId = require('joi-objectid')(Joi)

const subscriptionSchema=new mongoose.Schema({
    customerId:{type: mongoose.Schema.Types.ObjectId, required: true},
    vendorId:{type: mongoose.Schema.Types.ObjectId, required: true},
    monthRateForEachOpted:{   
        type: Number,
        min: 100,
        max: 200000,
        required: true
    },
    opted:{
        breakfast: {
            type: Boolean,
            default: false
        },
        lunch: {
            type: Boolean,
            default: false
        },
        dinner: {
            type: Boolean,
            default: false
        }
    },
    durationDays:{
        type:Number,
        min: 30,
        max: 1000,
        required: true
    },
    isAccepted:{
        type: Boolean,
        default: false
    },
    startDate:{
        type: Date
    },
    endDate:{
        type: Date
    }
})

subscriptionSchema.statics.addSubscription=async function(details){
    const subscription=new this(_.pick(details, ['customerId', 'vendorId', 'monthRateForEachOpted', 'opted.breakfast', 'opted.lunch','opted.dinner', 'durationDays', 'isAccepted']))
    await subscription.save()
    return subscription
}

const subscriptionModel=mongoose.model('subscription', subscriptionSchema)

function validateSubscription(sub){
    const optedSchema=Joi.object({
        breakfast: Joi.boolean(),
        lunch: Joi.boolean(),
        dinner: Joi.boolean()
    })
    const subSchema=Joi.object({     
        vendorId:Joi.objectId().required(),
        opted: optedSchema,
        durationDays:Joi.number().min(30).max(1000).required()
    })
    return subSchema.validate(sub).error
}

exports.validateSubscription=validateSubscription
exports.subscriptionModel=subscriptionModel
