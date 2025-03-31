var express = require('express');
var router = express.Router();
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Directory to store uploaded files
  },
  filename: function (req, file, cb) {
    const filename = `${Date.now()}-${file.originalname}`; // Use a timestamp to avoid filename collisions
    cb(null, filename);
  }
});

const upload = multer({ storage: storage });
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
    const status = req.body.status;
    const approved = false;
    const rejected = false;


    

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
      phone_number: req.body.phone_number,
      password: password,
      status: status,
      approved: approved,
      rejected: rejected,
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


//users
router.get('/api/users_application', async (req, res) => {
  const db = await connectToDB();
  try {
    // Fetch all users from the database for the given donorId
    const users = await db.collection('users').find({ approved: false, rejected: false }).toArray();

    

    // Respond with the users
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch users.' });
  } finally {
    await db.client.close(); // Ensure the database connection is closed
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

router.post('/api/donationnew', upload.fields([{ name: 'foodPhotos[]', maxCount: 10 }]), async (req, res) => {
  const db = await connectToDB();
  try {
    // Destructure title and foodItems from the request body
    const title = req.body.title;
    const date = req.body.date;
    const donorId = req.body.donorId;
    const donorName = req.body.donorName;
    const status = req.body.status;
    const pick_up_address = req.body.pick_up_address;
    const pick_up_latitude = req.body.pick_up_latitude;
    const pick_up_longitude = req.body.pick_up_longitude;
    const collectDate = req.body.collectDate;
    const collectTime = req.body.collectTime;
    const approved = false;
    const rejected = false;
    

    const foods = JSON.parse(req.body.foodItems); // Parse the foodItems from JSON string

    // Validate input data
    if (!title || !Array.isArray(foods) || foods.length === 0) {
      return res.status(400).json({ message: 'Bad Request: Missing required fields.' });
    }

    // Prepare the donation data
    const donationData = {
      title,
      date,
      donorId,
      donorName,
      pick_up_address,
      pick_up_latitude,
      pick_up_longitude,
      collectDate,
      collectTime,
      status,
      foodItems: foods.map((item, index) => ({
        ...item,
        foodPhoto: req.files['foodPhotos[]'] ? req.files['foodPhotos[]'][index]?.filename : null // Get the filename of the uploaded photo
      })),
      approved,
      rejected,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    // Insert the donation data into the database
    const result = await db.collection('donations').insertOne(donationData);

    // Respond with the inserted ID or a success message
    res.status(201).json({ id: result.insertedId, message: 'Donation submitted successfully.' });
  } catch (error) {
    console.error('Error submitting donation:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal Server Error: Unable to submit donation.' });
  } finally {
    await db.client.close(); // Ensure the database connection is closed
  }
});

// GET /api/donations
router.get('/api/donations', async (req, res) => {
  const db = await connectToDB();
  try {
    // Fetch all donations from the database
    const donations = await db.collection('donations').find({ approved: true, rejected: false }).toArray();

    // Check if donations exist
    if (donations.length === 0) {
      return res.status(404).json({ message: 'No donations found.' });
    }

    // Respond with the donations
    res.status(200).json(donations);
  } catch (error) {
    console.error('Error fetching donations:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch donations.' });
  } finally {
    await db.client.close(); // Ensure the database connection is closed
  }
});
router.get('/api/donation/:id', async (req, res) => {
  const db = await connectToDB();
  try {
    const donorId = req.params.id; // Get the donorId from the route parameters

    // Fetch all donations from the database for the given donorId
    const donations = await db.collection('donations').find({ donorId: donorId }).toArray();

    // Check if donations exist
    if (donations.length === 0) {
      return res.status(404).json({ message: 'No donations found.' });
    }

    // Respond with the donations
    res.status(200).json(donations);
  } catch (error) {
    console.error('Error fetching donations:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch donations.' });
  } finally {
    await db.client.close(); // Ensure the database connection is closed
  }
});

router.get('/api/donationdetail/:id', async (req, res) => {
  const db = await connectToDB();
  try {
    const donorId = req.params.id; // 从路由参数中获取 donorId

    // 使用 findOne 获取指定的捐赠记录
    const donation = await db.collection('donations').findOne({ _id: new ObjectId(donorId) });

    // 检查是否找到捐赠记录
    if (!donation) {
      return res.status(404).json({ message: 'No donation found.' });
    }

    // 响应捐赠记录
    res.status(200).json(donation);
  } catch (error) {
    console.error('Error fetching donation:', error); // 记录错误以供调试
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch donation.' });
  } finally {
    await db.client.close(); // 确保关闭数据库连接
  }
});

router.get('/api/applicationdetail/:id', async (req, res) => {
  const db = await connectToDB();
  try {
    const applicationId = req.params.id; // 从路由参数中获取 donorId

    // 使用 findOne 获取指定的捐赠记录
    const application = await db.collection('receivers').findOne({ _id: new ObjectId(applicationId) });

    // 检查是否找到捐赠记录
    if (!application) {
      return res.status(404).json({ message: 'No application found.' });
    }

    // 响应捐赠记录
    res.status(200).json(application);
  } catch (error) {
    console.error('Error fetching application:', error); // 记录错误以供调试
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch application.' });
  } finally {
    await db.client.close(); // 确保关闭数据库连接
  }
});


//donation

router.get('/api/donation_application', async (req, res) => {
  const db = await connectToDB();
  try {
    // Fetch all donations from the database for the given donorId
    const donations = await db.collection('donations').find({ approved: false, rejected: false }).toArray();

    

    // Respond with the donations
    res.status(200).json(donations);
  } catch (error) {
    console.error('Error fetching donations:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch donations.' });
  } finally {
    await db.client.close(); // Ensure the database connection is closed
  }
});
router.get('/api/donation_history', async (req, res) => {
  const db = await connectToDB();
  try {
    // Fetch all donations from the database for the given donorId
    const donations = await db.collection('donations').find({
      $or: [
        { approved: true },
        { rejected: true }
      ]
    }).toArray();

   

    // Respond with the donations
    res.status(200).json(donations);
  } catch (error) {
    console.error('Error fetching donations:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch donations.' });
  } finally {
    await db.client.close(); // Ensure the database connection is closed
  }
});


