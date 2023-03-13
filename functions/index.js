//The cloud functions for firebase sdk to create cloud functions and set up triggers 
const functions = require("firebase-functions");
// //the firebase admin sdk to access firestore
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require("cors");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const { user } = require("firebase-functions/v1/auth");
const nodemailer = require("nodemailer");
const { request } = require("express");
const fs = require("fs");
let FieldValue = require('firebase-admin').firestore.FieldValue;


const app = express();
var corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

//TODO:store in environment configurations
//secret for signing jwt token;
//store as environment config
const accessTokenSecret = functions.config().accesstoken.secret;

//access functions relating to operations dept role
// const Operations = require('./operations');
const validation = require('./validation');
const { validationResult } = require("express-validator");

//configure email transport 
const gmailEmail = "gwopz4adz@gmail.com"; //accessing gmail credentials stored in environment variable
const gmailPassword = "gman2014";
const mailTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: gmailEmail,
        pass: gmailPassword
    }
});

//company name to include in the email
const APP_NAME = 'TERP';

//authentication middleware
const authenticateUser = (req, res, next) => {
    //log request path
    console.log(req.path)
    if (
        req.path == "/api/registration" || req.path == "/api/login"
    ) {
        next();
    } else if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        res.status(403).json({
            status: 403,
            message: 'Unauthorized'
        });
    } else {
        const token = req.headers.authorization.split('Bearer ')[1];
        console.log(token)

        jwt.verify(token, accessTokenSecret, (err, user) => {
            if (err) {
                console.log(err);
                res.status(401).json({
                    status: 403,
                    message: "Error: expired or incorrect token"
                })
            } else {
                //add the user object to the request. user info can be fetched from req.user on endpoints
                req.user = user
                next();
            }
        })
    }
}

app.use(cors({
    origin: true
}));
app.use(authenticateUser)

app.post(
    '/api/registration',
    //Validate request body
    validation.validate('createUser'),

    async (req, res) => {

        //get the validation errors in this request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 400,
                message: errors.array()
            })
        }

        let data = {
            name: req.body.firstName + " " + req.body.lastName,
            email: req.body.email,
            phone: req.body.phone,
            password: req.body.password,
            role: req.body.role,
            address: req.body.address,
            dob: "",
            id_type: "",
            id_number: "",
            role: req.body.role,
            gender: "",
            bank_name: "",
            account_number: "",
            account_name: "",
            salary: "",
            accountStatus: "Inactive",
            department: "",
            id_file: ""
        }

        try {
            let userRecord = await admin.auth().createUser({
                email: data.email,
                phoneNumber: data.phone,
                displayName: data.name,
                disabled: true,
            });
            console.log(`User created with id: ${userRecord.uid}`);
            //storing user data in db
            registrationStatus = await register(data, userRecord.uid);
            console.log(`registration status is : ${registrationStatus}`)
            if (registrationStatus == true) {
                res.status(200).json({
                    status: 200,
                    message: "User registration successful, you will be able to access your account once the Admin approves it"
                })
            } else {
                res.status(400).json(
                    {
                        status: 400,
                        message: registrationStatus
                    });
            }

        } catch (e) {
            console.log(e.toString());
            res.status(400).json(
                {
                    status: 400,
                    message: e.code
                }
            );
        }

        //adjust json response
    })

//stores a newly registered user's data into the database
async function register(data, uid) {
    let name = data.name;
    let phone = data.phone;
    let email = data.email;
    let password = data.password;
    let dob = data.dob;
    let id_type = data.id_type;
    let id_number = data.id_number;
    let id_file = data.id_file
    let role = data.role;
    let gender = data.gender;
    let address = data.address;
    let bank_name = data.bank_name;
    let account_number = data.account_number;
    let account_name = data.account_name;
    let salary = data.salary;
    let accountStatus = data.accountStatus
    let department = data.department

    //define registrationstatus
    let registrationStatus

    //hash the password
    let hashedPin = await bcrypt.hash(password, saltRounds).catch((e) => {
        console.log(`Error hashing password: ${e}`)
    });

    console.log(`hashed pin is : ${hashedPin}`);
    //store data in db
    let docref = db.collection('Staffs');
    try {
        console.log(`user id is ${uid}`)
        let docdata = await docref.doc(uid).set({
            name: name,
            phone: phone,
            email: email,
            password: hashedPin,
            dob: dob,
            id_type: id_type,
            id_number: id_number,
            role: role,
            gender: gender,
            address: address,
            bank: bank_name,
            account_number: account_number,
            account_name: account_name,
            salary: salary,
            accountStatus: accountStatus,
            department: department
        })

        console.log(docdata)
        registrationStatus = true;
    } catch (err) {
        console.log(err);
        registrationStatus = err
    }

    return registrationStatus
}

//send welcome email 
exports.sendWelcomeEmail = functions.auth.user().onCreate((user) => {
    // [END onCreateTrigger]
    // [START eventAttributes]
    const email = user.email; // The email of the user.
    const displayName = user.displayName; // The display name of the user.
    // [END eventAttributes]

    return sendWelcomeEmail(email, displayName);
});

async function sendWelcomeEmail(email, displayName) {
    const mailOptions = {
        from: `${APP_NAME} <noreply@firebase.com>`,
        to: email
    };
    //email body
    mailOptions.subject = `Welcome to ${APP_NAME}`;
    mailOptions.text = `Hi ${displayName}! Welcome to ${APP_NAME}. We hope you enjoy using the system to execute your role seamlessly.`;
    try {
        await mailTransport.sendMail(mailOptions)
        functions.logger.log('New welcome email sent to:', email);
    } catch (error) {
        functions.logger.log('Error sending email because:', error);
    }

}



