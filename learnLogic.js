var seletedState;
var xPos;
var yPos;
var cyAnswer;
var cyQuestion;

var startState;

var states;

function onLoad() {
    xPos = 20;

    yPos = 20;

    cyAnswer = cytoscape({
        container: document.getElementById("cy-answer")
    })

    cyQuestion = cytoscape({
        container: document.getElementById("cy-question")
    })

    states = new Set();
}



function infoText(txt) {
    document.getElementById("infobox").innerHTML = txt;
}

function infoTextColor(txt, col) {
    infoText(txt);
    document.getElementById("infobox").style.color = col;
}

function newState() {
    var stateName = prompt("Wie soll der Zustand heißen?");
    if (stateName == null || stateName == "") {
        infoText("Neuen Zustand erstellen abgebrochen.");
    } else {
        if (states.has(stateName)) {
            infoTextColor("Ein Zustand mit diesem Namen existiert bereits", "red");
        } else {
            cyAnswer.add({
                group: 'nodes',
                data: {
                    id: stateName
                },
                position: {
                    x: xPos,
                    y: yPos
                }
            });
            if (xPos == yPos) {
                xPos += 20;
            } else {
                yPos += 20;
            }
            infoTextColor("Neuen Zustand " + stateName + " erfolgreich erstellt.", "green");
            states.add(stateName);
        }
    }
}

function makeStart(){
    removeStart(startState);
    startState = seletedState;
    //TODO: draw circle around
}

function removeStart(state){
    //TODO: remove circle around
}