router.put('/api/donation/:id/approve', async (req, res) => {
  const db = await connectToDB();
  const donationId = req.params.id; // 从请求参数中获取捐赠记录的 ID

  try {
    // 更新捐赠记录的 approved 字段为 true
    const result = await db.collection('donations').updateOne(
      { _id: new ObjectId(donationId) }, // 使用 MongoDB ObjectId 查询
      { $set: { approved: true,status: 'Approved', modifiedAt: new Date() } } // 更新 approved 字段和 modifiedAt
    );

    // 检查是否成功更新
    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Donation not found or already approved.' });
    }

    //send email
      // 获取捐赠记录以获取 donorId
      const donation = await db.collection('donations').findOne({ _id: new ObjectId(donationId) });
      if (!donation) {
        return res.status(404).json({ message: 'Donation not found.' });
      }
  
      const donorId = donation.donorId; // 获取 donorId
  
      // 从 users 表中获取用户的 email
      const user = await db.collection('users').findOne({ _id: new ObjectId(donorId) });
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
  
      const email = user.email; // 获取用户的 email
  
        // Send the reset email with user ID
        await transport.sendMail({
          from: {
            name: 'f1209057',
            address: 'f1209057@comp.hkbu.edu.hk',
          },
          to: email,
          subject: 'Donation Approved',
          text: `
          Dear ${donation.donorName},
          
          We are delighted to inform you that your generous donation of **${donation.title}** has been successfully approved!
          Thank you for your incredible support in helping those in need. Your contribution makes a significant difference in the lives of many, and we are truly grateful for your kindness.
          
          If you have any questions or need further assistance, please do not hesitate to reach out to us. We’re here to help!

          Warm regards,
          The Donation Team`,
        });
    
        res.status(200).json({ message: 'Reset email sent.' });
   //end email

  } catch (error) {
    console.error('Error approving donation:', error); // 记录错误以便调试
    res.status(500).json({ message: 'Internal Server Error: Unable to approve donation.' });
  } finally {
    await db.client.close(); // 确保数据库连接关闭
  }
});

