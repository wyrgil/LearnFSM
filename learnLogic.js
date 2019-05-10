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
 * These two variables are the cytoscape models for question and answer.
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

/**
 * These variables are for the question part
 */
var questionFSM;
var solutionFSM;

var selectedStateQuestion;

var pushToBottomSetFlag = false;

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
        heigth: '60%',
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
        node.highlight();
        selectedState = node.model;

        finishButtonText();
        // infoText('');
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

    paperQuestion.on('cell:pointerdown', function (node) {
        if (graphQuestion.getCells().length > 0) {
            graphQuestion.getCells().forEach(element => {
                paperQuestion.findViewByModel(element).unhighlight();
            });
        }
        node.highlight();
        selectedStateQuestion = node.model;

        unhighlight();

        graphAnswer.getCells().forEach(cell => {
            if (!graphAnswer.getLinks().includes(cell) && cell != start) {
                if (cell.id.includes(selectedStateQuestion.id)) {
                    paperAnswer.findViewByModel(cell).highlight();
                }
            }
        })
    });
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

/**
 * Creates a new transition between two cells in the answer graph.
 * 
 * @param {Cell} source : The cell from which the transition starts.
 * @param {Cell} target : The cell to whom the transition points.
 * @param {String} label : Name of the transition (0 or 1).
 * @param {*} vertices 
 */
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

function questionLink(source, target, label) {
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
        vertices: []
    });
    graphQuestion.addCell(cell);
}

/**
 * Unhighlights everything in the answer graph.
 */
function unhighlight() {
    if (graphAnswer.getCells().length > 0) {
        graphAnswer.getCells().forEach(element => {
            paperAnswer.findViewByModel(element).unhighlight();
        });
    }
}

function unhighlightQuestion() {
    if (graphQuestion.getCells().length > 0) {
        graphQuestion.getCells().forEach(element => {
            paperQuestion.findViewByModel(element).unhighlight();
        });
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
        stateName = fromTop;
    }
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
    }
}

/**
 * Removes the currently selected state from the answer graph.
 */
function deleteState() {
    if (selectedState == null) {
        infoTextColor("Es muss zuerst ein Zustand ausgewählt werden.", "red");
    } else {
        graphAnswer.removeCells(selectedState);
        states.delete(selectedState.id);
        nodes.delete(selectedState);
        selectedState = null;
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
        } else {
            finishStates.add(selectedState);
            selectedState.attr('circle/fill', 'yellow');
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
        infoTextColor("Bitte auf das Ziel klicken", "black");
        transitionSetFlag = true;
        lbl = literal;
    } else {
        infoTextColor("Bitte erst einen Zustand auswählen", "red");
    }
}

