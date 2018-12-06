import {Miner} from './miner';
import {Task} from './task';
import {sendTransaction} from "./blockchain";
import * as _ from "lodash";

class Agent {

    public minerCollector: Miner[];
    public  taskCollector: Task[];
    public  indexMiner: number;
    public indexTask: number;

    constructor(minerCollector: Miner[], taskCollector: Task[]) {
        this.minerCollector = minerCollector;
        this.taskCollector = taskCollector;
        this.indexMiner=0;
        this.indexTask=-1;
    }
}

const getAccumulatedCom = (aMiner : Miner[]): number =>{
    return aMiner
        .map((miner)=> miner.computePowerleft)
        .reduce((a,b) => a+b);
}

const schedulerTasks = (agent: Agent) : boolean=>{
    // const money : number[]=[];
    let numComputerPower = 0;
    console.log(agent);
    if (getAccumulatedCom(agent.minerCollector) < agent.taskCollector[agent.indexTask].computePower){
        return false;
    }
   /* // let index = 0;
    // while (index < agent.minerCollector.length) {
    //     if (numComputerPower < agent.taskCollector[agent.indexTask].computePower) {
    //         if (agent.taskCollector[agent.indexTask].computePower - numComputerPower > agent.minerCollector[index].computePowerleft) {
    //             numComputerPower = numComputerPower + agent.minerCollector[index].computePowerleft;
    //             money[index] = agent.taskCollector[agent.indexTask].price * agent.minerCollector[index].computePowerleft / agent.taskCollector[agent.indexTask].computePower;
    //             sendTransaction(agent.minerCollector[index].Pk, money[index]);
    //         }
    //         else {
    //             agent.minerCollector[index].computePowerleft = agent.minerCollector[index].computePowerleft + numComputerPower - agent.taskCollector[agent.indexTask].computePower;
    //             let cost = agent.taskCollector[agent.indexTask].computePower - numComputerPower;
    //             numComputerPower = agent.taskCollector[agent.indexTask].computePower;
    //             money[index] = agent.taskCollector [agent.indexTask].price * cost / agent.taskCollector[agent.indexTask].computePower;
    //             sendTransaction(agent.minerCollector[index].Pk, money[index]);
    //         }
    //         index ++;
    //     }
    //     else {
    //         break;
    //     }
    // }*/

    for(let i = 0 ; i < agent.indexMiner ; i++){
        const sumPower = getAccumulatedCom(agent.minerCollector);
        sendTransaction(agent.minerCollector[i].Pk, agent.taskCollector[agent.indexTask].price*agent.minerCollector[i].computePowerleft/sumPower);
        agent.minerCollector[i].computePowerleft = agent.minerCollector[i].computePowerleft - agent.minerCollector[i].computePowerleft/sumPower;
    }
    
    return true;

}
/**
 * return all miners message
 * @param agent
 */
const getAllMiners = (agent: Agent) =>{
    return _.cloneDeep(agent.minerCollector);
}

/**
 * return all tasks message
 * @param agent
 */
const getAllTasks =(agent: Agent) =>{
    return _.cloneDeep(agent.taskCollector);
}
export {Agent, schedulerTasks, getAllMiners, getAllTasks};