const express = require('express');
const session = require('express-session');
const { RelyingParty } = require('openid');
const SteamCommunity = require('steamcommunity');
const axios = require('axios');

const app = express();
const port = 3000;
const steam = new SteamCommunity();

// 🔹 Session Setup
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

// 🔹 Configure Steam OpenID Login
const relyingParty = new RelyingParty(
    'http://steam-backend-szpi.onrender.com/callback',
    null,
    true,
    false,
    []
);

// 🔹 Login Route
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

// 🔹 Callback Route (Store Steam Session)
app.get('/callback', (req, res) => {
    relyingParty.verifyAssertion(req, async (error, result) => {
        if (error || !result.authenticated) {
            return res.status(500).send('Verification failed');
        }

        const steamId = result.claimedIdentifier.split('/').pop();
        req.session.steamId = steamId;

        // ✅ Get session cookies
        steam.getSessionID((sessionID) => {
            req.session.sessionID = sessionID;

            steam.webLogOn((cookies) => {
                req.session.cookies = cookies; // ✅ Store cookies for authenticated requests
                res.send(`Logged in as ${steamId}`);
            });
        });
    });
});

// 🔹 Fetch Private Inventory Route
app.get('/inventory', async (req, res) => {
    if (!req.session.steamId || !req.session.cookies) {
        return res.status(401).json({ error: "Not authenticated. Log in first." });
    }

    const inventoryUrl = `https://steamcommunity.com/inventory/${req.session.steamId}/730/2?l=english&count=1000`;

    try {
        const response = await axios.get(inventoryUrl, {
            headers: { Cookie: req.session.cookies.join('; ') }
        });

        res.json(response.data);
    } catch (error) {
        console.error("❌ Failed to fetch inventory:", error.message);
        res.status(500).json({ error: "Failed to fetch inventory" });
    }
});

// 🔹 Start the Server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
