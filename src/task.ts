class Task {

    public id: string;
    public svcPkey: string;
    //public CPU: number;
    //public MEM: number;

    public computePower: number;
    public price: number;

    constructor(id: string, svcPkey: string, computePower: number, price: number) {
        this.id=id;
        this.svcPkey=svcPkey;
        this.computePower=computePower;
        this.price=price;
    }
}

export {Task};