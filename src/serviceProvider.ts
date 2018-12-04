import {Task} from './task';
import {Agent} from './agent';
class ServiceProvider {
    public svcPubkey: string;
    constructor(svcPubkey: string) {
        this.svcPubkey = svcPubkey;
    }
}

const sendTasktoAgent = (id: string, serviceProvider: string
    , computePower: number, price: number, agent: Agent) => {
    const newTask: Task = new Task(id, serviceProvider, computePower, price);
    agent.taskCollector[agent.indexTask]=newTask;
    agent.indexTask++;
};

export {sendTasktoAgent}