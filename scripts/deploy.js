async function main() {
  [owner] = await ethers.getSigners();

  const Staking = await ethers.getContractFactory("Staking", owner);

  const staking = await Staking.deploy(187848);

  const Tether = await ethers.getContractFactory("Tether", owner);
  tether = await Tether.deploy();

  await staking
    .connect(owner)
    .addToken("Tether", "USDT", tether.address, 200);

  console.log("Staking:", staking.address);
  console.log("Tether:", tether.address);

  const provider = waffle.provider;
  const block = await provider.getBlock();
  const newCreatedDate = block.timestamp - 86400 * 365;
  await staking.connect(owner).modifyCreatedDate(1, newCreatedDate);
  await staking.connect(owner).modifyCreatedDate(2, newCreatedDate);
  await staking.connect(owner).modifyCreatedDate(3, newCreatedDate);
}

// npx hardhat run --network localhost scripts/deploy.js

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
