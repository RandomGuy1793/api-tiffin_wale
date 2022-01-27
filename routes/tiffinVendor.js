const express=require('express')
const _=require('lodash')
const bcrypt=require('bcrypt')
const {vendorModel, addressObjJoi, vendorLoginValidate, vendorValidate, ratingValidate}=require('../models/tiffinVendor')
const {customerModel}=require('../models/customer')
const auth=require('../middleware/auth')
const { subscriptionModel } = require('../models/subscription')
const validateObjId = require('../middleware/validateObjId')
const mongoose = require('mongoose')
const router=express.Router()

router.get('/pincode/:pincode', async (req, res)=>{
    const error=addressObjJoi.pincode.validate(req.params.pincode).error
    if(error) return res.status(400).send(error.details[0].message)

    const vendors=await vendorModel.find({"address.pincode": req.params.pincode}).select("-password -pending -_id -__v")
    res.send(vendors)
})

router.get('/city/:city', async (req, res)=>{
    const error=addressObjJoi.city.validate(req.params.city).error
    if(error) return res.status(400).send(error.details[0].message)

    const vendors=await vendorModel.find({"address.city": req.params.city}).select("-password -pending -_id -__v")
    res.send(vendors)
})

router.post('/register', async (req, res)=>{
    const error=vendorValidate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    const vendor=await vendorModel.findOne({email: req.body.email})
    if(vendor) return res.status(400).send('Vendor is already registered.')
    
    let propertiesToPick= ['businessName', 'email', 'address.area', 'address.city', 'address.pincode', 'phone', 'monthRate.oldRate', 'monthRate.discountRate', 'monthRate.minMonthForNewRate', 'routine.breakfast', 'routine.lunch', 'routine.dinner', 'hasVeg', 'password' ]
    const newVendor=new vendorModel(_.pick(req.body, propertiesToPick))
    newVendor.password=await bcrypt.hash(newVendor.password, 10)
    newVendor.rating.numberOfRatings=0
    newVendor.rating.currentRating=0
    // console.log(newVendor);
    await newVendor.save();

    const token=newVendor.generateAuthToken();
    propertiesToPick.pop()      // remove last element from array i.e. password
    res.header('x-auth-token', token).send(_.pick(newVendor, propertiesToPick))
    
})

router.post('/login', async(req, res)=>{
    const error=vendorLoginValidate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    const vendor=await vendorModel.findOne({email: req.body.email})
    if(!vendor) return res.status(400).send("invalid email or password")

    const isPasswordCorrect=await bcrypt.compare(req.body.password, vendor.password)
    if(!isPasswordCorrect) return res.status(400).send("invalid email or password")

    const token=vendor.generateAuthToken();
    res.header('x-auth-token', token).send()
})

router.put('/edit', auth, async(req, res)=>{
    const error=vendorValidate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    const vendor=await vendorModel.findOne({email: req.body.email})
    if(vendor && !vendor._id.equals(req.data._id)){
        return res.status(400).send('email is already in use.')
    }
    const pass=await bcrypt.hash(req.body.password, 10)
    const result=await vendorModel.updateOne({_id: req.data._id},{
        $set:{
            businessName: req.body.businessName,
            email: req.body.email,
            password: pass,
            address: {area: req.body.address.area, city: req.body.address.city, pincode: req.body.address.pincode},
            phone: req.body.phone,
            monthlyRate: {oldRate: req.body.monthlyRate.oldRate, newRate: req.body.monthlyRate.newRate, minMonthForNewRate: req.body.monthlyRate.minMonthForNewRate},
            routine: {breakfast: req.body.routine.breakfast, lunch: req.body.routine.lunch, dinner: req.body.routine.dinner},
            hasVeg: req.body.hasVeg
        }
    })
    if(result.modifiedCount>0 || result.matchedCount == 1) return res.send('updated successfully')
    return res.status(404).send('tiffin vendor not available')
})

router.post('/review', auth, async (req, res)=>{
    const error=ratingValidate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    const customer=await customerModel.findById(req.data).select('_id')
    if(!customer) return res.status(400).send('customer no longer exists')

    const vendor=await vendorModel.findById(req.body.vendorId).select('rating')
    if(!vendor) return res.status(400).send('Tiffin vendor unavailable')

    const newRating=_.pick(req.body, ['rating','review.title', 'review.text'])
    newRating.customerId=req.data._id
    const rating=vendor.rating
    let oldCustRating=0
    for(let i=0; i<rating.customerRatings.length; i++){
        let curr=rating.customerRatings[i]
        if(curr.customerId.equals(newRating.customerId)){
            oldCustRating=curr.rating
            rating.customerRatings[i]=newRating
            break;
        }
    }
    
    rating.currentRating=updateRating(rating.numberOfRatings, rating.currentRating, oldCustRating, parseInt(newRating.rating))
    if(oldCustRating===0){
        rating.customerRatings.push(newRating)
        rating.numberOfRatings++
    } 
    await vendor.save()
    res.send(newRating)
})

router.put('/accept-order/:id', [auth, validateObjId], async(req, res)=>{
    const vendor=await vendorModel.findById(req.data._id).select('pending')
    if(!vendor) return res.status(400).send('vendor not available')
    vendor.pending=vendor.pending.filter(item=>!item.equals(req.params.id))
    await vendor.save()
    const subscription=await subscriptionModel.findById(req.params.id).select('isAccepted')
    if(!subscription) return res.status(400).send('subscription is not available')
    subscription.isAccepted=true;
    await subscription.save()
    res.send(_.pick(subscription, ['isAccepted']))
})


function updateRating(numberOfRatings, currRating, oldCustRating, newCustRating){
    return (currRating*numberOfRatings-oldCustRating+newCustRating)/(numberOfRatings+1)
}

module.exports=router