/**
 * These are vaules associated with positioning of state representations in cyAnswer.
 */
var selectedState;
var xPos;
var yPos;
var offsetX = 80;
var offsetY = 80;
var delta = 130;

/**
 * These two variables are the jointJS models for question and answer.
 */
var graphAnswer;
var paperAnswer;
var graphQuestion;
var paperQuestion;

/**
 * This is all for the answer part.
 */
var border = 2;
var borderActive = 4;

var nodeSize = 75;

var start;
var startLink = null;
var startState = null;
var startNode = null;

var finishStates = new Set();

var states;
var nodes;

var transitions = new Set();

var transitionSetFlag = false;

/**
 * These variables are for the question part
 */
var questionFSM;
var solutionFSM;

var selectedStateQuestion;

var pushToBottomSetFlag = false;

var topHints = 2.5;
var bottomHints = 2.5;
var hintCountTop;
var hintCountBottom;

/**
 * These are global help variables
 */
var helpCounter = 1;
var iterationSave = 0;


/**
 * These variables are needed for the minimize help
 */
var setSave;

var endSetSave;

var setsThatRemain;
var setsThatRemainIndices0;
var setsThatRemainIndices1;

/**
 * These variables are needed for the ndet help
 */
var targetStates = new Array();
var targetStatesOld = new Array();
var statesVisited = new Array();
var lastState;
var lastTargets = new Array();

/**
 * These variables are needed for the language help
 */
var hiddenState;
var hiddenIndex;
var savedStateSize;
var stateMap = new Map();
var hiddenTarget;
var stepSave;
var statesVisited = new Array();
var currentState;
var statesToVisit = new Array();

/**
 * This is used to highlight corresponding states in the other paper.
 */
var customHighlighter = {
    highlighter: {
        name: 'stroke',
        options: {
            padding: 10,
            rx: -5,
            ry: -5,
            attrs: {
                'stroke-width': 3,
                stroke: '#00FF0077'
            }
        }
    }
}

/**
 * This method is called by the browser after all DOM content is loaded.
 */
function onLoad() {
    xPos = 0;

    yPos = 0;

    /**
     * The JointJS graph instance for the answer part.
     */
    graphAnswer = new joint.dia.Graph;

    /**
     * The JointJS paper instance for the answer part.
     */
    paperAnswer = new joint.dia.Paper({
        el: $('#paperAnswer'),
        width: '100%',
        heigth: '50%',
        gridSize: 1,
        model: graphAnswer
    });

    /**
     * The JointJS graph instance for the question part.
     */
    graphQuestion = new joint.dia.Graph;

    /**
     * The JointJS paper instance for the question part.
     */
    paperQuestion = new joint.dia.Paper({
        el: $('#paperQuestion'),
        width: '100%',
        heigth: '30%',
        gridSize: 1,
        model: graphQuestion,
        interactive: function (cellView, method) {
            return;
        }
    });

    states = new Set();
    nodes = new Set();

    /**
     * Attaches an onClick handler to graph cells for answer paper.
     */
    paperAnswer.on('cell:pointerdown', function (node) {
        if (pushToBottomSetFlag) {
            pushStateToSelectedBottomState(node.model);
        }

        if (transitionSetFlag) {
            setTransition(node.model, lbl);
            // infoText('');
        }
        unhighlight();
        unhighlightQuestion();
        unhighlight(customHighlighter);
        node.highlight();
        selectedState = node.model;

        finishButtonText();
        deleteButtonText();

        highlightSets();

        unhighlightQuestion(customHighlighter);

        if (!graphAnswer.getLinks().includes(node.model) && node.model != start) {
            graphQuestion.getElements().forEach(element => {
                if (element.attributes.type != "fsa.StartState") {
                    let stateText = pruneString(selectedState.attributes.attrs.text.text);

                    var textSnippets = stateText.split(", ");
                    textSnippets.forEach(snip => {
                        let snap = pruneString(element.attributes.attrs.text.text);

                        if (snap == snip) {
                            paperQuestion.findViewByModel(element).highlight(null, customHighlighter);
                        }
                    });
                }
            });
        }

        if (node.model != startLink) {
            if (node.model.attributes.type == "standard.Link") {
                highlightTable(graphAnswer.getCell(selectedState.source().id).attributes.attrs.text.text.replace("\n", ""), selectedState.attributes.labels[0].attrs.text.text.replace("\n", ""));
            } else {
                highlightTable(selectedState.attributes.attrs.text.text.replace("\n", ""));
            }
        }

        highlightTransitions(graphAnswer, node);
        highlightTransitions(graphQuestion, node);
    });

    /**
     * Creates the "Start state" for the answer graph.
     */
    start = new joint.shapes.fsa.StartState({
        position: {
            x: 10,
            y: 10
        }
    });
    graphAnswer.addCell(start);

    start = graphAnswer.getCells()[0];

    loadQuestion();

    /**
     * Attaches an onClick handler to graph cells for question paper.
     */
    paperQuestion.on('cell:pointerdown', function (node) {
        unhighlightQuestion();
        unhighlight();
        unhighlightQuestion(customHighlighter);
        selectedState = null;
        finishButtonText();
        node.highlight();
        selectedStateQuestion = node.model;

        unhighlight(customHighlighter);

        graphAnswer.getElements().forEach(element => {
            if (element != start) {
                let snap = pruneString(element.attributes.attrs.text.text);

                if (snap == selectedStateQuestion.id) {
                    paperAnswer.findViewByModel(element).highlight(null, customHighlighter);
                }
            }
        });

        if (node.model.attributes.type == "standard.Link") {
            highlightTable(selectedStateQuestion.source().id, selectedStateQuestion.attributes.labels[0].attrs.text.text.replace("\n", ""));
        } else {
            highlightTable(selectedStateQuestion.id);
        }

        highlightTransitions(graphQuestion, node);
        highlightTransitions(graphAnswer, node);
    });

    graphAnswer.on('add remove change:source change:target', function () {
        adjustAll(graphAnswer);

        updateSelfLoops(graphAnswer);
    });

    paperAnswer.on('cell:pointerup', function () {
        adjustAll(graphAnswer);

        updateSelfLoops(graphAnswer);
    });

    unhighlightSets();

    hintCountTop = 0;
    hintCountBottom = 0;

    topHints = 2.5;
    bottomHints = 2.5;
    hintCountTop = null;
    hintCountBottom = null;

    helpCounter = 1;

    setSave = null;
    iterationSave = 0;
    endSetSave = null;

    setsThatRemain = null;
    setsThatRemainIndices0 = null;
    setsThatRemainIndices1 = null;
}

/**
 * Creates a new state and attaches it to the answer graph.
 * 
 * @param {Number} x : x position of cell.
 * @param {Number} y : y position of cell.
 * @param {String} label : Name of cell.
 */
