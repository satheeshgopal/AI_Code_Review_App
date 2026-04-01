const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Replace with your GitHub App secrets
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

// --- Serve static files ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Homepage Endpoint ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- OAuth Callback ---
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;

  try {
    // Exchange code for access token
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = response.data.access_token;
    res.send(`OAuth success! Access token: ${accessToken}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('OAuth error');
  }
});

// --- Webhook Handler ---
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);

  // Verify signature
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  if (signature !== digest) {
    return res.status(401).send('Invalid signature');
  }

  // Handle event
  const event = req.headers['x-github-event'];
  console.log(`Received event: ${event}`, req.body);

  res.status(200).send('Webhook received');
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
