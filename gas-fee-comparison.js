#!/usr/bin/env node

const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');

const mnemonicSeedPhrase = process.env.MNEMONIC ||
  '';
const infuraProjectId = process.env.INFURA_PROJECT_ID ||
  '';

function initialiseRsk() {
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

function initialiseEth() {
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

function cleanUp(web3Provider) {
  web3Provider.engine.stop();
}

async function getBlockNumber(web3Instance) {
  const block = await web3Instance.eth.getBlock('latest', false);
  const blockNumber = block.number;
  return blockNumber;
}

async function getGasUsedForTx({ web3Instance, txHash }) {
  const txReceipt = await web3Instance.eth.getTransactionReceipt(txHash);
  const gasUsed = txReceipt.gasUsed;
  return gasUsed;
}

async function getGasPrice(web3Instance) {
  return web3Instance.eth.getGasPrice();
}

async function executeAndLogForEach(
  list,
  names,
  resultName,
  execFunction,
) {
  const results = list.map(async (listItem, idx) => {
    const result = await execFunction(listItem);
    console.log(`${resultName}/${names[idx]} = ${result}`);
    return result;
  });
  return results;
}

async function performComparison() {
  const names = [
    'rsk/testnet',
    'ethereum/kovan',
  ];

  const web3ProviderRsk = initialiseRsk();
  const web3ProviderEth = initialiseEth();
  const web3Providers = [
    web3ProviderRsk,
    web3ProviderEth,
  ];

  const web3InstanceRsk = new Web3(web3ProviderRsk);
  const web3InstanceEth = new Web3(web3ProviderEth);
  const web3Instances = [
    web3InstanceRsk,
    web3InstanceEth,
  ];

  web3Providers.forEach(cleanUp);
  await executeAndLogForEach(
    web3Instances, names, 'blockNumber', getBlockNumber,
  );
  const rifTokenAddresses = [
    '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe',
    '0x69f6d4d4813f8e2e618dae7572e04b6d5329e207',
  ];
  await executeAndLogForEach(
    rifTokenAddresses, names, 'rifTokenContractAddress', ((x) => (x)),
  );
  const rifTokenDeploymentTxHashes = [
    '0xf56cd8264ada751fec85d2646fb593ab3b4cf53e8104a6e5768097239b5fe2eb',
    '0x1ecb1e45f7eb27e9fa4a43d2d71d37e92d1a1789b7b1bfbc4bf233598aeade52',
  ];
  await executeAndLogForEach(
    rifTokenDeploymentTxHashes, names, 'rifTokenContractDeploymentTx', ((x) => (x)),
  );
  const gasUsedPromises = await executeAndLogForEach(
    [
      { web3Instance: web3Instances[0], txHash: rifTokenDeploymentTxHashes[0], },
      { web3Instance: web3Instances[1], txHash: rifTokenDeploymentTxHashes[1], },
    ],
    names, 'gasUsed', getGasUsedForTx,
  );
  const gasPricePromises = await executeAndLogForEach(
    web3Instances, names, 'currentGasPrice', getGasPrice,
  );
  const gasUsedResults = await Promise.all(gasUsedPromises);
  const gasPriceResults = await Promise.all(gasPricePromises);
  console.log({
    gasUsedResults,
    gasPriceResults,
  });
}

performComparison();
