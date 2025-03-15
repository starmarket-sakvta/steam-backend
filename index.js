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
                return res.status(500).send('Authentication failed');
            }
            res.redirect(authUrl);
        }
    );
});

// Callback Route - Store Steam ID and Cookies
app.get('/callback', (req, res) => {
    relyingParty.verifyAssertion(req, async (error, result) => {
        if (error || !result.authenticated) {
            return res.status(500).send('Verification failed');
        }

        const steamId = result.claimedIdentifier.split('/').pop();
        
        // Store Steam ID in session
        req.session.steamId = steamId;

        // Fetch Steam session cookies (workaround)
        try {
            const steamResponse = await axios.get(`https://steamcommunity.com/profiles/${steamId}`, { withCredentials: true });
            req.session.steamCookies = steamResponse.headers['set-cookie'];  // Store session cookies
        } catch (err) {
            return res.status(500).send('Failed to get session cookies');
        }

        res.redirect('/inventory');
    });
});

// Private Inventory Route
app.get('/inventory', async (req, res) => {
    if (!req.session.steamId || !req.session.steamCookies) {
        return res.status(401).json({ error: "Not logged in" });
    }

    try {
        const inventoryUrl = `https://steamcommunity.com/inventory/${req.session.steamId}/730/2?l=english&count=1000`;
        const response = await axios.get(inventoryUrl, {
            headers: { Cookie: req.session.steamCookies },
        });

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch inventory" });
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.send('Logged out');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