app.post(
    '/api/login',
    //validate request body
    validation.validate('Login'),
    async (req, res) => {

        //get the validation errors in this request
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 200,
                message: errors.array()
            })
        }

        const { email, password } = req.body

        //check firebase auth to see if user is already registered
        let user = await admin.auth().getUserByEmail(email).catch((e) => {
            functions.logger.log(e);
            res.status(400).json({
                status: 400,
                message: `${e.code}`
            });
        });

        functions.logger.log(user);
        if (user.disabled == false) {
            try {
                let docref = db.collection("Staffs").doc(user.uid);
                let userDetails = await docref.get();
                if (userDetails.exists) {
                    functions.logger.log(userDetails);
                    // if (!password) {
                    //     res.status(403).json("User did not enter password")
                    // }

                    let hashedPassword = userDetails.data().password;
                    //check plain-text password against hashedpassword stored in db
                    passwordCheckResult = await bcrypt.compare(password, hashedPassword);
                    if (passwordCheckResult == true) {
                        //create access token containing user data
                        const accessToken = jwt.sign({
                            id: userDetails.id,
                            name: userDetails.data().name,
                            email: userDetails.data().email,
                            phone: userDetails.data().phone,
                            role: userDetails.data().role,
                            photo_url: userDetails.data().role
                        },
                            accessTokenSecret, {
                            expiresIn: "24h",
                        }
                        );
                        res.status(200).json({
                            status: 200,
                            userData: {
                                id: userDetails.id,
                                token: accessToken,
                                email: userDetails.data().email,
                                role: userDetails.data().role,
                                name: userDetails.data().name,
                                photo_url: userDetails.data().photo_url
                            },

                        })
                    } else {
                        res.status(400).json({
                            status: 400,
                            message: "Wrong Password"
                        });
                    }
                }
            } catch (e) {
                console.log("error getting document", e);
                res.status(500).json({
                    status: 500,
                    message: `${e}`
                });
            }
        } else {
            res.status(401).json({
                status: 401,
                message: "Oops, your account is yet to be approved by the admin"

            })
        }
    })

//TODO: ACTIVATE OR DEACTIVATE ACCOUNT. SEND AN EMAIL UPON ACTIVATION OR DEACTIVATION

app.post('/api/activateaccount', async (req, res) => {
    const { id } = req.query;
    const docRef = db.collection("Staffs").doc(id)
    try {
        userRecord = await admin.auth().updateUser(id, {
            disabled: false
        })

        await docRef.update({
            accountStatus: 'Active'
        })
        res.status(200).json({
            status: 200,
            message: `user account activated`
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            status: 200,
            message: `error activating user account: ${error}`
        })
    }
})

app.post('/api/deactivateaccount', async (req, res) => {
    const { id } = req.query;
    const docRef = db.collection("Staffs").doc(id)
    try {
        userRecord = await admin.auth().updateUser(id, {
            disabled: true
        })

        await docRef.update({
            accountStatus: 'Inactive'
        })
        res.status(200).json({
            status: 200,
            message: `user account deactivated`
        })
    } catch (error) {
        console.log(error)
        res.status(200).json({
            status: 200,
            message: `user account activated`
        })
    }
})


//TODO: UPDATE, DELETE, EDIT 
//send welcome email 
// exports.accountStatusNotification = functions.auth.user("").onUpdate((user) => {
//     // [END onCreateTrigger]
//     // [START eventAttributes]
//     const email = user.email; // The email of the user.
//     const displayName = user.displayName;
//     const disabled = user.disabled;

//     // The display name of the user.
//     // [END eventAttributes]

//     return accountStatusEmail(email, displayName, disabled);
// });

async function accountStatusEmail(email, displayName, disabled) {

    const mailOptions = {
        from: `${APP_NAME} <noreply@firebase.com>`,
        to: email
    };
    //email body
    mailOptions.subject = `Welcome to ${APP_NAME}`;
    if (disabled == true) {
        mailOptions.text = `Hi ${displayName}! We are sorry to inform you that Your account has been deactivated, Please reach out to the admin for more details`;
    } else {
        mailOptions.text = `Hi ${displayName}! we are pleased to inform you that Your account has now been activated. You can now access the TERP platform`;
    }


    try {
        await mailTransport.sendMail(mailOptions)
        functions.logger.log('New email sent to:', email);
    } catch (error) {
        functions.logger.log('Error sending email because:', error);
    }

}


app.get('/api/getstaffs', async (req, res) => {
    let staffsData = [];
    let staffsRef = db.collection("Staffs");
    try {
        let snapshot = await staffsRef.get();
        if (snapshot.empty) {
            console.log("No staffs data available");
            res.status(204).json({
                message: "There are no staffs available"
            })
        } else {
            snapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                staffsData.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            res.status(200).json({
                status: 200,
                data: staffsData
            })
            //get expensis relating to a project
        }
    } catch (e) {
        console.log(e);

        res.status(400).json({
            status: 200,
            data: `error getting staffs: ${e}`
        })
    }
})

app.get('/api/getstaff', async (req, res) => {
    let staffID = req.query.id;
    let staffData;
    let staffRef = db.collection("Staffs").doc(staffID);
    try {
        let doc = await staffRef.get();
        if (!doc.exists) {
            console.log("user not available");
            res.status(400).json({
                message: "user not available"
            })
        } else {
            staffData = doc.data();
            res.status(200).json({
                status: 200,
                data: staffData
            });
        }
    } catch (e) {
        console.log(e.toString());
        res.status(400).json({
            status: 400,
            data: `error getting staff: ${e}`
        })
    }
})


