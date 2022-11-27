const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
        const wishlistCollection = client.db('PhoneKinunDB').collection('wishlist');
        const paymentCollection = client.db('PhoneKinunDB').collection('payments');
        const advertiseCollection = client.db('PhoneKinunDB').collection('advertises');


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
        //add to wishlist api
        app.post('/wishlist/add', async (req, res) => {
            const wishlist = req.body;
            // console.log(wishlist);
            const query = {
                productId: wishlist.productId,
                userEmail: wishlist.userEmail
            }
            const existingProduct = await wishlistCollection.findOne(query);
            if (!existingProduct) {
                const result = await wishlistCollection.insertOne(wishlist);
                return res.send(result)
            }
            res.send({ acknowledged: false })
        })
        //get order by userEmails
        app.get('/orders/:email', async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        })
        // get wishlist by userEmails
        app.get('/wishlist/:email', async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            const wishlist = await wishlistCollection.find(query).toArray();
            res.send(wishlist);
        })

        //get product by id
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        })
        //delete product by id
        app.delete('/products/delete/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        })

        //stripe post api
        app.post("/create-payment-intent", async (req, res) => {
            const product = req.body;
            const price = product.sellingPrice;
            // console.log(price);
            const amount = (price) * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                payment_method_types: [
                    "card"
                ],
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        //store payment to DB
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const id = payment.productId;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    isSold: true
                }
            }
            const updatedProduct = await productCollection.updateOne(query, updateDoc, options)
            const result = await paymentCollection.insertOne(payment);
            res.send(result);
        })

        //post advertised product API
        app.post('/advertise', async (req, res) => {
            const advertiseItem = req.body;
            // console.log(advertiseItem);
            const query = { productId: advertiseItem.productId }
            const filter = { _id: ObjectId(advertiseItem.productId) }
            const product = await productCollection.findOne(filter);
            if (product.isSold) {
                return res.send({ acknowledged: 'sold' });
            }
            const existingProduct = await advertiseCollection.findOne(query);
            if (!existingProduct) {
                const result = await advertiseCollection.insertOne(advertiseItem)
                return res.send(result)
            }
            res.send({ acknowledged: false })
        })
        //get advertised products
        app.get('/advertise', async (req, res) => {
            const query = {};
            const advertises = await advertiseCollection.find(query).toArray();
            res.send(advertises);
        })


    }
    finally {


    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`Phone Kinun server running on port: ${port}`);
})