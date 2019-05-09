/**
 * @author Marius Santin <marius.santin@gmail.com>
 * @version %I%, %G%
 */

class FSM {
    constructor() {
        if (arguments.length != 4) {
            this.start = null;
            this.states = new Set();
            this.trans = new Set();
            this.ends = new Set();
        } else {
            this.start = arguments[0];
            this.states = arguments[1];
            this.trans = arguments[2];
            this.ends = arguments[3];
        }
    }

    setStart(start) {
        this.start = start;
    }

    addState(state) {
        this.states.add(state);
    }

    addTrans(trans) {
        this.trans.add(trans);
    }

    addEnd(end) {
        this.ends.add(end);
    }

    getNextState(state, sign) {
        for (const i of this.trans) {
            if (i.from == state && i.sign == sign) {
                return i.to;
            }
        }
        return false;
    }

    /**
     * Compares this FSM to another FSM and checks for equality.
     * 
     * @param {FSM} fsm : The finite state machine to be compared to the current one.
     */
    equal(fsm) {
        var mapper = new Map();
        mapper.set(this.start, fsm.start);

        var transitions = new Array();

        transitions.push([this.start, fsm.start]);

        var i = 0;
        do {
            ["0", "1"].forEach(s => {
                var qt = this.getNextState(transitions[i][0], s);
                var qf = fsm.getNextState(transitions[i][1], s);
                if (this.ends.has(qt) != fsm.ends.has(qf)) {
                    return false;
                }
                mapper.set(qt, qf);
                transitions.push([qt, qf]);
            });

            i++;
        } while (i < transitions.length);

        var fins = new Set();

        this.ends.forEach(end => {
            fins.push(mapper.get(end));
        });

        if (fins == fsm.ends) {
            return true;
        }

        return false;
    }

    compute(signs) {
        //TODO: accept or not accept?
    }

}

class Transition {

    constructor(from, sign, to) {
        this.from = from;
        this.sign = sign;
        this.to = to;
    }
}