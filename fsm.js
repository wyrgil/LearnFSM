/**
 * @author Marius Santin <marius.santin@gmail.com>
 * @version %I%, %G%
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

    addTransition(transition) {
        this.transitions.add(transition);
    }

    addEnd(end) {
        this.ends.add(end);
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
    equalLight(fsm) {
        var result = 0;
        var mapper = new Map();
        mapper.set(this.start, fsm.start);

        var transitions = new Array();

        transitions.push([this.start, fsm.start]);

        var i = 0;
        do {
            ["0", "1"].forEach(s => {
                var qt = this.getNextState(transitions[i][0], s);
                var qf = fsm.getNextState(transitions[i][1], s);
                if (this.ends.includes(qt) != fsm.ends.includes(qf)) {
                    result = "Es gibt noch falsche Transitionen.";
                }
                mapper.set(qt, qf);
                var add = true;
                transitions.forEach(t => {
                    if (arrayCompare(t, [qt, qf])) {
                        add = false;
                    }
                });
                if (add) {
                    transitions.push([qt, qf]);
                }
            });

            i++;
        } while (i < mapper.size);

        var fins = new Array();

        this.ends.forEach(end => {
            fins.push(mapper.get(end));
        });

        if (result == 0 && arrayCompare(fins, fsm.ends)) {
            result = 0;
        }

        return result;
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

        if ((this.states.length > 0 && !this.start) || (fsm.states.length > 0 && !fsm.start)) {
            return "Es wurde noch kein Startzustand deklariert."
        }

        if (this.states.length != fsm.states.length) {
            return "Es fehlen noch Zustände.";
        }

        if (this.ends.length != fsm.ends.length) {
            return "Es fehlen noch akzeptierende Zustände.";
        }

        if (this.transitions.length != fsm.transitions.length) {
            return "Es fehlen noch Transitionen.";
        }

        return equalLight(fsm);
    }

    compute(signs) {
        let currentState = this.start;

        for (let i = 0; i < signs.length; i++) {
            let sign = signs[i];
            let nextState = null;
            
            this.transitions.forEach(t => {
                if (t.from == currentState && t.sign == sign) {
                    nextState = t.to;
                }
            });
            if(!nextState){
                currentState = null;
                break;
            }
            currentState = nextState;
        }
        return this.ends.includes(currentState);
    }

    getHints(count){
        let acceptedStrings = new Array();

        
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