app.post('/api/updateStaff', async (req, res) => {
    let staffID = req.user.id
    let staffData = {
        name: req.body.name,
        phone: req.body.phone,
        dob: req.body.dob,
        id_type: req.body.id_type,
        id_number: req.body.id_number,
        id_file: req.body.id_file,
        gender: req.body.gender,
        address: req.body.address,
        bank: req.body.bank_name,
        account_number: req.body.account_number,
        account_name: req.body.account_name,
        photo_url: req.body.photo_url
    }

    const staffRef = db.collection("Staffs").doc(staffID)
    try {
        await admin.auth().updateUser(staffID, {
            phoneNumber: req.body.phone
        })

        await staffRef.update(staffData)
        res.status(200).json({
            status: 200,
            message: "staff info updated successfully"
        })
    } catch (e) {
        console.log(e.toString())
        res.status(400).json({
            status: 200,
            message: `Error updating staff info: ${e}`
        });
    }
})

app.post('/api/admin/updateStaff', async (req, res) => {
    let staffID = req.query.id
    let staffData = {
        role: req.body.role,
        department: req.body.department,
        salary: req.body.salary
    }

    const staffRef = db.collection("Staffs").doc(staffID)
    try {
        await staffRef.update(staffData)
        res.status(200).json({
            status: 200,
            message: "staff info updated successfully"
        })
    } catch (e) {
        console.log(e)
        res.status(400).json({
            status: 400,
            message: `Error updating staff info: ${e}`
        });
    }
})

async function generateBidId(client, location) {
   
    var rN = Math.random().toString().substr(2, 2);

    var date_ob = new Date();
    var day = ("0" + date_ob.getDate()).slice(-2);
    var month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    var year = date_ob.getFullYear();

    var date = year + "-" + month + "-" + day;
    console.log(date)
  
    var newlocation = location.substring(0, location.indexOf(' ')).toUpperCase();

    bidID = `TIS${client}${newlocation}${day}${month}${year}${rN}`
    console.log(bidID)
    return bidID
}

app.post("/api/genBidId", async (req, res) => {
    console.log(req)
    let bidId = await generateBidId(req.query.client, req.query.location)

    res.send(bidId)
})


app.post('/api/bid', async (req, res) => {

    let data = {
        tender_title: req.body.tenderTitle,
        tender_no: req.body.tenderNo,
        tag: req.body.tag,
        rfq: req.body.rfq,  //fileuploadlink
        client: req.body.client,
        client_contract_management_department: req.body.client_contract_management_department,
        location: req.body.projectLocation,
        companies: req.body.companies,
        winning_company: req.body.winningCompany,
        scope: req.body.scope,
        financials: req.body.financials,  //fileuploadlink
        contractSum: req.body.contractSum,
        deadline: req.body.deadline,
        date_submitted: req.body.dateSubmitted,
        status: "Pending",
        remark: " ",
        letterofaward: " ",  //fileuploadlink
        acceptanceletter: " ",
        dateCreated: FieldValue.serverTimestamp()
        //identify the person who created the bid
    }


    //   let bidId = await generateBidId(data.client, data.location);
    //   console.log(bidId)

    //store data in db
    // let docref = db.collection('Bids').doc(bidId);
    let docref = db.collection('Bids');
    try {
        let bidData = await docref.add(data);
         console.log(bidData);

        res.status(200).json({
            status: 200,
            message: `New bid initiated with BidID`
        });
    } catch (e) {
        console.log(e);
        res.status(400).json({
            status: 400,
            message: `Error initiating a bid becasuse; ${e}`
        })
    }
})
//TODO: UPDATE, DELETE, EDIT 
//a record of updates made relating to  bids should be implemented.

app.get('/api/getbids', async (req, res) => {
    let bidsData = [];
    let bidsRef = db.collection("Bids").orderBy("dateCreated", "desc");;
    try {
        let snapshot = await bidsRef.get();
        if (snapshot.empty) {
            console.log("No bids data available");
            res.status(400).json({
                status: 400,
                message: "There are no bids available"
            })
        } else {
            snapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                bidsData.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            res.status(200).json({
                status: 200,
                data: bidsData
            })
        }
    } catch (e) {
        console.log(e);
        res.status(400).json({
            status: 400,
            message: `error getting bids: ${e}`
        })
    }
})

app.get('/api/getBidsWon', async (req, res) => {
    let bidsData = [];
    let bidsRef = db.collection("Bids").where("status", "==", "Won").orderBy("dateCreated", "desc");;
    try {
        let snapshot = await bidsRef.get();
        if (snapshot.empty) {
            console.log("No bids data available");
            res.status(400).json({
                status: 400,
                message: "There are no bids available"
            })
        } else {
            snapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                bidsData.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            res.status(200).json({
                status: 200,
                data: bidsData
            })
        }
    } catch (e) {
        console.log(e);
        res.status(400).json({
            status: 400,
            message: `error getting bids: ${e}`
        })
    }
})
app.get('/api/getbid', async (req, res) => {
    let bidID = req.query.id;
    let bidData;
    let bidsRef = db.collection("Bids").doc(bidID);
    try {
        let doc = await bidsRef.get();
        if (!doc.exists) {
            console.log("bid not available");
            res.status(400).json({
                message: "bid not available"
            })
        } else {
            bidData = doc.data();
            res.status(200).json({
                status: 200,
                data: bidData
            });
        }
    } catch (e) {
        console.log(e.toString());
        res.status(400).json({
            status: 400,
            message: `error getting bid: ${e.toString()}`
        })
    }
})

