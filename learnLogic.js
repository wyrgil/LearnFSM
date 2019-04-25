var selectedState;
var xPos;
var yPos;
var offsetX = 80;
var offsetY = 80;
var delta = 130;
var cyAnswer;
var cyQuestion;

var border = 2;
var borderActive = 4;

var nodeSize = 60;

var startState = null;
var startNode = null;

var finishStates = new Set();

var states;

var styleUnselected = {
    'text-valign': 'center',
    'text-halign': 'center',
    'width': nodeSize,
    'height': nodeSize,
    'background-color': '#ffffff',
    'border-width': border,
    'border-color': 'black'
};

var styleSelected = {
    'text-valign': 'center',
    'text-halign': 'center',
    'width': nodeSize,
    'height': nodeSize,
    'background-color': '#ffffff',
    'border-width': borderActive,
    'border-color': 'black'
};

var styleFinish = {
    'text-valign': 'center',
    'text-halign': 'center',
    'width': nodeSize,
    'height': nodeSize,
    'background-color': 'yellow',
    'border-width': border,
    'border-color': 'black'
};

var styleFinishSelected = {
    'text-valign': 'center',
    'text-halign': 'center',
    'width': nodeSize,
    'height': nodeSize,
    'background-color': 'yellow',
    'border-width': borderActive,
    'border-color': 'black'
};

var styleStart = {
    'text-valign': 'center',
    'text-halign': 'center',
    'width': nodeSize,
    'height': nodeSize,
    'background-color': 'white',
    'border-width': border,
    'border-color': 'green'
};

var styleStartSelected = {
    'text-valign': 'center',
    'text-halign': 'center',
    'width': nodeSize,
    'height': nodeSize,
    'background-color': 'white',
    'border-width': borderActive,
    'border-color': 'green'
};

var styleStartAndFinish = {
    'text-valign': 'center',
    'text-halign': 'center',
    'width': nodeSize,
    'height': nodeSize,
    'background-color': 'yellow',
    'border-width': border,
    'border-color': 'green'
};

var styleStartAndFinishSelected = {
    'text-valign': 'center',
    'text-halign': 'center',
    'width': nodeSize,
    'height': nodeSize,
    'background-color': 'yellow',
    'border-width': borderActive,
    'border-color': 'green'
};

function getStyle(selected, start, finish) {
    var sel = selected ? borderActive : border;
    var sta = start ? 'green' : 'black';
    var fin = finish ? 'yellow' : 'white';

    return {
        'text-valign': 'center',
        'text-halign': 'center',
        'width': nodeSize,
        'height': nodeSize,
        'background-color': fin,
        'border-width': sel,
        'border-color': sta
    }
}

function onLoad() {
    xPos = 0;

    yPos = 0;

    cyAnswer = cytoscape({
        container: document.getElementById("cy-answer"),

        style: cytoscape.stylesheet()
            .selector('node')
            .style({
                'content': 'data(id)'
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

    cyAnswer.on('tap', 'node', function (evt) {
        var node = evt.target;
        selectState(node);
    })

    cyAnswer.zoom(2);
}

function selectState(node) {
    states.forEach(state => {
        var node = cyAnswer.getElementById(state);
        node.style(getStyle((state == selectedState), (state == startState), (finishStates.has(state))));
        /*if (!(startState == state)) {
            if (!(finishStates.has(state))) {
                node.style(styleUnselected);
            } else {
                node.style(styleFinish);
            }
        } else {
            if (!(finishStates.has(state))) {
                node.style(styleStart);
            } else {
                node.style(styleStartAndFinish);
            }
        }*/
    });
    var id = node.id();
    node.style(getStyle((id == selectedState), (id == startState), (id == finishStates)));
    /*if (!(startState == id)) {
        if (!(finishStates.has(id))) {
            node.style(styleSelected);
        } else {
            node.style(styleFinishSelected);
        }
    } else {
        if (!(finishStates.has(id))) {
            node.style(styleStartSelected);
        } else {
            node.style(styleStartAndFinishSelected);
        }
    }*/
    if (finishStates.has(id)) {
        document.getElementById("makeFinish").textContent = "Zielzustand entfernen";
    } else {
        document.getElementById("makeFinish").textContent = "Zum Zielzustand machen";
    }
    selectedState = node.id();
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
                yPos += delta;
            } else {
                yPos -= delta;
                xPos += delta;
            }
            infoTextColor("Neuen Zustand " + stateName + " erfolgreich erstellt.", "green");
            states.add(stateName);
            var node = cyAnswer.getElementById(stateName);
            selectState(node);
        }
    }
}

function makeStart() {
    removeStart(startState);
    startState = selectedState;
    var node = cyAnswer.getElementById(startState);
    node.style(styleStartSelected);
    selectState(node);
}

function removeStart(state) {
    var node = cyAnswer.getElementById(state);
    node.style((styleUnselected));
}

function deleteState() {
    cyAnswer.remove(selectedState);
    states.delete(selectedState);
    selectState(null);
}

function makeFinish() {
    var node = cyAnswer.getElementById(selectedState);
    if (finishStates.has(selectedState)) {
        node.style(styleSelected);
        finishStates.delete(selectedState);
    } else {
        node.style(styleFinishSelected);
        finishStates.add(selectedState);
    }
    selectState(node);
}