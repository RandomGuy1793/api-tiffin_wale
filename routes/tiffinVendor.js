const express=require('express')
const _=require('lodash')
const bcrypt=require('bcrypt')
const {vendorModel, addressObjJoi, vendorLoginValidate, vendorValidate, ratingValidate}=require('../models/tiffinVendor')
const {customerModel}=require('../models/customer')
const auth=require('../middleware/auth')
const { subscriptionModel } = require('../models/subscription')
const validateObjId = require('../middleware/validateObjId')
const router=express.Router()

router.get('/pincode/:pincode', async (req, res)=>{
    const error=addressObjJoi.pincode.validate(req.params.pincode).error
    if(error) return res.status(400).send(error.details[0].message)

    const vendors=await vendorModel.find({"address.pincode": req.params.pincode}).select("-password -pending -__v")
    res.send(vendors)
})

router.get('/city/:city', async (req, res)=>{
    const error=addressObjJoi.city.validate(req.params.city).error
    if(error) return res.status(400).send(error.details[0].message)

    const vendors=await vendorModel.find({"address.city": req.params.city}).select("-password -pending -__v")
    res.send(vendors)
})

router.post('/register', async (req, res)=>{
    const error=vendorValidate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    const vendor=await vendorModel.findOne({email: req.body.email}).select('_id')
    if(vendor) return res.status(400).send('Vendor is already registered.')
    let propertiesToPick= ['businessName', 'email', 'address.area', 'address.city', 'address.pincode', 'phone', 'monthRate.oldRate', 'monthRate.discountRate', 'monthRate.minMonthForNewRate', 'routine.breakfast', 'routine.lunch', 'routine.dinner', 'hasVeg', 'password' ]
    req.body.password=await bcrypt.hash(req.body.password, 10)

    const newVendor=await vendorModel.register(req.body, propertiesToPick)
    const token=newVendor.generateAuthToken()
    propertiesToPick.pop()      // remove last element from array i.e. password
    res.header('x-auth-token', token).send(_.pick(newVendor, propertiesToPick))
    
})

router.post('/login', async(req, res)=>{
    const error=vendorLoginValidate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    const vendor=await vendorModel.findOne({email: req.body.email}).select('_id')
    if(!vendor) return res.status(400).send("invalid email or password")

    const isPasswordCorrect=await bcrypt.compare(req.body.password, vendor.password)
    if(!isPasswordCorrect) return res.status(400).send("invalid email or password")

    const token=vendor.generateAuthToken();
    res.header('x-auth-token', token).send()
})

router.put('/edit', auth, async(req, res)=>{
    const error=vendorValidate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    let vendor=await vendorModel.findOne({email: req.body.email})
    if(vendor && !vendor._id.equals(req.data._id)){
        return res.status(400).send('email is already in use.')
    }
    req.body.password=await bcrypt.hash(req.body.password, 10)
    vendor=await vendorModel.findById(req.data._id).select('-pending -rating -__v')
    await vendor.updateDetails(req.body)
    res.send('updated successfully')
})

router.post('/review', auth, async (req, res)=>{
    const error=ratingValidate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    const customer=await customerModel.findById(req.data).select('_id')
    if(!customer) return res.status(400).send('customer does not exist')

    const vendor=await vendorModel.findById(req.body.vendorId)
    if(!vendor) return res.status(400).send('Tiffin vendor unavailable')

    const newRating=await vendor.updateRating(req.body, req.data._id)
    res.send(newRating)
})

router.put('/accept-subscription/:id', [auth, validateObjId], async(req, res)=>{
    const vendor=await vendorModel.findById(req.data._id).select('pending')
    if(!vendor) return res.status(400).send('vendor not available')
    vendor.acceptSubscription(req.params.id)

    const subscription=await subscriptionModel.findById(req.params.id).select('isAccepted')
    if(!subscription) return res.status(400).send('subscription is not available')
    subscription.isAccepted=true;
    await subscription.save()
    res.send(_.pick(subscription, ['isAccepted']))
})

module.exports=router