app.post('/api/updateBid', async (req, res) => {
    let bidID = req.query.id
    let bidsData = {

        tender_title: req.body.tenderTitle,
        tender_no: req.body.tenderNo,
        tag: req.body.tag,
        rfq: req.body.rfq,  //fileuploadlink
        client: req.body.client,
        client_contract_management_department: req.body.client_contract_management_department,
        location: req.body.projectLocation,
        companies: req.body.biddingcompanies,
        winning_company: req.body.winningCompany,
        scope: req.body.scope,
        financials: req.body.financials,  //fileuploadlink
        contractSum: req.body.contractSum,
        deadline: req.body.deadline,
        date_submitted: req.body.dateSubmitted,
        status: req.body.status,
        // remark: " ",
        letterofaward: req.body.letterofaward,
        acceptanceletter: req.body.acceptanceletter
    }

    const bidsRef = db.collection("Bids").doc(bidID)
    try {
        await bidsRef.update(bidsData)
        res.status(200).json({
            status: 200,
            "message": "Bids updated successfully"
        })
    } catch (e) {
        console.log(e)
        res.status(400).json({
            status: 400,
            message: `Error updating bid: ${e}`

        })
    }
})


app.post('/api/createProject', async (req, res) => {
    //use bidid to get information 
    let bidID = req.body.bidID;

    //reference bid collection
    //reference project collection
    const projectRef = db.collection('Projects');
    try {
        let snapshot = await projectRef.where("bidID", "==", bidID).get();
        if (!snapshot.empty) {
            res.status(400).json({
                status: 400,
                message: `Project associated with bid already exists!, you cannot create more than one project per bid`
            })
        }


        let data = {
            bidID: req.body.bidID,
            name: req.body.name,
            client: req.body.client,
            company: req.body.company,
            scope: req.body.scope,
            contractSum: req.body.contractSum,
            location: req.body.location, //get from associated bid
            tag: req.body.tag, //get from associated bid
            takeoff_date: req.body.takeoff_date,
            duration: req.body.duration,
            status: "Ongoing",
            costOfExecution: req.body.costOfExecution,
            // paymentStatus: " ",
            balanceOwed: req.body.contractSum,
            amountPaid: 0,
            vendors: [],
            comment: req.body.comment,
            percentage_of_completion: 10,
            letterofaward: req.body.letterofaward, //fileupload
            purchaseOrder: req.body.purchaseOrder, //fileupload
            acceptanceletter: req.body.acceptanceletter, //fileupload
            workOrder: req.body.workOrder, //fileupload
            invoiceDeliveryNote: " ", //fileupload
            certificateOfCompletion: " ", //fileupload
            apgInvoice:"",
            dateCreated: FieldValue.serverTimestamp()
        }
        //store project details in db
        let projectDoc = await projectRef.add(data)
        console.log(projectDoc.id);

        res.status(200).json({
            status: 200,
            message: `New Project created with projectID: ${projectDoc.id}`
        })
    } catch (e) {
        console.log(e);
        res.status(400).json({
            status: 400,
            message: `Error creating a new project becasuse; ${e}`
        })
    }
})


//TODO: UPDATE, DELETE, EDIT 
//a record of updates made relating to  projects should be implemented.

app.get('/api/getprojects', async (req, res) => {
    let projectsData = [];
    let projectsRef = db.collection("Projects").orderBy("dateCreated", "desc");
    try {
        let snapshot = await projectsRef.get();
        if (snapshot.empty) {
            console.log("No projects data available");
            res.status(204).json({
                status: 204,
                message: "There are no projects available"
            })
        } else {
            snapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                projectsData.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            res.status(200).json({
                status: 200,
                data: projectsData
            })
            //get expensis relating to a project
        }
    } catch (e) {
        console.log(e.toString());

        res.status(400).json({
            status: 400,
            message: `error getting projects: ${e}`
        })
    }
})



app.get('/api/getproject', async (req, res) => {
    let projectID = req.query.id;
    let projectData;
    let projectRef = db.collection("Projects").doc(projectID);
    try {
        let doc = await projectRef.get();
        if (!doc.exists) {
            console.log("project not available");
            res.status(400).json({
                message: "project not available"
            })
        } else {
            projectData = doc.data();
            res.status(200).json({
                status: 200,
                data: projectData
            }
            );
        }
    } catch (e) {
        console.log(e.toString());
        res.status(400).json(`error getting project: ${e.toString()}`)
    }
})


app.post('/api/updateProject', async (req, res) => {
    let projectID = req.query.id
    let projectData = {
        name: req.body.name,
        location: req.body.location,
        client: req.body.client,
        company: req.body.company,
        scope: req.body.scope,
        contract_sum: req.body.contract_sum,
        takeoff_date: req.body.takeoff_date,
        duration: req.body.duration,
        status: req.body.status,
        letterofaward: req.body.letterofaward,
        percentage_of_completion: req.body.percentage_of_completion,
        comment: req.body.comment,
        invoiceDeliveryNote: req.body.invoiceDeliveryNote,
        certificateOfCompletion: req.body.certificateOfCompletion,
        letterofaward: req.body.letterofaward, //fileupload
        purchaseOrder: req.body.purchaseOrder, //fileupload
        workOrder: req.body.workOrder,
        costOfExecution: req.body.costOfExecution,
        acceptanceletter: req.body.acceptanceletter,
        apgInvoice: req.body.apgInvoice,
        // paymentStatus: req.body.paymentStatus,
        // vendors: "",
        amountPaid: req.body.amountPaid,
        bidID: req.body.bidID

    }

    const projectRef = db.collection("Projects").doc(projectID)
    try {
        await projectRef.update(projectData)
        res.status(200).json({
            status: 200,
            message: "project updated successfully"
        })
    } catch (e) {
        console.log(e.toString())
        res.status(400).json({
            status: 400,
            message: `Error updating project: ${e}`
        });
    }
})


