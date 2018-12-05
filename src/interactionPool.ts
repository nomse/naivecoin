import * as _ from 'lodash';
import {Interaction, validateInteraction, getInteractionId} from './Interaction';

let interactionPool: Interaction[] = [];

const getInteractionPool = () => {
    return interactionPool;
};

const addToInteractionPool = (ix: Interaction) => {
    if (!validateInteraction(ix)) {
        throw Error('Trying to add invalid tx to pool');
    }
    if (!isValidIxForPool(ix, interactionPool)) {
        throw Error('Trying to add invalid tx to pool');
    }
    console.log('adding to ixPool: %s', JSON.stringify(ix));
    interactionPool.push(ix);
};

const updateInteractionPool = () => {
    const invalidInteractions = [];
    for (const ix of interactionPool) {
            if (!ix.valid) {
                invalidInteractions.push(ix);
            }
            console.log(ix);
    }
    if (invalidInteractions.length > 0) {
        console.log('removing the following interaction from ixPool: %s', JSON.stringify(invalidInteractions));
        interactionPool = _.without(interactionPool, ...invalidInteractions);
    }
};


const isValidIxForPool = (ix: Interaction, aInteractionPool: Interaction[]): boolean => {
    for(let i=0 ; i < aInteractionPool.length; i++){
        if(getInteractionId(aInteractionPool[i]) === getInteractionId(ix)){
           return false;
        }
    }
    return true;
};

export {addToInteractionPool, getInteractionPool, updateInteractionPool};
