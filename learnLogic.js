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

var startState = null;
var startNode = null;

var finishStates = new Set();

var states;

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

    paperAnswer.on('cell:pointerclick', function(node){
        selectState(node);
    });
    // graphAnswer.on('tap', 'node', function (evt) {
    //     var node = evt.target;
    //     selectState(node);
    // });

    var start = new joint.shapes.fsa.StartState({
        position: {x: 10, y: 10}
    });
    graphAnswer.addCell(start);
}

function state(x, y, label){
    var cell = new joint.shapes.fsa.State({
        position: {x: x, y: y},
        size: {width: nodeSize, height: nodeSize},
        attrs: { text: {text: label}}
    });
    graphAnswer.addCell(cell);
    return cell;
}

function link(source, target, label, vertices){
    var cell = new joint.shapes.fsa.Arrow({
        source: {id: source.id},
        target: {id: target.id},
        labels: [{position: .5, attrs: { text: { text: label || '', 'font-weight': 'bold'}}}],
        vertices: vertices || []
    });
    graphAnswer.addCell(cell);
    return cell;
}



function selectState(node) {
    states.forEach(state => {
        var node = graphAnswer.getElementById(state);
        node.style(getStyle((state == selectedState), (state == startState), (finishStates.has(state))));
    });
    var id = node.id();
    node.style(getStyle((id == selectedState), (id == startState), (id == finishStates)));
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
            selectState(node);
        }
    }
}

function makeStart() {
    removeStart(startState);
    startState = selectedState;
    var node = graphAnswer.getElementById(startState);
    node.style(styleStartSelected);
    selectState(node);
}

function removeStart(state) {
    var node = graphAnswer.getElementById(state);
    node.style((styleUnselected));
}

function deleteState() {
    graphAnswer.remove(selectedState);
    states.delete(selectedState);
    selectState(null);
}

function makeFinish() {
    var node = graphAnswer.getElementById(selectedState);
    if (finishStates.has(selectedState)) {
        node.style(styleSelected);
        finishStates.delete(selectedState);
    } else {
        node.style(styleFinishSelected);
        finishStates.add(selectedState);
    }
    selectState(node);
}

function newTransition(literal) {
    var fromState = selectedState;
    infoTextColor("Bitte auf das Ziel klicken");
    transitionSetFlag = true;
    var timeAtStart = new Date().getTime();
    var tooMuchTimePassed = false;
    while (transitionSetFlag) {
        if (new Date().getTime() - 30000 <= timeAtStart) {
            if (selectState != fromState) {
                transitionSetFlag = false;
            } else {
               // await sleep(500);
            }
        }else{
            transitionSetFlag = false;
            tooMuchTimePassed = true;
        }
    }
    if(tooMuchTimePassed){
        infoTextColor("Das hat zu lange gedauert", "red");
    }else{
        graphAnswer.add({
            group: 'edges',
            data: {
                source: fromState,
                target: selectedState,
                label: literal
            }
        });
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}