/**
 * Sets the new transition from source to target.
 * 
 * @param {Cell} node : Node to which the tranisiton points.
 * @param {String} lbl : Name of the transition (0 or 1).
 */
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
                            graphCell.attributes.labels[0].attrs.text.text = ("0, 1");
                            graphCell.attr('text/text', '0, 1');
                        }
                        newNeeded = false;
                    }
                }
            });
        });
    }
    if (graphAnswer.getLinks().length > 0) {
        graphAnswer.getLinks().forEach(linkId => {
            if (newNeeded && from == linkId.source().id) {
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
    }
    transitionSetFlag = false;
    lbl = null;
}

/**
 * Sets the text of the "makeFinish" button to display "add" or "remove",
 * depending on whether the selected state is a finish state or not.
 */
function finishButtonText() {
    if (finishStates.has(selectedState)) {
        document.getElementById("makeFinish").textContent = "Zielzustand entfernen";
    } else {
        document.getElementById("makeFinish").textContent = "Zum Zielzustand machen";
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
        switch (document.getElementById("questionType").innerHTML) {
            case "minimize":
                packedQuestion = {
                    questionText: "Minimieren Sie diesen Automaten.",
                    questionFSM: {
                        start: "q0",
                        states: ["q0", "q1", "q2"],
                        ends: ["q1", "q2"],
                        trans: [{
                            from: "q0",
                            sign: "0",
                            to: "q1"
                        }, {
                            from: "q0",
                            sign: "1",
                            to: "q1"
                        }, {
                            from: "q1",
                            sign: "0",
                            to: "q2"
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
                            to: "q1"
                        }]
                    },
                    solutionFSM: {
                        start: "q0",
                        states: ["q0", "q1"],
                        ends: ["q1"],
                        trans: [{
                            from: "q0",
                            sign: "0",
                            to: "q1"
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
                            to: "q1"
                        }]
                    }
                }
                break;

            default:
                break;
        }
    }
    document.getElementById("questionText").innerHTML = packedQuestion.questionText;
    questionFSM = new FSM(packedQuestion.questionFSM.start,
        packedQuestion.questionFSM.states,
        packedQuestion.questionFSM.trans,
        packedQuestion.questionFSM.ends);
    solutionFSM = new FSM(packedQuestion.solutionFSM.start,
        packedQuestion.solutionFSM.states,
        packedQuestion.solutionFSM.trans,
        packedQuestion.solutionFSM.ends);

    drawQuestion(questionFSM);
}

/**
 * Takes an FSM and draws it on the questionPaper as a graph.
 * 
 * @param {FSM} fsm : The FSM to draw.
 */
function drawQuestion(fsm) {
    var startQuestion = new joint.shapes.fsa.StartState({
        position: {
            x: 10,
            y: 10
        }
    });
    graphQuestion.addCell(startQuestion);

    var xqPos = 0;
    var yqPos = 0;

    fsm.states.forEach(state => {
        var cell = new joint.shapes.fsa.State({
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
    });

    questionLink(startQuestion, graphQuestion.getCell(fsm.start));

    fsm.trans.forEach(transition => {
        var newNeeded = true;
        if (graphQuestion.getLinks().length > 0) {
            graphQuestion.getLinks().forEach(linkId => {
                graphQuestion.getCells().forEach(graphCell => {
                    if (newNeeded && linkId.id == graphCell.id) {
                        if (transition.from == graphCell.source().id &&
                            transition.to == graphCell.target().id) {
                            if (!graphCell.attributes.labels[0].attrs.text.text.includes(transition.sign)) {
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
            questionLink(graphQuestion.getCell(transition.from),
                graphQuestion.getCell(transition.to),
                transition.sign);
        }
    });

    fsm.ends.forEach(end => {
        graphQuestion.getCell(end).attr('circle/fill', 'yellow');
    })
}

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
        alert(alertText);
    }
}

function answerToFSM() {
    var trans = new Array();
    var startName;
    var ends = new Array();

    if (graphAnswer.getLinks().length > 0) {
        graphAnswer.getLinks().forEach(link => {
            if (link != startLink) {
                link.label().attrs.text.text.split(', ').forEach(splitLabel => {
                    trans.push({
                        from: link.source().id,
                        sign: splitLabel,
                        to: link.target().id
                    });
                });
            }
        });
    }

    startName = (startState != null) ? startState.id : null;

    finishStates.forEach(fState => {
        ends.push(fState.id);
    });

    return new FSM(startName, Array.from(states), trans, ends);
}

function addToBottom() {
    if (!graphQuestion.getLinks().includes(selectedStateQuestion)) {
        newState(selectedStateQuestion.id);
    } else {
        infoTextColor("Bitte einen Zustand auswählen.", "red");
    }
}

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
        if (!graphAnswer.getCell(cellId.id).attributes.attrs.text.text.includes(selectedStateQuestion.id)) {
            var newText;
            newText = graphAnswer.getCell(cellId.id).attributes.attrs.text.text + ", " + selectedStateQuestion.id;
            if ((splitText = newText.split(", ")).length > 2) {
                for (var i = 2; i < splitText.length; i += 2) {
                    splitText[i] = "\n" + splitText[i];
                }
                newText = splitText.join(', ');
            }
            var cellToChange = graphAnswer.getCell(cellId.id);
            // cellToChange.id = newText;
            cellToChange.attr('text/text', newText);
            pushToBottomSetFlag = false;
        } else {
            infoTextColor("Dieser Zustand hat diesen Namen bereits.", "red");
        }
    }
}