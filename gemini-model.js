const OpenAI = require('openai');
require('dotenv').config();

const geminiApiKey = process.env.GEMINI_API_KEY;

const openai = new OpenAI({
    apiKey: geminiApiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

async function getReviewComments(data) {
const response = await openai.chat.completions.create({
    model: "gemini-3-flash-preview",
    messages: [
        {   role: "system",
            content: "code review assistant, gives review comments for PR patch in github api inline review comment input format" 
        },
        {
            role: "user",
            content: data,
        },
    ],
});
//console.log(response.choices[0].message);

return response.choices[0].message.content;
}

module.exports = {
 getReviewComments
};

