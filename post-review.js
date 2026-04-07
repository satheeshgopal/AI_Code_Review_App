const axios = require('axios');
require('dotenv').config();

// --- Configuration ---
const GITHUB_TOKEN = 'your_personal_access_token';
const OWNER = 'repository_owner';
const REPO = 'repository_name';
const PULL_NUMBER = 1; 
const COMMIT_ID = 'latest_commit_sha'; // Required for line-specific comments

/**
 * Posts a Pull Request Review with multiple comments using Axios
 */
async function postPullRequestReview(url, data, config) {
    try {

        console.log('Sending review to GitHub...');
        console.log('url' + url);

        // 4. Execute POST request
        const response = await axios.post(url, data, config);

        console.log(`✨ Review submitted successfully! Status: ${response.status}`);
        console.log(`🔗 Review URL: ${response.data.html_url}`);

    } catch (error) {
        console.error('❌ Failed to post review:');
        if (error.response) {
            // Detailed error from GitHub API
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

module.exports = {
    postPullRequestReview
}