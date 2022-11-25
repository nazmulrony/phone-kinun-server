const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
// const jwt = require('jsonwebtoken');
const app = express();
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

//middle wares
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Phone Kinun express server running!')

})
// const verifyJWT = (req, res, next) => {

//     const authHeader = req.headers.authorization;
//     if (!authHeader) {
//         return res.status(401).send({ message: 'Unauthorized access' })
//     }
//     const token = authHeader.split(' ')[1];
//     jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
//         if (err) {
//             return res.status(403).send({ message: 'Forbidden access' });
//         }
//         req.decoded = decoded;
//         next();
//     })

// }

//mongo db connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cwjhhvi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//mongodb crud function
async function run() {
    try {
        //document collections
        const userCollection = client.db('PhoneKinunDB').collection('users');
        const categoryCollection = client.db('PhoneKinunDB').collection('categories');
        const productCollection = client.db('PhoneKinunDB').collection('products');



        //get admin user
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query)
            res.send({ isAdmin: user?.role === 'admin' })
        })
        //get seller user
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query)
            res.send({ isSeller: user?.role === 'seller' })
        })
        //get regular user
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query)
            res.send({ isBuyer: user?.role === 'buyer' })
        })

        //user data save
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        })
        //get categories api
        app.get('/categories', async (req, res) => {
            const query = {};
            const result = await categoryCollection.find(query).toArray()
            res.send(result);
        })
        //get products api
        app.get('/products', async (req, res) => {
            const email = req.query.email;
            const query = { sellerEmail: email };
            const products = await productCollection.find(query).toArray();
            res.send(products);
        })

        //post products api
        app.post('/products', async (req, res) => {
            const product = req.body;
            product.postDate = new Date().toDateString();
            const result = await productCollection.insertOne(product);
            res.send(result);
        })

    }
    finally {


    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`Phone Kinun server running on port: ${port}`);
})