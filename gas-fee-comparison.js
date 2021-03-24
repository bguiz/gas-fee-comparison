#!/usr/bin/env node

const axios = require('axios');

const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');

const mnemonicSeedPhrase = process.env.MNEMONIC ||
  '';
const infuraProjectId = process.env.INFURA_PROJECT_ID ||
  '';

function initialiseRskTestnet() {
  return new HDWalletProvider({
    mnemonic: {
      phrase: mnemonicSeedPhrase,
    },
    providerOrUrl: 'https://public-node.testnet.rsk.co/',
    derivationPath: "m/44'/37310'/0'/0/",
    // Higher polling interval to check for blocks less frequently
    pollingInterval: 15e3,
  });
}

function initialiseRskMainnet() {
  return new HDWalletProvider({
    mnemonic: {
      phrase: mnemonicSeedPhrase,
    },
    providerOrUrl: 'https://public-node.rsk.co/',
    derivationPath: "m/44'/137'/0'/0/",
    // Higher polling interval to check for blocks less frequently
    pollingInterval: 15e3,
  });
}

function initialiseEthTestnet() {
  return new HDWalletProvider({
    mnemonic: {
      phrase: mnemonicSeedPhrase,
    },
    providerOrUrl: `https://kovan.infura.io/v3/${infuraProjectId}`,
    derivationPath: "m/44'/60'/0'/0/",
    // Higher polling interval to check for blocks less frequently
    pollingInterval: 15e3,
  });
}

function initialiseEthMainnet() {
  return new HDWalletProvider({
    mnemonic: {
      phrase: mnemonicSeedPhrase,
    },
    providerOrUrl: `https://mainnet.infura.io/v3/${infuraProjectId}`,
    derivationPath: "m/44'/60'/0'/0/",
    // Higher polling interval to check for blocks less frequently
    pollingInterval: 15e3,
  });
}

function cleanUp({ web3ProviderTestnet, web3ProviderMainnet }) {
  web3ProviderTestnet.engine.stop();
  web3ProviderMainnet.engine.stop();
}

async function getBlockNumber({ web3InstanceTestnet }) {
  const block = await web3InstanceTestnet.eth.getBlock('latest', false);
  const blockNumber = block.number;
  return blockNumber;
}

async function getGasUsedForTx({ web3InstanceTestnet, txHash }) {
  const txReceipt = await web3InstanceTestnet.eth.getTransactionReceipt(txHash);
  const gasUsed = txReceipt.gasUsed;
  return gasUsed;
}

async function getGasPrice({ web3InstanceMainnet }) {
  return web3InstanceMainnet.eth.getGasPrice();
}

async function getCoinPrice({ coinSymbol, fiatSymbol }) {
  const url =
    `https://min-api.cryptocompare.com/data/price?fsym=${coinSymbol}&tsyms=${fiatSymbol}`;

  const response = await axios({
    method: 'get',
    url,
    responseType: 'json',
    responseEncoding: 'utf8',
  });
  return response.data;
}

function calculateFees({
  web3InstanceTestnet,
  gasUsed,
  gasPrice,
  coinPrice,
  decimalPoints = 18,
}) {
  const fiatRateInCents = web3InstanceTestnet.utils.toBN(
    Math.floor(coinPrice.USD * 100),
  );
  const decimalPointMultiplier = web3InstanceTestnet.utils.toBN(
    Math.pow(10, decimalPoints),
  );
  const cryptoFee = web3InstanceTestnet.utils.toBN(gasUsed)
    .mul(web3InstanceTestnet.utils.toBN(gasPrice));
  const fiatFeeCents = cryptoFee
    .mul(fiatRateInCents)
    .div(decimalPointMultiplier);
  const fiatFee = (fiatFeeCents.toNumber() / 100).toFixed(2);
  return {
    cryptoFee: cryptoFee.toString(),
    fiatFee,
  };
}

async function init(item) {
  const [blockNumber, coinPrice, gasPrice] = await Promise.all([
    getBlockNumber(item),
    getCoinPrice(item),
    getGasPrice(item),
  ]);
  return {
    blockNumber,
    coinPrice,
    gasPrice,
  };
}

async function performComparisonOfTxFee(list, txList) {
  const promises = list.map(async (item, idx) => {
    const {
      web3InstanceTestnet,
      network,
      coinPrice,
      gasPrice,
      decimalPoints,
    } = item;
    const {
      address,
      txHash,
    } = txList[idx];
    const gasUsed = await getGasUsedForTx({ web3InstanceTestnet, txHash });
    const fees = calculateFees({
      web3InstanceTestnet,
      gasUsed,
      gasPrice,
      coinPrice,
      decimalPoints,
    });
    const {
      cryptoFee,
      fiatFee,
    } = fees;
    return {
      network,
      coinPrice,
      gasPrice,
      address,
      txHash,
      gasUsed,
      cryptoFee,
      fiatFee,
    };
  });
  const results = await Promise.all(promises);
  return results;
}

async function performComparison() {
  let list = [
    {
      network: 'rsk',
      web3ProviderTestnet: initialiseRskTestnet(),
      web3ProviderMainnet: initialiseRskMainnet(),
      coinSymbol: 'BTC',
      fiatSymbol: 'USD',
      decimalPoints: 18,
    },
    {
      network: 'ethereum',
      web3ProviderTestnet: initialiseEthTestnet(),
      web3ProviderMainnet: initialiseEthMainnet(),
      coinSymbol: 'ETH',
      fiatSymbol: 'USD',
      decimalPoints: 18,
    },
  ].map((item) => {
    const web3InstanceTestnet = (new Web3(item.web3ProviderTestnet));
    const web3InstanceMainnet = (new Web3(item.web3ProviderMainnet));
    return {
      ...item,
      web3InstanceTestnet,
      web3InstanceMainnet,
    };
  });

  const initPromises = list.map(init);
  const initResults = await Promise.all(initPromises);
  list = list.map((item, idx) => {
    const initResult = initResults[idx];
    return {
      ...item,
      ...initResult
    };
  });

  const bguizErc20ExampleTokenTxList = [
    {
      address: '0x89B110E7e17a62bf5D13009f9D500555611Cb4cD',
      txHash: '0x112dc1cd0a6c50aae90bcb37f0377b510ede046dffb1e18cb32d33a6a4ab2710',
    },
    {
      address: '0x83075fa1a90821ccc89eafc5a149c2b906f3d820',
      txHash: '0xcb9067289d116059c81141840edb643f689ffa3c34767aa608fff8b919dec259',
    },
  ];
  const bguizErc20ExampleTokenTxFeeResults =
    await performComparisonOfTxFee(list, bguizErc20ExampleTokenTxList);
  console.log('ERC20 Example Token Deployment Transaction\n', bguizErc20ExampleTokenTxFeeResults);

  const bguizErc721ExampleTokenTxList = [
    {
      address: '0xc2E29C80a5BDD4785AD520EBE92e53F9BdA8dF0b',
      txHash: '0x0bbaf7f86191c3c0461b5ee99508abcfc6c5067c3a82e43f8dcc2efd792cf070',
    },
    {
      address: '0xb78615d79cf590588c055319f96617c842040db9',
      txHash: '0xc886a1475f07fdf3566c60e27f28c1dcecf3562a493ba28b1071cfe202385267',
    },
  ];
  const bguizErc721ExampleTokenTxFeeResults =
    await performComparisonOfTxFee(list, bguizErc721ExampleTokenTxList);
  console.log('ERC721 Example Token Deployment Transaction\n', bguizErc721ExampleTokenTxFeeResults);

  list.forEach(cleanUp);
}

performComparison();
