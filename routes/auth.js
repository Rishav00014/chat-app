const express = require('express');
const passport = require('passport');
const User = require('../models/user');
const Message = require('../models/message');
const router = express.Router();

router.get('/login', (req, res) => {
    res.render('login');
});


router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            return res.render('login', { error: 'Incorrect email or password.' });
        }
        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.redirect('/');
        });
    })(req, res, next);
});


router.get('/signup', (req, res) => {
    res.render('signup');
});

router.post('/signup', async (req, res) => {
    const newUser = new User({
        email: req.body.email,
        password: req.body.password
    });

    try {
        await newUser.save();
        res.redirect('/login');
    } catch (err) {
        console.error("Error during signup:", err);
        res.render('signup', { error: 'Signup failed.' });
    }
});


router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.redirect('/login');
    });
});



router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        // Fetch all users except the currently logged-in user
        const users = await User.find({ _id: { $ne: req.user.id } });
        res.render('dashboard', { user: req.user, users: users });
    } catch (err) {
        console.error("Error fetching users:", err);
        res.redirect('/login');
    }
});

// Middleware to ensure user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/login');
    }
}

router.get('/chat/:userId', ensureAuthenticated, async (req, res) => {
    try {
        const otherUser = await User.findById(req.params.userId);
        const messages = await Message.find({
            $or: [
                { senderID: req.user._id, receiverID: req.params.userId },
                { senderID: req.params.userId, receiverID: req.user._id }
            ]
        }).sort('timestamp');
        res.render('chat', { user: req.user, otherUser: otherUser, messages: messages });
    } catch (err) {
        console.error("Error fetching user for chat:", err);
        res.redirect('/dashboard');
    }
});



module.exports = router;