app.post('/api/company', async (req, res) => {

    let data = {
        name: req.body.name,
        description: req.body.description,
        rcNumber: req.body.rcNumber,
        address: req.body.address,
        email: req.body.email,
        phone: req.body.phone,
        accountName: req.body.accountName,
        tin: req.body.tin,
        bankName: req.body.bankName,
        accountNumber: req.body.accountNumber,
        sortCode: req.body.sortCode,
        signature: req.body.signature, //evaluate the scope for this
        tin: req.body.tin,
        tcc: req.body.tcc,//file upload link 
        itf: req.body.itf, //file upload link
        nsitf: req.body.nsitf,  //file upload link
        pencom: req.body.pencom, //file upload link
        bpp: req.body.bpp, //file upload link
        nemsa: req.body.nemsa, //file upload link
        coren: req.body.coren,//file upload link
        technicalDocument: req.body.technicalDocument, //file upload link
        swornAffidavit: req.body.swornAffidavit, //file upload link
        bankReference: req.body.bankReference, //file upload link

    }

    //store data in db
    let docref = db.collection('Companies');
    try {
        let doc = await docref.add(data)
        console.log(doc.id);

        res.status(200).json({
            status: 200,
            message: `New Company created with companyID: ${doc.id}`
        })
    } catch (e) {
        console.log(e);
        res.status(400).json({
            status: 200,
            message: `Error registering a new company becasuse; ${e}`
        })
    }
})

//TODO: UPDATE, DELETE, EDIT 
app.get('/api/getcompanies', async (req, res) => {
    let companysData = [];
    let companysRef = db.collection("Companies");
    try {
        let snapshot = await companysRef.get();
        if (snapshot.empty) {
            console.log("No company data available");
            res.status(204).json({
                message: "There are no companies available"
            })
        } else {
            snapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                companysData.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            console.log(companysData);
            res.status(200).json({
                status: 200,
                data: companysData
            })

        }
    } catch (e) {
        console.log(e);
        res.status(400).json({
            status: 400,
            message: `error getting companies: ${e}`
        })
    }
})

app.get('/api/getcompany', async (req, res) => {
    let companyID = req.query.id;
    let companyData;
    let companyRef = db.collection("Companies").doc(companyID);
    try {
        let doc = await companyRef.get();
        if (!doc.exists) {
            console.log("company not available");
            res.status(400).json({
                status: 400,
                message: "company not available"
            })
        } else {
            companyData = doc.data();
            res.status(200).json({
                status: 200,
                data: {
                    details: companyData,
                }
            });
            //get expensis relating to project
        }
    } catch (e) {
        console.log(e);
        res.status(400).json({
            status: 400,
            message: `error getting company: ${e}`
        }
        )
    }
})


app.post('/api/updateCompany', async (req, res) => {
    let companyID = req.query.id
    let companyData = {
        name: req.body.name,
        rcNumber: req.body.rcNumber,
        address: req.body.address,
        contactEmail: req.body.contactEmail,
        description: req.body.description,
        contactNumber: req.body.contactNumber,
        accountName: req.body.accountName,
        accountNumber: req.body.accountNumber,
        bankName: req.body.bankName,
        sortCode: req.body.sortCode,
        signature: req.body.signature, //evaluate the scope for this
        tin: req.body.tin,
        tcc: req.body.tcc,//file upload link 
        itf: req.body.itf, //file upload link
        nsitf: req.body.nsitf,  //file upload link
        pencom: req.body.pencom, //file upload link
        bpp: req.body.bpp, //file upload link
        nemsa: req.body.nemsa, //file upload link
        coren: req.body.coren,//file upload link
        technicalDocument: req.body.technicalDocument //file upload link
    }

    const companyRef = db.collection("Companies").doc(companyID)
    try {
        await companyRef.update(companyData)
        res.status(200).json({
            status: 200,
            message: "company updated successfully"
        })
    } catch (e) {
        console.log(e)
        res.status(400).json({
            status: 400,
            message: `Error updating company: ${e}`
        });
    }
})




app.post('/api/createEquipments', async (req, res) => {
    let data = {
        category: req.body.category,
        item: req.body.item,
        stock: req.body.stock,
        latestPrice: req.body.latestPrice,
        lastPurchaseDate: req.body.lastPurchaseDate,
        vendor: req.body.vendor,
        vendorLocation: req.body.vendorLocation,
        vendorContact: req.body.vendorContact,

    }

    //store data in db
    let docref = db.collection('Equipments');
    try {
        let doc = await docref.add(data);
        console.log(`new document added with ${doc.id}`)

        res.status(201).json({
            status: 200,
            message: `Equipment details added successfully with id ${doc.id}`
        })
    } catch (e) {
        console.log(e)

        res.status(400).json({
            status: 400,
            message: `Error storing equipment data: ${e}`
        })
    }
});
//TODO: UPDATE, DELETE, EDIT 
app.get('/api/getequipments', async (req, res) => {
    let equipmentsData = [];
    let equipmentsRef = db.collection("Equipments");
    try {
        let snapshot = await equipmentsRef.get();
        if (snapshot.empty) {
            console.log("No equipments data available");
            res.status(204).json({
                message: "There are no equipments data available"
            })
        } else {
            snapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                equipmentsData.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            console.log(equipmentsData);
            res.status(200).json({
                status: 200,
                data: equipmentsData
            })

        }
    } catch (e) {
        console.log(e);
        res.status(400).json({
            status: 200,
            message: `error getting equipments: ${e.toString()}`
        })
    }
})

