
class Miner {

    public Pk: string;
    //public  CPU: number;
    //public MEM: number;
    //public leftCPU: number;
    //public leftMEM: number;
    public  computePower: number;
    public computePowerleft: number;
    constructor(Pk: string, computePower: number, computePowerleft: number) {
        this.Pk=Pk;
        this.computePower=computePower;
        this.computePowerleft=computePowerleft;
    }
};

export {Miner};