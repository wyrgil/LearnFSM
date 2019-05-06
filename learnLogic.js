/**
 * These are vaules associated with positioning of state representations in cyAnswer
 */
var selectedState;
var xPos;
var yPos;
var offsetX = 80;
var offsetY = 80;
var delta = 130;

/**
 * These two variables are the cytoscape models for question and answer
 */
var graphAnswer;
var paperAnswer;
var graphQuestion;

/**
 * This is all for cyAnswer
 */
var border = 2;
var borderActive = 4;

var nodeSize = 60;

var start;
var startLink = null;
var startState = null;
var startNode = null;

var finishStates = new Set();

var states;
var nodes;

var transitions = new Set();

var transitionSetFlag = false;

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

    graphAnswer = new joint.dia.Graph;

    paperAnswer = new joint.dia.Paper({
        el: $('#paperAnswer'),
        width: '100%',
        heigth: '60%',
        gridSize: 1,
        model: graphAnswer
    });

    states = new Set();
    nodes = new Set();

    paperAnswer.on('cell:pointerclick', function (node) {
        if (transitionSetFlag) {
            setTransition(node.model, lbl);
        }
        unhighlight();
        node.highlight();
        selectedState = node.model;

        finishButtonText();
    });

    start = new joint.shapes.fsa.StartState({
        position: {
            x: 10,
            y: 10
        }
    });
    graphAnswer.addCell(start);
}

function state(x, y, label) {
    var cell = new joint.shapes.fsa.State({
        id: label,
        position: {
            x: x,
            y: y
        },
        size: {
            width: nodeSize,
            height: nodeSize
        },
        attrs: {
            text: {
                text: label
            }
        }
    });
    graphAnswer.addCell(cell);
    return cell;
}

function link(source, target, label, vertices) {
    var cell = new joint.shapes.fsa.Arrow({
        source: {
            id: source.id
        },
        target: {
            id: target.id
        },
        labels: [{
            position: .5,
            attrs: {
                text: {
                    text: label || '',
                    'font-weight': 'bold'
                }
            }
        }],
        vertices: vertices || []
    });
    graphAnswer.addCell(cell);
    return cell;
}

function unhighlight() {
    if (graphAnswer.getCells().length > 0) {
        graphAnswer.getCells().forEach(element => {
            paperAnswer.findViewByModel(element).unhighlight();
        });
    }
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
            var node = state(xPos + offsetX, yPos + offsetY, stateName);
            graphAnswer.addCell(node);
            if (yPos == 0) {
                yPos += delta;
            } else {
                yPos -= delta;
                xPos += delta;
            }
            infoTextColor("Neuen Zustand " + stateName + " erfolgreich erstellt.", "green");
            states.add(stateName);
            nodes.add(node);
        }
    }
}

function makeStart() {
    startState = selectedState;
    if (startLink != null) {
        graphAnswer.removeCells(startLink);
    }
    startLink = link(start, selectedState);
}

function removeStart(state) {
    var node = graphAnswer.getElementById(state);
    node.style((styleUnselected));
}

function deleteState() {
    graphAnswer.removeCells(selectedState);
    states.delete(selectedState.id);
    nodes.delete(selectedState);
    selectedState = null;
}

function makeFinish() {
    if (finishStates.has(selectedState)) {
        finishStates.delete(selectedState);
        selectedState = new joint.shapes.fsa.State(selectedState);
    } else {
        finishStates.add(selectedState);
        selectedState = new joint.shapes.fsa.EndState(selectedState);
    }
    finishButtonText();
}

function newTransition(literal) {
    infoTextColor("Bitte auf das Ziel klicken", "black");
    transitionSetFlag = true;
    lbl = literal;
}

function setTransition(node, lbl) {
    var from = selectedState.id;
    var to = node.id;
    var newNeeded = true;
    if (graphAnswer.getLinks().length > 0) {
        graphAnswer.getLinks().forEach(linkId => {
            graphAnswer.getCells().forEach(graphCell => {
                if (linkId.id == graphCell.id && newNeeded) {
                    if (from == graphCell.source().id && to == graphCell.target().id) {
                        if (graphCell.attributes.labels[0].attrs.text.text.includes(lbl)) {
                            infoTextColor("Diese Transition existiert bereits.", "red");
                        } else {
                            graphCell.attributes.labels[0].attrs.text.text = ("0 , 1");
                            graphCell.attr('text/text', '0, 1');
                        }
                        newNeeded = false;
                    }
                }
            });
        });
    }
    if (newNeeded) {
        link(selectedState, node, lbl);
    }
    transitionSetFlag = false;
    lbl = null;
}

function finishButtonText() {
    if (finishStates.has(selectedState)) {
        document.getElementById("makeFinish").textContent = "Zielzustand entfernen";
    } else {
        document.getElementById("makeFinish").textContent = "Zum Zielzustand machen";
    }
}