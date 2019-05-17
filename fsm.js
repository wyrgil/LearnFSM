/**
 * @author Marius Santin <marius.santin@gmail.com>
 */

class FSM {
    constructor() {
        if (arguments.length != 4) {
            this.start = null;
            this.states = new Array();
            this.transitions = new Array();
            this.ends = new Array();
        } else {
            this.start = arguments[0];
            this.states = arguments[1];
            this.transitions = arguments[2];
            this.ends = arguments[3];
        }
    }

    setStart(start) {
        this.start = start;
    }

    addState(state) {
        this.states.add(state);
    }

    removeState(state) {
        if (this.states.includes(state)) {
            this.states.pop(state);
        }
    }

    addTransition(transition) {
        this.transitions.add(transition);
    }

    removeTransition(transition) {
        if (this.transitions.includes(transition)) {
            this.transitions.pop(transition);
        }
    }

    addEnd(end) {
        this.ends.add(end);
    }

    removeEnd(end) {
        if (this.ends.includes(end)) {
            this.ends.pop(end);
        }
    }

    getNextState(state, sign) {
        var ret = null;
        this.transitions.forEach(t => {
            if (t.from == state && t.sign == sign) {
                ret = t.to;
            }
        });
        return ret;
    }

    /**
     * Compares the given FSM to this FSM, but just on acceptance level.
     * 
     * @param {FSM} fsm : FSM to compare
     */
    equivalence(fsm) {
        let correctness = this.isCorrect();
        if(correctness != 0){
            return "Ungültiger Automat: " + correctness;
        }

        let result = 0;
        let mapper = new Map();
        mapper.set(this.states[this.start], fsm.states[fsm.start]);

        let transitions = new Array();

        transitions.push([this.states[this.start], fsm.states[fsm.start]]);

        let i = 0;
        do {
            ["0", "1"].forEach(s => {
                let qt = this.getNextState(transitions[i][0], s);
                let qf = fsm.getNextState(transitions[i][1], s);
                if (qt && qf) {
                    if (this.ends.includes(this.states.indexOf(qt)) != fsm.ends.includes(fsm.states.indexOf(qf))) {
                        result = "Es gibt noch falsche Transitionen.";
                    }
                    mapper.set(qt, qf);
                    let add = true;
                    transitions.forEach(t => {
                        if (arrayCompare(t, [qt, qf])) {
                            add = false;
                        }
                    });
                    if (add) {
                        transitions.push([qt, qf]);
                    }
                } else {
                    result = "Es fehlen noch Zustände";
                }
            });

            i++;
        } while (i < mapper.size);

        let fins = new Array();

        this.ends.forEach(end => {
            fins.push(mapper.get(this.states[end]));
        });

        let finsToCompare = new Array();
        fsm.ends.forEach(end => {
            finsToCompare.push(fsm.states[end]);
        });

        if (result == 0 && arrayCompare(fins, fsm.ends)) {
            result = 0;
        }

        return result;
    }

    isCorrect() {
        let correct = true;

        if (this.start && (this.start >= this.states.length || this.start < 0)) {
            return "Kein oder falscher Startzustand.";
        }

        for(let i = 0; i < this.ends.length; i++){
            if (this.ends[i] >= this.states.length || this.ends[i] < 0) {
                return "Falsche Startzustände.";
            }
        }

        for (let i = 0; i < this.states.length; i++) {
            let has0Transition = false;
            let has1Transition = false;
            for (let j = 0; j < this.transitions.length; j++) {
                if (this.transitions[j].from == this.states[i] &&
                    this.transitions[j].sing == "0") {
                    has0Transition = has0Transition || true;
                }
                if (this.transitions[j].from == this.states[i] &&
                    this.transitions[j].sing == "1") {
                    has1Transition = has1Transition || true;
                }
            }
            correct = correct && has0Transition && has1Transition;
            if(!correct){
                return "Fehlende Transitionen.";
            }
        }

        return 0;
    }

