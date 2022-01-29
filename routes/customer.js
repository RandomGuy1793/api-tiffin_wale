const express=require('express')
const _=require('lodash')
const bcrypt=require('bcrypt')
const {customerModel, customerLoginValidate, customerValidate}=require('../models/customer')
const auth=require('../middleware/auth')
const router=express.Router()

router.post('/register', async (req, res)=>{
    const error=customerValidate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    const customer=await customerModel.findOne({email: req.body.email}).select('_id')
    if(customer) return res.status(400).send('Customer is already registered.')

    let propertiesToPick=['name', 'email', 'address.area', 'address.city', 'address.pincode', 'password']
    req.body.password=await bcrypt.hash(req.body.password, 10)

    const newCustomer=await customerModel.register(req.body, propertiesToPick)
    propertiesToPick.pop()
    const token=newCustomer.generateAuthToken();
    res.header('x-auth-token', token).send(_.pick(newCustomer, propertiesToPick))
})

router.post('/login', async (req, res)=>{
    const error=customerLoginValidate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    const customer=await customerModel.findOne({email: req.body.email}).select('_id password')
    if(!customer) return res.status(400).send("invalid email or password")
    const isPasswordCorrect=await bcrypt.compare(req.body.password, customer.password)
    if(!isPasswordCorrect) return res.status(400).send("invalid email or password")
    const token=customer.generateAuthToken()
    res.header('x-auth-token', token).send()
})

router.put('/edit', auth, async (req, res)=>{
    const error=customerValidate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    let customer=await customerModel.findOne({email: req.body.email}).select('_id')
    if(customer && !customer._id.equals(req.data._id)){
        return res.status(400).send('email is already in use.')
    }
    req.body.password=await bcrypt.hash(req.body.password, 10)
    customer=await customerModel.findById(req.data._id).select('-__v')
    await customer.updateDetails(req.body)
    res.send('updated successfully')
})

module.exports=router