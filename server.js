require('dotenv').config();
const express = require('express');
const { spawn } = require('child_process');
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const port = 3000;

// Debugging: Log environment variables
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_SERVER:', process.env.DB_SERVER);
console.log('DB_DATABASE:', process.env.DB_DATABASE);

// Database configuration
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true, // Use encryption
        enableArithAbort: true // Enable ArithAbort setting
    }
};

app.use(express.static('public'));

// Middleware to parse JSON bodies
app.use(express.json());

//Route to get minimum voted card - TODO: Add other tables
app.get('/newCard', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        const result = await request.query(`EXECUTE newCard`);
        id = result.recordset[0].id
        //console.log(id)
        await request.query(`INSERT INTO [dbo].[Log] (QueryType, CardID, VoteType, CreatedAt) VALUES ('NewCard', '${id}', NULL, (getdate()))`); //Log card get
        res.json(result.recordset);
    } catch (err) {
        console.error('Error retrieving card:', err);
        res.status(500).send('Error retrieving card');
    } finally {
        sql.close(); // Close the connection
    }
});

// Route to get vote counts
app.get('/votes', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        const result = await request.query(`SELECT VoteType, COUNT(*) as count FROM Votes GROUP BY VoteType`);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error retrieving votes:', err);
        res.status(500).send('Error retrieving votes');
    } finally {
        sql.close(); // Close the connection
    }
});

//upVote based on ID value
app.post('/upvote', async (req, res) => {
    const id = req.body.id;
    const type = req.body.type;

    //console.log(`ID: "${id}"`);
    //console.log(`Type: "${type}"`);

    if (!id) {
        return res.status(400).send('Card is required');
    }
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        await request.query(`UPDATE dbo.${type} SET score = score + 1 WHERE id = '${id};'`); //Incriment score
        await request.query(`UPDATE dbo.${type} SET votes = votes + 1 WHERE id = '${id};'`); //Incriment votes
        await request.query(`INSERT INTO [dbo].[Log] (QueryType, CardID, VoteType, CreatedAt) VALUES ('Vote', NEWID(), 1, (getdate()))`); //Log vote
        res.send('Vote up recorded');
    } catch (err) {
        console.error('Error recording vote up:', err);
        res.status(500).send('Error recording vote up');
    } finally {
        sql.close(); // Close the connection
    }
    
});

//downVote based on ID value
app.post('/downvote', async (req, res) => {
    //console.log(req)
    const id = req.body.id;
    const type = req.body.type;
    if (!id) {
        return res.status(400).send('Card is required');
    }
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        await request.query(`UPDATE dbo.${type} SET score = score - 1 WHERE id = '${id};'`); //Incriment score
        await request.query(`UPDATE dbo.${type} SET votes = votes + 1 WHERE id = '${id};'`); //Incriment votes
        await request.query(`INSERT INTO [dbo].[Log] (QueryType, CardID, VoteType, CreatedAt) VALUES ('Vote', NEWID(), -1, (getdate()))`); //Log vote
        res.send('Vote up recorded');
    } catch (err) {
        console.error('Error recording vote up:', err);
        res.status(500).send('Error recording vote up');
    } finally {
        sql.close(); // Close the connection
    }
    
});

//Generate card through python script
app.post('/runPython', async (req, res) => {

    const cardInfo = JSON.stringify(req.body); 
    //console.log(`RunPythonX: [${cardInfo}]`)
    
    const python = false;
    if (python) {
        const pythonProcess = spawn('python3', ['cardGeneration\\cardImage.py', cardInfo]);             //Spawn Child Process
        pythonProcess.stdout.on('data', (data) => {                                                     //Success Case
            res.send(data.toString());
        });

        pythonProcess.stderr.on('data', (data) => {                                                     //Error Case
            console.log(data.toString());
            console.error(`stderr: ${data}`);
            res.status(500).send(data.toString());
        });

        pythonProcess.on('close', (code) => {                                                           //Finally
            //console.log("Image Generated!");
        });
    }
    else {
        const path = require('path');
        const generateImage = require('./CardGeneration/generateImage');

        /*const data = {
            "id": "example-card",
            "name": "Example Card",
            "type": "Creature",
            "keywords": ["Flying", "Trample"],
            "text": "When this creature enters the battlefield, draw a card.",
            "flavorText": "Just an example.",
            "power": "3",
            "toughness": "4",
            "manaCost": "3RR"
        };*/

        const data = JSON.parse(cardInfo)
    
        // Ensure the output directory exists
        const outputDir = path.join(__dirname, 'public', 'cards');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
    
        const outputFilePath = path.join(outputDir, `${data.id}.png`);
        try {
            const resultPath = await generateImage(JSON.stringify(data), false, outputFilePath);
            //console.log(`Image generated at: ${resultPath}`);
            res.send("No errors! :)");

        } catch (error) {
            console.error('Error generating image:', error);
        }
    }
});

