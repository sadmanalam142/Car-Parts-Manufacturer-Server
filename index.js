const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kk9hb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const partCollection = client.db("car_parts_manufacturer").collection("parts");
        const orderCollection = client.db("car_parts_manufacturer").collection("orders");

        app.get('/part', async (req, res) => {
            const parts = await partCollection.find().toArray();
            res.send(parts)
        })

        app.get('/part/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const parts = await partCollection.findOne(query);
            res.send(parts)
        })

        app.put('/part/:id', async (req, res) => {
            const id = req.params.id;
            const updatedQuantity = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    availableQuantity: updatedQuantity.quantity
                }
            };
            const parts = await partCollection.updateOne(filter, updateDoc, options);
            res.send(parts)
        })

        app.post('/order', async (req, res) => {
            const order = req.body;
            const orders = await orderCollection.insertOne(order);
            res.send(orders)
        })
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello from car manufacturer')
});

app.listen(port, () => {
    console.log('Successfully listening from', port)
});