app.get('/api/getequipment', async (req, res) => {
    let equipmentID = req.query.id;
    let equipmentData;
    let equipmentRef = db.collection("Equipments").doc(equipmentID);
    try {
        let doc = await equipmentRef.get();
        if (!doc.exists) {
            console.log("equipment data not found");
            res.status(400).json({
                status: 400,
                message: "equipment data not found"
            })
        } else {
            equipmentData = doc.data();
            console.log(equipmentData)
            res.status(200).json({
                status: 200,
                data: equipmentData
            });
        }
    } catch (e) {
        console.log(e.toString());
        res.status(400).json({
            status: 400,
            message: `error getting equipment data: ${e.toString()}`
        })
    }
})

app.post('/api/updateEquipment', async (req, res) => {
    let equipmentID = req.query.id
    let equipmentData = {
        category: req.body.category,
        item: req.body.item,
        stock: req.body.stock,
        latestPrice: req.body.latestPrice,
        lastPurchaseDate: req.body.lastPurchaseDate,
        vendor: req.body.vendor,
        vendorLocation: req.body.vendorLocation,
        vendorContact: req.body.vendorContact,
    }

    const equipmentRef = db.collection("Equipments").doc(equipmentID)
    try {
        await equipmentRef.update(equipmentData)
        res.status(200).json({
            status: 200,
            message: "equipment data updated successfully"
        })
    } catch (e) {
        console.log(e)
        res.status(400).json({
            stats: 400,
            message: `Error updating equipment data: ${e}`
        });
    }
})


//a record of updates made relating to  tasks should be implemented.
app.post('/api/tasks', async (req, res) => {
    let data = {
        name: req.body.name,
        scope: req.body.name,
        assignedTo: req.body.assignedTo,
        initiatedBy: req.body.initiatedBy,
        deadline: req.body.deadline,
        comment: req.body.comment,
        status: "Pending",
        prioritylevel: parseInt(req.body.prioritylevel),
        peopleInvolved: req.body.peopleInvolved, //an array
        startDate: req.body.startDate,
        dateCreated: FieldValue.serverTimestamp()

    }

    //store data in db
    let docref = db.collection('Tasks');
    try {
        let doc = await docref.add(data);
        console.log(`new task created with ${doc.id} and assigned to ${data.assignedTo}`)

        res.status(200).json({
            status: 200,
            message: `new task created with ${doc.id} and assigned to ${data.assignedTo}`
        })
    } catch (e) {
        console.log(e)
        res.status(400).json({
            status: 200,
            message: `Error creating a new task: ${e}`
        })
    }
})

//TODO: UPDATE, DELETE, EDIT 

app.get('/api/gettasks', async (req, res) => {
    let tasksData = [];
    let tasksRef = db.collection("Tasks").orderBy("dateCreated", "desc");
    try {
        let snapshot = await tasksRef.get();
        if (snapshot.empty) {
            console.log("No tasks data available");
            res.status(400).json({
                status: 400,
                message: "There are no tasks "
            })
        } else {
            snapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                tasksData.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            console.log(tasksData);
            res.status(200).json({
                status: 200,
                data: tasksData
            })

        }
    } catch (e) {
        console.log(e);
        res.status(400).json({
            status: 400,
            message: `error getting tasks: ${e}`
        })
    }
})

app.get('/api/getstafftasks', async (req, res) => {
    let tasksData = [];
    let name = req.user.name
    let assignedtasksRef = db.collection("Tasks").where("assignedTo", "==", name).orderBy("dateCreated", "DESC")
    let involvedtasksRef = db.collection("Tasks").where("peopleInvolved", "array-contains", name).orderBy("dateCreated", "DESC")
    try {
        let assignedSnapshot = await assignedtasksRef.get();
        if (assignedSnapshot.empty) {
            console.log("No assigned tasks available");
            // res.status(400).json({
            //     status: 400,
            //     message: "There are no tasks data available"
            // })
        } else {
            assignedSnapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                tasksData.push({
                    id: doc.id,
                    ...doc.data()
                })
            })

        }
        let involvedSnapshot = await involvedtasksRef.get();
        if (involvedSnapshot.empty) {
            console.log("No involved tasks")
        } else {
            involvedSnapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                tasksData.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
        }
        console.log(tasksData);

        // let filteredTasks = tasksData.filter(e => e.peopleInvolved.contains(name))
        // console.log(filteredTasks)

        res.status(200).json({
            status: 200,
            data: tasksData
        })
    } catch (e) {
        console.log(e);
        res.status(400).json({
            status: 400,
            message: `error getting tasks: ${e}`
        })
    }
})


app.get('/api/gettask', async (req, res) => {
    let taskID = req.query.id;
    let taskData;
    let taskRef = db.collection("Tasks").doc(taskID);
    try {
        let doc = await taskRef.get();
        if (!doc.exists) {
            console.log("task data not found");
            res.status(400).json({
                message: "task data not found"
            })
        } else {
            taskData = doc.data();
            console.log(taskData)
            res.status(200).json({
                status: 200,
                data: taskData
            });
        }
    } catch (e) {
        console.log(e);
        res.status(400).json({
            status: 400,
            message: `error getting task data: ${e}`
        })
    }
})


