require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');

const inDevelopment = (!process.env.NODE_ENV || process.env.REACT_APP_ENV === 'development');

const app = express();

const path = './tokens.json';
const tokens = loadTokens();
var track_data = [];

function loadTokens() {
    if (!fs.existsSync(path))
        fs.writeFileSync(path, '{}');

    const data = fs.readFileSync(path, 'utf8');

    return JSON.parse(data);
}

function saveTokens(tokens) {
    if (fs.existsSync(path))
        fs.writeFileSync(path, JSON.stringify(tokens, null, 2));      
}

function updateToken(id, data) {
    tokens[id] = data;

    return saveTokens(tokens)
}

async function refreshToken(user) {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', tokens[user]?.refresh_token);
    params.append('client_id', process.env.SPOTIFY_API_CLIENT_ID);

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        updateToken(user, {
            refresh_token: response.data.refresh_token,
            access_token: response.data.access_token
        });

        return await getCurrentlyPlaying()
    } catch (e) {
        console.error(e.message);
        return { error: e.message }
    }
}

async function getCurrentlyPlaying(user) {
    try {
        const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${tokens[user]?.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401)
            return await refreshToken(user);

        if (response.status !== 200)
            return { error: response.data }

        return await response.data
    } catch (e) {
        console.error(e.message);
        return { error: e.message }
    }
}

app.use(cors());
app.use(express.json());

app.get('/login', (req, res) => {
    const url = inDevelopment ? 'http://localhost' : `${req.protocol}://${req.get('host')}`;

    const scope = 'user-read-currently-playing user-read-playback-state';
    const redirect_uri = `${url}/callback`;

    const query = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.SPOTIFY_API_CLIENT_ID,
        scope: scope,
        redirect_uri: redirect_uri
    });

    res.redirect(`https://accounts.spotify.com/authorize?${query}`);
});
app.get('/callback', async (req, res) => {
    const url = inDevelopment ? 'http://localhost' : `${req.protocol}://${req.get('host')}`;
    const basicAuth = Buffer.from(`${process.env.SPOTIFY_API_CLIENT_ID}:${process.env.SPOTIFY_API_CLIENT_SECRET}`).toString('base64');
    const code = req.query.code;

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', `${url}/callback`);

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', params, {
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const url = inDevelopment ? 'http://localhost:3000' : 'https://clovis-junior.github.io/music-player-overlay';

        const id = Date.now().toString();
        updateToken(id, {
            refresh_token: response.data.refresh_token,
            access_token: response.data.access_token
        });

        res.redirect(`${url}/?spotifyToken=${id}`);
    } catch (e) {
        console.error(e.message);
        res.status(401).json({ error: e.message });
    }
});
app.get('/player', async (req, res) => {
    try {
        const data = await getCurrentlyPlaying(req.get('user_token'));

        res.json(data);
    } catch (e) {
        console.error(e.message);
        res.status(404).json({ error: e.message })
    }
});

app.listen(80, () => {
    console.debug(`Spotify API Web listening at port 80`);
});