const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
const { getInstallationToken } = require('./github-auth');
const { getReviewComments } = require("./gemini-model");
const { postPullRequestReview } = require("./post-review")

const app = express();
app.use(bodyParser.json());

// GitHub App secrets
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
app.post('/webhook', async (req, res) => {
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

  if(req.body.action== "opened")
  {
    const installationId = process.env.GITHUB_INSTALLATION_ID; // set this in .env
    const token = await getInstallationToken(installationId);
    doCodeReview(token, req.body.number);
  }  

  res.status(200).send('Webhook received');
});

//
app.get('/test-auth', async (req, res) => {
  try {
    const installationId = process.env.GITHUB_INSTALLATION_ID; // set this in .env
    const token = await getInstallationToken(installationId);

    res.send(`Installation token: ${token}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/code-review', async (req, res) => {
  pullRequest = req.query.pull;
  token = req.query.token;

  await doCodeReview(token, pullRequest);
  res.status(200).send('Code review completed');
  });


  async function doCodeReview(token, pullRequest)
  {
    const response1 = await axios.get(`https://api.github.com/repos/satheeshgopal/sample2express/pulls/${pullRequest}/commits`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json'
    }
  });

  const sha = response1.data[0].sha;
  console.log("sha" + sha);

  const response = await axios.get(`https://api.github.com/repos/satheeshgopal/sample2express/commits/${sha}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json'
    }
  });

  //console.log(response.data);
  const { commit, files } = response.data;

  console.log(`Commit Message: ${commit?.message}`);
  console.log(`Total Files Changed: ${files?.length}`);

  // Iterate through each changed file
  files.forEach(file => {
    console.log(`\nFile: ${file.filename}`);
    console.log(`Status: ${file.status} (+${file.additions}, -${file.deletions})`);

    // The 'patch' field contains the actual diff (code changes)
    if (file.patch) {
      console.log("Changes:");
      console.log(file.patch);
    } else {
      console.log("No patch available (possibly a large or binary file).");
    }
  });

  //const reviewComments = await getReviewComments(files[0].patch);

  //console.log(reviewComments);

  const reviewComments = '```json\n' +
    '[\n' +
    '  {\n' +
    '    "line": 10,\n' +
    '    "body": "The `path` module is used here but it is not defined in this snippet. Ensure you have added `const path = require(\'path\');` at the top of your file, otherwise this will throw a `ReferenceError`."\n' +
    '  },\n' +
    '  {\n' +
    '    "line": 21,\n' +
    '    "body": "Avoid leaving the file without a trailing newline. It is a standard practice (POSIX) to end files with a newline to ensure compatibility with various Unix tools and to avoid messy diffs in the future."\n' +
    '  }\n' +
    ']\n' +
    '```';

  // 1. Extract and parse the JSON content
  const jsonString = reviewComments.replace(/```json|```/g, '').trim();
  const feedbackArray = JSON.parse(jsonString);

  // 2. Map the feedback into GitHub's Review Comment format
  // Note: 'path' is required for each comment in a review
  const comments = feedbackArray.map(item => ({
    path: files[0].filename, // Replace with the actual file path
    line: item.line,
    body: item.body,
    side: 'RIGHT'
  }));

  const data = {
    commit_id: sha,
    event: 'COMMENT', // Can be 'APPROVE', 'REQUEST_CHANGES', or 'COMMENT'
    body: 'Automated code review feedback.',
    comments: comments
  };

  const config = {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10'
    }
  };

  postPullRequestReview("https://api.github.com/repos/satheeshgopal/sample2express/pulls/8/reviews", data, config);

  }



// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
