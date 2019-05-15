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

var nodeSize = 80;

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

        unhighlightQuestion(customHighlighter);

        if (!graphAnswer.getLinks().includes(node.model) && node.model != start) {
            graphQuestion.getElements().forEach(element => {
                if (element.attributes.type != "fsa.StartState") {
                    let stateText = selectedState.attributes.attrs.text.text;
                    if (stateText[0] == "{") {
                        stateText = stateText.substr(1, stateText.length - 2);
                    }
                    var textSnippets = stateText.split(", ");
                    textSnippets.forEach(snip => {
                        let snap = element.attributes.attrs.text.text;
                        if (snap[0] == "{") {
                            snap = snap.substr(1, snap.length - 2);
                        }
                        if (snap == snip) {
                            paperQuestion.findViewByModel(element).highlight(null, customHighlighter);
                        }
                    });
                }
            });
        }

        if (node.model != startLink) {
            if (node.model.attributes.type == "standard.Link") {
                highlightTable(graphAnswer.getCell(selectedState.source().id).attributes.attrs.text.text, selectedState.attributes.labels[0].attrs.text.text);
            } else {
                highlightTable(selectedState.attributes.attrs.text.text);
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
                let snap = element.attributes.attrs.text.text;
                if (snap[0] == "{") {
                    snap = snap.substr(1, snap.length - 2);
                }
                if (snap == selectedStateQuestion.id) {
                    paperAnswer.findViewByModel(element).highlight(null, customHighlighter);
                }
            }
        });

        if (node.model.attributes.type == "standard.Link") {
            highlightTable(selectedStateQuestion.source().id, selectedStateQuestion.attributes.labels[0].attrs.text.text);
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

        document.getElementById("answerStartState").innerHTML = "Startzustand: " + selectedState.attributes.attrs.text.text
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
            states.delete(selectedState.id);
            nodes.delete(selectedState);
            if (finishStates.has(selectedState)) {
                finishStates.delete(selectedState);
            }

            if (selectedState.attributes.type == "standard.Link") {
                let table = document.getElementById("answerTransitions");
                let rows = table.rows;
                for (let i = 1; i < rows.length; i++) {
                    if (graphAnswer.getCell(selectedState.source().id).attributes.attrs.text.text == rows[i].cells[0].innerHTML &&
                        selectedState.attributes.labels[0].attrs.text.text == rows[i].cells[1].innerHTML &&
                        graphAnswer.getCell(selectedState.target().id).attributes.attrs.text.text == rows[i].cells[2].innerHTML) {
                        table.deleteRow(i);
                        i--;
                    }
                }
            } else {
                let stateText = selectedState.attributes.attrs.text.text;
                let table = document.getElementById("answerStates");
                for(let i = 0; i < table.rows[0].cells.length; i++){
                    if(table.rows[0].cells[i].innerHTML == stateText){
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
                    if (selectedState.attributes.attrs.text.text == table.rows[0].cells[i].innerHTML) {
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
                if (selectedState.attributes.attrs.text.text == table.rows[0].cells[i].innerHTML) {
                    table.rows[0].deleteCell(i);
                }
            }
        } else {
            finishStates.add(selectedState);
            selectedState.attr('circle/fill', 'yellow');

            document.getElementById("answerEndStatesText").innerHTML = "Akzeptierende Zustände der Antwort.";
            let table = document.getElementById("answerEndStates");
            let tableCell = table.rows[0].insertCell(table.rows[0].length);
            tableCell.innerHTML = selectedState.attributes.attrs.text.text;
            tableCell.setAttribute("id", "answerEnd-" + selectedState.attributes.attrs.text.text);
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
                if (newNeeded && from == graphAnswer.getCell(linkId.source().id).attributes.attrs.text.text) {
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

    if (packedQuestion.questionFSM) {
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
        if (document.getElementById("questionType").innerHTML != "minimize" && fsmToCheck.equivalence(solutionFSM) == 0) {
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
        let snap = graphAnswer.getCell(cellId.id).attributes.attrs.text.text;
        let saveForTable = snap;
        if (snap[0] == "{") {
            snap = snap.substr(1, snap.length - 2);
        }
        if (snap != selectedStateQuestion.id) {
            let newText;
            newText = graphAnswer.getCell(cellId.id).attributes.attrs.text.text;
            if (states.has(newText)) {
                states.delete(newText);
            }
            newText = newText.substr(1, newText.length - 2);
            newText += ", " + selectedStateQuestion.id;
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
                let snop = rows[i].cells[0].innerHTML;
                if (saveForTable == snop) {
                    rows[i].cells[0].innerHTML = newText.replace("\n", "");
                }
                snop = rows[i].cells[2].innerHTML;
                if (saveForTable == snop) {
                    rows[i].cells[2].innerHTML = newText.replace("\n", "");
                }
                sortTable();
            }

            table = document.getElementById("answerStates");
            for (let i = 0; i < table.rows[0].cells.length; i++) {
                let snop = table.rows[0].cells[i].innerHTML;
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
        let sourceText = linkSource.attributes.attrs.text.text;
        if (sourceText[0] == "{") {
            sourceText = sourceText.substr(1, sourceText.length - 2);
        }
        let sourceArray = sourceText.split(', ');
        sourceArray.forEach(lbl => {
            g2.getLinks().forEach(link => {
                if (g2.getCell(link.source().id).attributes.type != "fsa.StartState") {
                    let otherGraphText = g2.getCell(link.source().id).attributes.attrs.text.text;
                    if (otherGraphText[0] == "{") {
                        otherGraphText = otherGraphText.substr(1, otherGraphText.length - 2);
                    }
                    if (otherGraphText == lbl) {
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
    cellFrom.innerHTML = graphAnswer.getCell(fromState).attributes.attrs.text.text;

    let cellSign = row.insertCell(1);
    cellSign.innerHTML = symb;

    let cellTo = row.insertCell(2);
    cellTo.innerHTML = graphAnswer.getCell(toState).attributes.attrs.text.text;

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
        if (rows[i].cells[0].innerHTML.includes(fromName) &&
            sign.includes(rows[i].cells[1].innerHTML)) {
            rows[i].classList.add("tableHighlight");
        }
    }
}