    /**
     * Compares this FSM to another FSM and checks for equality.
     * 
     * @param {FSM} fsm : The finite state machine to be compared to the current one.
     * 
     * @returns 0 in case of equality, else a error message.
     */
    equal(fsm) {
        var result = 0;

        if (this.states.length > 0 && this.start == null) {
            return "Es wurde noch kein Startzustand deklariert."
        }

        if (this.states.length < fsm.states.length) {
            return "Es fehlen noch Zustände.";
        }

        if (this.transitions.length < fsm.transitions.length ||
            this.transitions.length < this.states.length * 2) {
            return "Es fehlen noch Transitionen.";
        }

        if (this.ends.length < fsm.ends.length) {
            return "Es fehlen noch akzeptierende Zustände.";
        }

        let light = this.equivalence(fsm);
        if (light != 0) {
            return light;
        }

        if (this.states.length > fsm.states.length) {
            return "Der Automat hat zu viele Zustände.";
        }

        if (this.transitions.length > fsm.transitions.length ||
            this.transitions.length > this.states.length * 2) {
            return "Der Automat hat zu viele Transitionen";
        }

        if (this.ends.length > fsm.ends.length) {
            return "Der Automat hat zu viele akzeptierende Zustände.";
        }

        return 0;
    }

    /**
     * Computes if the FSM accepts the given char sequence or not.
     * 
     * @param {String} signs : Char sequence to compute.
     * 
     * @returns {Boolean} Accept or not.
     */
    compute(signs) {
        let currentState = this.states[this.start];

        for (let i = 0; i < signs.length; i++) {
            let sign = signs[i];
            let nextState = null;

            this.transitions.forEach(t => {
                if (t.from == currentState && t.sign == sign) {
                    nextState = t.to;
                }
            });
            if (!nextState) {
                currentState = null;
                break;
            }
            currentState = nextState;
        }
        return this.ends.includes(this.states.indexOf(currentState));
    }

    /**
     * Evaluates the first <count> accepted char sequences for this FSM. 
     * 
     * @param {Number} count : Number of hints to give.
     * 
     * @returns {String[]} String array of accepted char sequences.
     */
    getHints(count) {
        let acceptedStrings = new Array();
        let visitedStrings = new Array();

        if (this.ends.length <= 0) {
            //add empty set "Ø"
            acceptedStrings.push(String.fromCharCode(8709));

            return acceptedStrings;
        }

        if (this.ends.includes(this.start)) {
            //add empty word "ε"
            acceptedStrings.push(String.fromCharCode(949));
        }
        visitedStrings.push("");

        return this.__getHintsRecursive(acceptedStrings, visitedStrings, count);
    }

    /**
     * Recursive function to decide if the next char sequence should be added to
     * acceptedStrings.
     * 
     * @param {String[]} acceptedStrings : Already accepted strings.
     * @param {String[]} visitedStrings : Already visited strings.
     * @param {Number} count : Number of hints to give.
     */
    __getHintsRecursive(acceptedStrings, visitedStrings, count) {
        if (acceptedStrings.length >= count || visitedStrings.length >= 1024) {
            return acceptedStrings;
        }
        let newVisitedStrings = new Array();
        for (let i = Math.ceil(visitedStrings.length / 2 - 1); i < visitedStrings.length; i++) {
            let currentVisitedStringAddSign = new Array();
            currentVisitedStringAddSign.push(visitedStrings[i] + "0");
            currentVisitedStringAddSign.push(visitedStrings[i] + "1");
            for (let j = 0; j < currentVisitedStringAddSign.length; j++) {
                if (this.compute(currentVisitedStringAddSign[j])) {
                    acceptedStrings.push(currentVisitedStringAddSign[j]);
                }
                newVisitedStrings.push(currentVisitedStringAddSign[j]);
                if (acceptedStrings.length >= count) {
                    return acceptedStrings;
                }
            }
        }
        visitedStrings = visitedStrings.concat(newVisitedStrings);
        return this.__getHintsRecursive(acceptedStrings, visitedStrings, count);
    }

}

/**
 * Compares to arrays if they are equal.
 * 
 * @param {Array} arr1
 * @param {Array} arr2
 */
function arrayCompare(arr1, arr2) {
    var result = false;
    if (arr1.length != arr2.length) {
        return false;
    }
    var i = 0;
    if (arr1 && arr2) {
        result = true;
        for (i; i < arr1.length && result; i++) {
            result = (arr1[i] == arr2[i]);
        }
    }
    return result;
}

class Transition {

    constructor(from, sign, to) {
        this.from = from;
        this.sign = sign;
        this.to = to;
    }
}