var express = require('express');
var bodyParser = require('body-parser');
var urlencoded = bodyParser.urlencoded({ extended: false });
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var users = [];
var connections = [];
const mysql = require('mysql');
const router = express.Router();


//creating a connection to database
const databaseConnection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "chattapplicationdb"
});

//connecting to database
databaseConnection.connect((err) => {
    if (err) {
        console.log("Database connection Error");
    }
    else {
        console.log("Connectted to Database Successfully!!");
    }
});

//listenning on port 3000
server.listen(process.env.PORT || '4000');
console.log('Running...............');


//receing requests and send replies from the index page
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
})

app.get('/login', function (req, res) {
    res.sendFile(__dirname + '/login.html');
})

app.get('/register', function (req, res) {
    res.sendFile(__dirname + '/register.html');
})

//handling requests for registering new user
app.post('/register', urlencoded, function (req, res) {
    let user = { FirstName: req.body.fname, LastName: req.body.lname, Email: req.body.email, userName: req.body.userName, password: req.body.pwd };
    let sql = 'INSERT INTO users SET ?'
    let query = databaseConnection.query(sql, user, (err, result) => {
        if (err) {
            res.sendFile(__dirname + '/register.html');
            console.log(err);
        }
        else {
            res.sendFile(__dirname + '/index.html');
        }
    });
})

//handling requests for user loging
app.post('/login', urlencoded, function (req, res) {
    //checking if the user exisists and all credentials maches
    let sql = 'SELECT *  FROM users WHERE  userName  = "' + req.body.userName + '"   AND password = "' + req.body.pwd + '"';
    let query = databaseConnection.query(sql, (err, result) => {
        if (err) {
            console.log("enable to identify the user");
            console.log(err);
        }
        else {
            console.log(result[0].userName);
            //return this page only if the user is successfully logged in
            res.sendFile(__dirname + '/chatRoom.html');

        }
    });

})


//accepting new client connection and add it to the list of connected client
io.sockets.on('connection', function (socket) {
    connections.push(socket);
    //display the number of connected users
    console.log('# of connected users is %s', connections.length);

    //feching all posts when the user is connected
    let sql = 'SELECT *  FROM messages';
    let query = databaseConnection.query(sql, (err, result) => {
        if (err) console.log("enable to fecht messages");
        else {
            console.log(result[0].content);

            io.sockets.emit('all messages', { msg: result });
        }
    });


    //disconnecting fromt the server
    socket.on('disconnect', function (data) {
        connections.splice(connections.indexOf(socket), 1);
        console.log('Remaining # of connected users is %s', connections.length);
    });

    //sending  and saving messages 
    socket.on('send message', function (data) {
        console.log(data);
        //sending messages to connected client
        io.sockets.emit('new message', { msg: data });

        //saving messages into database
        let message = { sender: 'Jeannette', content: data, timeStamp: new Date().toLocaleString() };
        let sql = 'INSERT INTO messages SET ?'
        let query = databaseConnection.query(sql, message, (err, result) => {
            if (err) {
                console.log("enable to save post");
            }
        });
    });
});