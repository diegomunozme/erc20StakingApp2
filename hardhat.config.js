require("@nomiclabs/hardhat-ethers");
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  
  solidity:{
    version: "0.8.17",},
    //This paths is for the hardhat to easily find the React frontend
    paths: {
      artifacts: "./client/src/artifatcs"
    }
};
