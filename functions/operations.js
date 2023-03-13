//The cloud functions for firebase sdk to create cloud functions and set up triggers 
// const functions = require("firebase-functions");
// const admin = require('firebase-admin');
// admin.initializeApp();
// const db = admin.firestore();

//apparently you can't admin.initializeApp twice. fix this or just leave all the codes in index.js

async function createBID(req) {
    let data = {
        tender_title: req.body.tender_title,
        tender_no: req.body.tender_no,
        rfq: req.body.rfq,  //fileuploadlink
        client: req.body.client,
        client_contract_management_department: req.body.client_contract_management_department,
        ompanies: req.body.companies,
        winning_company: req.body.winning_company,
        scope: req.body.scope,
        financials: req.body.financials,  //fileuploadlink
        contract_sum_range: req.body.contract_sum_range,
        deadline: req.body.deadline,
        date_submitted: req.body.date_submitted,
        status: req.body.status,
        letterofaward: req.body.letterofaward,  //fileuploadlink
        purchase_order: req.body.purchase_order, //fileuploadlink
        //identify the person who created the bid
    }
    //store data in db
    let docref = db.collection('Bids');
    try {
        let bidData = await docref.add(data);
        console.log(bidData.id);
        return bidData
        // res.status(200).send("New bid initiated with BidID:", bidData.id);
    } catch (e) {
        console.log(e.toString);
        return null;
        // res.status(400).send(`Error initiating a bid becasuse; ${e}`)
    }
}


async function getBIDS() {
    let bidsData = [];
    let bidsRef = db.collection("Bids");
    try {
        let snapshot = await bidsRef.get();
        if (snapshot.empty) {
            console.log("No bids data available");
            return null;
        } else {
            snapshot.forEach(doc => {
                console.log(doc.id, "=>", doc.data());

                bidsData.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            return bidData;
        }
    } catch (e) {
        console.log(e.toString());
        return null;
    }
}

async function getBID(bidID) {
    let bidData;
    let bidsRef = db.collection("Bids").doc(bidID);
    try {
        let doc = await bidsRef.get();
        if (!doc.exists) {
            console.log("bid not available");
            return null
        } else {
            bidData = doc.data();
            return bidData
        }
    } catch (e) {
        console.log(e.toString());
        return null
    }
}

async function updateBID(req) {
    let bidData
    let bidID = req.query.id
    let bidsData = {
        tender_title: req.body.tender_title,
        tender_no: req.body.tender_no,
        rfq: req.body.rfq,  //fileuploadlink
        client: req.body.client,
        client_contract_management_department: req.body.client_contract_management_department,
        ompanies: req.body.companies,
        winning_company: req.body.winning_company,
        scope: req.body.scope,
        financials: req.body.financials,  //fileuploadlink
        contract_sum_range: req.body.contract_sum_range,
        deadline: req.body.deadline,
        date_submitted: req.body.date_submitted,
        status: req.body.status,
        letterofaward: req.body.letterofaward,  //fileuploadlink
        purchase_order: req.body.purchase_order //fileuploadlink
    }

    const bidsRef = db.collection("Bids").doc(bidID)
    try {
        await bidsRef.update(bidsData)
        bidData = "bid updated successfully"
        return bidData;
    } catch (e) {
        console.log(e.toString())
        return null;
    }
}







module.exports = { createBID, getBIDS, getBID, updateBID };