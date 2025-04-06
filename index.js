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

async function refreshToken() {
    try {
        const response = await axios.get('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token,
                'client_id': SPOTIFY_API_CLIENT_ID
            }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        // refresh_token = response.data.refresh_token;
        access_token = response.data.access_token;

        return await getCurrentSong()
    } catch (e) {
        console.error(e.message);
        res.status(401).json({ error: e.message })
    }
}

async function getCurrentSong() {
    try {
        const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401)
            return await refreshToken();

        res.json(response.data);
    } catch (e) {
        console.error(e.message);
        res.status(401).json({ error: e.message })
    }
}

app.get('/current-song', async (req, res) => {
    try {
        const data = await getCurrentSong();

        res.json(data);
    } catch (e) {
        console.error(e.message);
        res.status(404).json({ error: e.message })
    }
});
app.get('/callback', async (req, res) => {
    const uri = 'https://clovis-junior.github.io/music-player-overlay/';
    const basicAuth = Buffer.from(`${SPOTIFY_API_CLIENT_ID}:${SPOTIFY_API_CLIENT_SECRET}`).toString('base64');

    try {
        const response = await axios.get('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                'grant_type': 'authorization_code',
                'code': req.query.code,
                'redirect_uri': uri,
                'client_id': SPOTIFY_API_CLIENT_ID,
                'client_secret': SPOTIFY_API_CLIENT_SECRET
            }), {
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        refresh_token = response.data.refresh_token;
        access_token = response.data.access_token;

        res.status(200).redirect(`${uri}spotifyToken=${refresh_token}`)
    } catch (e) {
        console.error(e.message);
        res.status(401).json({ error: e.message })
    }
});

app.listen(port, () => {
    console.debug(`Spotify API Web listening at http://localhost:${port}`);
})