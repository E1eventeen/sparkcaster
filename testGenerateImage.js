const fs = require('fs');
const path = require('path');
const generateImage = require('./generateImage');

// Sample card data
const sampleData = {
    name: "Test Card",
    type: "Creature",
    keywords: ["Flying", "Trample"],
    text: ["This is a test card for demonstrating image generation.", "It has multiple lines of text."],
    flavorText: "A taste of something new.",
    power: 3,
    toughness: 3,
    manaCost: "{2}{G}{G}",
    imageDescription: "A sample card image"
};

// Path to save the generated image
const outputPath = path.join(__dirname, 'output', 'testCard.png');

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Generate image
generateImage(sampleData, false, outputPath)
    .then(output => {
        console.log(`Image successfully generated at: ${output}`);
    })
    .catch(error => {
        console.error('Error generating image:', error);
    });
