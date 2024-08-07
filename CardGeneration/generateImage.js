const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Constants for card generation
const TEXT_WIDTH = 40;
const LINE_HEIGHT = 35;

// Function to generate the card image
async function generateImage(data, hasImage, outputPath) {
    // Parse JSON data if it's a string
    if (typeof data === 'string') {
        data = JSON.parse(data);
    }

    // Default values if certain fields are not provided
    if (!data.name) data.name = "Card Name";
    if (!data.type) data.type = "Type Line";
    if (!data.keywords) data.keywords = [];
    if (!Array.isArray(data.keywords)) data.keywords = data.keywords.split(','); // Ensure keywords is an array
    if (!data.text) data.text = [];
    if (!Array.isArray(data.text)) data.text = data.text.split('\\n'); // Ensure text is an array
    if (!data.flavorText) data.flavorText = "Flavor Text";
    if (!data.power) data.power = 1;
    if (!data.toughness) data.toughness = 1;
    if (!data.imageDescription) data.imageDescription = "Abstract Art";

    // Handle mana cost parsing if provided as a string
    if (typeof data.manaCost === 'string') {
        let temp = data.manaCost;
        let numbers = temp.match(/\d+/g);
        let colorless = numbers ? parseInt(numbers[0]) : 0;

        data.manaCost = {
            red: (temp.match(/R/g) || []).length,
            blue: (temp.match(/U/g) || []).length,
            green: (temp.match(/G/g) || []).length,
            black: (temp.match(/B/g) || []).length,
            white: (temp.match(/W/g) || []).length,
            colorless: colorless
        };
    } else if (!data.manaCost || data.type === "Land") {
        data.manaCost = {
            red: 0,
            blue: 0,
            green: 0,
            black: 0,
            white: 0,
            colorless: 0
        };
    }

    // Load template image
    let tempColor = Math.floor(Math.random() * 10) + 1;
    let img = await loadImage(`CardGeneration/Templates/${tempColor}.png`);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Load card art
    if (hasImage) {
        // If custom image is provided, load it
        let customImg = await loadImage(data.customImagePath); // Assumes customImagePath is provided
        ctx.drawImage(customImg, 84, 163, 808, 593);
    } else {
        let foundTag = false;
        const cardTypes = ["Artifact", "Creature", "Enchantment", "Instant", "Sorcery"];
        for (let cardType of cardTypes) {
            if (data.type.includes(cardType)) {
                let src = path.join(__dirname, `CardArt/${cardType}/`, fs.readdirSync(path.join(__dirname, `CardArt/${cardType}/`)).sort(() => 0.5 - Math.random())[0]);
                let cardArt = await loadImage(src);
                ctx.drawImage(cardArt, 84, 163, 808, 593);
                foundTag = true;
                break;
            }
        }

        if (!foundTag) {
            let src = path.join(__dirname, 'Van.gogh.paintings/', fs.readdirSync(path.join(__dirname, 'Van.gogh.paintings/')).sort(() => 0.5 - Math.random())[0]);
            let cardArt = await loadImage(src);
            ctx.drawImage(cardArt, 84, 163, 808, 593);
        }
    }

    // Set font
    ctx.font = '42px sans';

    // Draw card name
    ctx.fillText(data.name, 96, 76);

    // Draw card type
    ctx.fillText(data.type, 96, 766);

    // Draw card power and toughness
    if (data.power !== "" && data.toughness !== "") {
        ctx.fillText(`${data.power}/${data.toughness}`, 773, 1212);
    }

    // Draw main body text
    ctx.font = '35px sans';
    let cursorY = 864;
    let keyWords = data.keywords.join(", ");

    let bodyTextSpace = [keyWords].concat(data.text);
    bodyTextSpace.forEach(line => {
        let sublines = line.split("\n");
        sublines.forEach(subline => {
            let words = subline.split(" ");
            let currentLine = "";
            words.forEach(word => {
                let testLine = currentLine + word + " ";
                let metrics = ctx.measureText(testLine);
                if (metrics.width > TEXT_WIDTH && currentLine !== "") {
                    ctx.fillText(currentLine, 104, cursorY);
                    currentLine = word + " ";
                    cursorY += LINE_HEIGHT;
                } else {
                    currentLine = testLine;
                }
            });
            ctx.fillText(currentLine, 104, cursorY);
            cursorY += LINE_HEIGHT;
        });
    });

    // Draw flavor text
    if (data.flavorText !== "") {
        ctx.font = '24px sans';
        let flavorTextLines = data.flavorText.split('\n');
        flavorTextLines.forEach(flavorText => {
            let line = '"' + flavorText + '"';
            let words = line.split(" ");
            let currentLine = "";
            words.forEach(word => {
                let testLine = currentLine + word + " ";
                let metrics = ctx.measureText(testLine);
                if (metrics.width > TEXT_WIDTH && currentLine !== "") {
                    ctx.fillText(currentLine, 104, cursorY);
                    currentLine = word + " ";
                    cursorY += LINE_HEIGHT;
                } else {
                    currentLine = testLine;
                }
            });
            ctx.fillText(currentLine, 104, cursorY);
            cursorY += LINE_HEIGHT;
        });
    }

    // Draw mana cost
    const manaIcons = {
        red: 'CardGeneration/icons/red.png',
        blue: 'CardGeneration/icons/blue.png',
        green: 'CardGeneration/icons/green.png',
        black: 'CardGeneration/icons/black.png',
        white: 'CardGeneration/icons/white.png',
        colorless: 'CardGeneration/icons/1.png'
    };

    let manaX = 750; // Starting X position for mana icons
    let manaY = 50;  // Y position for mana icons
    let manaTypes = ['red', 'blue', 'green', 'black', 'white', 'colorless'];

    for (let manaType of manaTypes) {
        if (data.manaCost[manaType] > 0 || (manaType === 'colorless' && data.manaCost.red === 0 && data.manaCost.blue === 0 && data.manaCost.green === 0 && data.manaCost.black === 0 && data.manaCost.white === 0)) {
            for (let i = 0; i < data.manaCost[manaType]; i++) {
                let manaImg = await loadImage(manaIcons[manaType]);
                ctx.drawImage(manaImg, manaX, manaY, 30, 30); // Adjust size as needed
                manaX -= 35; // Move to the left for the next icon
            }
        }
    }

    // Save the final image
    const out = fs.createWriteStream(outputPath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    await new Promise((resolve, reject) => {
        out.on('finish', resolve);
        out.on('error', reject);
    });

    return outputPath;
}

// Export the function for external use
module.exports = generateImage;
