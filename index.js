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
        const orderCollection = client.db('PhoneKinunDB').collection('orders');


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
        //get seller specific products api
        app.get('/products', async (req, res) => {
            const email = req.query.email;
            const query = { sellerEmail: email };
            const products = await productCollection.find(query).toArray();
            res.send(products);
        })
        //get category specific products
        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            const category = await categoryCollection.findOne({ _id: ObjectId(id) });
            const filter = { category: category.name }
            const products = await productCollection.find(filter).toArray();//products of that category
            const availableProducts = products.filter(product => product.isSold === false)
            res.send(availableProducts);
        })

        //find seller for a specific product
        app.get('/seller', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const seller = await userCollection.findOne(query);
            res.send(seller);
        })

        //post products api
        app.post('/products', async (req, res) => {
            const product = req.body;
            product.postDate = new Date().toDateString();
            const result = await productCollection.insertOne(product);
            res.send(result);
        })

        //add a order api
        app.post('/products/add', async (req, res) => {
            const order = req.body;
            console.log(order);
            const query = {
                productId: order.productId,
                userEmail: order.userEmail
            }
            const existingProduct = await orderCollection.findOne(query);
            if (!existingProduct) {
                const result = await orderCollection.insertOne(order);
                return res.send(result)
            }
            res.send({ acknowledged: false })
        })

        //

    }
    finally {


    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`Phone Kinun server running on port: ${port}`);
})