import express from 'express';
import mongoose from 'mongoose';
import Cors from "cors"
import Pusher from "pusher"
import dotenv from 'dotenv'
dotenv.config();
import mongoData from './dbModel.js'

//app config
const app = express();
const port=process.env.PORT ||9000;
const secret=process.env.SECRET_KEY;
const pusher = new Pusher({
    appId: "1163804",
    key: "e09578ae0363cf0d7f86",
    secret: secret,
    cluster: "ap2",
    useTLS: true
  });
//middleware
app.use(express.json());
app.use(Cors());
//db config
const password = process.env.PASSWORD;
const connection_url=`mongodb+srv://admin:${password}@cluster0.8twwp.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`
mongoose.connect(connection_url,{
    useCreateIndex:true,
    useNewUrlParser:true,
    useUnifiedTopology:true,
})
mongoose.connection.once("open",()=>{
    console.log("DB Connected")

    const changeStream =mongoose.connection.collection("conversations").watch();
    changeStream.on("change",(change)=>{
        if(change.operationType==="insert"){
            pusher.trigger("channels","newChannel",{
                "change": change
            })
        }else if(change.operationType==="update"){
            pusher.trigger("conversation","newMessage",{
                "change": change
            })
        }else{
            console.log("Error")
        }
    })
})
//api routes
app.get("/",(req, res) =>{
    res.status(200).send("Hello World")
})
app.post("/new/channel",(req, res) =>{
    const dbData=req.body;
    mongoData.create(dbData,(err,data)=>{
        if(err){
            res.status(500).send(err)
        }else{
            res.status(200).send(data)
        }
    })
})
app.post("/new/messages",(req, res) =>{
    const id =req.query.id;
    const newMessage =req.body;
    mongoData.update(
        {_id:id},
        {$push:{conversation:newMessage}},
        (err, data) =>{
            if(err){
                res.status(500).send(err)
            }else{
                res.status(201).send(data)
            }
        }
    )
})
app.get("/get/channelList",(req, res)=>{
    mongoData.find((err, data)=>{
        if(err){
            res.status(500).send(err)
        }else{
            let channels=[];
            data.map((channelData)=>{
                const channelInfo={
                    id: channelData._id,
                    name: channelData.channelName
                }
                channels.push(channelInfo)
            })
            res.status(200).send(channels)
        }
    })
})

app.get("/get/conversation",(req, res)=>{
    const id=req.query.id
    mongoData.find({_id:id},(err,data)=>{
        if(err){
            res.status(500).send(err)
        }else{
            res.status(200).send(data)
        }
    })
})
//listener
app.listen(port,()=>console.log(`listening to port ${port}`))