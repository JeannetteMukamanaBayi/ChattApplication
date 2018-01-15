var express = require('express');

//handling post requests
var bodyParser = require('body-parser');
var urlencoded = bodyParser.urlencoded({ extended: false });
var app = express();

//setting  redndering dynamic web pages
app.set('view engine', 'ejs');

var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var users = [];
var connections = [];
const mysql = require('mysql');
const router = express.Router();
let mySocket = null ;

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

    //check if the user name already exist
    let sql = 'SELECT *  FROM users WHERE  userName  = "' + req.body.userName + '"';
    let query = databaseConnection.query(sql, (err, result) => {
        if (err) {
            console.log("enable to register the user");
            console.log(err);
        }

        if (result[0] != undefined) {
            console.log(req.body.userName + "Already exists");
            //sending back the registration form if the user already exists     
            res.sendFile(__dirname + '/register.html');
        }
        else {

            //adding the user into the databse if the users doen not already exists
            let user = { FirstName: req.body.fname, LastName: req.body.lname, Email: req.body.email, userName: req.body.userName, password: req.body.pwd };
            let sql = 'INSERT INTO users SET ?'
            let query = databaseConnection.query(sql, user, (err, result) => {
                if (err) {
                    res.sendFile(__dirname + '/register.html');
                    console.log(err);
                }

                //return the home page after user's successfull registration
                else {
                    res.sendFile(__dirname + '/index.html');
                }
            });
        }
    });
})

//handling requests for user loging
app.post('/login', urlencoded, function (req, res) {
    let userName = req.body.userName;
    //checking if the user exisists and all credentials maches
    let sql = 'SELECT *  FROM users WHERE  userName  = "' + req.body.userName + '"   AND password = "' + req.body.pwd + '"';
    let query = databaseConnection.query(sql, (err, result) => {
        //alert the user if credentials do not match

        if (err) {
            console.log("enable to identify the user");
            console.log(err);
        }
        //feching all messages after the user successfully logged in

       
        else {
            mySocket.emit('new user', userName); 
            let sql = 'SELECT *  FROM messages';
            let query = databaseConnection.query(sql, (err, result) => {
                if (err) console.log("enable to fecht messages");
                else {
                    var result2 = JSON.stringify(result);
                    res.render(__dirname + '/chatRoom', { userName: req.body.userName, oldMessages: result2 });

                }
            });

        }
    });

})

//accepting new client connection and add it to the list of connected client
io.sockets.on('connection', function (socket) {
    mySocket = socket;
    connections.push(socket);

    //display the number of connected users
    console.log('# of connected users is %s', connections.length);
    //disconnecting fromt the server
    socket.on('disconnect', function (data) {
        connections.splice(connections.indexOf(socket), 1);
        console.log('Remaining # of connected users is %s', connections.length);
        socket.emit('user left', data.userName); 
    });

    //sending  and saving messages 
    socket.on('send message', function (data) {

        //sending messages to connected client
        let timeStamp = new Date();
        io.sockets.emit('new message', { message: data, time: timeStamp.getDate() + "/" + timeStamp.getMonth() + 1 + "/" + timeStamp.getFullYear() + "   " + timeStamp.getHours() + ":" + timeStamp.getMinutes() });
        console.log("timeStamp.getFullYear()" + timeStamp.getDate());

        //saving messages into database
        let message = { sender: 'Jeannette', content: data, timeStamp: timeStamp.getDate() + "/" + timeStamp.getMonth() + 1 + "/" + timeStamp.getFullYear() + "   " + timeStamp.getHours() + ":" + timeStamp.getMinutes() };
        let sql = 'INSERT INTO messages SET ?'
        let query = databaseConnection.query(sql, message, (err, result) => {
            if (err) {
                console.log("enable to save post");
            }
        });
    });
});