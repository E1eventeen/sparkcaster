require('dotenv').config();
const express = require('express');
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

// Route to vote up (POST request)
app.post('/vote/up', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).send('Username is required');
    }
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        await request.query(`INSERT INTO Votes (VoteType, Username) VALUES ('up', '${username}')`);
        res.send('Vote up recorded');
    } catch (err) {
        console.error('Error recording vote up:', err);
        res.status(500).send('Error recording vote up');
    } finally {
        sql.close(); // Close the connection
    }
});

// Route to vote down (POST request)
app.post('/vote/down', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).send('Username is required');
    }
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        await request.query(`INSERT INTO Votes (VoteType, Username) VALUES ('down', '${username}')`);
        res.send('Vote down recorded');
    } catch (err) {
        console.error('Error recording vote down:', err);
        res.status(500).send('Error recording vote down');
    } finally {
        sql.close(); // Close the connection
    }
});

//Route to get minimum voted card - TODO: Add other tables
app.get('/newCard', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        const result = await request.query(`EXECUTE newCard`);
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

//Vote based on ID value
app.post('/upvote', async (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).send('Card is required');
    }
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        await request.query(`UPDATE dbo.Artifact SET score = score + 1 WHERE id = '${id};'`);
        await request.query(`UPDATE dbo.Artifact SET votes = votes + 1 WHERE id = '${id};'`);
        res.send('Vote up recorded');
    } catch (err) {
        console.error('Error recording vote up:', err);
        res.status(500).send('Error recording vote up');
    } finally {
        sql.close(); // Close the connection
    }
});

// Add a route to handle the root URL
app.get('/', (req, res) => {
    res.send('Welcome to the Voting App');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
