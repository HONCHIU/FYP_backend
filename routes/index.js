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


// router.post('/api/donationnew', async (req, res) => {
//   const db = await connectToDB();
//   try {
//     const title = req.body.title;

//     // Initialize arrays to hold the food data
//     const foodNames = req.body.foodname;
//     const quantities = req.body.quantity;
//     const typesOfFood = req.body.typeoffood;
//     const expiryDates = req.body.expiry_date;


//     // Prepare the donation data
//     const donationData = {
//       title,
//       foodNames,
//       quantities,
//       typesOfFood,
//       expiryDates,
//       createdAt: new Date(),
//       modifiedAt: new Date(),
//     };

//     // Insert data into the database
//     const result = await db.collection("donations").insertOne(donationData);
    
//     // Respond with the inserted ID
//     res.status(201).json({ id: result.insertedId });
//     console.log('Donation data inserted:', result);
//   } catch (err) {
//     console.error('Error inserting donation data:', err);
//     res.status(500).json({ message: 'Internal Server Error' });
//   } finally {
//     await db.client.close(); // Ensure the database connection is closed
//   }
// });
router.post('/api/donationnew', async (req, res) => {
  const db = await connectToDB();
  try {
    // Destructure title and foodItems from the request body
    const title = req.body.title;
    const foods = req.body.foodItems; // Correctly access foodItems

    // Validate input data
    if (!title || !foods || foods.length === 0) {
      return res.status(400).json({ message: 'Bad Request: Missing required fields.' });
    }

    // Prepare the donation data
    const donationData = {
      title,
      foodItems: foods,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    // Insert the donation data into the database
    const result = await db.collection('donations').insertOne(donationData);

    // Respond with the inserted ID or a success message
    res.status(201).json({ id: result.insertedId, message: 'Donation submitted successfully.' });
  } catch (error) {
    console.error('Error submitting donation:', error);
    res.status(500).json({ message: 'Internal Server Error: Unable to submit donation.' });
  } finally {
    await db.client.close(); // Ensure the database connection is closed
  }
});


module.exports = router;