router.put('/api/donation/:id/reject', async (req, res) => {
  const db = await connectToDB();
  const donationId = req.params.id; // 从请求参数中获取捐赠记录的 ID

  try {
    // 更新捐赠记录的 rejected 字段为 true
    const result = await db.collection('donations').updateOne(
      { _id: new ObjectId(donationId) }, // 使用 MongoDB ObjectId 查询
      { $set: { rejected: true, status: 'Rejected', modifiedAt: new Date() } } // 更新 rejected 字段和 modifiedAt
    );

    // 检查是否成功更新
    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Donation not found or already rejected.' });
    }

    // 获取捐赠记录以获取 donorId
    const donation = await db.collection('donations').findOne({ _id: new ObjectId(donationId) });
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found.' });
    }
  
    const donorId = donation.donorId; // 获取 donorId
  
    // 从 users 表中获取用户的 email
    const user = await db.collection('users').findOne({ _id: new ObjectId(donorId) });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
  
    const email = user.email; // 获取用户的 email
  
    // Send the rejection email
    await transport.sendMail({
      from: {
        name: 'f1209057',
        address: 'f1209057@comp.hkbu.edu.hk',
      },
      to: email,
      subject: 'Donation Rejected',
      text: `
      Dear ${donation.donorName},

      We regret to inform you that your donation of **${donation.title}** has not been approved at this time. We truly appreciate your willingness to support those in need, and we encourage you to consider donating again in the future.
      If you have any questions or would like to discuss this further, please feel free to reach out to us. Your support means a lot to us and those we serve.

      Thank you once again for your generosity.

      Best regards,
      The Donation Team`,
    });

    // 返回成功响应
    return res.status(200).json({ message: 'Donation rejected successfully and email sent.' });

  } catch (error) {
    console.error('Error approving donation:', error); // 记录错误以便调试
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Internal Server Error: Unable to reject donation.' });
    }
  } finally {
    await db.client.close(); // 确保数据库连接关闭
  }
});


//reciver

router.get('/api/receiver_application', async (req, res) => {
  const db = await connectToDB();
  try {
    // Fetch all donations from the database for the given donorId
    const receivers = await db.collection('receivers').find({ approved: false, rejected: false }).toArray();

    

    // Respond with the donations
    res.status(200).json(receivers);
  } catch (error) {
    console.error('Error fetching receivers:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch receivers.' });
  } finally {
    await db.client.close(); // Ensure the database connection is closed
  }
});
router.get('/api/receivers_history', async (req, res) => {
  const db = await connectToDB();
  try {
    // Fetch all donations from the database for the given donorId
    const receivers = await db.collection('receivers').find({
      $or: [
        { approved: true },
        { rejected: true }
      ]
    }).toArray();

    // Respond with the donations
    res.status(200).json(receivers);
  } catch (error) {
    console.error('Error fetching receivers:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch receivers.' });
  } finally {
    await db.client.close(); // Ensure the database connection is closed
  }
});


router.put('/api/receivers/:id/approve', async (req, res) => {
  const db = await connectToDB();
  const receiversId = req.params.id; // 从请求参数中获取捐赠记录的 ID

  try {
    // 更新捐赠记录的 approved 字段为 true
    const result = await db.collection('receivers').updateOne(
      { _id: new ObjectId(receiversId) }, // 使用 MongoDB ObjectId 查询
      { $set: { approved: true, status: 'Approved', modifiedAt: new Date() } } // 更新 approved 字段和 modifiedAt
    );

    // 检查是否成功更新
    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Receivers not found or already approved.' });
    }

    // 获取捐赠记录以获取 receiverId
    const application = await db.collection('receivers').findOne({ _id: new ObjectId(receiversId) });
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const applicantId = application.applicantId; // 获取 donorId

    // 从 users 表中获取用户的 email
    const user = await db.collection('users').findOne({ _id: new ObjectId(applicantId) });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const email = user.email; // 获取用户的 email

    // Send the approval email
    await transport.sendMail({
      from: {
        name: 'f1209057',
        address: 'f1209057@comp.hkbu.edu.hk',
      },
      to: email,
      subject: 'Application Approved',
      text: `
Dear ${application.applicant},

We are delighted to inform you that your application of food **${application.title}** has been successfully approved!

Thank you for your generous willingness to support those in need. 

If you have any questions or need further assistance, please do not hesitate to reach out to us. We are here to help!

Best regards,
The Donation Team`,
    });

    // Send a single success response
    return res.status(200).json({ message: 'Receivers approved successfully and email sent.' });

  } catch (error) {
    console.error('Error approving receivers:', error); // 记录错误以便调试
    return res.status(500).json({ message: 'Internal Server Error: Unable to approve receivers.' });
  } finally {
    await db.client.close(); // 确保数据库连接关闭
  }
});


