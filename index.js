const express = require('express');
const session = require('express-session');
const axios = require('axios');
const { RelyingParty } = require('openid');

const app = express();
const port = 3000;

// Configure session middleware
app.use(session({
    secret: 'your-secret-key',  // Change this in production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true if using HTTPS
}));

// Configure Relying Party (Steam OpenID)
const relyingParty = new RelyingParty(
    'http://steam-backend-szpi.onrender.com/callback',  // Change this in production
    null,
    true,
    false,
    []
);

// Login Route
app.get('/login', (req, res) => {
    relyingParty.authenticate(
        'https://steamcommunity.com/openid',
        false,
        (error, authUrl) => {
            if (error) {
                return res.status(500).json({ error: 'Authentication failed' });
            }
            res.redirect(authUrl);
        }
    );
});

// Callback Route
app.get('/callback', (req, res) => {
    relyingParty.verifyAssertion(req, (error, result) => {
        if (error || !result.authenticated) {
            return res.status(500).send('Verification failed');
        }

        const steamId = result.claimedIdentifier.split('/').pop();
        res.send(`${steamId}`);
    });
});


// Private Inventory Route
app.get('/inventory', async (req, res) => {
    if (!req.session.steamId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    try {
        const inventoryUrl = `https://steamcommunity.com/inventory/${req.session.steamId}/730/2?l=english&count=1000`;
        const response = await axios.get(inventoryUrl, {
            headers: { Cookie: req.session.steamCookies || '' }, // Use session cookies if available
        });

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch inventory" });
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
