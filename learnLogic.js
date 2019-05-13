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

var topHints = 2.5;
var bottomHints = 2.5;
var hintCountTop;
var hintCountBottom;

/**
 * This is used to highlight corresponding states in the other paper.
 */
var customHighlighter = {
    highlighter: {
        name: 'stroke',
        options: {
            padding: 10,
            rx: 5,
            ry: 5,
            attrs: {
                'stroke-width': 3,
                stroke: '#00FF00'
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

        unhighlightQuestion(customHighlighter);

        if (!graphAnswer.getLinks().includes(node.model) && node.model != start) {
            graphQuestion.getElements().forEach(element => {
                if (element.attributes.type != "fsa.StartState") {
                    var textSnippets = selectedState.attributes.attrs.text.text.split(", ");
                    textSnippets.forEach(snip => {
                        if (element.attributes.attrs.text.text.includes(snip)) {
                            paperQuestion.findViewByModel(element).highlight(null, customHighlighter);
                        }
                    });
                }
            });
        }
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
        node.highlight();
        selectedStateQuestion = node.model;

        unhighlight(customHighlighter);

        graphAnswer.getElements().forEach(element => {
            if (element != start) {
                if (element.attributes.attrs.text.text.includes(selectedStateQuestion.id)) {
                    paperAnswer.findViewByModel(element).highlight(null, customHighlighter);
                }
            }
        })
    });

    hintCountTop = 0;
    hintCountBottom = 0;
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
    var vertex;
    // vertex = getHalfcircleVertex(source, target);
    // vertices = [vertex];
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

/**
 * Used for creating transitions in question graph.
 * 
 * @param {Cell} source : Source cell.
 * @param {Cell} target : Target cell.
 * @param {String} label : Transition label (0 or 1).
 */
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
 * 
 * @param {*} highlighter : Custom highlighter to be unhighlighted.
 */
function unhighlight(highlighter) {
    if (graphAnswer.getCells().length > 0) {
        graphAnswer.getCells().forEach(element => {
            paperAnswer.findViewByModel(element).unhighlight(null, highlighter);
        });
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
        if(finishStates.has(selectedState)){
            finishStates.delete(selectedState);
        }
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
            graphAnswer.getLinks().forEach(graphElement => {
                if (linkId.id == graphElement.id && newNeeded) {
                    if (from == graphElement.source().id && to == graphElement.target().id) {
                        if (graphElement.attributes.labels[0].attrs.text.text.includes(lbl)) {
                            infoTextColor("Diese Transition existiert bereits.", "red");
                        } else {
                            graphElement.attributes.labels[0].attrs.text.text = ("0, 1");
                            graphElement.attr('text/text', '0, 1');
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
                        start: 0,
                        states: ["q0", "q1", "q2"],
                        ends: [1, 2],
                        transitions: [{
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
                        start: 0,
                        states: ["q0", "q1"],
                        ends: [1],
                        transitions: [{
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
        packedQuestion.questionFSM.transitions,
        packedQuestion.questionFSM.ends);
    solutionFSM = new FSM(packedQuestion.solutionFSM.start,
        packedQuestion.solutionFSM.states,
        packedQuestion.solutionFSM.transitions,
        packedQuestion.solutionFSM.ends);

    drawQuestion(questionFSM);
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

    let xqPos = 0;
    let yqPos = 0;

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
    });

    questionLink(startQuestion, graphQuestion.getCell(fsm.states[fsm.start]));

    fsm.transitions.forEach(transition => {
        let newNeeded = true;
        if (graphQuestion.getLinks().length > 0) {
            graphQuestion.getLinks().forEach(linkId => {
                graphQuestion.getLinks().forEach(graphElement => {
                    if (newNeeded && linkId.id == graphElement.id) {
                        if (transition.from == graphElement.source().id &&
                            transition.to == graphElement.target().id) {
                            if (!graphElement.attributes.labels[0].attrs.text.text.includes(transition.sign)) {
                                graphElement.attributes.labels[0].attrs.text.text = ("0 , 1");
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
    });

    fsm.ends.forEach(end => {
        graphQuestion.getCell(fsm.states[end]).attr('circle/fill', 'yellow');
    })
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
        alert(alertText);
    }
}

/**
 * This casts the given answer to a new FSM.
 */
function answerToFSM() {
    let newTransitions = new Array();
    let newStates = Array.from(states);
    let newStartState;
    let ends = new Array();

    if (graphAnswer.getLinks().length > 0) {
        graphAnswer.getLinks().forEach(link => {
            if (link != startLink) {
                link.label().attrs.text.text.split(', ').forEach(splitLabel => {
                    newTransitions.push({
                        from: link.source().id,
                        sign: splitLabel,
                        to: link.target().id
                    });
                });
            }
        });
    }

    newStartState = (startState != null) ? newStates.indexOf(startState.id) : null;

    finishStates.forEach(fState => {
        ends.push(newStates.indexOf(fState.id));
    });

    return new FSM(newStartState, newStates, newTransitions, ends);
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

function getHalfcircleVertex(source, target) {
    var sx = source.position().x;
    var sy = source.position().y;
    var tx = target.position().x;
    var ty = target.position().y;

    tx = tx - sx;
    ty = ty - sy;

    var mx = tx / 2;
    var my = ty / 2;

    var vx = ((ty - my) / 2) + sx;
    var vy = -(tx - mx) / 2 + sy;

    return {
        x: vx,
        y: vy
    };
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
function hint(answer){
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

    if(answer){
        hintCountBottom += (hintCountBottom < 4) ? 1 : 0;
    }else{
        hintCountTop += (hintCountTop < 4) ? 1 : 0;
    }

    alert(hintStringsFormatted);
}