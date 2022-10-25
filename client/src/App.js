import { useEffect, useState } from "react";

import { ethers } from "ether";

import artifact from "./artifacts/contracts/Staking.sol/Staking.json";
import usdtArtifact from "./artifacts/contracts/Tether.sol/Tether.json";
import "./App.css";

import StakeModal from "./Components/StakeModal";

const CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

const USDT_ADDRESS = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";

function App() {
  const [provider, setProvider] = useState(undefined);

  const [signer, setSigner] = useState(undefined);

  const [contract, setContract] = useState(undefined);

  const toEther = (wei) =>
    Number(ethers.utils.formatEther(String(wei))).toFixed(2);

  const [tokenSymbols, setTokenSymbols] = useState([]);

  const [tokens, setTokens] = useState({});

  const [stakedTokens, setStakedTokens] = useState({});

  const [assetIds, setAssetIds] = useState([]);
  const [assets, setAssets] = useState([]);

  const [showStakeModal, setShowStakeModal] = useState(false);

  const [stakeTokenSymbol, setStakeTokenSymbol] = useState(undefined);

  const [stakeTokenQuantity, setStakeTokenQuantity] = useState(undefined);

  const [tokenContracts, setTokenContracts] = useState({});

  useEffect(() => {
    const onLoad = async () => {
      const provider = await new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);

      const contract = await new ethers.Contract(
        CONTRACT_ADDRESS,
        artifact.abi,
        provider
      );
      setContract(contract);

      const usdtContract = await new ethers.Contract(
        USDT_ADDRESS,
        usdtArtifact.abi,
        provider
      );

      setTokenContracts((prev) => ({ ...prev, ["USDT"]: usdtContract }));

      const tokenSymbols = await contract.getTokenSymbols();
      setTokenSymbols(tokenSymbols);

      tokenSymbols.map(async (symbol) => {
        const token = await contract.getToken(symbol);
        setTokens((prev) => ({ ...prev, [symbol]: token }));

        const stakedAmount = await contract.stakedTokens(symbol);
        setStakedTokens((prev) => ({
          ...prev,
          [symbol]: toEther(stakedAmount),
        }));
      });
    };
    onLoad();
  }, []);

  const isConnected = () => signer !== undefined;

  const getSigner = async () => {
    const signer = provider.getSigner();
    setSigner(signer);
    return signer;
  };

  const connectAndLoad = async () => {
    const signer = await getSigner(provider);
    setSigner(signer);

    const assetIdsHex = await contract
      .connect(signer)
      .getPositionIdsForAddress();
    const assetIds = assetIdsHex.map((id) => Number(id));
    setAssetIds(assetIds);

    const queriedAssets = await Promise.all(
      assetIds.map((id) => contract.connect(signer).getPositionById(Number(id)))
    );

    queriedAssets.map(async (asset) => {
      const tokensStaked = toEther(asset.tokenQuantity);

      const ethAccruedInterestWei = await calcAccruedInterest(
        asset.apy,
        asset.createdDate
      );

      const ethAccruedInterest = toEther(ethAccruedInterestWei);

      const parsedAsset = {
        positionId: Number(asset.positionId),
        tokenName: asset.name,
        tokenSymbol: asset.symbol,
        createdDate: asset.createdDate,
        apy: asset.apy / 100,
        tokensStaked: tokensStaked,
        open: asset.open,
      };

      setAssets((prev) => [...prev, parsedAsset]);
    });
  };

  const calcAccruedInterest = async (apy, value, createdDate) => {
    const numberOfDays = await contract.calculateNumberDays(createdDate);
    const accruedInterest = await contract.calculateInterest(
      apy,
      value,
      numberOfDays
    );
    return Number(accruedInterest);
  };

  const openStakingModal = (tokenSymbol) => {
    setShowStakeModal(true);
    setStakeTokenSymbol(tokenSymbol);
  };

  const stakeTokens = async () => {
    const stakeTokenQuantityWei = ethers.utils.parseEther(stakeTokenQuantity);
    await tokenContracts[stakeTokenSymbol]
      .connect(signer)
      .approve(contract.address, stakeTokenQuantityWei);
    contract
      .connect(signer)
      .stakeTokens(stakeTokenSymbol, stakeTokenQuantityWei);
  };

  const withdraw = (positionId) => {
    contract.connect(signer).closePosition(positionId);
  };

  const tokenRow = (tokenSymbol) => {
    const token = tokens[tokenSymbol];
    const amountStaked = Number(stakedTokens[tokenSymbol]);

    return (
      <div className="row">
        <div className="col-md-2">{token?.symbol}</div>
        <div className="col-md-2">
          {(Number(token?.usdPrice) / 100).toFixed(0)}
        </div>
        <div className="col-md-2">{amountStaked}</div>
        <div className="col-md-2">{(Number(token?.apy) / 100).toFixed(0)}%</div>
        <div className="col-md-2">
          {isConnected() && (
            <div
              className="orangeMiniButton"
              onClick={() => openStakingModal(tokenSymbol, "12%")}
            >
              Stake
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <div className="marketContainer">
        <div className="subContainer">
          <span>
            <img className="logoImg" src="eth-logo.webp" />
          </span>
          <span className="marketHeader">Hashback Staking</span>
        </div>

        <div>
          <div className="row columnHeaders">
            <div className="col-md-2">Asset</div>
            <div className="col-md-2">Symbol</div>
            <div className="col-md-2">Total Supplied</div>
            <div className="col-md-2">APY</div>
          </div>
        </div>
        <div>
          {tokenSymbols.length > 0 &&
            Object.keys(tokens).length > 0 &&
            tokenSymbols.map((a, idx) => <div>{tokenRow(a)}</div>)}
        </div>
      </div>

      <div className="assetContainer">
        {isConnected() ? (
          <>
            <div className="subContainer">
              <span className="marketHeader stakedTokensHeader">
                Staked Assets
              </span>
            </div>
            <div>
              <div>
                <div className="row columnHeaders">
                  <div className="col-md-1">Asset</div>
                  <div className="col-md-2">Tokens Staked</div>
                  <div className="col-md-2">Market Value (USD)</div>
                  <div className="col-md-2">Accrued Interest (USD)</div>
                  <div className="col-md-2">Accrued Interest (ETH)</div>
                  <div className="col-md-2"></div>
                </div>
              </div>
              <br />
              {assets.length > 0 &&
                assets.map((a, idx) => (
                  <div className="row">
                    <div className="col-md-2">{a.tokensStaked}</div>
                    <div className="col-md-2">{a.usdValue}</div>
                    <div className="col-md-2">{a.usdAccruedInterest}</div>
                    <div className="col-md-2">{a.ethAccruedInterest}</div>
                    <div className="col-md-2">
                      {a.open ? (
                        <div
                          onClick={() => withdraw(a.positionId)}
                          className="orangeMiniButton"
                        >
                          Withdraw
                        </div>
                      ) : (
                        <span>closed</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <div onClick={() => connectAndLoad()} className="connectButton">
            Connect Wallet
          </div>
        )}
      </div>
      {showStakeModal && (
        <StakeModal
          onClose={() => setShowStakeModal(false)}
          stakeTokenSymbol={stakeTokenSymbol}
          setStakeTokenQuantity={setStakeTokenQuantity}
          stakeTokens={stakeTokens}
        />
      )}
    </div>
  );
}

export default App;
