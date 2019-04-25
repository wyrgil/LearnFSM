var seletedState;
var xPos;
var yPos;
var offsetX = 80;
var offsetY = 80;
var cyAnswer;
var cyQuestion;

var startState;

var states;

var styleUnselected = {
    'text-valign': 'center',
    'text-halign': 'center',
    'width': 60,
    'height': 60,
    'background-color': '#ffffff',
    'border-width': 1,
    'border-color': 'black'
};

var styleSelected = {
    'text-valign': 'center',
    'text-halign': 'center',
    'width': 60,
    'height': 60,
    'background-color': '#ffffff',
    'border-width': 3,
    'border-color': 'black'
};

function onLoad() {
    xPos = 0;

    yPos = 0;

    cyAnswer = cytoscape({
        container: document.getElementById("cy-answer"),

        style: cytoscape.stylesheet()
            .selector('node')
                .style({
                    'content': 'data(id)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'width': 60,
                    'height': 60,
                    'background-color': '#ffffff',
                    'border-width': 1,
                    'border-color': 'black'
                }),
        layout: {
            name: 'grid',
            rows: 2,
            cols: 2
        }
    });

    cyQuestion = cytoscape({
        container: document.getElementById("cy-question"),

        style: cytoscape.stylesheet()
            .selector('node')
                .style({
                    'content': 'data(id)'
                }),
        layout: {
            name: 'breadthfirst',
            directed: true,
            padding: 10
        }
    });

    states = new Set();

    cyAnswer.on('tap', 'node', function(evt){
        var node = evt.target;
        selectState(node);
    })
}

function selectState(node){
    states.forEach(state => {
        cyAnswer.getElementById(state).style(styleUnselected)
    });
    node.style(styleSelected);
    seletedState = node;
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
                    x: xPos + offsetX,
                    y: yPos + offsetY
                }
            });
            if (yPos == 0) {
                yPos += 200;
            } else {
                yPos -= 200;
                xPos += 200;
            }
            infoTextColor("Neuen Zustand " + stateName + " erfolgreich erstellt.", "green");
            states.add(stateName);
            var node = cyAnswer.getElementById(stateName);
            selectState(node);
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

function deleteState(){
    cyAnswer.remove(seletedState);
    states.delete(seletedState);
}