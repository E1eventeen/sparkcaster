var id = "0";
var card = {};
var text = false;

function voteUp() {
    //console.log(card.types)
    if (id == "0") {
        alert('Invalid card voted on');
        return;
    }

    const type = card.types

    fetch('/upvote', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, type })
    })
    .then(response => response.text())
    .then(data => {
        console.log('Upvoted card with ID: ', id)
    })
    .catch(error => {
        console.error('Error voting up:', error);
        alert('Error voting up');
    });
    loadCard()
}

function voteDown() {
    if (id == "0") {
        alert('Invalid card voted on');
        return;
    }

    const type = card.types

    fetch('/downvote', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, type })
    })
    .then(response => response.text())
    .then(data => {
        console.log('Downvoted card with ID: ', id)
    })
    .catch(error => {
        console.error('Error voting up:', error);
        alert('Error voting up');
    });
    loadCard()
}

function getVotes() {
    fetch('/votes')
    .then(response => response.json())
    .then(data => {
        console.log('Vote counts:', data);
        let voteCounts = '';
        data.forEach(vote => {
            voteCounts += `${vote.VoteType}: ${vote.count}\n`;
        });
        alert(voteCounts);
    })
    .catch(error => {
        console.error('Error getting vote counts:', error);
        alert('Error getting vote counts');
    });
}

async function newCard() {
    cleanUp()
    try {
        const response = await fetch('/newCard')
        const data = await response.json()
        
        if (!data[0]) {
            throw new Error('No card data received');
        }

        card = data[0];
        id = data[0].id;
    }
    catch {
        console.log("Script.Js: Error in Newcard");
    }
}

function loading() {
    document.getElementById("new").disabled = true;
    document.getElementById("up").disabled = true;
    document.getElementById("down").disabled = true;
    document.getElementById("toggleText").disabled = true;

    document.getElementById("textBox").setAttribute("style", "display: none;");
    document.getElementById("imageBox").setAttribute("style", "display: none;");
    document.getElementById("loadingBox").setAttribute("style", "display: block;");
    text = !text;
}

async function loadCard(inputID) {

    loading()

    if (!inputID) {
        await newCard()
    }           
    
    //console.log("LoadCard: ", card);
    //console.log("String: ", JSON.stringify(card));

    const response2 = await fetch('/runPython', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(card)
    })
    
    .then(response => response.text())
    .then(data => {
        //console.log('Python script output:', data);
        if (data.toString().trim() !== "No errors! :)") {
            console.log(`Python Error: "${data.toString().trim()}"`)
            document.getElementById('cardImage').src = `blankCard.png`;
        }
        else {
            document.getElementById('cardImage').src = `cards/${card.id}.png`;
        }
    })
    .catch(error => {
        console.error('Error running Python script:', error);
    });

    document.getElementById("name").innerHTML = card.name;
    document.getElementById("mana").innerHTML = card.manaCost;
    document.getElementById("type").innerHTML = card.type;
    document.getElementById("subtypes").innerHTML = card.subtypes;
    document.getElementById("keywords").innerHTML = card.keywords;
    document.getElementById("text").innerHTML = card.text;
    document.getElementById("flavorText").innerHTML = card.flavorText;
    document.getElementById("power").innerHTML = card.power;
    document.getElementById("toughness").innerHTML = card.toughness;
    document.getElementById("rarity").innerHTML = card.rarity;
    document.getElementById("types").innerHTML = card.types;
    document.getElementById("score").innerHTML = card.score;
    document.getElementById("votes").innerHTML = card.votes;
    

    document.getElementById("new").disabled = false;
    document.getElementById("up").disabled = false;
    document.getElementById("down").disabled = false;
    document.getElementById("toggleText").disabled = false;

    document.getElementById("loadingBox").setAttribute("style", "display: none;");
    toggleText();
}

function toggleText() {
    if (text) {
        text = false;
        document.getElementById("toggleText").innerHTML = "Show Text";
        document.getElementById("imageBox").setAttribute("style", "display: block;");
        document.getElementById("textBox").setAttribute("style", "display: none;");
    }
    else {
        text = true;
        document.getElementById("toggleText").innerHTML = "Show Image";
        document.getElementById("textBox").setAttribute("style", "display: block;");
        document.getElementById("imageBox").setAttribute("style", "display: none;");
    }

}

function cleanUp() {
    const response = fetch('/cleanup')
}

async function generate() {

    loading()
    text = !text

    const prompt = document.getElementById('cname').value;
    const type = document.getElementById('selectType').value;
    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, type }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        card = data;
        id = card.id;
        await loadCard(id);
        
    } catch (error) {
        console.error('Error:', error);
    }
}