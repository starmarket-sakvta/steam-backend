const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const axios = require('axios');
const { RelyingParty } = require('openid');

const app = express();
const port = 3000;

// 🔹 Create Redis Client
const redisClient = createClient({
    username: 'default',
    password: 'qsL5DKvyrR1z1VKZ6oqH2eE0dnK5W5zV',
    socket: {
        host: 'redis-13747.c124.us-central1-1.gce.redns.redis-cloud.com',
        port: 13747
    }
});

// Handle Redis Errors
redisClient.on('error', err => console.log('Redis Client Error', err));

// Connect to Redis
redisClient.connect().then(() => console.log("✅ Connected to Redis"));

// 🔹 Configure Express Session with Redis
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: 'your-secret-key',  // Change this in production
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }  // Set to true if using HTTPS
}));

// 🔹 Steam OpenID Login
const relyingParty = new RelyingParty(
    'http://steam-backend-szpi.onrender.com/callback',
    null, true, false, []
);

// ✅ Login Route
app.get('/login', (req, res) => {
    relyingParty.authenticate(
        'https://steamcommunity.com/openid', false,
        (error, authUrl) => {
            if (error) return res.status(500).json({ error: 'Authentication failed' });
            res.redirect(authUrl);
        }
    );
});

// ✅ Callback Route (Stores Steam ID and Cookies in Redis)
app.get('/callback', async (req, res) => {
    relyingParty.verifyAssertion(req, async (error, result) => {
        if (error || !result.authenticated) return res.status(500).send('Verification failed');

        const steamId = result.claimedIdentifier.split('/').pop();
        req.session.steamId = steamId;

        try {
            const inventoryUrl = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=1`;
            const steamLoginResponse = await axios.get(inventoryUrl, { withCredentials: true });

            // 🔹 Store Cleaned Cookies in Redis
            const rawCookies = steamLoginResponse.headers['set-cookie'];
            if (rawCookies) {
                const filteredCookies = rawCookies.map(cookie => cookie.split(';')[0]).join('; ');
                req.session.steamCookies = filteredCookies;
                console.log("✅ Stored Steam Cookies:", req.session.steamCookies);
            } else {
                console.log("⚠️ No cookies received from Steam.");
            }
        } catch (error) {
            console.error("⚠️ Failed to fetch Steam cookies:", error.message);
        }

        res.send(`${steamId}`);
    });
});

// ✅ Inventory Route (Uses Redis Sessions)
app.get('/inventory', async (req, res) => {
    if (!req.session.steamId) return res.status(401).json({ error: "Not logged in" });

    console.log("🛠️ Fetching inventory for:", req.session.steamId);
    console.log("🔹 Sending Cookies:", req.session.steamCookies);

    try {
        const inventoryUrl = `https://steamcommunity.com/inventory/${req.session.steamId}/730/2?l=english&count=1000`;
        const response = await axios.get(inventoryUrl, {
            headers: {
                'Cookie': req.session.steamCookies,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
            },
            withCredentials: true,
        });

        console.log("✅ Inventory fetched successfully!");
        res.json(response.data);
    } catch (err) {
        console.error("⚠️ Inventory Fetch Error:", err.message);
        res.status(500).json({ error: "Failed to fetch inventory" });
    }
});

// ✅ Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
});

// Start the server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
