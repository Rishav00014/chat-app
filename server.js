const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const User = require('./models/user');
const authRoutes = require('./routes/auth');
const Message = require('./models/message');
const PORT = process.env.PORT || 3000;
const flash = require('connect-flash');



// MongoDB connection
mongoose.connect('mongodb+srv://nodejsDeepak:nodejsDeepak@cluster0.lnx1ekk.mongodb.net/WhatsAppDB?', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('Connected to MongoDB!');
});




// Middleware setup
app.set('view engine', 'ejs');
app.use(flash());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'whatsapp-clone-secret',
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(new LocalStrategy({ usernameField: 'email' },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ email: email });
            if (!user) {
                return done(null, false, { message: 'Incorrect email.' });
            }

            user.comparePassword(password, (err, isMatch) => {
                if (err) return done(err);
                if (isMatch) return done(null, user);
                else return done(null, false, { message: 'Incorrect password.' });
            });
        } catch (err) {
            return done(err);
        }
    }
));


passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

//socket
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When a message is received from a client
    socket.on('send_message', async (data) => {
        // Save the message to the database
        if (data.message && data.message.trim() !== '') {
            const newMessage = new Message({
                senderID: data.from,
                receiverID: data.to,
                content: data.message
            });
            try {
                await newMessage.save();
                // Broadcast the message to the other user
                socket.broadcast.to(data.to).emit('receive_message', {
                    message: data.message,
                    from: data.from
                });
            } catch (err) {
                console.error('Error saving message:', err);
            }
        }
    });

    // On disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
    // When a user logs in (or opens the chat), associate their user ID with this socket
    socket.on('login', (userId) => {
        socket.join(userId);
    });

});



// Routes
app.use('/', authRoutes);
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        // If user is authenticated, redirect to dashboard or chat page
        res.redirect('/dashboard');  // Assuming you'll have a dashboard route
    } else {
        // If user is not authenticated, redirect to login page
        res.redirect('/login');
    }
});


// Start the server
http.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