function state(x, y, label) {
    var cell = new joint.shapes.fsa.State({
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

/**
 * Creates a new transition between two cells in the answer graph.
 * 
 * @param {Cell} source : The cell from which the transition starts.
 * @param {Cell} target : The cell to whom the transition points.
 * @param {String} label : Name of the transition (0 or 1).
 * @param {*} vertices 
 */
function link(source, target, label, vertices) {
    var cell = new joint.shapes.standard.Link({
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
        smooth: true,
        vertices: vertices || []
    });
    cell.attr('line/strokeWidth', 3);
    graphAnswer.addCell(cell);
    return cell;
}

/**
 * Used for creating transitions in question graph.
 * 
 * @param {Cell} source : Source cell.
 * @param {Cell} target : Target cell.
 * @param {String} label : Transition label (0 or 1).
 */
function questionLink(source, target, label) {
    var cell = new joint.shapes.standard.Link({
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
        smooth: true,
        vertices: []
    });
    cell.attr('line/strokeWidth', 3);
    graphQuestion.addCell(cell);
}

/**
 * Unhighlights everything in the answer graph.
 * 
 * @param {*} highlighter : Custom highlighter to be unhighlighted.
 */
function unhighlight(highlighter) {
    if (graphAnswer.getCells().length > 0) {
        graphAnswer.getCells().forEach(element => {
            paperAnswer.findViewByModel(element).unhighlight(null, highlighter);
        });
    }
    graphAnswer.getLinks().forEach(link => {
        link.attr('line/stroke', 'black');
    });

    let table = document.getElementById("answerTransitions");
    let rows = table.rows;
    for (let i = 1; i < rows.length; i++) {
        rows[i].classList.remove("tableHighlight");
    }
}

/**
 * Unhighlights everything in the question graph.
 * 
 * @param {*} highlighter : Custom highlighter to be unhighlighted.
 */
function unhighlightQuestion(highlighter) {
    if (graphQuestion.getCells().length > 0) {
        graphQuestion.getCells().forEach(element => {
            paperQuestion.findViewByModel(element).unhighlight(null, highlighter);
        });
    }
    graphQuestion.getLinks().forEach(link => {
        link.attr('line/stroke', 'black');
    });

    let table = document.getElementById("questionTransitions");
    let rows = table.rows;
    for (let i = 1; i < rows.length; i++) {
        rows[i].classList.remove("tableHighlight");
    }
}

/**
 * Displays text in the info part at the bottom of the screen.
 * 
 * @param {String} txt : Text to be displayed.
 */
function infoText(txt) {
    document.getElementById("infobox").innerHTML = txt;
}

/**
 * See infoText(), but with colored text.
 * 
 * @param {String} txt : Text to be displayed.
 * @param {String} col : Color of text, can be in 'red' or '#ff0000' format.
 */
function infoTextColor(txt, col) {
    infoText(txt);
    document.getElementById("infobox").style.color = col;
}

/**
 * Creates a new state to be added to the answer graph.
 */
function newState(fromTop) {
    var stateName;
    if (!fromTop) {
        stateName = prompt("Wie soll der Zustand heißen?");
    } else {
        stateName = "{" + fromTop + "}";
    }
    if (stateName == null || stateName == "" || stateName.replace(' ', '') == "") {
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
            document.getElementById("answerStatesText").innerHTML = "Zustände in der Aufgabe:";

            let table = document.getElementById("answerStates");
            let tableCell = table.rows[0].insertCell(table.rows[0].length);
            tableCell.innerHTML = stateName;
            tableCell.setAttribute("id", "answerState-" + stateName);
        }
    }
}

/**
 * Sets the currently selected state as the start state of the answer graph.
 */
function makeStart() {
    if (selectedState == null) {
        infoTextColor("Es muss zuerst ein Zustand ausgewählt werden.", "red");
    } else {
        startState = selectedState;
        if (startLink != null) {
            graphAnswer.removeCells(startLink);
        }
        startLink = link(start, selectedState);

        document.getElementById("answerStartState").innerHTML = "Startzustand: " + selectedState.attributes.attrs.text.text.replace("\n", "");
    }
}

/**
 * Removes the currently selected state from the answer graph.
 */
function deleteState() {
    if (selectedState == null) {
        infoTextColor("Es muss zuerst ein Zustand ausgewählt werden.", "red");
    } else {
        if (selectedState != start && selectedState != startLink) {
            graphAnswer.removeCells(selectedState);
            states.delete(selectedState.attributes.attrs.text.text);
            nodes.delete(selectedState);
            if (finishStates.has(selectedState)) {
                finishStates.delete(selectedState);
            }

            if (selectedState.attributes.type == "standard.Link") {
                let table = document.getElementById("answerTransitions");
                let rows = table.rows;
                for (let i = 1; i < rows.length; i++) {
                    if (graphAnswer.getCell(selectedState.source().id).attributes.attrs.text.text.replace("\n", "") == rows[i].cells[0].innerHTML &&
                        selectedState.attributes.labels[0].attrs.text.text.replace("\n", "") == rows[i].cells[1].innerHTML &&
                        graphAnswer.getCell(selectedState.target().id).attributes.attrs.text.text.replace("\n", "") == rows[i].cells[2].innerHTML) {
                        table.deleteRow(i);
                        i--;
                    }
                }
            } else {
                let stateText = selectedState.attributes.attrs.text.text.replace("\n", "");
                let table = document.getElementById("answerStates");
                for (let i = 0; i < table.rows[0].cells.length; i++) {
                    if (table.rows[0].cells[i].innerHTML == stateText) {
                        table.rows[0].deleteCell(i);
                        i--;
                    }
                }

                table = document.getElementById("answerTransitions");
                let rows = table.rows;
                for (let i = 1; i < rows.length; i++) {
                    if (stateText == rows[i].cells[0].innerHTML) {
                        table.deleteRow(i);
                        i--;
                    }
                }

                table = document.getElementById("answerEndStates");
                for (let i = 0; i < table.rows[0].cells.length; i++) {
                    if (selectedState.attributes.attrs.text.text.replace("\n", "") == table.rows[0].cells[i].innerHTML) {
                        table.rows[0].deleteCell(i);
                        i--;
                    }
                }
            }

            selectedState = null;
        }
    }
}

/**
 * Sets the currently selected state as a finish state of the answer graph.
 */
function makeFinish() {
    if (selectedState == null) {
        infoTextColor("Es muss zuerst ein Zustand ausgewählt werden.", "red");
    } else {
        if (finishStates.has(selectedState)) {
            finishStates.delete(selectedState);
            selectedState.attr('circle/fill', 'white');

            let table = document.getElementById("answerEndStates");
            for (let i = 0; i < table.rows.length; i++) {
                if (selectedState.attributes.attrs.text.text.replace("\n", "") == table.rows[0].cells[i].innerHTML) {
                    table.rows[0].deleteCell(i);
                }
            }
        } else {
            finishStates.add(selectedState);
            selectedState.attr('circle/fill', 'yellow');

            document.getElementById("answerEndStatesText").innerHTML = "Akzeptierende Zustände der Antwort.";
            let table = document.getElementById("answerEndStates");
            let tableCell = table.rows[0].insertCell(table.rows[0].length);
            tableCell.innerHTML = selectedState.attributes.attrs.text.text.replace("\n", "");
            tableCell.setAttribute("id", "answerEnd-" + selectedState.attributes.attrs.text.text.replace("\n", ""));
        }
        finishButtonText();
    }
}

/**
 * Adds a new transition from the currently selected state to the next selected state
 * in the answer graph.
 * 
 * @param {String} literal : Name of the transition (0 or 1)
 */
function newTransition(literal) {
    if (selectedState != null) {
        if (selectedState.attributes.type == "fsa.State") {
            if (selectedState != null) {
                infoTextColor("Bitte auf das Ziel klicken", "black");
                transitionSetFlag = true;
                lbl = literal;
            } else {
                infoTextColor("Bitte erst einen Zustand auswählen", "red");
            }
        } else {
            infoTextColor("Für diese Aktion muss ein Zustand ausgewählt sein.", "red");
        }
    } else {
        infoTextColor("Für diese Aktion muss ein Zustand ausgewählt sein.", "red");
    }
}

/**
 * Sets the new transition from source to target.
 * 
 * @param {Cell} node : Node to which the tranisiton points.
 * @param {String} lbl : Name of the transition (0 or 1).
 */
function setTransition(node, lbl) {
    let from = selectedState.id;
    let to = node.id;
    let newNeeded = true;
    if (node.attributes.type == "standard.Link") {
        infoTextColor("Bitte einen Zustand als Ziel der Transition auswählen. Mit der Auswahl des beginnenden Zustands erneut beginnen.", 'red');
        transitionSetFlag = false;
    } else {
        if (graphAnswer.getLinks().length > 0) {
            graphAnswer.getLinks().forEach(linkId => {
                graphAnswer.getElements().forEach(graphElement => {
                    if (graphElement.id == linkId.source().id && newNeeded) {
                        if (from == linkId.source().id &&
                            to == linkId.target().id) {
                            if (linkId.attributes.labels[0].attrs.text.text.includes(lbl)) {
                                infoTextColor("Diese Transition existiert bereits.", "red");
                            } else {
                                linkId.attributes.labels[0].attrs.text.text = ("0, 1");
                                linkId.attr('text/text', '0, 1');
                                transitionToTable(from, lbl, to);
                            }
                            newNeeded = false;
                        }
                    }
                });
            });
        }
        if (graphAnswer.getLinks().length > 0) {
            graphAnswer.getLinks().forEach(linkId => {
                if (newNeeded && graphAnswer.getCell(linkId.source().id).attributes.type != "fsa.StartState" && from == graphAnswer.getCell(linkId.source().id).attributes.attrs.text.text) {
                    if (linkId.label().attrs.text.text.includes(lbl)) {
                        infoTextColor("Dieser Zustand hat bereits eine Transition mit diesem Literal.", "red");
                        newNeeded = false;
                    }
                }
            });
        }
        if (newNeeded) {
            link(selectedState, node, lbl);
            infoTextColor("Transition erfolgreich erstellt.", "black");

            transitionToTable(from, lbl, to);
        }
        transitionSetFlag = false;
        lbl = null;
    }
}

/**
 * Sets the text of the "makeFinish" button to display "add" or "remove",
 * depending on whether the selected state is a finish state or not.
 */
function finishButtonText() {
    let finishBtn = document.getElementById("makeFinish");
    if (selectedState != null) {
        finishBtn.disabled = false;
        if (finishStates.has(selectedState)) {
            finishBtn.textContent = "Zielzustand entfernen";
        } else {
            finishBtn.textContent = "Zum Zielzustand machen";
        }
    } else {
        finishBtn.disabled = true;
    }
}

function deleteButtonText() {
    if (graphAnswer.getLinks().includes(selectedState)) {
        document.getElementById('deleteState').innerHTML = "Transition löschen";
    } else if (graphAnswer.getElements().includes(selectedState)) {
        document.getElementById('deleteState').innerHTML = "Zustand löschen";
    } else {
        document.getElementById('deleteState').innerHTML = "Zustand/Transition löschen";
    }
}

/**
 * Loads a question.
 * 
 * @param {Number} id : Question id (for database).
 */
function loadQuestion(id) {

    var packedQuestion;
    if (id != null) {
        //TODO: load question from db.
    } else {
        switch (document.body.getAttribute("questiontype")) {
            case "minimize":
                packedQuestion = {
                    questionText: "Minimieren Sie diesen Automaten.",
                    questionFSM: {
                        start: 0,
                        states: ["q0", "q1", "q2", "q3", "q4"],
                        ends: [1, 2],
                        transitions: [{
                            from: "q0",
                            sign: "0",
                            to: "q1"
                        }, {
                            from: "q0",
                            sign: "1",
                            to: "q3"
                        }, {
                            from: "q1",
                            sign: "0",
                            to: "q3"
                        }, {
                            from: "q1",
                            sign: "1",
                            to: "q2"
                        }, {
                            from: "q2",
                            sign: "0",
                            to: "q1"
                        }, {
                            from: "q2",
                            sign: "1",
                            to: "q4"
                        }, {
                            from: "q3",
                            sign: "0",
                            to: "q4"
                        }, {
                            from: "q3",
                            sign: "1",
                            to: "q4"
                        }, {
                            from: "q4",
                            sign: "0",
                            to: "q3"
                        }, {
                            from: "q4",
                            sign: "1",
                            to: "q3"
                        }]
                    },
                    solutionFSM: {
                        start: 0,
                        states: ["q0", "q1", "q2", "q3"],
                        ends: [1, 2],
                        transitions: [{
                            from: "q0",
                            sign: "0",
                            to: "q1"
                        }, {
                            from: "q0",
                            sign: "1",
                            to: "q3"
                        }, {
                            from: "q1",
                            sign: "0",
                            to: "q3"
                        }, {
                            from: "q1",
                            sign: "1",
                            to: "q2"
                        }, {
                            from: "q2",
                            sign: "0",
                            to: "q1"
                        }, {
                            from: "q2",
                            sign: "1",
                            to: "q3"
                        }, {
                            from: "q3",
                            sign: "0",
                            to: "q3"
                        }, {
                            from: "q3",
                            sign: "1",
                            to: "q3"
                        }]
                    }
                }
                break;
            case "ndet":
                packedQuestion = {
                    questionText: "Wandeln Sie diesen nichtdeterministischen Automaten in einen deterministischen um.",
                    questionFSM: {
                        start: 0,
                        states: ["q0", "q1"],
                        ends: [1],
                        transitions: [{
                            from: "q0",
                            sign: "0",
                            to: "q0"
                        }, {
                            from: "q0",
                            sign: "1",
                            to: "q0"
                        }, {
                            from: "q0",
                            sign: "1",
                            to: "q1"
                        }, {
                            from: "q1",
                            sign: "0",
                            to: "q0"
                        }, {
                            from: "q1",
                            sign: "1",
                            to: "q0"
                        }, {
                            from: "q1",
                            sign: "1",
                            to: "q1"
                        }]
                    },
                    solutionFSM: {
                        start: 0,
                        states: ["q0", "q1"],
                        ends: [1],
                        transitions: [{
                            from: "q0",
                            sign: "0",
                            to: "q0"
                        }, {
                            from: "q0",
                            sign: "1",
                            to: "q1"
                        }, {
                            from: "q1",
                            sign: "0",
                            to: "q0"
                        }, {
                            from: "q1",
                            sign: "1",
                            to: "q1"
                        }]
                    }
                }
                break;
            case "language":
                packedQuestion = {
                    questionText: "Erzeugen sie einen Automaten zu Sprache L={\"alle Zeichenketten, bei denen die Anzahl der Einsen durch 3 teilbar ist\"}.",

                    solutionFSM: {
                        start: 0,
                        states: ["q0", "q1", "q2"],
                        ends: [0],
                        transitions: [{
                            from: "q0",
                            sign: "0",
                            to: "q0"
                        }, {
                            from: "q0",
                            sign: "1",
                            to: "q1"
                        }, {
                            from: "q1",
                            sign: "0",
                            to: "q1"
                        }, {
                            from: "q1",
                            sign: "1",
                            to: "q2"
                        }, {
                            from: "q2",
                            sign: "0",
                            to: "q2"
                        }, {
                            from: "q2",
                            sign: "1",
                            to: "q0"
                        }]
                    }
                }
                break;
            default:
                break;
        }
    }
    document.getElementById("questionText").innerHTML = packedQuestion.questionText;


    solutionFSM = new FSM(packedQuestion.solutionFSM.start,
        packedQuestion.solutionFSM.states,
        packedQuestion.solutionFSM.transitions,
        packedQuestion.solutionFSM.ends);

    if (packedQuestion.questionFSM) {
        questionFSM = new FSM(packedQuestion.questionFSM.start,
            packedQuestion.questionFSM.states,
            packedQuestion.questionFSM.transitions,
            packedQuestion.questionFSM.ends);

        drawQuestion(questionFSM);
    }
}

/**
 * Takes an FSM and draws it on the questionPaper as a graph.
 * 
 * @param {FSM} fsm : The FSM to draw.
 */
function drawQuestion(fsm) {
    let startQuestion = new joint.shapes.fsa.StartState({
        position: {
            x: 10,
            y: 10
        }
    });
    graphQuestion.addCell(startQuestion);

    if (fsm.start != null) {
        document.getElementById("questionStartState").innerHTML = "Startzustand: " + fsm.states[fsm.start];
    }

    let xqPos = 0;
    let yqPos = 0;

    if (fsm.states.length > 0) {
        document.getElementById("questionStatesText").innerHTML = "Zustände in der Aufgabe:";
    }

    fsm.states.forEach(state => {
        let cell = new joint.shapes.fsa.State({
            id: state,
            position: {
                x: xqPos + offsetX / 2,
                y: yqPos + offsetY / 2
            },
            size: {
                width: nodeSize,
                height: nodeSize
            },
            attrs: {
                text: {
                    text: state
                }
            }
        });
        graphQuestion.addCell(cell);
        if (yqPos == 0) {
            yqPos += delta;
        } else {
            yqPos -= delta;
            xqPos += delta;
        }

        let table = document.getElementById("questionStates");
        let tableCell = table.rows[0].insertCell(table.rows[0].length);
        tableCell.innerHTML = state;
        tableCell.setAttribute("id", "questionState-" + state);
    });

    questionLink(startQuestion, graphQuestion.getCell(fsm.states[fsm.start]));

    if (fsm.transitions.length > 0) {
        document.getElementById("questionTransitionsText").innerHTML = "Transitionen in der Aufgabe:";

        let table = document.getElementById("questionTransitions");
        let row = table.insertRow(0);

        let transitionFrom = row.insertCell(0);
        transitionFrom.innerHTML = "<b>Von Zustand</b>";

        let transitionSym = row.insertCell(1);
        transitionSym.innerHTML = "<b>über Symbol</b>";

        let transitionTo = row.insertCell(2);
        transitionTo.innerHTML = "<b>zu Zustand</b>";
    }

    fsm.transitions.forEach(transition => {
        let newNeeded = true;
        if (graphQuestion.getLinks().length > 0) {
            graphQuestion.getLinks().forEach(linkId => {
                graphQuestion.getLinks().forEach(graphElement => {
                    if (newNeeded && linkId.id == graphElement.id) {
                        if (transition.from == graphElement.source().id &&
                            transition.to == graphElement.target().id) {
                            if (!graphElement.attributes.labels[0].attrs.text.text.includes(transition.sign)) {
                                graphElement.attributes.labels[0].attrs.text.text = ("0, 1");
                                graphElement.attr('text/text', '0, 1');
                            }
                            newNeeded = false;
                        }
                    }
                });
            });
        }
        if (newNeeded) {
            questionLink(graphQuestion.getCell(transition.from),
                graphQuestion.getCell(transition.to),
                transition.sign);
        }

        let table = document.getElementById("questionTransitions");
        let row = table.insertRow(table.rows.length);

        let transitionFrom = row.insertCell(0);
        transitionFrom.innerHTML = transition.from;

        let transitionSym = row.insertCell(1);
        transitionSym.innerHTML = transition.sign;

        let transitionTo = row.insertCell(2);
        transitionTo.innerHTML = transition.to;
    });

    if (fsm.ends.length > 0) {
        document.getElementById("questionEndStatesText").innerHTML = "Akzeptierende Zustände in der Aufgabe:";
    }

    fsm.ends.forEach(end => {
        graphQuestion.getCell(fsm.states[end]).attr('circle/fill', 'yellow');

        let table = document.getElementById("questionEndStates");
        let tableCell = table.rows[0].insertCell(table.rows[0].length);
        tableCell.innerHTML = fsm.states[end];
        tableCell.setAttribute("id", "questionEnd-" + fsm.states[end]);
    });

    graphQuestion.getLinks().forEach(link => {
        adjustVertices(graphQuestion, link);
    });

    updateSelfLoops(graphQuestion);
}

/**
 * Cheks if the given answer is the same as the set solution.
 */
function check() {
    var fsmToCheck = answerToFSM();
    var equality;
    equality = fsmToCheck.equal(solutionFSM);
    var alertText = equality == 0 ? "Diese Antwort ist korrekt\nWeiter zur nächsten frage?" :
        equality;
    if (equality == 0) {
        if (confirm(alertText)) {
            onLoad();
        }
    } else {
        if (document.body.getAttribute("questiontype") != "minimize" && fsmToCheck.equivalence(solutionFSM) == 0) {
            alert("Diese Antwort ist korrekt, jedoch noch nicht minimal.");
            if (confirm("Für einen Minimalen Automaten gilt noch:\n" + equality + "\nAbrrechen, um es weiter zu versuchen, OK für die nächste Aufgabe.")) {
                onLoad();
            }
        } else {
            alert(alertText);
        }
    }
}

/**
 * This casts the given answer to a new FSM.
 */
function answerToFSM() {
    let newTransitions = new Array();
    let newStates = Array.from(states);
    let newStartState;
    let newEnds = new Array();

    if (graphAnswer.getLinks().length > 0) {
        graphAnswer.getLinks().forEach(link => {
            if (link != startLink) {
                link.label().attrs.text.text.split(', ').forEach(splitLabel => {
                    newTransitions.push({
                        from: graphAnswer.getCell(link.source().id).attributes.attrs.text.text,
                        sign: splitLabel,
                        to: graphAnswer.getCell(link.target().id).attributes.attrs.text.text
                    });
                });
            }
        });
    }

    newStartState = (startState != null) ? newStates.indexOf(graphAnswer.getCell(startState.id).attributes.attrs.text.text) : null;

    finishStates.forEach(fState => {
        newEnds.push(newStates.indexOf(graphAnswer.getCell(fState.id).attributes.attrs.text.text));
    });

    return new FSM(newStartState, newStates, newTransitions, newEnds);
}

/**
 * Adds the selected state from the question graph to the answer graph.
 */
function addToBottom() {
    if (!graphQuestion.getLinks().includes(selectedStateQuestion)) {
        newState(selectedStateQuestion.id);
    } else {
        infoTextColor("Bitte einen Zustand auswählen.", "red");
    }
}

/**
 * Adds the text of the selected state from the question graph to the selected State
 * of the answer graph.
 */
function pushToBottom() {
    if (!selectedStateQuestion) {
        infoTextColor("Es muss ein Zustand ausgewählt sein.", "red");
    } else {

        var isTransition = false;

        graphQuestion.getLinks().forEach(element => {
            if (selectedStateQuestion == element) {
                isTransition = true;
            }
        });
        if (isTransition) {
            infoTextColor("Es muss ein Zustand ausgewählt sein.", "red");
        } else {
            pushToBottomSetFlag = true;
            infoTextColor("Bitte einen Zustand auswählen.", "black");
        }
    }
}

/**
 * Actual logic for adding text to answer state.
 * 
 * @param {*} cellId : Cell to get name enlarged.
 */
function pushStateToSelectedBottomState(cellId) {
    var isTransition = false;

    graphAnswer.getLinks().forEach(element => {
        if (graphAnswer.getCell(cellId) == element) {
            isTransition = true;
        }
    });

    if (isTransition) {
        infoTextColor("Das ausgewählte Element ist eine Transition.", "red");
    } else {
        let snap = pruneString(graphAnswer.getCell(cellId.id).attributes.attrs.text.text);
        let saveForTable = snap;

        if (snap != selectedStateQuestion.id) {
            let newText;
            newText = graphAnswer.getCell(cellId.id).attributes.attrs.text.text;
            if (states.has(newText)) {
                states.delete(newText);
            }

            newText = pruneString(newText);
            newText += ", " + selectedStateQuestion.id;
            newText = newText.split(", ").sort().join(", ");
            if ((splitText = newText.split(", ")).length > 2) {
                for (var i = 2; i < splitText.length; i += 2) {
                    splitText[i] = "\n" + splitText[i];
                }
                newText = splitText.join(', ');
            }
            newText = "{" + newText + "}";
            var cellToChange = graphAnswer.getCell(cellId.id);
            cellToChange.attr('text/text', newText);
            states.add(newText);
            pushToBottomSetFlag = false;

            let table = document.getElementById("answerTransitions");
            let rows = table.rows;
            for (let i = 1; i < rows.length; i++) {
                let snop = pruneString(rows[i].cells[0].innerHTML);
                if (saveForTable == snop) {
                    rows[i].cells[0].innerHTML = newText.replace("\n", "");
                }
                snop = rows[i].cells[2].innerHTML;
                if (saveForTable == snop) {
                    rows[i].cells[2].innerHTML = newText.replace("\n", "");
                }
                sortTable("answerTransitions");
            }

            table = document.getElementById("answerStates");
            for (let i = 0; i < table.rows[0].cells.length; i++) {
                let snop = pruneString(table.rows[0].cells[i].innerHTML);
                if (saveForTable == snop) {
                    table.rows[0].cells[i].innerHTML = newText.replace("\n", "");
                }
            }

            table = document.getElementById("answerEndStates");
            for (let i = 0; i < table.rows[0].cells.length; i++) {
                let snop = pruneString(table.rows[0].cells[i].innerHTML);
                if (saveForTable == snop) {
                    table.rows[0].cells[i].innerHTML = newText.replace("\n", "");
                }
            }
        } else {
            infoTextColor("Dieser Zustand hat diesen Namen bereits.", "red");
        }
    }
}

/**
 * Generates an alert with accepted char sequences of the question FSM.
 */
function hintTop() {
    hint(false);
}

/**
 * Generates an alert with accepted char sequences of the answer FSM.
 */
function hintBottom() {
    hint(true);
}

/**
 * Generates an alert with accepted char sequences of the selected FSM. 
 * 
 * @param {Boolean} answer : true = answer; false = question.
 */
function hint(answer) {
    let hints = (answer) ? bottomHints : topHints;

    let hintCount = (answer) ? hintCountBottom : hintCountTop;

    let count = Math.floor(hints * Math.pow(2, hintCount));

    let fsm = (answer) ? answerToFSM() : solutionFSM;

    let hintStrings = fsm.getHints(count);

    let hintStringsFormatted = "Anzahl der Hinweise: " + count + "\n\n";

    hintStringsFormatted += (answer) ? "Ihr Antwortautomat akzeptiert" : "Der Automat aus der Aufgabenstellung";

    hintStringsFormatted += " folgende Zeichenketten:\n";

    if (hintStrings.length > 0) {
        hintStringsFormatted += "\"" + hintStrings[0] + "\"";

        for (let i = 1; i < hintStrings.length; i++) {
            hintStringsFormatted += ", \"" + hintStrings[i] + "\"";
        }
    }

    if (answer) {
        hintCountBottom += (hintCountBottom < 4) ? 1 : 0;
    } else {
        hintCountTop += (hintCountTop < 4) ? 1 : 0;
    }

    alert(hintStringsFormatted);
}

/**
 * This function is copied from the jointJS tutorial, which can be found on 
 * https://resources.jointjs.com/tutorial/multiple-links-between-elements .
 */
function adjustVertices(graph, cell) {

    // if `cell` is a view, find its model
    cell = cell.model || cell;

    if (cell instanceof joint.dia.Element) {
        // `cell` is an element

        _.chain(graph.getConnectedLinks(cell))
            .groupBy(function (link) {

                // the key of the group is the model id of the link's source or target
                // cell id is omitted
                return _.omit([link.source().id, link.target().id], cell.id)[0];
            })
            .each(function (group, key) {

                // if the member of the group has both source and target model
                // then adjust vertices
                if (key !== 'undefined') adjustVertices(graph, _.first(group));
            })
            .value();

        return;
    }

    // `cell` is a link
    // get its source and target model IDs
    var sourceId = cell.get('source').id || cell.previous('source').id;
    var targetId = cell.get('target').id || cell.previous('target').id;

    // if one of the ends is not a model
    // (if the link is pinned to paper at a point)
    // the link is interpreted as having no siblings
    if (!sourceId || !targetId) return;

    // identify link siblings
    var siblings = _.filter(graph.getLinks(), function (sibling) {

        var siblingSourceId = sibling.source().id;
        var siblingTargetId = sibling.target().id;

        // if source and target are the same
        // or if source and target are reversed
        return ((siblingSourceId === sourceId) && (siblingTargetId === targetId)) ||
            ((siblingSourceId === targetId) && (siblingTargetId === sourceId));
    });

    var numSiblings = siblings.length;
    switch (numSiblings) {

        case 0: {
            // the link has no siblings
            break;

        }
        case 1: {
            // there is only one link
            // no vertices needed
            if (sourceId != targetId) {
                cell.unset('vertices');
            }
            break;

        }
        default: {
            // there are multiple siblings
            // we need to create vertices

            // find the middle point of the link
            var sourceCenter = graph.getCell(sourceId).getBBox().center();
            var targetCenter = graph.getCell(targetId).getBBox().center();
            var midPoint = g.Line(sourceCenter, targetCenter).midpoint();

            // find the angle of the link
            var theta = sourceCenter.theta(targetCenter);

            // constant
            // the maximum distance between two sibling links
            var GAP = 40;

            _.each(siblings, function (sibling, index) {

                // we want offset values to be calculated as 0, 20, 20, 40, 40, 60, 60 ...
                var offset = GAP * Math.ceil(index / 2);

                // place the vertices at points which are `offset` pixels perpendicularly away
                // from the first link
                //
                // as index goes up, alternate left and right
                //
                //  ^  odd indices
                //  |
                //  |---->  index 0 sibling - centerline (between source and target centers)
                //  |
                //  v  even indices
                var sign = ((index % 2) ? 1 : -1);

                // to assure symmetry, if there is an even number of siblings
                // shift all vertices leftward perpendicularly away from the centerline
                if ((numSiblings % 2) === 0) {
                    offset -= ((GAP / 2) * sign);
                }

                // make reverse links count the same as non-reverse
                var reverse = ((theta < 180) ? 1 : -1);

                // we found the vertex
                var angle = g.toRad(theta + (sign * reverse * 90));
                var vertex = g.Point.fromPolar(offset, angle, midPoint);

                // replace vertices array with `vertex`
                sibling.vertices([vertex]);
            });
        }
    }
}

function adjustAll(graph) {
    graph.getLinks().forEach(link => {
        adjustVertices(graph, link);
    });
}

function pruneString(s) {
    let newS = s;
    if (s[0] == "{") {
        newS = newS.substr(1, newS.length - 2);
    }
    newS = newS.replace("\n", "");
    return newS;
}

function highlightTransitions(graph, node) {
    let g1 = (graph == graphAnswer) ? graphAnswer : graphQuestion;
    let g2 = (graph == graphAnswer) ? graphQuestion : graphAnswer;

    let linkSource;

    if (node.model.attributes.type == "standard.Link") {
        linkSource = g1.getCell(node.model.source().id);
    } else {
        linkSource = node.model;
    }

    if (linkSource && linkSource != start) {
        let sourceText = pruneString(linkSource.attributes.attrs.text.text);

        let sourceArray = sourceText.split(', ');
        sourceArray.forEach(lbl => {
            g2.getLinks().forEach(link => {
                if (g2.getCell(link.source().id).attributes.type != "fsa.StartState") {
                    let otherGraphText = pruneString(g2.getCell(link.source().id).attributes.attrs.text.text);

                    let otherGraphTextArray = otherGraphText.split(", ");
                    for (let i = 0; i < otherGraphTextArray.length; i++) {
                        if (otherGraphTextArray[i] == lbl) {
                            switch (link.label().attrs.text.text) {
                                case "0":
                                    link.attr('line/stroke', 'red');
                                    break;
                                case "1":
                                    link.attr("line/stroke", 'blue');
                                    break;
                                default:
                                    link.attr("line/stroke", 'magenta');
                                    break;
                            }
                        }
                    }

                }
            });
        });

    }
}

function updateSelfLoops(graph) {
    graph.getLinks().forEach(link => {
        if (link.source().id == link.target().id) {
            let midPoint = graph.getCell(link.source().id).getBBox().bottomRight();
            let offset = 25;

            link.vertices([{
                x: midPoint.x + offset,
                y: midPoint.y - offset / 3
            }, {
                x: midPoint.x + offset,
                y: midPoint.y + offset
            }, {
                x: midPoint.x - offset / 3,
                y: midPoint.y + offset
            }]);
        }
    });
}

function transitionToTable(fromState, symb, toState) {
    let tableId = "answerTransitions";
    let table = document.getElementById(tableId);
    let row = table.insertRow(table.rows.length);

    let cellFrom = row.insertCell(0);
    cellFrom.innerHTML = graphAnswer.getCell(fromState).attributes.attrs.text.text.replace("\n", "");

    let cellSign = row.insertCell(1);
    cellSign.innerHTML = symb;

    let cellTo = row.insertCell(2);
    cellTo.innerHTML = graphAnswer.getCell(toState).attributes.attrs.text.text.replace("\n", "");

    sortTable(tableId);
}

function sortTable(id) {
    let tableToSort = document.getElementById(id);
    let rows = tableToSort.rows;

    for (let i = 1; i < rows.length; i++) {
        let min = i;
        for (let j = i + 1; j < rows.length; j++) {
            min = sortTableHelper(rows, i, j, 0, min);
        }
        rows[i].parentNode.insertBefore(rows[min], rows[i]);
    }
}

function sortTableHelper(rows, i, j, k, min) {
    if (k >= rows.length) {
        return min;
    } else {
        if (rows[i].cells[0].innerHTML.toLowerCase() > rows[j].cells[0].innerHTML.toLowerCase()) {
            min = j;
        } else if (rows[i].cells[0].innerHTML.toLowerCase() == rows[j].cells[0].innerHTML.toLowerCase()) {
            return sortTableHelper(rows, i, j, k + 1, min);
        }
        return min;
    }
}

function highlightTable(fromName, sign = "01") {
    if (fromName[0] == "{") {
        fromName = fromName.substr(1, fromName.length - 2);
    }
    fromName = fromName.replace("\n", "");
    let table = document.getElementById("answerTransitions");
    let rows = table.rows;
    for (let i = 1; i < rows.length; i++) {
        if (rows[i].cells[0].innerHTML.includes(fromName) &&
            sign.includes(rows[i].cells[1].innerHTML)) {
            rows[i].classList.add("tableHighlight");
        }
    }

    table = document.getElementById("questionTransitions");
    rows = table.rows;
    for (let i = 1; i < rows.length; i++) {
        let splitText = fromName.split(", ");
        for (let j = 0; j < splitText.length; j++) {
            if (rows[i].cells[0].innerHTML.includes(splitText[j]) &&
                sign.includes(rows[i].cells[1].innerHTML)) {
                rows[i].classList.add("tableHighlight");
            }
        }
    }
}

function openHelper() {
    document.getElementById("helper").style.display = "block";
    document.getElementById("openHelper").style.display = "none";
    document.getElementById("mainContent").style.marginLeft = "8%";
    document.getElementById("mainContent").style.marginRight = "38%";

}

function noIdea() {
    document.getElementById("help1").style.display = "none";
    helpResponse("Okay, hier ein Ansatz für diesen Aufgabentyp:");
    switch (document.body.getAttribute("questiontype")) {
        case "minimize":
            minimizeHelp();
            break;
        case "ndet":
            ndetHelp();
            break;
        case "language":
            languageHelp();
            break;
    }
}

function helpResponse(response) {
    let newHelpDiv = document.createElement("div");
    newHelpDiv.id = "helpResponse" + helpCounter++;
    document.getElementById("helper").appendChild(newHelpDiv);
    let newHelpText = response;
    newHelpDiv.innerHTML = newHelpText;
}

function minimizeHelp() {
    let newHelpDiv = document.createElement("div");
    newHelpDiv.id = "help" + helpCounter;
    document.getElementById("helper").appendChild(newHelpDiv);
    let newHelpText = "Bei der Minimierung ist die Idee, die Zustände aus der Aufgabe so " +
        "in Zustandsmengen zusammenzufassen, dass alle Zustände in einer Menge äquivalent sind.<br>" +
        "Der erste Schritt hierbei ist, alle akzeptierenden und alle nichtakzeptierenden Zustände " +
        "jeweils in einer Menge zusammenzufassen.";
    newHelpDiv.innerHTML = newHelpText;
    let newButtonsDiv = document.createElement("div");
    newButtonsDiv.id = "helpButton" + helpCounter;
    let newButton = document.createElement("button");
    newButton.onclick = function () {
        minimizeSet(0);
    }
    newButton.innerHTML = "Ersten Schritt machen";
    document.getElementById("helper").appendChild(newButtonsDiv);
    newButtonsDiv.appendChild(newButton);
}

function minimizeSet() {
    let iteration = iterationSave;
    let sets = setSave;
    if (document.getElementById("helpButton" + helpCounter)) {
        document.getElementById("helpButton" + helpCounter).style.display = "none";
    } else if (document.getElementById("helpButtonDiv" + helpCounter)) {
        document.getElementById("helpButtonDiv" + helpCounter).style.display = "none";
    }
    helpResponse("Okay, hier gibt es Hilfe für Schritt " + iteration + " bei der Mengenerstellung:");
    if (iteration == 0) {
        let newHelpDiv = document.createElement("div");
        newHelpDiv.id = "help" + helpCounter;
        document.getElementById("helper").appendChild(newHelpDiv);
        let endStates = new Array();
        questionFSM.ends.forEach(e => {
            endStates.push(questionFSM.states[e]);
        });
        let otherStates = new Array();
        questionFSM.states.forEach(s => {
            if (!endStates.includes(s)) {
                otherStates.push(s);
            }
        });
        let newHelpText = "Die Menge mit den Zielzuständen:<br>M" + iteration + ",0 = {" +
            endStates + "},<br>die Menge mit den anderen Zuständen:<br>M" + iteration + ",1 = {" +
            otherStates + "}.<br>" +
            "Am einfachsten ist es, die Mengen links als Zustände zu übernehmen und die Menge mit den " +
            "Zielzuständen als Zielzustand zu markieren.";
        newHelpDiv.innerHTML = newHelpText;
        let newButtonsDiv = document.createElement("div");
        newButtonsDiv.id = "helpButton" + helpCounter;
        let newButton = document.createElement("button");

        endSetSave = [endStates];
        setSave = [otherStates];
        newButton.onclick = function () {
            minimizeHelpStep();
        }
        newButton.innerHTML = "Habe ich gemacht";
        document.getElementById("helper").appendChild(newButtonsDiv);
        newButtonsDiv.appendChild(newButton);
    } else {
        let newHelpDiv = document.createElement("div");
        newHelpDiv.id = "help" + helpCounter;
        document.getElementById("helper").appendChild(newHelpDiv);
        let newHelpText = "";

        let minimizedSet = minimizeFurther(sets);

        if (setsThatRemain.length > 0) {
            newHelpText += "Die Zustände aus den Mengen vorher, die auf die gleichen anderen Mengen gezeigt haben, sind folgende:<br>";
            for (let i = 0; i < setsThatRemain.length; i++) {
                newHelpText += setsThatRemain[i].toString() + " haben mit einer 0 auf die Menge M" + (iteration - 1) + "," +
                    setsThatRemainIndices0[i] + " und mit einer 1 auf die Menge M" + (iteration - 1) + "," + setsThatRemainIndices1[i] +
                    " gezeigt.<br><br>"
            }
        } else {
            newHelpText += "Keine der Zustände haben mit beiden Transitionen jeweils auf die gleichen Mengen gezeigt.<br><br>";
        }

        newHelpText += "Die Mengen mit den Zuständen sehen also jetzt so aus:<br>";

        for (let i = 0; i < minimizedSet.length; i++) {
            newHelpText += "M" + iteration + "," + i + " = {" +
                minimizedSet[i].toString() + "}" + ((i == minimizedSet.length - 1) ? "" : ",") + "<br>";
        }

        if (!setCompare(minimizedSet, setSave)) {

            newHelpText += "Um fortzufahren, ist es am besten, die neuen Mengen links als Zustände zu übernehmen.";

            newHelpDiv.innerHTML = newHelpText;

            xPos = 0;
            yPos = 0;

            setSave = minimizedSet;

            let newButtonsDiv = document.createElement("div");
            newButtonsDiv.id = "helpButton" + helpCounter;
            let newButton = document.createElement("button");

            newButton.onclick = function () {
                minimizeHelpStep();
            }
            newButton.innerHTML = "Habe ich gemacht";
            document.getElementById("helper").appendChild(newButtonsDiv);
            newButtonsDiv.appendChild(newButton);

        } else {
            newHelpText += "<br>Die Mengen haben sich im vergleich zum vorherigen Schritt nicht verändert, das bedeutet, der Automat ist jetzt minimal.<br>" +
                "Es müssen nur noch die Transitionen eingezeichnet werden, dann ist die Aufgabe abgeschlossen.";

            newHelpDiv.innerHTML = newHelpText;
        }
    }
}

function minimizeHelpStep() {
    let iteration = iterationSave;
    let ends = endSetSave;
    let sets = setSave;
    let isCorrect = true;
    if (states.size <= 0 || finishStates.size <= 0) {
        isCorrect = false;
    } else {
        states.forEach(s => {
            let stateText = pruneString(s);

            let isFinish = false;
            if (iteration == 0) {
                finishStates.forEach(fs => {
                    let stateText2 = pruneString(fs.attributes.attrs.text.text);

                    if (stateText == stateText2) {
                        isFinish = true;
                    }
                });
            }
            let currentStates = new Array();
            currentStates.push(stateText.split(", "));
            if (isFinish) {
                let setHas = false;
                ends.forEach(e => {
                    setHas = setHas || e.toString() == currentStates.toString();
                });
                isCorrect = isCorrect && setHas;
            } else {
                let setHas = false;
                sets.forEach(e => {
                    setHas = setHas || e.toString() == currentStates.toString();
                });
                isCorrect = isCorrect && setHas;
            }
        });
    }
    if (isCorrect) {
        document.getElementById("helpButton" + helpCounter).style.display = "none";
        if (iteration == 0) {
            helpResponse("Sehr gut. Jetzt gilt es zu überprüfen, ob diese Mengen auch korrekt sind. " +
                "Dazu können die Zustände links markiert werden. Wenn dann im Automaten aus der Aufgabe alle " +
                "0 Transitionen auf die selbe Menge zeigen und alle 1 Transitionen auf die selbe Menge zeigen, " +
                "ist die Menge minimal. Ansonsten müssen die Zustände aus der Menge, die andere Transitionen haben, " +
                "so neu zusammengefasst werden, dass alle Zustände der neuen Mengen diese Anforderungen erfüllen.<br>");
        } else {
            helpResponse("Das stimmt. Dieses Vorgehen einfach so lange wiederholen, bis sich die Mengen der Zustände " +
                "nicht mehr ändern.");
        }

        let newButtonsDiv = document.createElement("div");
        newButtonsDiv.id = "helpButtonDiv" + helpCounter;
        let newButton = document.createElement("button");
        if (iteration == 0) {
            setSave = ends.concat(sets);
        } else {
            setSave = sets;
        }
        newButton.onclick = function () {
            checkMinimizeCorrect();
            //TODO:
        }
        newButton.innerHTML = "Ich habe den nächsten Schritt gemacht";
        document.getElementById("helper").appendChild(newButtonsDiv);
        newButtonsDiv.appendChild(newButton);

        newButton = document.createElement("button");
        iterationSave++;
        newButton.onclick = function () {
            minimizeSet();
        }
        newButton.innerHTML = "Ich brauche Hilfe";
        document.getElementById("helper").appendChild(newButtonsDiv);
        newButtonsDiv.appendChild(newButton);
    } else {
        alert("Das stimmt leider noch nicht.");
    }
}

function minimizeFurther() {
    let sets = [...setSave];
    let newSets = new Array();

    setsThatRemain = new Array();
    setsThatRemainIndices0 = new Array();
    setsThatRemainIndices1 = new Array();

    sets.forEach(s => {
        let tempS = [...s];
        while (tempS.length > 0) {
            let s1 = new Array();
            let target0 = questionFSM.getNextState(tempS[0], 0);
            let target1 = questionFSM.getNextState(tempS[0], 1);

            let target0index = getSetIndex(sets, target0);
            let target1index = getSetIndex(sets, target1);

            s1.push(tempS.shift());

            let multiplePushed = new Array();
            multiplePushed.push(s1[0]);
            for (let i = 0; i < tempS.length; i++) {
                if (getSetIndex(sets, questionFSM.getNextState(tempS[i], 0)) == target0index &&
                    getSetIndex(sets, questionFSM.getNextState(tempS[i], 1)) == target1index) {
                    s1.push(tempS.pop(i));
                    i--;
                    if (multiplePushed.length > 0) {
                        multiplePushed.push(s1[s1.length - 1]);
                    }
                }
            }
            if (multiplePushed.length > 1) {
                setsThatRemain.push(multiplePushed);
                setsThatRemainIndices0.push(target0index);
                setsThatRemainIndices1.push(target1index);
            }
            newSets.push(s1);
        }
    });

    return newSets;
}

function getSetIndex(sets, elem) {
    for (let i = 0; i < sets.length; i++) {
        if (sets[i].includes(elem)) {
            return i;
        }
    }
    return null;
}

function quickArrayCompare(arr1, arr2) {
    let result = false;
    if (arr1.length != arr2.length) {
        return false;
    }
    if (arr1 && arr2) {
        result = true;
        for (let i = 0; i < arr1.length && result; i++) {
            result = (arr1[i] == arr2[i]);
        }
    }
    return result;
}

function setCompare(set1, set2) {
    let result = false;
    if (set1.length != set2.length) {
        return false;
    }
    if (set1 && set2) {
        result = true;
        for (let i = 0; i < set1.length; i++) {
            result = result && quickArrayCompare(set1[i].sort(), set2[i].sort());
        }
    }
    return result;
}

function checkMinimizeCorrect() {
    let newSet = minimizeFurther(setSave);

    if (setCompare(newSet, setSave)) {
        hideHelpButtons();
        helpResponse("Die Mengen haben sich im vergleich zum vorherigen Schritt nicht verändert, das bedeutet, der Automat ist jetzt minimal.<br>" +
            "Es müssen nur noch die Transitionen eingezeichnet werden, dann ist die Aufgabe abgeschlossen.");
    } else {

        let iteration = iterationSave;
        let isCorrect = true;
        let currentStates = null;
        if (states.size <= 0) {
            isCorrect = false;
        } else {
            states.forEach(s => {
                let stateText = pruneString(s);

                currentStates = new Array();
                currentStates.push(stateText.split(", "));

                let setHas = false;
                newSet.forEach(e => {
                    setHas = setHas || e.sort().toString() == currentStates.sort().toString();
                });
                isCorrect = isCorrect && setHas;
            });
        }
        if (isCorrect) {
            hideHelpButtons();

            let newHelpText = "Das ist korrekt.<br>Die Mengen in Schritt " + iteration + " sind also folgende:<br>";
            for (let i = 0; i < newSet.length; i++) {
                newHelpText += "M" + iteration + "," + i + " = {" +
                    newSet[i].toString() + "}" + ((i == newSet.length - 1) ? "" : ",") + "<br>";
            }
            newHelpText += "Jetzt einfach mit diesem Verfahren weitermachen.";
            helpResponse(newHelpText);

            let newButtonsDiv = document.createElement("div");
            newButtonsDiv.id = "helpButtonDiv" + helpCounter;
            let newButton = document.createElement("button");
            setSave = newSet;
            newButton.onclick = function () {
                checkMinimizeCorrect();
            }
            newButton.innerHTML = "Ich habe den nächsten Schritt gemacht";
            document.getElementById("helper").appendChild(newButtonsDiv);
            newButtonsDiv.appendChild(newButton);

            newButton = document.createElement("button");
            iterationSave++;
            newButton.onclick = function () {
                minimizeSet();
            }
            newButton.innerHTML = "Ich brauche Hilfe";
            document.getElementById("helper").appendChild(newButtonsDiv);
            newButtonsDiv.appendChild(newButton);

        } else {
            alert("Das sind noch nicht alle Zustandsmengen.");
        }
    }
}

function hideHelpButtons() {
    if (document.getElementById("helpButton" + helpCounter)) {
        document.getElementById("helpButton" + helpCounter).style.display = "none";
    } else if (document.getElementById("helpButtonDiv" + helpCounter)) {
        document.getElementById("helpButtonDiv" + helpCounter).style.display = "none";
    }
}

function highlightSets() {
    //TODO: highlight sets for both graphs in different colors if minimize question
}

function unhighlightSets() {
    //TODO: unhighlight different colors for both graphs if minimizequestion
}

function ndetHelp() {
    let newHelpDiv = document.createElement("div");
    newHelpDiv.id = "help" + helpCounter;
    document.getElementById("helper").appendChild(newHelpDiv);
    let newHelpText = "Bei der Überführung eines nichtdeterministischen Automaten in einen deterministischen " +
        "Automaten ist die Idee, die Zustände aus der Aufgabe beginnend beim Startzustand " +
        "durchzugehen und für alle Zustände, die erreicht werden können, eine Zustandsmenge für 0 Transitionen " +
        "und eine für 1 Transitionen zu erzeugen.";
    newHelpDiv.innerHTML = newHelpText;
    let newButtonsDiv = document.createElement("div");
    newButtonsDiv.id = "helpButton" + helpCounter;
    let newButton = document.createElement("button");
    newButton.onclick = function () {
        ndetStep(0);
    }
    newButton.innerHTML = "Ersten Schritt machen";
    document.getElementById("helper").appendChild(newButtonsDiv);
    newButtonsDiv.appendChild(newButton);
}

function ndetStep() {
    hideHelpButtons();
    let newHelpText = "Der Startzustand in der Aufgabe ist " + questionFSM.states[questionFSM.start] +
        ". Am besten beginnt man damit, den Startzustand zu übernehmen.<br>";
    helpResponse(newHelpText);

    let newButtonsDiv = document.createElement("div");
    newButtonsDiv.id = "helpButton" + helpCounter;
    let newButton = document.createElement("button");

    newButton.onclick = function () {
        ndetNewStates();
    }
    newButton.innerHTML = "Habe ich gemacht";
    document.getElementById("helper").appendChild(newButtonsDiv);
    newButtonsDiv.appendChild(newButton);
}

function ndetNewStates() {
    if (iterationSave == 0) {
        if (!startState) {
            alert("Es gibt noch keinen Startzustand.");
        } else {
            let stateText = pruneString(startState.attributes.attrs.text.text).split(", ");
            if (states.size >= 1 && stateText == questionFSM.states[questionFSM.start]) {
                hideHelpButtons();
                let newHelpText = "Sehr gut. Als nächstes muss man sich die Transitionen des " +
                    "Startzustands in der Aufgabe betrachten. Er hat hier 0-Transitionen nach ";
                let moreThanOne = false;
                let targets0 = new Array();
                let targets1 = new Array();
                for (let i = 0; i < questionFSM.transitions.length; i++) {
                    let trans = questionFSM.transitions[i];
                    for (let j = 0; j < stateText.length; j++) {
                        if (trans.from == stateText[j] && trans.sign == 0) {
                            newHelpText += (moreThanOne ? ", " : " ");
                            newHelpText += trans.to;
                            targets0.push(trans.to);
                            moreThanOne = true;
                        }
                    }
                }
                moreThanOne = false;
                newHelpText += " und 1-Transitionen nach ";
                for (let i = 0; i < questionFSM.transitions.length; i++) {
                    let trans = questionFSM.transitions[i];
                    for (let j = 0; j < stateText.length; j++) {
                        if (trans.from == stateText[j] && trans.sign == 1) {
                            newHelpText += (moreThanOne ? ", " : " ");
                            newHelpText += trans.to;
                            targets1.push(trans.to);
                            moreThanOne = true;
                        }
                    }
                }

                newHelpText += ".<br>" +
                    "Also müssen jetzt alle Zustände auf die eine 0-Transition zeigt und alle Zustände auf " +
                    "die eine 1-Transition zeigt in jeweils eine Zustandsmenge zusammengefasst werden, " +
                    "also für 0 in die Menge {" + targets0.toString() + "} und für 1 in die Menge {" +
                    targets1.toString() + "}.";

                let finishFlag = false;
                questionFSM.ends.forEach(e => {
                    targets0.forEach(t => {
                        if (questionFSM.states[e] == t) {
                            finishFlag = true;
                        }
                    });
                    targets1.forEach(t => {
                        if (questionFSM.states[e] == t) {
                            finishFlag = true;
                        }
                    });
                });

                if (finishFlag) {
                    newHelpText += "<br>Eine Menge, die einen akzeptierenden Zustand enthält, muss auch zu einem " +
                        "akzeptierenden Zustand gemacht werden.";
                }

                targetStatesOld.push(targets0);
                targetStatesOld.push(targets1);
                iterationSave++;
                helpResponse(newHelpText);

                for (let i = 0; i < targetStatesOld.length; i++) {
                    targets0 = new Array();
                    targets1 = new Array();
                    for (let j = 0; j < questionFSM.transitions.length; j++) {
                        let trans = questionFSM.transitions[j];
                        for (let k = 0; k < targetStatesOld[i].length; k++) {
                            if (trans.from == targetStatesOld[i][k] && trans.sign == 0) {
                                targets0.push(trans.to);
                            }
                        }
                    }
                    targets0 = [...new Set(targets0)];
                    for (let j = 0; j < questionFSM.transitions.length; j++) {
                        let trans = questionFSM.transitions[j];
                        for (let k = 0; k < targetStatesOld[i].length; k++) {
                            if (trans.from == targetStatesOld[i][k] && trans.sign == 1) {
                                targets1.push(trans.to);
                            }
                        }
                    }
                    targets1 = [...new Set(targets1)];

                    lastTargets[i] = new Array();
                    lastTargets[i].push([...targets0]);
                    lastTargets[i].push([...targets1]);
                }

                lastState = stateText;

                let newButtonsDiv = document.createElement("div");
                newButtonsDiv.id = "helpButton" + helpCounter;
                let newButton = document.createElement("button");

                newButton.onclick = function () {
                    ndetNewStates2();
                }
                newButton.innerHTML = "Habe ich gemacht";
                document.getElementById("helper").appendChild(newButtonsDiv);
                newButtonsDiv.appendChild(newButton);
            } else {
                alert("Der Startzustand ist noch nicht korrekt.");
            }
        }
    } else {
        hideHelpButtons();
        if (answerToFSM().equivalence(solutionFSM) == 0) {
            hideHelpButtons();
            helpResponse("Sehr gut.<br>Alle Zustände wurden abgearbeitet und der Automat wurde " +
                "erfolgreich in einen deterministischen überführt.");
        } else {
            let stateText = targetStatesOld[0];
            lastState = stateText;
            let newHelpText = "Der Zustand {" + stateText + "} hat hier 0-Transitionen nach {";
            let targets0 = new Array();
            let targets1 = new Array();
            for (let i = 0; i < questionFSM.transitions.length; i++) {
                let trans = questionFSM.transitions[i];
                for (let j = 0; j < stateText.length; j++) {
                    if (trans.from == stateText[j] && trans.sign == 0) {
                        targets0.push(trans.to);
                    }
                }
            }
            targets0 = [...new Set(targets0)];
            newHelpText += targets0.join(", ");
            moreThanOne = false;
            newHelpText += "} und 1-Transitionen nach {";
            for (let i = 0; i < questionFSM.transitions.length; i++) {
                let trans = questionFSM.transitions[i];
                for (let j = 0; j < stateText.length; j++) {
                    if (trans.from == stateText[j] && trans.sign == 1) {
                        targets1.push(trans.to);
                    }
                }
            }
            targets1 = [...new Set(targets1)];
            newHelpText += targets1.join(", ");
            newHelpText += "}.<br>" +
                "Also müssen jetzt alle Zustände auf die eine 0-Transition zeigt und alle Zustände auf " +
                "die eine 1-Transition zeigt in jeweils eine Zustandsmenge zusammengefasst werden, " +
                "also für 0 in die Menge {" + targets0.toString() + "} und für 1 in die Menge {" +
                targets1.toString() + "}.";

            let finishFlag = false;
            questionFSM.ends.forEach(e => {
                targets0.forEach(t => {
                    if (questionFSM.states[e] == t) {
                        finishFlag = true;
                    }
                });
                targets1.forEach(t => {
                    if (questionFSM.states[e] == t) {
                        finishFlag = true;
                    }
                });
            });

            if (finishFlag) {
                newHelpText += "<br>Eine Menge, die einen akzeptierenden Zustand enthält, muss auch zu einem " +
                    "akzeptierenden Zustand gemacht werden.";
            }

            if (!statesVisited.includes(targets0.sort().toString()) && !(targets0.sort().toString() == stateText.sort().toString())) {
                targetStates.push(targets0);
            }
            if (!statesVisited.includes(targets1.sort().toString()) && !(targets1.sort().toString() == stateText.sort().toString())) {
                targetStates.push(targets1);
            }

            for (let i = 0; i < targetStatesOld.length; i++) {
                targets0 = new Array();
                targets1 = new Array();
                for (let j = 0; j < questionFSM.transitions.length; j++) {
                    let trans = questionFSM.transitions[j];
                    for (let k = 0; k < targetStatesOld[i].length; k++) {
                        if (trans.from == targetStatesOld[i][k] && trans.sign == 0) {
                            targets0.push(trans.to);
                        }
                    }
                }
                targets0 = [...new Set(targets0)];
                for (let j = 0; j < questionFSM.transitions.length; j++) {
                    let trans = questionFSM.transitions[j];
                    for (let k = 0; k < targetStatesOld[i].length; k++) {
                        if (trans.from == targetStatesOld[i][k] && trans.sign == 1) {
                            targets1.push(trans.to);
                        }
                    }
                }
                targets1 = [...new Set(targets1)];

                lastTargets[i] = new Array();
                lastTargets[i].push([...targets0]);
                lastTargets[i].push([...targets1]);
            }

            iterationSave++;

            helpResponse(newHelpText);

            lastState = stateText;

            let newButtonsDiv = document.createElement("div");
            newButtonsDiv.id = "helpButton" + helpCounter;
            let newButton = document.createElement("button");

            newButton.onclick = function () {
                ndetNewStates2();
            }
            newButton.innerHTML = "Habe ich gemacht";
            document.getElementById("helper").appendChild(newButtonsDiv);
            newButtonsDiv.appendChild(newButton);
        }
    }
}

function ndetNewTransitions() {
    let isCorrect0 = false;
    let isCorrect1 = false;
    graphAnswer.getLinks().forEach(link => {
        if (link.attributes.type != "fsa.StartState" && link.attributes.labels[0].attrs.text.text.includes("0")) {
            if (pruneString(graphAnswer.getCell(link.source().id).attributes.attrs.text.text).split(", ").sort().toString() == lastState.toString() &&
                (pruneString(graphAnswer.getCell(link.target().id).attributes.attrs.text.text).split(", ").sort().toString() == lastTargets[0][0].toString())) {
                isCorrect0 = true;
            }
        }
        if (link.attributes.type != "fsa.StartState" && link.attributes.labels[0].attrs.text.text.includes("1")) {
            if (pruneString(graphAnswer.getCell(link.source().id).attributes.attrs.text.text).split(", ").sort().toString() == lastState.toString() &&
                (pruneString(graphAnswer.getCell(link.target().id).attributes.attrs.text.text).split(", ").sort().toString() == lastTargets[0][1].toString())) {
                isCorrect1 = true;
            }
        }
    });

    if (isCorrect0 && isCorrect1) {
        hideHelpButtons();

        statesVisited.push(targetStatesOld.shift().sort().toString());
        lastTargets.shift();

        if (answerToFSM().equivalence(solutionFSM) == 0) {
            ndetNewStates()
        } else {

            newHelpText = "Sehr gut. Als nächstes macht man mit einem der neuen Zustände das gleiche.<br>" +
                "Beginnen wir mit {" + targetStatesOld[0] + "}.";
            helpResponse(newHelpText);

            let newButtonsDiv = document.createElement("div");
            newButtonsDiv.id = "helpButton" + helpCounter;
            let newButton = document.createElement("button");

            newButton.onclick = function () {
                ndetNewStates();
            }
            newButton.innerHTML = "Okay";
            document.getElementById("helper").appendChild(newButtonsDiv);
            newButtonsDiv.appendChild(newButton);
        }
    } else if (!isCorrect0 && !isCorrect1) {
        alert("Es fehlen noch beide Transitionen.");
    } else if (!isCorrect0) {
        alert("Es fehlt noch die 0-Transition.")
    } else if (!isCorrect1) {
        alert("Es fehlt noch die 1-Transition.");
    }
}


function ndetNewStates2() {
    let isCorrect = true;
    for (let i = 0; i < targetStatesOld.length; i++) {
        let hasState = false;
        states.forEach(s => {
            let stateText = pruneString(s);
            stateText = stateText.split(", ").sort().toString();
            hasState = hasState || targetStatesOld[i].includes(stateText);
        });
        isCorrect = isCorrect && hasState;
    }
    let finishFlag = false;
    questionFSM.ends.forEach(e => {
        targetStatesOld.forEach(t => {
            if (t.includes(questionFSM.states[e])) {
                let isSetAsFinishState = false;
                finishStates.forEach(fs => {
                    if (pruneString(fs.attributes.attrs.text.text).split(", ").sort().toString() == t.toString()) {
                        isSetAsFinishState = true;
                    }
                });
                if (!isSetAsFinishState) {
                    finishFlag = true;
                }
            }
        });
    });

    if (isCorrect) {
        if (finishFlag) {
            alert("Es fehlt noch ein Zielzustand.");
        } else {
            hideHelpButtons();
            newHelpText = "Sehr gut. Als nächstes müssen die Transitionen auf die neuen Zustände gesetzt " +
                "werden.<br>" +
                "Beginnen wir mit {" + targetStatesOld[0] + "}.<br>" +
                "Der Zustand braucht eine 0-Transition nach {" + lastTargets[0][0] + "} und eine 1-Transition " +
                "nach {" + lastTargets[0][1] + "}.";
            helpResponse(newHelpText);

            let newButtonsDiv = document.createElement("div");
            newButtonsDiv.id = "helpButton" + helpCounter;
            let newButton = document.createElement("button");

            newButton.onclick = function () {
                ndetNewTransitions();
            }
            newButton.innerHTML = "Habe ich gemacht.";
            document.getElementById("helper").appendChild(newButtonsDiv);
            newButtonsDiv.appendChild(newButton);
        }
    } else {
        alert("Es fehlen noch Zustände.");
    }
}

function languageHelp() {
    let newHelpDiv = document.createElement("div");
    newHelpDiv.id = "help" + helpCounter;
    document.getElementById("helper").appendChild(newHelpDiv);
    let newHelpText = "Bei der Erzeugung eines Automaten aus einer Sprache ist die Idee, " +
        "sich für einzelne Zeichenketten zu überlegen, ob sie zur Sprache gehören oder ob man etwas " +
        "an sie anhängen kann, damit sie zur Sprache gehören.";
    newHelpDiv.innerHTML = newHelpText;
    let newButtonsDiv = document.createElement("div");
    newButtonsDiv.id = "helpButton" + helpCounter;
    let newButton = document.createElement("button");
    newButton.onclick = function () {
        languageStep1();
    }
    newButton.innerHTML = "Ersten Schritt machen";
    document.getElementById("helper").appendChild(newButtonsDiv);
    newButtonsDiv.appendChild(newButton);
}

function languageStep1() {
    hideHelpButtons();
    let newHelpText = "Man beginnt damit, zu überlegen ob das leere Wort zur Sprache gehört. Wenn ja, dann " +
        "muss der Startzustand akzeptierend sein, sonst darf er das nicht sein.";

    if (solutionFSM.compute("")) {
        newHelpText += "<br>Hier gehört das leere Wort zur Sprache, der Startzustand muss also akzeptierend sein.";
    } else {
        newHelpText += "<br>Hier gehört das leere Wort nicht zur Sprache, der Startzustand " +
            "darf also nicht akzeptierend sein."
    }
    helpResponse(newHelpText);
    let newButtonsDiv = document.createElement("div");
    newButtonsDiv.id = "helpButton" + helpCounter;
    let newButton = document.createElement("button");
    newButton.onclick = function () {
        languageStep2();
    }
    newButton.innerHTML = "Weiter";
    document.getElementById("helper").appendChild(newButtonsDiv);
    newButtonsDiv.appendChild(newButton);

    hiddenIndex = solutionFSM.start;
    hiddenState = solutionFSM.states[hiddenIndex];
    savedStateSize = 0;
}

function languageStep2() {

    let errorMessage = 1;
    if (states.size == savedStateSize + 1) {
        let s = [...states];
        for (let [key, value] of stateMap) {
            if (s.includes(value)) {
                let i = s.indexOf(value);
                s.splice(i, 1);
            }
        }
        console.log(s.length);
        if (s.length == 1) {
            stateMap.set(hiddenState, s[0]);
            currentState = s[0];
        }
    }

    if (states.size > savedStateSize + 1) {
        errorMessage = "Es wurden zu viele Zustände hinzugefügt.";
    } else if (states.size < savedStateSize + 1) {
        if (answerToFSM.equivalence(solutionFSM) == 0) {
            errorMessage = 2;
        } else {
            errorMessage = "Es wurden keine neuen Zustände hinzugefügt.";
        }
    }

    if (errorMessage == 1) {

        savedStateSize++;
        hideHelpButtons();

        let newHelpText = "Jetzt muss man sich fragen, was passiert, wenn man im Zustand " +
            currentState + " an die Zeichenkette eine 0 anhängt.<br>";

        let nextState = solutionFSM.getNextState(hiddenState, "0");

        if (nextState == hiddenState) {
            newHelpText += "Hier ändert sich bezüglich der Sprache nichts, wenn eine 0 angehängt wird, " +
                "man bleibt also im gleichen Zustand. Das heißt, er kann eine 0-Transition auf sich selbst bekommen.";
            hiddenTarget = false;
        } else {
            newHelpText += "Hier ändert sich sich etwas, wenn man eine 0 anhängt. Man benötigt also eine " +
                "0-Transition in einen anderen Zustand.<br>";
            hiddenTarget = solutionFSM.getNextState(hiddenState);

            let mapContains = stateMap.has(hiddenTarget);
            if (mapContains) {
                newHelpText += "Dieser Zustand ist aber bereits erstellt. Welcher könnte es sein?";
            } else {
                newHelpText += "Diesen Zustand gibt es aber noch nicht. Da muss ein neuer angelegt werden.";
                if (!statesToVisit.includes(hiddenTarget)) {
                    statesToVisit.push(hiddenTarget);
                }
            }
        }
        helpResponse(newHelpText);
        let newButtonsDiv = document.createElement("div");
        newButtonsDiv.id = "helpButton" + helpCounter;

        if (nextState != hiddenState && hiddenTarget) {
            let revealButton = document.createElement("button");
            revealButton.onclick = function () {
                languageReveal();
            }
            stepSave = 3;
            revealButton.innerHTML = "Zeigen";
            revealButton.id = "revealbtn" + helpCounter;

            newButtonsDiv.appendChild(revealButton);

        }
        document.getElementById("helper").appendChild(newButtonsDiv);
        let newButton = document.createElement("button");
        newButton.onclick = function () {
            languageStep3();
        }
        newButton.innerHTML = "Weiter";
        document.getElementById("helper").appendChild(newButtonsDiv);
        newButtonsDiv.appendChild(newButton);
    } else if(errorMessage == 2){
        hideHelpButtons();
        helpResponse("Fertig.");
    }else{
        alert(errorMessage);
    }
}


function languageStep3() {
    let thisState;
    let errorMessage = 1;
    let thisTarget = hiddenTarget;

    let hiddenAdd = 0;
    if (hiddenTarget && !stateMap.has(hiddenTarget)) {
        hiddenAdd = 1;
    }
    if (states.size == savedStateSize + hiddenAdd) {
        let s = [...states];
        for (let [key, value] of stateMap) {
            if (s.includes(value)) {
                let i = s.indexOf(value);
                s.splice(i, 1);
            }
        }
        console.log(s.length);
        if (s.length == 1 && hiddenTarget) {
            stateMap.set(hiddenTarget, s[0]);
        }
    }
    if (states.size > savedStateSize + hiddenAdd) {
        errorMessage = "Es wurden zu viele Zustände hinzugefügt.";
    } else if (states.size < savedStateSize + hiddenAdd) {
        errorMessage = "Es wurden keine neuen Zustände hinzugefügt.";
    }

    if (errorMessage == 1) {
        hideHelpButtons();

        let newHelpText = "Jetzt muss man sich fragen, was passiert, wenn man im Zustand " +
            currentState + " an die Zeichenkette eine 1 anhängt.<br>";

        let nextState = solutionFSM.getNextState(hiddenState, "1");

        if (nextState == hiddenState) {
            newHelpText += "Hier ändert sich bezüglich der Sprache nichts, wenn eine 1 angehängt wird, " +
                "man bleibt also im gleichen Zustand. Das heißt, er kann eine 1-Transition auf sich selbst bekommen.";
            hiddenTarget = false;
        } else {
            newHelpText += "Hier ändert sich sich etwas, wenn man eine 1 anhängt. Man benötigt also eine " +
                "1-Transition in einen anderen Zustand.<br>";
            hiddenTarget = solutionFSM.getNextState(hiddenState, "1");
            let mapContains = stateMap.has(hiddenTarget);
            if (mapContains) {
                newHelpText += "Dieser Zustand ist aber bereits erstellt. Welcher könnte es sein?";
            } else {
                newHelpText += "Diesen Zustand gibt es aber noch nicht. Da muss ein neuer angelegt werden.";
                if (!statesToVisit.includes(hiddenTarget)) {
                    statesToVisit.push(hiddenTarget);
                }
            }
        }
        helpResponse(newHelpText);
        let newButtonsDiv = document.createElement("div");
        newButtonsDiv.id = "helpButton" + helpCounter;

        if (stateMap.has(hiddenTarget)) {
            let revealButton = document.createElement("button");
            revealButton.onclick = function () {
                languageReveal();
            }
            stepSave = 2;
            revealButton.innerHTML = "Zeigen";
            revealButton.id = "revealbtn" + helpCounter;

            newButtonsDiv.appendChild(revealButton);

        }
        document.getElementById("helper").appendChild(newButtonsDiv);
        let newButton = document.createElement("button");
        newButton.onclick = function () {
            languageStep2();
        }
        newButton.innerHTML = "Weiter";
        document.getElementById("helper").appendChild(newButtonsDiv);
        newButtonsDiv.appendChild(newButton);

        statesVisited.push(hiddenState);
        hiddenState = hiddenTarget ? hiddenTarget : null;
    } else {
        alert(errorMessage);
    }
}

function languageReveal() {
    hideHelpButtons();

    let newHelpText = "Der gesuchte Zustand ist " + hiddenTarget + ".";
    helpResponse(newHelpText);

    let newButtonsDiv = document.createElement("div");
    newButtonsDiv.id = "helpButton" + helpCounter;
    let newButton = document.createElement("button");
    if (stepSave == 2) {
        newButton.onclick = function () {
            languageStep2();
        }
    }
    if (stepSave == 3) {
        newButton.onclick = function () {
            languageStep3();
        }
    }

    newButton.innerHTML = "Weiter";
    document.getElementById("helper").appendChild(newButtonsDiv);
    newButtonsDiv.appendChild(newButton);
}