import {Task} from './task';
import {Agent,schedulerTasks} from './agent';
class ServiceProvider {
    public svcPubkey: string;
    constructor(svcPubkey: string) {
        this.svcPubkey = svcPubkey;
    }
}

const sendTasktoAgent = (id: string, serviceProvider: string
    , computePower: number, price: number, agent: Agent) => {
    const newTask: Task = new Task(id, serviceProvider, computePower, price);
    agent.indexTask++;
    agent.taskCollector[agent.indexTask]=newTask;

    console.log(agent);
    schedulerTasks(agent);
};

export {sendTasktoAgent}