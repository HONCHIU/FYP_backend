var express = require('express');
var router = express.Router();
const { connectToDB, ObjectId } = require('../utils/db');
const { generateToken } = require('../utils/auth');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// POST /api/register
router.post('/api/register', async (req, res) => {
  const db = await connectToDB();
  try {
    const role = req.body.role;
    const salutation = req.body.salutation;
    const english_name = req.body.english_name; 
    const company_name = req.body.company_name;
    const email = req.body.email;
    const password = req.body.password;


    

    // Check if the registration data is valid
    if (!role|| !salutation|| !english_name || !company_name || !email || !password) {
      return res.status(400).send('Bad Request');
    }

    // Check if the email is already registered
    let user = await db.collection("users").findOne({ email: email });
    if (user) {
      return res.status(400).send('Email already registered');
    }

    // Create a new user 
    let userdata = {
      role: role,
      salutation: salutation,
      english_name: english_name,
      company_name: company_name,
      email: email,
      password: password,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
    let result = await db.collection("users").insertOne(userdata);
    res.status(201).json({ id: result.insertedId });
    console.log(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    await db.client.close();
  }
});

// POST /api/login
router.post('/api/login', async (req, res) => {
  const db = await connectToDB();
  try {
    const email = req.body.email;
    const password = req.body.password;

    // Check if the login data is valid
    if (!email || !password) {
      return res.status(400).send('Bad Request');
    }

    // Check if the email is already registered
    let user = await db.collection("users").findOne({ email: email });
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Check if the password is correct
    if (user.password !== password) {
      return res.status(401).send('Unauthorized');
    }

    delete user.password;
    delete user.ip_address;

    const token = generateToken({ user });

    res.status(200).json({ token: token });
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    await db.client.close();
  }
});








module.exports = router;