app.post('/api/updateTask', async (req, res) => {
    let taskID = req.query.id
    let taskData = {
        name: req.body.name,
        scope: req.body.name,
        assignedTo: req.body.assignedTo,
        initiatedBy: req.body.initiatedBy,
        deadline: req.body.deadline,
        comment: req.body.comment,
        status: req.body.status,
        prioritylevel: req.body.prioritylevel,
        peopleInvolved: req.body.peopleInvolved, //an array
        startDate: req.body.startDate,
    }

    const taskRef = db.collection("Tasks").doc(taskID)
    try {
        await taskRef.update(taskData)
        res.status(200).json({
            status: 200,
            message: "task data updated successfully"
        })
    } catch (e) {
        console.log(e)
        res.status(400).json({
            status: 400,
            message: `Error updating task data: ${e}`
        });
    }
})


app.post('/api/meetings', async (req, res) => {
    let data = {
        title: req.body.title,
        scope: req.body.scope,
        date: req.body.date,
        time: req.body.time,
        mode: req.body.mode,
        location: req.body.location,
        status: req.body.status,
        comment: req.body.comment
    }
    //store data in db
    let docref = db.collection('Tasks');
    try {
        let doc = await docref.add(data);
        console.log(`new meeting created with ${doc.id}`)

        res.status(201).json(`new meeting created with ${doc.id}`)
    } catch (e) {
        console.log(e.toString())

        res.status(400).json(`Error creating a new meeting`)
    }
})

//dashboardData
app.get('/api/dashboarddata', async (req, res) => {

    const bids = [];
    const projects = [];
    const tasks = []


    const allBidsRef = db.collection("Bids");
    const pendingBidsRef = db.collection("Bids").where("status", "==", "Pending");
    const approvedBidRef = db.collection("Bids").where("status", "==", "Won");
    const lostBidsRef = db.collection("Bids").where("where", "==", "Lost");

    const allProjectsRef = db.collection("Projects");
    const ongoingProjectsRef = db.collection("Projects").where("status", "==", "Ongoing");
    const completedProjectsRef = db.collection("Projects").where("status", "==", "Completed")

    const projectsRef = db.collection("Projects").orderBy("dateCreated", "desc").limit(5);
    const bidsRef = db.collection('Bids').orderBy("dateCreated", "desc").limit(5);
    const tasksRef = db.collection("Tasks").where("prioritylevel", "==", 1).limit(5)


    try {
        const allBidsSnapshot = await allBidsRef.get();
        const allBidsCount = allBidsSnapshot.size;

        const pendingBidsSnapshot = await pendingBidsRef.get();
        const pendingBidsCount = pendingBidsSnapshot.size;
        const approvedBidsSnapshot = await approvedBidRef.get();
        const approvedBidsCount = approvedBidsSnapshot.size;
        const lostBidsSnapshot = await lostBidsRef.get();
        const lostBidsCount = lostBidsSnapshot.size;

        const allProjectsSnapshot = await allProjectsRef.get();
        const allProjectsCount = allProjectsSnapshot.size;
        const ongoingProjectsSnapshot = await ongoingProjectsRef.get();
        const ongoingProjectsCount = ongoingProjectsSnapshot.size

        const completedProjectsSnapshot = await completedProjectsRef.get();
        const completedProjectsCount = completedProjectsSnapshot.size


        const projectsSnapshot = await projectsRef.get();
        if (projectsSnapshot.empty) {
            console.log("No tasks data available");
        } else {
            projectsSnapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                projects.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            console.log(projects);
        }

        const bidsSnapshot = await bidsRef.get();
        if (bidsSnapshot.empty) {
            console.log("No bids data available");
        } else {
            bidsSnapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                bids.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            console.log(bids);
        }

        const tasksSnapshot = await tasksRef.get();
        if (tasksSnapshot.empty) {
            console.log("No tasks data available");
        } else {
            tasksSnapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                tasks.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            console.log(tasks);
        }

        res.status(200).json({
            status: 200,
            data: {
                allBidsCount,
                allProjectsCount,
                pendingBidsCount,
                approvedBidsCount,
                lostBidsCount,
                completedProjectsCount,
                ongoingProjectsCount,
                bids,
                projects,
                tasks


            }
        })

    } catch (e) {
        console.log(e)
        res.status(400).json({
            status: 400,
            message: `Error getting dashboard data: ${e}`
        })
    }


})


