import * as CryptoJS from 'crypto-js';
import * as ecdsa from 'elliptic';
import * as _ from 'lodash';
const ec = new ecdsa.ec('secp256k1');
import {Agent} from './agent';
import {addToInteractionPool} from "./interactionPool";

class User {
    public publicKey: string;
    public privateKey: string;

    constructor(publicKey: string, privateKey: string) {
        this.publicKey = publicKey;
        this.privateKey = privateKey;
    }
}

class Interaction {
    public id: string;
    public user: string;
    public appId: string;
    public time: number;
    public valid: boolean; // 初始化设置成true，，在被记录到区块后设置成false
    public requestApi: string; // 预留接口

    constructor(id: string, user: string, appId: string, time: number, valid: boolean, requestApi: string){
        this.id = id;
        this.user = user;
        this.appId = appId;
        this.time = time;
        this.valid = valid;
        this.requestApi = requestApi;
    }
}

const getInteractionId = (interaction: Interaction): string => {
    return CryptoJS.SHA256(interaction.appId + interaction.time + interaction.requestApi).toString();
};

const getCurrentTimestamp = (): number => Math.round(new Date().getTime() / 1000);

const signInteraction = (interaction: Interaction, user: User): string => { // 在产生交互的时候生成签名
    const dataToSign = interaction.id;
    const key = ec.keyFromPrivate(user.privateKey, 'hex');
    const signature: string = toHexString(key.sign(dataToSign).toDER());
    return signature;
};

const generateInteraction = (taskId: string) => {
    const keyPair = ec.genKeyPair();
    const user: User = new User(keyPair.getPrivate(), keyPair.getPublicKey());
    const interaction: Interaction = new Interaction( "", "", taskId, getCurrentTimestamp(), true, "/getApi");
    interaction.id =  getInteractionId(interaction);
    interaction.user = signInteraction(interaction, user);
    addToInteractionPool(interaction);
};

const validateInteraction = (interaction: Interaction): boolean => {

    if (!isValidInteractionStructure(interaction)) {
        return false;
    }

    if (getInteractionId(interaction) !== interaction.id) {
        console.log('invalid interaction id: ' + interaction.id);
        return false;
    }
    if (validateUser) {
        console.log('interaction is invalid : ' + interaction.id);
        return false;
    }
    return true;
};

const validateUser = (interaction: Interaction, user: User): boolean => {
    const address = user.privateKey;
    const key = ec.keyFromPublic(address, 'hex');
    const validSignature: boolean = key.verify(interaction.id, interaction.user);
    if (!validSignature) {
        console.log('invalid interaction signature: %s interactionId: %s ', interaction.user, interaction.id);
        return false;
    }
    return true;
};

// Todo update 全局interactions
// const updateInteractions = (aInteractions: Interaction[], aUnspentTxOuts: Interaction[]): UnspentTxOut[] => {
//     const newUnspentTxOuts: UnspentTxOut[] = aTransactions
//         .map((t) => {
//             return t.txOuts.map((txOut, index) => new UnspentTxOut(t.id, index, txOut.address, txOut.amount));
//         })
//         .reduce((a, b) => a.concat(b), []);
//
//     const consumedTxOuts: UnspentTxOut[] = aTransactions
//         .map((t) => t.txIns)
//         .reduce((a, b) => a.concat(b), [])
//         .map((txIn) => new UnspentTxOut(txIn.txOutId, txIn.txOutIndex, '', 0));
//
//     const resultingUnspentTxOuts = aUnspentTxOuts
//         .filter(((uTxO) => !findUnspentTxOut(uTxO.txOutId, uTxO.txOutIndex, consumedTxOuts)))
//         .concat(newUnspentTxOuts);
//
//     return resultingUnspentTxOuts;
// };
//
// const processInteractions = (aInteractions: Interaction[], blockIndex: number) => {
//
//     if (!validateBlockInteractions(aInteractions, blockIndex)) {
//         console.log('invalid block transactions');
//         return null;
//     }
//     return updateInteractions(aInteractions, aUnspentTxOuts);
// };

const validateBlockInteractions = (aInteractions: Interaction[], blockIndex: number): boolean => {// TODO 添加交互校验
    return true;
};

const toHexString = (byteArray): string => {
    return Array.from(byteArray, (byte: any) => {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
};

const getPublicKey = (aPrivateKey: string): string => {
    return ec.keyFromPrivate(aPrivateKey, 'hex').getPublic().encode('hex');
};

const isValidInteractionStructure = (interaction: Interaction) => {
    if (typeof interaction.user !== 'string') {
        console.log('interactionId missing');
        return false;
    }
    if (typeof interaction.appId !== 'string') {
        console.log('appId missing');
        return false;
    }
    if (typeof interaction.time !== 'number') {
        console.log('requestTime missing');
        return false;
    }
    if (typeof interaction.requestApi !== 'string') {
        console.log('requestApi missing');
        return false;
    }
    if (typeof interaction.valid !== 'boolean') {
        console.log('valid missing');
        return false;
    }
    return true;
};

// valid address is a valid ecdsa public key in the 04 + X-coordinate + Y-coordinate format
const isValidAddress = (address: string): boolean => {
    if (address.length !== 130) {
        console.log(address);
        console.log('invalid public key length');
        return false;
    } else if (address.match('^[a-fA-F0-9]+$') === null) {
        console.log('public key must contain only hex characters');
        return false;
    } else if (!address.startsWith('04')) {
        console.log('public key must start with 04');
        return false;
    }
    return true;
};

export {
    signInteraction, getInteractionId, isValidAddress, User, validateInteraction, validateUser, getPublicKey,
    Interaction, generateInteraction
};
