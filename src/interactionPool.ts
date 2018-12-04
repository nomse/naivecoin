import * as _ from 'lodash';
import {Interaction, validateInteraction} from './Interaction';

let interactionPool: Interaction[] = [];

const getInteractionPool = () => {
    return _.cloneDeep(interactionPool);
};

const addToInteractionPool = (ix: Interaction) => {
    if (!validateInteraction(ix)) {
        throw Error('Trying to add invalid tx to pool');
    }
    // if (!isValidIxForPool(ix, interactionPool)) {
    //     throw Error('Trying to add invalid tx to pool');
    // }
    console.log('adding to ixPool: %s', JSON.stringify(ix));
    interactionPool.push(ix);
};

const updateInteractionPool = () => {
    const invalidInteractions = [];
    for (const ix of interactionPool) {

            if (!ix.valid) {
                invalidInteractions.push(ix);
                break;
            }
    }
    if (invalidInteractions.length > 0) {
        console.log('removing the following transactions from txPool: %s', JSON.stringify(invalidInteractions));
        interactionPool = _.without(interactionPool, ...invalidInteractions);
    }
};

// const isValidIxForPool = (ix: Interaction, aInteractionPool: Interaction[]): boolean => {
//     return true;
// };

export {addToInteractionPool, getInteractionPool, updateInteractionPool};