router.put('/api/receivers/:id/reject', async (req, res) => {
  const db = await connectToDB();
  const receiversId = req.params.id; // 从请求参数中获取捐赠记录的 ID

  try {
    // 更新捐赠记录的 approved 字段为 true
    const result = await db.collection('receivers').updateOne(
      { _id: new ObjectId(receiversId) }, // 使用 MongoDB ObjectId 查询
      { $set: { rejected: true,status: 'Rejected', modifiedAt: new Date() } } // 更新 approved 字段和 modifiedAt
    );

    // 检查是否成功更新
    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Receivers not found or already rejected.' });
    }
    const application = await db.collection('receivers').findOne({ _id: new ObjectId(receiversId) });
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const applicantId = application.applicantId; // 获取 donorId

    // 从 users 表中获取用户的 email
    const user = await db.collection('users').findOne({ _id: new ObjectId(applicantId) });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const email = user.email; // 获取用户的 email

    // Send the approval email
    await transport.sendMail({
      from: {
        name: 'f1209057',
        address: 'f1209057@comp.hkbu.edu.hk',
      },
      to: email,
      subject: 'Application Rejected',
      text: `
Dear ${application.applicant},

We regret to inform you that your application for food **${application.title}** has been rejected.

We appreciate your willingness to support those in need, and we encourage you to apply again in the future. If you have any questions or would like more information about the decision, please feel free to reach out to us.

Thank you for your understanding.

Best regards,
The Donation Team`,
    });

    // Send a single success response
    return res.status(200).json({ message: 'Receivers approved successfully and email sent.' });


    // 返回成功响应
    res.status(200).json({ message: 'Receivers application rejected successfully.' });
  } catch (error) {
    console.error('Error approving receivers:', error); // 记录错误以便调试
    res.status(500).json({ message: 'Internal Server Error: Unable to approve receivers.' });
  } finally {
    await db.client.close(); // 确保数据库连接关闭
  }
});

router.post('/api/applicationnew', upload.none(), async (req, res) => {
  const db = await connectToDB();
  console.log('Request Body:', req.body);

  try {
    const title = req.body.title;
    const applicant = req.body.applicant;
    const applicantId = req.body.applicantId;
    const pickupDate = req.body.pickupDate;
    const pickupTime = req.body.pickupTime;
    const pickupAddress = req.body.pickupAddress;
    const pickupLatitude = req.body.pickupLatitude;
    const pickupLongitude = req.body.pickupLongitude;
    const contactInfo = req.body.contactInfo;
    const remarks = req.body.remarks;
    const donationId = req.body.donationId;
    const status = req.body.status;
    const approved = false;
    const rejected = false;


    // Prepare the donation data
    const donationData = {
      title: title,
      applicant: applicant,
      applicantId: applicantId,
      pickupDate : pickupDate,
      pickupTime : pickupTime,
      pickupAddress : pickupAddress,
      pickupLatitude : pickupLatitude,
      pickupLongitude : pickupLongitude,
      contactInfo : contactInfo,
      remarks : remarks,
      donationId : donationId,
      status : status,
      approved,
      rejected,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    // Insert the donation data into the database
    const result = await db.collection('receivers').insertOne(donationData);

    // Respond with the inserted ID or a success message
    res.status(201).json({ id: result.insertedId, message: 'Donation submitted successfully.' });
  } catch (error) {
    console.error('Error submitting donation:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal Server Error: Unable to submit donation.' });
  } finally {
    await db.client.close(); // Ensure the database connection is closed
  }
});

router.get('/api/application/:id', async (req, res) => {
  const db = await connectToDB();
  try {
    const applicantId = req.params.id; // 修改为 req.params.id

    // 从数据库中根据 applicantId 获取所有接收者
    const receivers = await db.collection('receivers').find({ applicantId: applicantId }).toArray();

    // 检查是否存在接收者
    if (receivers.length === 0) {
      return res.status(404).json({ message: 'No donations found.' });
    }

    // 返回接收者列表
    res.status(200).json(receivers);
  } catch (error) {
    console.error('Error fetching donations:', error); // 记录错误以便调试
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch donations.' });
  } finally {
    await db.client.close(); // 确保关闭数据库连接
  }
});


router.get('/api/donorcontent', async (req, res) => {
  const db = await connectToDB();
  try {
    // Fetch all donations from the database for the given donorId
    const users = await db.collection('users').find({ role: 'donor',approved: true }).toArray();


    

    // Respond with the donations
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching donors:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch donors.' });
  } finally {
    await db.client.close(); // Ensure the database connection is closed
  }
});

