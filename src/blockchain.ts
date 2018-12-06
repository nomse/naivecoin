import * as CryptoJS from 'crypto-js';
import * as _ from 'lodash';
import {broadCastInteractionPool, broadcastLatest, broadCastTransactionPool} from './p2p';
import {Interaction, generateInteraction} from './interaction';
import {updateInteractionPool} from './interactionPool';
import {
    getCoinbaseTransaction, isValidAddress, processTransactions, Transaction, UnspentTxOut
} from './transaction';
import {addToTransactionPool, getTransactionPool, updateTransactionPool} from './transactionPool';
import {hexToBinary} from './util';
import {createTransaction, findUnspentTxOuts, getBalance, getPrivateFromWallet, getPublicFromWallet} from './wallet';
import {addToInteractionPool, getInteractionPool} from "./interactionPool";

/**
 * 区块结构
 * 区块头
 * index        //区块索引
 * hash         //全体数据的哈希
 * previousHash
 * timestamp
 * pouw_proof   //从矿工那获取
 * -----------------------------------------------
 * 交易
 * coinbase
 * serviceprovider<— —>miner
 * （后续再有可以加一些用户购买VIP服务之类）
 * -----------------------------------------------
 * 用户访问DAPP产生的用户数据
 * InteractionData
 */

class Block {
    /*区块头*/
    public index: number;
    public hash: string;
    public previousHash: string;
    public timestamp: number;
    public pouw_proof: string;
    public difficulty: number;
    public nonce: number;

    /*交易*/
    public data: Transaction[];
    /*用户访问DAPP产生的用户数据*/
    public interactionData: Interaction[];


    constructor(index: number, hash: string, previousHash: string, timestamp: number, pouw_proof: string,
                data: Transaction[], InteractionData: Interaction[], difficulty: number, nonce: number) {
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.pouw_proof = pouw_proof;
        this.data = data;
        this.interactionData = InteractionData;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}

//TODO:创世交易和创世区块

//创世交易填写的是service_provider的公钥地址
const genesisTransaction = {
    'txIns': [{'signature': '', 'txOutId': '', 'txOutIndex': 0}],
    'txOuts': [{
        'address': '04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534a',
        // 'address': '0484c132d3c4b34114899e1e212e7677800ef06cd9eda1c02ece37047fa7e536356a115fa120ed9b2a10a9ea3187edb6c208f8dab9a91719a1dc7e27639d3806e4',  //sjc提供公钥
        'amount': 50
    }],
    'id': 'e655f6a5f26dc9b4cac6e46f52336428287759cf81ef5ff10854f69d68f43fa3'
};
const genesisInteraction = null;
const getCurrentTimestamp = (): number => Math.round(new Date().getTime() / 1000);
//(null,null,null,0,false,null);
const genesisBlock: Block = new Block(
    /*index, hash,                                                          prehash,timestamp,pouw_proof,         data(Transaction), InteractionData*/
    0, '91a73664bc84c0baa1fc75ea6e4aa6d1d20c5df664c724e3159aefc2e1186627', '', getCurrentTimestamp(), '', [genesisTransaction], [genesisInteraction], 0, 0
);


let blockchain: Block[] = [genesisBlock];

// the unspent txOut of genesis block is set to unspentTxOuts on startup
let unspentTxOuts: UnspentTxOut[] = processTransactions(blockchain[0].data, [], 0);

const getBlockchain = (): Block[] => blockchain;

const getUnspentTxOuts = (): UnspentTxOut[] => _.cloneDeep(unspentTxOuts);

// and txPool should be only updated at the same time
const setUnspentTxOuts = (newUnspentTxOut: UnspentTxOut[]) => {
    console.log('replacing unspentTxouts with: %s', newUnspentTxOut);
    unspentTxOuts = newUnspentTxOut;
};

const getLatestBlock = (): Block => blockchain[blockchain.length - 1];

// in seconds
const BLOCK_GENERATION_INTERVAL: number = 10;

// in blocks
const DIFFICULTY_ADJUSTMENT_INTERVAL: number = 10;

const getDifficulty = (aBlockchain: Block[]): number => {
    const latestBlock: Block = aBlockchain[blockchain.length - 1];
    if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
        return getAdjustedDifficulty(latestBlock, aBlockchain);
    } else {
        return latestBlock.difficulty;
    }
};

const getAdjustedDifficulty = (latestBlock: Block, aBlockchain: Block[]) => {
    const prevAdjustmentBlock: Block = aBlockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
    const timeExpected: number = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
    const timeTaken: number = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
    if (timeTaken < timeExpected / 2) {
        return prevAdjustmentBlock.difficulty + 1;
    } else if (timeTaken > timeExpected * 2) {
        return prevAdjustmentBlock.difficulty - 1;
    } else {
        return prevAdjustmentBlock.difficulty;
    }
};

