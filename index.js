const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const FormData = require('form-data');
require('dotenv').config({ path: __dirname + '/.env' });
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());


const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const ZOHO_REDIRECT_URI = process.env.ZOHO_REDIRECT_URI;
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;
const ZOHO_TOKEN_URL = process.env.ZOHO_TOKEN_URL;
const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID;

// console.log("🔍 Loaded Environment Variables:");
// console.log("-------------------------------------------------");
// console.log("✅ PORT: ", process.env.PORT || "⚠️ Not Set (Using Default 3000)");
// console.log("✅ OPENAI_API_KEY: ", process.env.OPENAI_API_KEY ? "✅ Loaded" : "❌ NOT LOADED");
// console.log("✅ ZOHO_CLIENT_ID: ", process.env.ZOHO_CLIENT_ID || "❌ NOT LOADED");
// console.log("✅ ZOHO_CLIENT_SECRET: ", process.env.ZOHO_CLIENT_SECRET || "❌ NOT LOADED");
// console.log("✅ ZOHO_REDIRECT_URI: ", process.env.ZOHO_REDIRECT_URI || "❌ NOT LOADED");
// console.log("✅ ZOHO_REFRESH_TOKEN: ", process.env.ZOHO_REFRESH_TOKEN || "❌ NOT LOADED");
// console.log("✅ ZOHO_TOKEN_URL: ", process.env.ZOHO_TOKEN_URL || "❌ NOT LOADED");
// console.log("✅ ZOHO_ORG_ID: ", process.env.ZOHO_ORG_ID || "❌ NOT LOADED");
// console.log("-------------------------------------------------");


let accessToken = "";
(async () => {
    try {
      accessToken = await fetchAccessToken();
      console.log("Initial access token fetched.");
    } catch (err) {
      console.error("Error during initial token fetch:", err.message);
    }
  })();


setInterval( async () => {
    accessToken = await fetchAccessToken();
}, 58 * 60 * 1000 );


// Route 1: Check if the server is running
app.get('/', (req, res) => {
  console.log('Ping route accessed.');
  res.send('Server is running!');
});


app.get("/get-projectcode", async (req, res) => {
  try {
    if(!accessToken){
        accessToken = await fetchAccessToken();
    }
    // Replace with your token
    if (!accessToken) {
      return res.status(500).json({
        message: "access token not found",
      });
    }
    const response = await axios.get(
      "https://desk.zoho.com/api/v1/cm_projects",
      {
        params: {
          viewId: "1142108000000456256",
          fields: "cf_project_code",
        },
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          orgId: ZOHO_ORG_ID,
          "Content-Type": "application/json",
        },
      },
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Full error object:", error);
    console.error(
      "Error details:",
      error.response
        ? JSON.stringify(error.response.data, null, 2)
        : error.message,
    );
    res.status(500).json({ error: "Failed to fetch custom module data" });
  }
});


async function fetchAccessToken() {
  try {
        const url = `${ZOHO_TOKEN_URL}?grant_type=refresh_token&client_id=${ZOHO_CLIENT_ID}&client_secret=${ZOHO_CLIENT_SECRET}&redirect_uri=${ZOHO_REDIRECT_URI}&refresh_token=${ZOHO_REFRESH_TOKEN}`;
        const response = await axios.post(url);

      if (response.data && response.data.access_token) {
          console.log("access token generated: ", response.data.access_token )
          return response.data.access_token;
      } else {
          throw new Error("Access token not found in the response.");
      }
  } catch (error) {
      console.error("Error fetching access token:", error.message);
      throw error;
  }
}

const upload = multer({storage : multer.memoryStorage()});

