const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).send({ message: 'Unauthorized Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kk9hb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const partCollection = client.db("car_parts_manufacturer").collection("parts");
        const orderCollection = client.db("car_parts_manufacturer").collection("orders");
        const reviewCollection = client.db("car_parts_manufacturer").collection("reviews");
        const userCollection = client.db("car_parts_manufacturer").collection("users");

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'Forbidden Access' })
            }
        }

        app.get('/part', async (req, res) => {
            const parts = await partCollection.find().toArray();
            res.send(parts)
        })

        app.post('/part', verifyJWT, verifyAdmin, async (req, res) => {
            const part = req.body;
            const parts = await partCollection.insertOne(part);
            res.send(parts)
        })

        app.delete('/part/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const parts = await partCollection.deleteOne(query);
            res.send(parts)
        })

        app.get('/part/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
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

        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const orders = await orderCollection.findOne(query);
            res.send(orders)
        })

        app.get('/order', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const orders = await orderCollection.find(query).toArray();
                res.send(orders)
            }
            else {
                res.status(403).send({ message: 'Forbidden Access' })
            }
        })

        app.post('/order', async (req, res) => {
            const order = req.body;
            const orders = await orderCollection.insertOne(order);
            res.send(orders)
        })

        app.get('/review', async (req, res) => {
            const reviews = await reviewCollection.find().toArray();
            res.send(reviews)
        })

        app.post('/review', async (req, res) => {
            const review = req.body;
            const reviews = await reviewCollection.insertOne(review);
            res.send(reviews)
        })

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        })

        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const users = await userCollection.updateOne(filter, updateDoc);
            res.send(users)
        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const users = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30d' });
            res.send({ users, token })
        })

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
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