const generateRawNextBlock = (blockData: Transaction[], interData: Interaction[]) => {
    const previousBlock: Block = getLatestBlock();
    const difficulty: number = getDifficulty(getBlockchain());
    const nextIndex: number = previousBlock.index + 1;
    const nextTimestamp: number = getCurrentTimestamp();
    const pouw: string = getPouw();
    const newBlock: Block = findBlock(nextIndex, previousBlock.hash, nextTimestamp, pouw , blockData, interData, difficulty);
    if (addBlockToChain(newBlock)) {
        broadcastLatest();
        return newBlock;
    } else {
        return null;
    }

};

//TODO getPouw
const getPouw = ():string => {
    return CryptoJS.SHA256(getCurrentTimestamp().toString()).toString();
}

// gets the unspent transaction outputs owned by the wallet
const getMyUnspentTransactionOutputs = () => {
    return findUnspentTxOuts(getPublicFromWallet(), getUnspentTxOuts());
};

const generateNextBlock = () => {
    const coinbaseTx: Transaction = getCoinbaseTransaction(getPublicFromWallet(), getLatestBlock().index + 1);
    const blockData: Transaction[] = [coinbaseTx].concat(getTransactionPool());
    const interData: Interaction[] = getInteractionPool();
    return generateRawNextBlock(blockData,interData);
};

const generatenextBlockWithTransaction = (receiverAddress: string, amount: number) => {
    if (!isValidAddress(receiverAddress)) {
        throw Error('invalid address');
    }
    if (typeof amount !== 'number') {
        throw Error('invalid amount');
    }
    const coinbaseTx: Transaction = getCoinbaseTransaction(getPublicFromWallet(), getLatestBlock().index + 1);
    const tx: Transaction = createTransaction(receiverAddress, amount, getPrivateFromWallet(), getUnspentTxOuts(), getTransactionPool());
    const blockData: Transaction[] = [coinbaseTx, tx];
    const interData: Interaction[] = getInteractionPool();
    return generateRawNextBlock(blockData,interData);
};

const findBlock = (index: number, previousHash: string, timestamp: number, pouw:string, data: Transaction[], interactionData: Interaction[], difficulty: number): Block => {
    let nonce = 0;
    while (true) {
        const hash: string = calculateHash(index, previousHash, timestamp, pouw, data, interactionData, difficulty, nonce);
        if (hashMatchesDifficulty(hash, difficulty)) {
            return new Block(index, hash, previousHash, timestamp, pouw, data, interactionData, difficulty, nonce);
        }
        nonce++;
    }
};

const getAccountBalance = (): number => {
    Math.random()
    return getBalance(getPublicFromWallet(), getUnspentTxOuts());
};

const sendTransaction = (address: string, amount: number): Transaction => {
    const tx: Transaction = createTransaction(address, amount, getPrivateFromWallet(), getUnspentTxOuts(), getTransactionPool());
    addToTransactionPool(tx, getUnspentTxOuts());
    broadCastTransactionPool();
    return tx;
};

const sendInteraction = (taskId: string): Interaction => {
    const interaction: Interaction = generateInteraction(taskId);
    broadCastInteractionPool();
    return interaction;
};

const calculateHashForBlock = (block: Block): string =>
    calculateHash(block.index, block.previousHash, block.timestamp, block.pouw_proof, block.data, block.interactionData, block.difficulty, block.nonce);

const calculateHash = (index: number, previousHash: string, timestamp: number, pouw: string, data: Transaction[], interactionData: Interaction[],
                       difficulty: number, nonce: number): string =>
    CryptoJS.SHA256(index + previousHash + timestamp + pouw + data + interactionData + difficulty + nonce).toString();

const isValidBlockStructure = (block: Block): boolean => {
    return typeof block.index === 'number'
        && typeof block.hash === 'string'
        && typeof block.previousHash === 'string'
        && typeof block.timestamp === 'number'
        && typeof block.data === 'object';
};

const isValidNewBlock = (newBlock: Block, previousBlock: Block): boolean => {
    if (!isValidBlockStructure(newBlock)) {
        console.log('invalid block structure: %s', JSON.stringify(newBlock));
        return false;
    }
    if (previousBlock.index + 1 !== newBlock.index) {
        console.log('invalid index');
        return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
        console.log('invalid previoushash');
        return false;
    } else if (!isValidTimestamp(newBlock, previousBlock)) {
        console.log('invalid timestamp');
        return false;
    } else if (!hasValidHash(newBlock)) {
        return false;
    }
    return true;
};

