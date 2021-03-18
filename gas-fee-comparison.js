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
    providerOrUrl: `https://rinkeby.infura.io/v3/${infuraProjectId}`,
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

async function executeAndLogForEach(
  list,
  names,
  resultName,
  execFunction,
) {
  list.forEach(async (listItem, idx) => {
    const result = await execFunction(listItem);
    console.log(`${resultName}/${names[idx]} = ${result}`);
  });
}

async function performComparison() {
  const names = [
    'rsk',
    'ethereum',
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
    web3Instances, names, 'blockNumber', getBlockNumber);
}

performComparison();
