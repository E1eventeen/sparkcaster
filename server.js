require('dotenv').config();
const express = require('express');
const { spawn } = require('child_process');
const sql = require('mssql');

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
    const { id } = req.body;
    if (!id) {
        return res.status(400).send('Card is required');
    }
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        await request.query(`UPDATE dbo.Artifact SET score = score + 1 WHERE id = '${id};'`); //Incriment score
        await request.query(`UPDATE dbo.Artifact SET votes = votes + 1 WHERE id = '${id};'`); //Incriment votes
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
    const { id } = req.body;
    if (!id) {
        return res.status(400).send('Card is required');
    }
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        await request.query(`UPDATE dbo.Artifact SET score = score - 1 WHERE id = '${id};'`); //Incriment score
        await request.query(`UPDATE dbo.Artifact SET votes = votes + 1 WHERE id = '${id};'`); //Incriment votes
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
    //console.log("Python Server:", cardInfo);
    
    const pythonProcess = spawn('python3', ['cardGeneration\\cardImage.py', cardInfo]);

    pythonProcess.stdout.on('data', (data) => {
        res.send(data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
        console.log(data.toString());
        console.error(`stderr: ${data}`);
        res.status(500).send(data.toString());
    });

    pythonProcess.on('close', (code) => {
        //console.log("Image Generated!");
    });
});

//Route to handle the root URL
app.get('/', (req, res) => {
    res.send('Welcome to the Voting App');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
