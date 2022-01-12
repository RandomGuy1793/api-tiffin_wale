const config=require('config')
const express=require('express')
const app=express();

require('./startup/db')()
require('./startup/errorLog')()
require('./startup/routes')(app)

const PORT = process.env.PORT || 5000
app.listen(PORT, ()=>console.log(`Server Active on port ${PORT}`))