const getAccumulatedDifficulty = (aBlockchain: Block[]): number => {
    return aBlockchain
        .map((block) => block.difficulty)
        .map((difficulty) => Math.pow(2, difficulty))
        .reduce((a, b) => a + b);
};

const isValidTimestamp = (newBlock: Block, previousBlock: Block): boolean => {
    return ( previousBlock.timestamp - 60 < newBlock.timestamp )
        && newBlock.timestamp - 60 < getCurrentTimestamp();
};

const hasValidHash = (block: Block): boolean => {

    if (!hashMatchesBlockContent(block)) {
        console.log('invalid hash, got:' + block.hash);
        return false;
    }

    if (!hashMatchesDifficulty(block.hash, block.difficulty)) {
        console.log('block difficulty not satisfied. Expected: ' + block.difficulty + 'got: ' + block.hash);
    }
    return true;
};

const hashMatchesBlockContent = (block: Block): boolean => {
    const blockHash: string = calculateHashForBlock(block);
    return blockHash === block.hash;
};

const hashMatchesDifficulty = (hash: string, difficulty: number): boolean => {
    const hashInBinary: string = hexToBinary(hash);
    const requiredPrefix: string = '0'.repeat(difficulty);
    return hashInBinary.startsWith(requiredPrefix);
};

/*
    Checks if the given blockchain is valid. Return the unspent txOuts if the chain is valid
 */
const isValidChain = (blockchainToValidate: Block[]): UnspentTxOut[] => {
    console.log('isValidChain:');
    console.log(JSON.stringify(blockchainToValidate));
    const isValidGenesis = (block: Block): boolean => {
        return JSON.stringify(block) === JSON.stringify(genesisBlock);
    };
    if (!isValidGenesis(blockchainToValidate[0])) {
        return null;
    }
    /*
    Validate each block in the chain. The block is valid if the block structure is valid
      and the transaction are valid
     */
    let aUnspentTxOuts: UnspentTxOut[] = [];

    for (let i = 0; i < blockchainToValidate.length; i++) {
        const currentBlock: Block = blockchainToValidate[i];
        if (i !== 0 && !isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])) {
            return null;
        }

        aUnspentTxOuts = processTransactions(currentBlock.data, aUnspentTxOuts, currentBlock.index);
        if (aUnspentTxOuts === null) {
            console.log('invalid transactions in blockchain');
            return null;
        }
    }
    return aUnspentTxOuts;
};

const addBlockToChain = (newBlock: Block): boolean => {
    if (isValidNewBlock(newBlock, getLatestBlock())) {
        const retVal: UnspentTxOut[] = processTransactions(newBlock.data, getUnspentTxOuts(), newBlock.index);
        newBlock.interactionData.forEach((interaction: Interaction) => {
            try {
                interaction.valid = false;
            } catch (e) {
                console.log(e.message);
            }
        });
        if (retVal === null) {
            console.log('block is not valid in terms of transactions');
            return false;
        } else {
            blockchain.push(newBlock);
            setUnspentTxOuts(retVal);
            updateTransactionPool(unspentTxOuts);
            updateInteractionPool();
            return true;
        }
    }
    return false;
};

const replaceChain = (newBlocks: Block[]) => {
    const aUnspentTxOuts = isValidChain(newBlocks);
    console.log(aUnspentTxOuts);
    const validChain: boolean = aUnspentTxOuts !== null;
    console.log(validChain);
    if (validChain &&
        getAccumulatedDifficulty(newBlocks) > getAccumulatedDifficulty(getBlockchain())) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        setUnspentTxOuts(aUnspentTxOuts);
        updateTransactionPool(unspentTxOuts);
        updateInteractionPool();
        broadcastLatest();
    } else {
        console.log('Received blockchain invalid');
    }
};

const handleReceivedTransaction = (transaction: Transaction) => {
    addToTransactionPool(transaction, getUnspentTxOuts());
};
const handleReceivedInteraction = (interaction: Interaction) => {
    addToInteractionPool(interaction);
};

export {
    Block, getBlockchain, getUnspentTxOuts, getLatestBlock, sendTransaction,
    generateRawNextBlock, generateNextBlock, generatenextBlockWithTransaction,
    handleReceivedTransaction, getMyUnspentTransactionOutputs,
    getAccountBalance, isValidBlockStructure, replaceChain, addBlockToChain, handleReceivedInteraction, sendInteraction
};