app.post("/api/create-ticket", upload.array('files', 10), async (req, res) => {
  try {
      // Extract form data
      const { subject, departmentId, description, severity, contactId,ticketCreator, team,projectCode,priority} = req.body;

  //     const teamMap = {
  //       "1142108000000466538": "Planning Team",
  //       "1142108000000466552": "Production Team 1",
  //       "1142108000000466566": "Production Team 2",
  //       "1142108000000466580": "Production Team 3",
  //       "1142108000000466594": "Service Team",
  //       "1142108000000466342": "Basis",
  //       "1142108000000466356": "Composite",
  //       "1142108000000466370": "Interior Engineering",
  //       "1142108000000466384": "Yacht Design",
  //       "1142108000000466398": "Interior Design",
  //       "1142108000000466412": "Yacht Design 3D Visuals",
  //       "1142108000000466426": "Deck outfitting",
  //       "1142108000000466440": "Electrical",
  //       "1142108000000466454": "Integrated Solutions",
  //       "1142108000000466468": "Machinery and Piping",
  //       "1142108000000466482": "Interior Engineering SY",
  //       "1142108000000466496": "Composite AND",
  //       "1142108000000466510": "Systems AND",
  //       "1142108000000466524": "Naval Architecture"

  //   };

  //   // Map team ID to team name
  //   const teamIdMap = Object.fromEntries(
  //     Object.entries(teamMap).map(([id, name]) => [name, id])
  // );

  // const teamId = teamIdMap[team] || "";


      // Step 1: Create ticket in Zoho Desk
      if(!accessToken){
        accessToken = await fetchAccessToken();
      }
      if(!accessToken){
        return res.status(500).json({
          "message" : "access token not found"
        })
      }

      // console.log("generated token : ", accessToken);
      // console.log("Team id : ", teamId);

        // ✅ Correcting the ticketData format
        const ticketData = {
          subject: subject,
          departmentId: departmentId, // Zoho department ID (keep this same)
          description: `${description}`, // Merging description & notes
          language: "English",
          status: "Open", // Setting initial status
          category: "general", // Adjust category if needed
          contactId: "1142108000000476001", // Set correct contact ID
          productId: "", // Can be updated if needed,
          // teamId : teamId,
          priority : priority,
          channel:"Voice Note",
          cf: { // ✅ Add custom fields (cf)
              cf_permanentaddress: null,
              cf_dateofpurchase: null,
              cf_phone: null,
              cf_numberofitems: null,
              cf_url: null,
              cf_secondaryemail: null,
              cf_severitypercentage: "0.0",
              cf_modelname: "F3 2017",
              cf_project_code : projectCode,
              cf_severity : severity,
              cf_team_name : team
          },
      };



      const ticketResponse = await axios.post(
          "https://desk.zoho.com/api/v1/tickets",
          ticketData,
          {
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Zoho-oauthtoken ${accessToken}`,
              },
          }
      );


      const ticketId = ticketResponse.data.id; // <-- Correct way to get the ticket ID
      const ticketNumber = ticketResponse.data.ticketNumber; // <-- This is the readable ticket number

      // console.log("Ticket ID:", ticketId);
      // console.log("Ticket Number:", ticketNumber);

        // ✅ Step 1: Log access token before uploading

        if (!ZOHO_ORG_ID) {
            throw new Error("❌ orgId is missing. Please check your .env file.");
        }

      if (!req.files || req.files.length === 0) {
          console.log("⚠️ No files uploaded.");
      } else {
          for (const file of req.files) {
              console.log(`📁 Uploading File: ${file.originalname}`);
      
              const formData = new FormData();
              formData.append("file", file.buffer, { filename: file.originalname });
      
              await axios.post(
                  `https://desk.zoho.com/api/v1/tickets/${ticketId}/attachments`,
                  formData,
                  {
                      headers: {
                        'Content-Type': 'multipart/form-data',
                          "Authorization": `Zoho-oauthtoken ${accessToken}`,
                          "orgId": ZOHO_ORG_ID,
                          ...formData.getHeaders(),
                      },
                  }
              );
      
              console.log(`✅ Uploaded: ${file.originalname}`);
          }
      }
  

      res.status(200).json({ message: "Ticket created successfully!", ticketNumber });

  } catch (error) {
      console.error("Error:", error.message);
      res.status(500).json({ error: "An error occurred", details: error.message });
  }
});


// module.exports = app;

app.listen(PORT, () => {  
  console.log(`Server is running on port ${PORT}`);
});