app.get('/cleanup', (req, res) => {
    const directoryPath = path.join(__dirname, 'public', 'cards');

    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading directory');
            return;
        }

        files.forEach(file => {
            if (path.extname(file).toLowerCase() === '.png') {
                const filePath = path.join(directoryPath, file);
                fs.unlink(filePath, err => {
                    if (err) {
                        console.error(`Error deleting file: ${filePath}`);
                    } else {
                        //console.log(`Deleted file: ${filePath}`);
                    }
                });
            }
        });

        res.send('Cleanup completed');
    });
});


//Route to handle the root URL
app.get('/', (req, res) => {
    res.send('Welcome to the Voting App');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

app.post('/generate', async (req, res) => {
    let prompt = req.body.prompt;
    let type = req.body.type;
    
    //console.log(prompt)
    //console.log(type)

    if (!prompt) {
        return res.status(400).send({ error: 'Prompt is required' });
    }

    prompt = prompt.replace("'","") //Cleaning Data

    const chatGPT = true;
    const huggingFace = false;

    if (chatGPT) {
        const apiKey = process.env.GPT_API_KEY;
        try {
            let query = 
            `Generate JSON for a Magic: The Gathering Card in the following format using plaintext. Add no other information.
            {"name": "Brotherhood Scribe",
            "manaCost": "{1}{W}",
            "type": "Creature Human Artificer",
            "subtypes": "Human, Artificer",
            "keywords": "Metalcraft",
            "text": "Card Text",
            "flavorText": "I'm a cool guy!",
            "power": "1",
            "toughness": "3",
            "rarity": "rare",
            "types": "Creature"} 
            Generate it with the following name: [${prompt}].
            Generate it with the following type: [${type}]`
            
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4o-mini', // or the model you are using
                    messages: [{ role: 'user', content: [query, prompt].join("") }],
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            let reply = response.data.choices[0].message.content; //Currently broken usually cause GPT keeps messing with me
            reply = reply.replace((/  |\r\n|\n|\r/gm),"");
            reply = reply.replace(/```json|```/g, '').trim();
            reply = reply.replace(/'/g, '');
            //console.log(reply)
            
            const cardJSON = JSON.parse(reply);
            

            await sql.connect(dbConfig);
            const sqlRequest = new sql.Request();
            const sqlResult = await sqlRequest.query(`INSERT INTO [dbo].[${type}] (name, manaCost, type, subtypes, keywords, text, flavorText, power, toughness, rarity, types, custom) OUTPUT inserted.id VALUES ('${cardJSON.name}', '${cardJSON.manaCost}', '${cardJSON.type}', '${cardJSON.subtypes}', '${cardJSON.keywords}', '${cardJSON.text}', '${cardJSON.flavorText}', '${cardJSON.power}', '${cardJSON.toughness}', '${cardJSON.rarity}', '${cardJSON.types}', (1))`);
            id = await sqlResult.recordset[0].id
            await sqlRequest.query(`INSERT INTO [dbo].[Log] (QueryType, CardID, VoteType, CreatedAt) VALUES ('Generate', '${id}', null, (getdate()))`);
            
            cardJSON["id"] = id;
            //console.log("ID: ", cardJSON.id)
            res.send(cardJSON);
        } catch (error) {
            console.error('Error querying ChatGPT:', error);
            res.status(500).send({ error: 'Error querying ChatGPT' });
        }
    }

    else if (huggingFace) {
        const apiKey = process.env.HUG_API_KEY;
        try {
            let query = `${prompt}`; // Construct your query or input here
            console.log(`HuggingFace: Running prompt ${query}`)
            
            const response = await axios.post(
                'https://api-inference.huggingface.co/models/nightmarebleeds/Sparkcasterv3',
                {
                    inputs: query,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`, // Replace with your Hugging Face API token
                        'Content-Type': 'application/json',
                    },
                }
            );
    
            let reply = response.data[0].generated_text; // Access the generated text from the response
            reply = reply.replace((/  |\r\n|\n|\r/gm), "");
            reply = reply.replace(/```json|```/g, '').trim();
            reply = reply.replace(/'/g, '');
            console.log(reply);
            
            const cardJSON = JSON.parse(reply);
    
            await sql.connect(dbConfig);
            const sqlRequest = new sql.Request();
            const sqlResult = await sqlRequest.query(`INSERT INTO [dbo].[${type}] (name, manaCost, type, subtypes, keywords, text, flavorText, power, toughness, rarity, types, custom) OUTPUT inserted.id VALUES ('${cardJSON.name}', '${cardJSON.manaCost}', '${cardJSON.type}', '${cardJSON.subtypes}', '${cardJSON.keywords}', '${cardJSON.text}', '${cardJSON.flavorText}', '${cardJSON.power}', '${cardJSON.toughness}', '${cardJSON.rarity}', '${cardJSON.types}', (1))`);
            id = await sqlResult.recordset[0].id;
            await sqlRequest.query(`INSERT INTO [dbo].[Log] (QueryType, CardID, VoteType, CreatedAt) VALUES ('Generate', '${id}', null, (getdate()))`);
            
            cardJSON["id"] = id;
            console.log("ID: ", cardJSON.id);
            res.send(cardJSON);
        } catch (error) {
            console.error('Error querying Huggingface:', error);
            res.status(500).send({ error: 'Error querying Huggingface' });
        }
    }
    

});