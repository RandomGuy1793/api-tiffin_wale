const express=require('express')
const _=require('lodash')
const bcrypt=require('bcrypt')
const {customerModel, customerLoginValidate, customerValidate}=require('../models/customer')
const auth=require('../middleware/auth')
const router=express.Router()

router.get('/', (req, res)=>{
    res.send('customer register api working.')
})

router.post('/register', async (req, res)=>{
    const error=customerValidate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    const customer=await customerModel.findOne({email: req.body.email})
    if(customer) return res.status(400).send('Customer is already registered.')
    let propertiesToPick=['name', 'email', 'address.area', 'address.city', 'address.pincode', 'password']
    const newCustomer=new customerModel(_.pick(req.body, propertiesToPick))
    newCustomer.password=await bcrypt.hash(newCustomer.password, 10)
    await newCustomer.save();
    propertiesToPick.pop()
    const token=newCustomer.generateAuthToken();
    res.header('x-auth-token', token).send(_.pick(newCustomer, propertiesToPick))
})

router.post('/login', async (req, res)=>{
    const error=customerLoginValidate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    const customer=await customerModel.findOne({email: req.body.email})
    if(!customer) return res.status(400).send("invalid email or password")

    const isPasswordCorrect=await bcrypt.compare(req.body.password, customer.password)
    if(!isPasswordCorrect) return res.status(400).send("invalid email or password")

    const token=customer.generateAuthToken()
    res.header('x-auth-token', token).send()
})

router.put('/edit', auth, async (req, res)=>{
    const error=customerValidate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    const customer=await customerModel.findOne({email: req.body.email})
    if(customer && !customer._id.equals(req.data._id)){
        return res.status(400).send('email is already in use.')
    }

    const pass=await bcrypt.hash(req.body.password, 10)
    const result=await customerModel.updateOne({_id: req.data._id}, {
        $set:{
            name: req.body.name,
            email: req.body.email,
            password: pass,
            "address.area": req.body.address.area,
            "address.city": req.body.address.city,
            "address.pincode": req.body.address.pincode,
        }
    })
    if (result.modifiedCount > 0 || result.matchedCount == 1) return res.send('updated successfully')
    return res.status(404).send('customer not available')
})

module.exports=router