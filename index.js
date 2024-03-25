const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const mysql = require('mysql');

const app = express();
const port = process.env.PORT || 3000;

app.use(cookieParser());

const con = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
  
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
    // con.query("CREATE DATABASE mydb", function (err, result) {
    //   if (err) throw err;
    //   console.log("Database created");
    // });
    // var sql = "CREATE TABLE users (name VARCHAR(255), password VARCHAR(255))";
    // con.query(sql, function (err, result) {
    //   if (err) throw err;
    //   console.log("Table created");
    // });
});
  

// Define the directory where your static files (like HTML, CSS, images) reside
const publicDirectoryPath = path.join(__dirname, 'public');

// Serve static files from the 'public' directory
app.use(express.static(publicDirectoryPath));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Define your endpoint to serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDirectoryPath, 'login.html'));
});

app.post('/signup',(req,res)=>{
    const {username,password1,password2} = req.body;
    console.log(`username: ${username}, password1: ${password1}, password2: ${password2}`);

    if(password1 != password2){
      res.status(401).json({ message: 'Passwords do not match' });
    }
    else{
      var sql = `INSERT INTO users (name, password) VALUES ('${username}', '${password1}')`;
      con.query(sql, function (err, result) {
        if (err) throw err;
        console.log("User added");
      });
      res.sendFile(path.join(publicDirectoryPath, 'login.html'));
    }

});

app.post('/auth',(req,res)=>{
    const {username,password} = req.body;
    console.log(`username: ${username}, password: ${password}`);

    var sql = `SELECT * FROM users WHERE name = '${username}' AND password = '${password}'`;
    con.query(sql, function (err, result) {
      if (err) throw err;
      console.log(result);
      if(result.length > 0){
        res.cookie('username', username, { maxAge: 900000, httpOnly: false });
        res.sendFile(path.join(publicDirectoryPath, 'upload.html'));
      }else{
        res.status(401).json({ message: 'Invalid credentials' });
      }
  })
});

// Start the server
app.listen(port, '0.0.0.0',() => {
  console.log(`Server is up on port ${port}`);
});


// auto edit 04:29:26
// auto edit 04:29:26