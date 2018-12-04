import {Miner} from './miner';
import {Task} from './task';
import {sendTransaction} from "./blockchain";

class Agent {

    public minerCollector: Miner[];
    public  taskCollector: Task[];
    public  indexMiner: number;
    public indexTask: number;

    constructor(minerCollector: Miner[], taskCollector: Task[]) {
        this.minerCollector = minerCollector;
        this.taskCollector = taskCollector;
        this.indexMiner=0;
        this.indexTask=0;
    }
}

const getAccumulatedCom = (aMiner : Miner[]): number =>{
    return aMiner
        .map((miner)=> miner.computePower)
        .reduce((a,b) => a+b);
}

const schedulerTasks = (agent: Agent) : boolean=>{
    const money : number[]=[];
    let numComputerPower = 0;
    if (getAccumulatedCom(agent.minerCollector) < agent.taskCollector[agent.indexTask].computePower){
        return false;
    }

    while (agent.indexMiner < agent.minerCollector.length) {
        if (numComputerPower < agent.taskCollector[agent.indexTask].computePower) {
            if (agent.taskCollector[agent.indexTask].computePower - numComputerPower > agent.minerCollector[agent.indexTask].computePowerleft) {
                numComputerPower = numComputerPower + agent.minerCollector[agent.indexMiner].computePowerleft;
                money[agent.indexMiner] = agent.taskCollector[agent.indexTask].price * agent.minerCollector[agent.indexMiner].computePowerleft / agent.taskCollector[agent.indexTask].computePower;
                sendTransaction(agent.minerCollector[agent.indexMiner].Pk, money[agent.indexMiner]);
            }
            else {
                agent.minerCollector[agent.indexTask].computePowerleft = agent.minerCollector[agent.indexTask].computePowerleft + numComputerPower - agent.taskCollector[agent.indexTask].computePower;
                let cost = agent.taskCollector[agent.indexTask].computePower - numComputerPower;
                numComputerPower = agent.taskCollector[agent.indexTask].computePower;
                money[agent.indexMiner] = agent.taskCollector [agent.indexTask].price * cost / agent.taskCollector[agent.indexTask].computePower;
                sendTransaction(agent.minerCollector[agent.indexMiner].Pk, money[agent.indexMiner]);
            }
        }
        else {
            break;
        }
    }
    return true;

}

export {Agent, schedulerTasks};