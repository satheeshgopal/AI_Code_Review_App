const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

// Load environment variables
const APP_ID = process.env.GITHUB_APP_ID; // Your GitHub App ID
console.log(APP_ID);        
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH;
console.log(PRIVATE_KEY_PATH); 
const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

/**
 * Generate a JWT for authenticating as the GitHub App
 */
function generateJWT() {
  return jwt.sign(
    { iss: APP_ID },
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn: '10m' // GitHub requires short-lived JWTs
    }
  );
}

/**
 * Exchange JWT for an installation access token
 * @param {string} installationId - The installation ID of your app
 */
async function getInstallationToken(installationId) {
  const jwtToken = generateJWT();

  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;

  const response = await axios.post(url, {}, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      Accept: 'application/vnd.github+json'
    }
  });

  return response.data.token;
}

module.exports = {
  generateJWT,
  getInstallationToken
};