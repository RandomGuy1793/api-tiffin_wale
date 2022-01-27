const express=require('express')
const _=require('lodash')
const auth=require('../middleware/auth')
const {customerModel}=require('../models/customer')
const {vendorModel}=require('../models/tiffinVendor')
const {subscriptionModel, validateSubscription}=require('../models/subscription')
const validateObjId=require('../middleware/validateObjId')
const router=express.Router()

router.get('/customer', auth, async (req, res)=>{
    const subscriptions=await subscriptionModel.find({customerId: req.data})
    res.send(subscriptions)
})

router.get('/tiffin-vendor', auth, async (req, res)=>{
    const subscriptions=await subscriptionModel.find({vendorId: req.data})
    res.send(subscriptions)
})

router.post('/add', auth, async (req, res)=>{
    const error=validateSubscription(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    const customer=await customerModel.findById(req.data)
    if(!customer) return res.status(400).send('Customer not available')
    req.body.customerId=customer._id

    const vendor=await vendorModel.findById(req.body.vendorId).select('monthRate pending')
    if(!vendor) return res.status(400).send('invalid vendor id')
    req.body.monthRateForEachOpted=getRate(vendor.monthRate, req.body.durationDays);
    req.body.isAccepted=false

    const subscription=new subscriptionModel(_.pick(req.body, ['customerId', 'vendorId', 'monthRateForEachOpted', 'opted.breakfast', 'opted.lunch','opted.dinner', 'durationDays', 'isAccepted']))
    vendor.pending.push(subscription._id)
    await vendor.save()
    await subscription.save()
    
    res.send(subscription);
})

router.delete('/customer/delete/:id', [auth, validateObjId], async (req, res)=>{
    const customer=await customerModel.findById(req.data)
    if(!customer) return res.status(400).send('invalid customer')
    const subscription=await subscriptionModel.findById(req.params.id)
    if(!subscription) return res.status(400).send('subscription unavailable')
    if(!subscription.customerId.equals(customer._id)) return res.status(403).send('different customer trying to delete')
    if(!subscription.isAccepted){
        const result=await vendorModel.updateOne({_id: subscription.vendorId}, {
            $pull:{
                pending: subscription._id
            }
        })
    }
    await subscription.delete()
    res.send('subscription removed')
})

router.delete('/tiffin-vendor/delete/:id', [auth, validateObjId], async (req, res)=>{
    const vendor=await vendorModel.findById(req.data._id).select('_id pending')
    if(!vendor) return res.status(400).send('invalid vendor')
    const subscription=await subscriptionModel.findById(req.params.id)
    if(!subscription) return res.status(400).send('subscription unavailable')
    if(!subscription.vendorId.equals(vendor._id)) return res.status(403).send('different vendor trying to delete')
    if(!subscription.isAccepted){
        vendor.pending=vendor.pending.filter(item=>!item.equals(subscription._id))
        await vendor.save()
    }
    await subscription.delete()
    res.send('subscription removed')
})

function getRate(monthRate, durationDays){
    const monthDuration=durationDays/30
    return monthDuration>=monthRate.minMonthForNewRate ? monthRate.discountRate : monthRate.oldRate
}

module.exports=router