router.get('/api/donordetail/:id', async (req, res) => {
  const db = await connectToDB();
  try {
    const donorId = req.params.id; // 从路由参数中获取 donorId

    // 使用 findOne 获取指定的捐赠记录
    const donorContent = await db.collection('users').findOne({ _id: new ObjectId(donorId) });

    // 检查是否找到捐赠记录
    if (!donorContent) {
      return res.status(404).json({ message: 'Donor not found.' });
    }

    // 响应捐赠记录
    res.status(200).json(donorContent);
  } catch (error) {
    console.error('Error fetching donor:', error); // 记录错误以供调试
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch donor.' });
  } finally {
    await db.client.close(); // 确保关闭数据库连接
  }
});
router.put('/api/donordetail/:id', async (req, res) => {
  const db = await connectToDB();
  try {
    const donorId = req.params.id; // 从路由参数中获取 donorId
    const updatedData = req.body; // 从请求体中获取更新的数据

    // 移除 _id 字段以避免更新错误
    delete updatedData._id;

    // 使用 updateOne 更新指定的捐赠记录
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(donorId) },
      { $set: updatedData }
    );

    // 检查是否找到并更新捐赠记录
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Donor not found.' });
    }

    // 响应成功消息
    res.status(200).json({ message: 'Donor updated successfully.' });
  } catch (error) {
    console.error('Error updating donor:', error); // 记录错误以供调试
    res.status(500).json({ message: 'Internal Server Error: Unable to update donor.' });
  } finally {
    await db.client.close(); // 确保关闭数据库连接
  }
});






router.get('/api/receivercontent', async (req, res) => {
  const db = await connectToDB();
  try {
    // Fetch all donations from the database for the given receiverId
    const users = await db.collection('users').find({ role: 'receiver' }).toArray();

    

    // Respond with the donations
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching receivers:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch receivers.' });
  } finally {
    await db.client.close(); // Ensure the database connection is closed
  }
});

router.get('/api/receiverdetail/:id', async (req, res) => {
  const db = await connectToDB();
  try {
    const receiverId = req.params.id; // 从路由参数中获取 receiverId

    // 使用 findOne 获取指定的捐赠记录
    const receiverContent = await db.collection('users').findOne({ _id: new ObjectId(receiverId) });

    // 检查是否找到捐赠记录
    if (!receiverContent) {
      return res.status(404).json({ message: 'Receiver not found.' });
    }

    // 响应捐赠记录
    res.status(200).json(receiverContent);
  } catch (error) {
    console.error('Error fetching receiver:', error); // 记录错误以供调试
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch receiver.' });
  } finally {
    await db.client.close(); // 确保关闭数据库连接
  }
});
router.put('/api/receiverdetail/:id', async (req, res) => {
  const db = await connectToDB();
  try {
    const receiverId = req.params.id; // 从路由参数中获取 receiverId
    const updatedData = req.body; // 从请求体中获取更新的数据

    // 移除 _id 字段以避免更新错误
    delete updatedData._id;

    // 使用 updateOne 更新指定的捐赠记录
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(receiverId) },
      { $set: updatedData }
    );

    // 检查是否找到并更新捐赠记录
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Receiver not found.' });
    }

    // 响应成功消息
    res.status(200).json({ message: 'Receiver updated successfully.' });
  } catch (error) {
    console.error('Error updating receiver:', error); // 记录错误以供调试
    res.status(500).json({ message: 'Internal Server Error: Unable to update Receiver.' });
  } finally {
    await db.client.close(); // 确保关闭数据库连接
  }
});


//Donate Money
const stripe = require('stripe')('sk_test_51R5KUXR9jEjIeFLXUNLR08NlXP0yudAKksrRK0B3MMrdv02eYcQ2eIuaZVFhH7kV2AZM26VXzk1V7pVKmfMaHtPX00Lg6FqfR1');

const YOUR_DOMAIN = 'http://localhost:5173';

