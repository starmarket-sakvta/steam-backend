const express = require('express');
const { RelyingParty } = require('openid');

const app = express();
const port = 3000;

// Configure Relying Party
const relyingParty = new RelyingParty(
    'http://192.168.1.105:3000/callback', // Return URL
    null, // Realm (optional)
    true, // Use stateless verification
    false, // Strict mode
    [] // Extensions (optional)
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

// Callback Route
app.get('/callback', (req, res) => {
    relyingParty.verifyAssertion(req, (error, result) => {
        if (error || !result.authenticated) {
            return res.status(500).send('Verification failed');
        }

        const steamId = result.claimedIdentifier.split('/').pop();
        res.send(`Steam ID: ${steamId}`);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
