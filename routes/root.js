const express=require('express');

const router=express.Router();

router.get('/', (req, res)=>{
    throw new Error('efdgfgfgfgfg')
    res.send('welcome to tiffin_wale.')
})

module.exports=router