router.post('/api/create-checkout-session', async (req, res) => {
    const { eventName, eventPrice, donationMessage, uniqueKey } = req.body;

    // 检查必填字段
    if (!eventName || !eventPrice) {
        return res.status(400).json({ error: 'Missing eventName or eventPrice' });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'hkd',
                        product_data: {
                            name: 'Donation by ' + eventName,
                        },
                        unit_amount: eventPrice, // 以分为单位
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${YOUR_DOMAIN}/success?donor_name=${eventName}&donation_amount=${eventPrice}&donationMessage=${donationMessage}&uniqueKey=${uniqueKey}`,
            cancel_url: `${YOUR_DOMAIN}/cancel`,
            automatic_tax: { enabled: true },
        });

        res.json({ url: session.url }); // 返回会话 URL
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.post('/api/record-donation', async (req, res) => {
  const db = await connectToDB();

  const { donorName, donationAmount, donationMessage, uniqueKey } = req.body;

  // 检查必填字段
  if (!donorName || !donationAmount) {
      return res.status(400).json({ error: 'Missing donorName or donationAmount' });
  }

  try {
      // 假设您使用的是 MongoDB
      await db.collection('donatemoney').insertOne({
          donorName,
          donationAmount,
          donationMessage,
          createdAt: new Date()
      });
      res.status(201).json({ message: 'Donation recorded successfully.' });
  } catch (error) {
      console.error('Error recording donation:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/api/delivery/:id', async (req, res) => {
  const db = await connectToDB();
  try {
    const donorId = req.params.id; // Get the donorId from the route parameters

    // Fetch all donations from the database for the given donorId
    const donations = await db.collection('delivery').find({ applicantId: donorId }).toArray();

    // Check if donations exist
    if (donations.length === 0) {
      return res.status(404).json({ message: 'No delivery found.' });
    }

    // Respond with the donations
    res.status(200).json(donations);
  } catch (error) {
    console.error('Error fetching delivery:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch delivery.' });
  } finally {
    await db.client.close(); // Ensure the database connection is closed
  }
});
router.get('/api/deliverydetail/:id', async (req, res) => {
  const db = await connectToDB();
  try {
    const deliveryId = req.params.id; // 从路由参数中获取 receiverId

    // 使用 findOne 获取指定的捐赠记录
    const deliveryContent = await db.collection('delivery').findOne({ _id: new ObjectId(deliveryId) });

    // 检查是否找到捐赠记录
    if (!deliveryContent) {
      return res.status(404).json({ message: 'Delivery not found.' });
    }

    // 响应捐赠记录
    res.status(200).json(deliveryContent);
  } catch (error) {
    console.error('Error fetching delivery:', error); // 记录错误以供调试
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch delivery.' });
  } finally {
    await db.client.close(); // 确保关闭数据库连接
  }
});

router.post('/api/delivery', async (req, res) => {
  const db = await connectToDB();

  try {
    const { orderId, applicantId, date,type, time, address } = req.body;

    const deliveryData = {
      orderId: orderId,
      applicantId: applicantId,
      type,
      date: date,
      time: time,
      address: address,
      status: 'wait', 
      createdAt: new Date(),
      modifiedAt: new Date()
    };

    const result = await db.collection('delivery').insertOne(deliveryData);

    res.status(201).json({ id: result.insertedId, message: 'Delivery record created successfully.' });
  } catch (error) {
    console.error('Error creating delivery record:', error);
    res.status(500).json({ message: 'Internal Server Error: Unable to create delivery record.' });
  } finally {
    await db.client.close();
  }
});

router.get('/api/delivery', async (req, res) => {
  const db = await connectToDB();
  try {
    // Fetch all delivery from the database for the given donorId
    const delivery = await db.collection('delivery').find({
      
         type: 'receive'
          
      
    }).toArray();

   

    // Respond with the delivery
    res.status(200).json(delivery);
  } catch (error) {
    console.error('Error fetching delivery:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal Server Error: Unable to fetch delivery.' });
  } finally {
    await db.client.close(); // Ensure the database connection is closed
  }
});


const Nodemailer = require("nodemailer");

const transport = Nodemailer.createTransport({
  pool: false,
  host: "mh5.comp.hkbu.edu.hk",
  port: 465,
  secure: true, // use TLS
  auth: {
    user: "f1209057",
    pass: "Kevinyip1c33!"
  },
  tls: {
    rejectUnauthorized: false // This will ignore certificate errors
  }
});


// Password Reset Request Endpoint
router.post('/api/reset-password', async (req, res) => {
  const db = await connectToDB();

  const { email } = req.body;

  try {
    const user = await db.collection("users").findOne({ email:email });

      if (!user) {
          return res.status(404).json({ message: 'Email not found.' });
      }

      // Send the reset email with user ID
      const resetUrl = `http://localhost:5173/reset-password/${user._id}`;
      await transport.sendMail({
        from: {
          name: 'f1233411',
          address: 'f1233411@comp.hkbu.edu.hk',
        },
        to: email,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Click the link below to reset your password:\n${resetUrl}`,
      });
  
      res.status(200).json({ message: 'Reset email sent.' });
    } catch (error) {
      console.error('Error during password reset:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  });

module.exports = router;