app.get('/api/staff/dashboarddata', async (req, res) => {
    const name = req.user.name
    const bids = [];
    const projects = [];
    const tasks = []


    const allBidsRef = db.collection("Bids");
    const pendingBidsRef = db.collection("Bids").where("status", "==", "Pending");
    const approvedBidRef = db.collection("Bids").where("status", "==", "Won");
    const lostBidsRef = db.collection("Bids").where("where", "==", "Lost");

    const allProjectsRef = db.collection("Projects");
    const ongoingProjectsRef = db.collection("Projects").where("status", "==", "Ongoing");
    const completedProjectsRef = db.collection("Projects").where("status", "==", "Completed")

    const projectsRef = db.collection("Projects").limit(6);
    const bidsRef = db.collection('Bids').limit(6);
    const assignedtasksRef = db.collection("Tasks").where("assignedTo", "==", name).where("status", "==", "Pending").orderBy("dateCreated", "DESC").limit(6)
    // const involvedtasksref = db.collection("Tasks").where("assignedTo", "==", name).where("peopleInvolved", "array-contains", name).orderBy("dateCreated", "DESC").limit(3)

    try {
        const allBidsSnapshot = await allBidsRef.get();
        const allBidsCount = allBidsSnapshot.size;

        const pendingBidsSnapshot = await pendingBidsRef.get();
        const pendingBidsCount = pendingBidsSnapshot.size;
        const approvedBidsSnapshot = await approvedBidRef.get();
        const approvedBidsCount = approvedBidsSnapshot.size;
        const lostBidsSnapshot = await lostBidsRef.get();
        const lostBidsCount = lostBidsSnapshot.size;

        const allProjectsSnapshot = await allProjectsRef.get();
        const allProjectsCount = allProjectsSnapshot.size;
        const ongoingProjectsSnapshot = await ongoingProjectsRef.get();
        const ongoingProjectsCount = ongoingProjectsSnapshot.size

        const completedProjectsSnapshot = await completedProjectsRef.get();
        const completedProjectsCount = completedProjectsSnapshot.size


        const projectsSnapshot = await projectsRef.get();
        if (projectsSnapshot.empty) {
            console.log("No tasks data available");
        } else {
            projectsSnapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                projects.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            console.log(projects);
        }

        const bidsSnapshot = await bidsRef.get();
        if (bidsSnapshot.empty) {
            console.log("No bids data available");
        } else {
            bidsSnapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                bids.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            console.log(bids);
        }

        const assignedtasksSnapshot = await assignedtasksRef.get();
        if (assignedtasksSnapshot.empty) {
            console.log("No tasks data available");
        } else {
            assignedtasksSnapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                tasks.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            console.log(tasks);
        }

        // const involvedtasksSnapshot = await involvedtasksref.get();
        // if (involvedtasksSnapshot.empty) {
        //     console.log("No tasks data available");
        // } else {
        //     involvedtasksSnapshot.forEach(doc => {
        //         console.log(doc.id, "=>", doc.data());

        //         tasks.push({
        //             id: doc.id,
        //             ...doc.data()
        //         })
        //     })
        //     console.log(tasks);
        // }

        res.status(200).json({
            status: 200,
            data: {
                allBidsCount,
                allProjectsCount,
                pendingBidsCount,
                approvedBidsCount,
                lostBidsCount,
                completedProjectsCount,
                ongoingProjectsCount,
                bids,
                projects,
                tasks


            }
        })

    } catch (e) {
        console.log(e)
        res.status(400).json({
            status: 400,
            message: `Error getting dashboard data: ${e}`
        })
    }


})

//TODO: UPDATE, DELETE, EDIT

app.post('/api/expenses', async (req, res) => {
    let data = {
        description: req.body.description,
        category: req.body.category,
        authorisedBy: req.body.authorisedBy,
        date: req.body.date,
        amount: req.body.amount,
        projectId: req.body.projectId,
        dateCreated: FieldValue.serverTimestamp()
    }
    //store data in d
    let docref = db.collection('Expenses');
    try {
        await docref.add(data);
        console.log(`Success recording expenses`)

        res.status(200).json({
            status: 200,
            message: "Success recording expenses"
        })
    } catch (e) {
        console.log(e)

        res.status(400).json({
            status: 200,
            message: `Error recording Expenses: ${e}`
        })
    }
})


app.post('/api/updateExpenses', async (req, res) => {
    let expensesId = req.query.id
    let data = {
        description: req.body.description,
        category: req.body.category,
        authorisedBy: req.body.authorisedBy,
        date: req.body.date,
        amount: req.body.amount,
        projectId: req.body.projectId,
        dateCreated: FieldValue.serverTimestamp()
    }
    //store data in d
    let docref = db.collection('Expenses').doc(expensesId)
    try {
        await docref.update(data);
        console.log(`Success updating expenses`)

        res.status(200).json({
            status: 200,
            message: "Success updating expenses"
        })
    } catch (e) {
        console.log(e)

        res.status(400).json({
            status: 200,
            message: `Error updating Expenses: ${e}`
        })
    }
})


app.get('/api/getAllExpenses', async (req, res) => {
    let expensesData = [];
    let expensesRef = db.collection("Expenses").orderBy("dateCreated", "desc");
    try {
        let snapshot = await expensesRef.get();
        if (snapshot.empty) {
            console.log("No expenses data available");
            res.status(400).json({
                status: 400,
                message: "There are no expense data available"
            })
        } else {
            snapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                expensesData.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            console.log(expensesData);
            res.status(200).json({
                status: 200,
                data: expensesData
            })

        }
    } catch (e) {
        console.log(e);
        res.status(400).json({
            status: 400,
            message: `error getting expenses: ${e}`
        })
    }
})


app.get('/api/getExpenses', async (req, res) => {
    let expensesId = req.query.id;
    let expensesData;
    let expensesRef = db.collection("Expenses").doc(expensesId);
    try {
        let doc = await expensesRef.get();
        if (!doc.exists) {
            console.log("expenses data not found");
            res.status(400).json({
                status: 400,
                message: "expenses data not found"
            })
        } else {
            expensesData = doc.data();
            console.log(expensesData)
            res.status(200).json({
                status: 200,
                data: expensesData
            });
        }
    } catch (e) {
        console.log(e);
        res.status(400).json({
            status: 400,
            message: `error getting expenses data: ${e}`
        })
    }
})


app.get('/api/getProjectExpenses', async (req, res) => {
    let projectId = req.query.id
    let expensesData = [];
    let expensesRef = db.collection("Expenses").where("projectId", "==", projectId).orderBy("dateCreated", "desc");
    try {
        let snapshot = await expensesRef.get();
        if (snapshot.empty) {
            console.log("No expenses data available");
            res.status(200).json({
                status: 200,
                message: "There are no expenses data available"
            })
        } else {
            snapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                expensesData.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            console.log(expensesData);
            res.status(200).json({
                status: 200,
                data: expensesData
            })

        }
    } catch (e) {
        console.log(e);
        res.status(400).json({
            status: 400,
            message: `error getting expenses: ${e}`
        })
    }
})




//TODO: UPDATE, DELETE, EDIT





//expose express application
exports.app = functions.https.onRequest(app);
