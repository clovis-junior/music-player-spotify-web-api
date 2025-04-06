require('dotenv').config();

const express = require('express');
const qs = require('querystring');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const { SPOTIFY_API_CLIENT_ID, SPOTIFY_API_CLIENT_SECRET } = process.env;

var refresh_token, access_token;

app.get('/current-song', async (req, res) => {
    try {
        const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (e) {
        console.error(e.message);
        res.status(401).json({ error: e.message })
    }
});

app.get('/callback', async (req, res) => {
    const uri = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    try {
        const response = await axios.get('https://accounts.spotify.com/api/token',
            qs.stringify({
                'grant_type': 'authorization_code',
                'code': req.query.code,
                'redirect_uri': uri,
                'client_id': SPOTIFY_API_CLIENT_ID,
                'client_secret': SPOTIFY_API_CLIENT_SECRET
            }), {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${SPOTIFY_API_CLIENT_ID}:${SPOTIFY_API_CLIENT_SECRET}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        res.json(response.data)
    } catch (e) {
        console.error(e.message);
        res.status(401).json({ error: e.message })
    }
}),
    app.get('/refresh-token', async (req, res) => {
        try {
            const response = await axios.get('https://accounts.spotify.com/api/token',
                qs.stringify({
                    'grant_type': 'refresh_token',
                    'refresh_token': refresh_token,
                    'client_id': SPOTIFY_API_CLIENT_ID
                }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            // refresh_token = response.data.refresh_token;
            access_token = response.data.access_token;

            res.status(200)
        } catch (e) {
            console.error(e.message);
            res.status(401).json({ error: e.message })
        }
    });

app.listen(port, () => {
    console.debug(`Spotify API Web listening at http://localhost:${port}`);
})