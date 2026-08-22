const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;


// ==========================================
// HOME PAGE
// ==========================================

app.get("/", (req, res) => {

    res.send(`
        <!DOCTYPE html>

        <html>

        <head>

            <title>M-Pesa STK Push Test</title>

            <style>

                body {
                    font-family: Arial;
                    max-width: 500px;
                    margin: 50px auto;
                    padding: 20px;
                }

                input {
                    width: 100%;
                    padding: 12px;
                    margin-bottom: 15px;
                    box-sizing: border-box;
                }

                button {
                    width: 100%;
                    padding: 12px;
                    cursor: pointer;
                }

            </style>

        </head>

        <body>

            <h2>M-Pesa STK Push Test</h2>

            <form action="/pay" method="POST">

                <label>Phone Number</label>

                <input
                    type="text"
                    name="phone"
                    placeholder="2547XXXXXXXX"
                    required
                >

                <label>Amount</label>

                <input
                    type="number"
                    name="amount"
                    value="1"
                    required
                >

                <button type="submit">
                    PAY WITH M-PESA
                </button>

            </form>

        </body>

        </html>
    `);

});


// ==========================================
// GET ACCESS TOKEN
// ==========================================

async function getAccessToken() {

    const consumerKey =
        process.env.MPESA_CONSUMER_KEY;

    const consumerSecret =
        process.env.MPESA_CONSUMER_SECRET;

    const auth =
        Buffer
        .from(
            consumerKey +
            ":" +
            consumerSecret
        )
        .toString("base64");

    const response = await axios.get(

        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",

        {
            headers: {
                Authorization:
                    `Basic ${auth}`
            }
        }

    );

    return response.data.access_token;

}


// ==========================================
// SEND STK PUSH
// ==========================================

app.post("/pay", async (req, res) => {

    try {

        let phone = req.body.phone;

        let amount = req.body.amount;

        // Remove spaces
        phone = phone.replace(/\s/g, "");
        //Remove dashes
        phone = phone.replace(/-/g, "");
        // Convert 07XXXXXXXX to 2547XXXXXXXX
        if (phone.startsWith("0")) {
            phone =
                "254" +
                phone.substring(1);

        }

        // Get access token
        const accessToken = await getAccessToken();

        // Create timestamp
        const now =
            new Date();

        const timestamp =
            now.getFullYear().toString()
            +
            String(now.getMonth() + 1).padStart(2, "0")
            +
            String(now.getDate()).padStart(2, "0")
            +
            String(now.getHours()).padStart(2, "0")
            +
            String(now.getMinutes()).padStart(2, "0")
            +
            String(now.getSeconds()).padStart(2, "0");


        // Generate password
        const password =
            Buffer
            .from(

                process.env.MPESA_SHORTCODE +

                process.env.MPESA_PASSKEY +

                timestamp

            )
            .toString("base64");


        // STK Push request

        const response =
            await axios.post(

                "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",

                {

                    BusinessShortCode:
                        process.env.MPESA_SHORTCODE,

                    Password:
                        password,

                    Timestamp:
                        timestamp,

                    TransactionType:
                        "CustomerPayBillOnline",

                    Amount:
                        Number(amount),

                    PartyA:
                        phone,

                    PartyB:
                        process.env.MPESA_SHORTCODE,

                    PhoneNumber:
                        phone,

                    CallBackURL:
                        process.env.MPESA_CALLBACK_URL,

                    AccountReference:
                        "GOETHE TEST",

                    TransactionDesc:
                        "STK Push Test"

                },

                {

                    headers: {

                        Authorization:
                            `Bearer ${accessToken}`

                    }

                }

            );


        console.log(
            "STK RESPONSE:"
        );

        console.log(
            response.data
        );


        res.send(

            `
            <h2>Request Sent</h2>

            <pre>
${JSON.stringify(
    response.data,
    null,
    2
)}
            </pre>

            <br>

            <a href="/">
                Go Back
            </a>
            `

        );

    }

    catch (error) {

        console.log(
            "ERROR:"
        );

        console.log(
            error.response
                ? error.response.data
                : error.message
        );


        res.send(

            `
            <h2>Payment Error</h2>

            <pre>
${JSON.stringify(
    error.response
        ? error.response.data
        : error.message,
    null,
    2
)}
            </pre>

            <br>

            <a href="/">
                Try Again
            </a>
            `

        );

    }

});


// ==========================================
// M-PESA CALLBACK
// ==========================================

app.post(
    "/callback",

    (req, res) => {

        console.log(
            "M-PESA CALLBACK RECEIVED:"
        );

        console.log(
            JSON.stringify(
                req.body,
                null,
                2
            )
        );


        res.status(200).json({

            ResultCode: 0,

            ResultDesc: "Accepted"

        });

    }

);


// ==========================================
// START SERVER
// ==========================================

app.listen(

    PORT,

    () => {

        console.log(
            `Server running on http://localhost:${PORT}`
        );

    }

);