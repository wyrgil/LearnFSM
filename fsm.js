/**
 * This class is a representation of a finite state machine.
 * 
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
            let i = this.states.indexOf(state);
            this.states.splice(i, 1);
        }
    }

    addTransition(transition) {
        this.transitions.add(transition);
    }

    removeTransition(transition) {
        if (this.transitions.includes(transition)) {
            let i = this.transitions.indexOf(transition);
            this.transitions.splice(i, 1);
        }
    }

    addEnd(end) {
        this.ends.add(end);
    }

    removeEnd(end) {
        if (this.ends.includes(end)) {
            let i = this.ends.indexOf(end);
            this.ends.splice(i);
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
     * @param {FSM} fsm : FSM to compare.
     */
    equivalence(fsm) {
        // Check for correctness.
        let correctness = this.isCorrect();
        if(correctness != 0){
            return "Ungültiger Automat: " + correctness;
        }

        // Starts with a positive result
        let result = 0;

        // This mapper is used to map states from this FSM to states of the given FSM.
        let mapper = new Map();
        // The start states for both FSMs are mapped.
        mapper.set(this.states[this.start], fsm.states[fsm.start]);

        // New array to store states after a transition as a tuple in form of
        // [new state for this FSM, new state for given FSM].
        let transitions = new Array();
        // Both start states are pushed to our transitions array as a tuple.
        transitions.push([this.states[this.start], fsm.states[fsm.start]]);

        let i = 0;
        do {
            ["0", "1"].forEach(s => {
                // Target of 0 or 1 transition of this FSMs last added state.
                let qt = this.getNextState(transitions[i][0], s);
                // Target of 0 or 1 transition of given FSMs last added state.
                let qf = fsm.getNextState(transitions[i][1], s);
                // If both states exist
                if (qt && qf) {
                    // If both states are either accepting or not.
                    if (this.ends.includes(this.states.indexOf(qt)) != fsm.ends.includes(fsm.states.indexOf(qf))) {
                        result = "Es gibt noch falsche akzeptierende Zustände.";
                    }
                    // Map target of this FSM to target of given FSM.
                    mapper.set(qt, qf);
                    // If tuple already exisits in transitions[], don't add it, else do.
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
            // Repeat with next state tuple.
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

    /**
     * Checks if this FSM has a set start state and for each state at least 
     * two transitions.
     */
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
                    this.transitions[j].sign == "0") {
                    has0Transition = has0Transition || true;
                }
                if (this.transitions[j].from == this.states[i] &&
                    this.transitions[j].sign == "1") {
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
        // break recursion if wanted count of accepted strings is reached
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