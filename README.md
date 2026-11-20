# PAK VOTEX

**Unofficial educational blockchain voting and election-audit simulator.** Theme: CyberVote 2077 (purple/cyan cyberpunk). Candidate names and illustrations are fictional/parody references; this is not affiliated with a political party or election authority.

## What works in the source code
- Register a test wallet and issue a non-transferable ERC-721 VoterPass.
- One registered wallet can cast one transparent demo vote; repeated attempts revert.
- Admin can publish unique polling-station totals and SHA-256 document hashes; each creates a non-transferable ResultProof NFT.
- Admin submits consolidated totals; anyone can run on-chain verification to detect mismatches.
- Mint one of each of three parody candidate collectibles per wallet and transfer them with ERC-721.
- Frontend displays real contract data and allows file-hash comparison in the browser.

**Important limitations:** Wallet registration is not real-world identity verification. Voting choices are public in transaction calldata even though the VoteCast event does not contain the choice. Result hashes detect changes but do not establish original accuracy. Station audit figures and direct demo votes are independent and never added together. The admin can submit consolidated totals once; there is no correction/dispute procedure in this classroom MVP. The contract can finalize with a discrepancy flag, which is an audit finding, not certification of correctness. No fiat or valuable token is involved.

## Folder structure
- `contracts/PakVotexNFT.sol`: ERC-721 voter passes, result proofs, transferable collectibles.
- `contracts/PakVotexElection.sol`: eight core election functions.
- `frontend/`: responsive web UI and MetaMask integration.
- `scripts/deploy.js`: deploy and connect contracts; writes `frontend/config.js`.
- `test/`: Hardhat contract tests.
- `screenshots/`: add actual screenshots after deployment.

## Setup on Windows (PowerShell or CMD)
1. Install Node.js LTS and MetaMask.
2. Open a terminal **inside the PAK-VOTEX folder**.
3. Run `npm install` then `npm test`.
4. Copy `.env.example` to `.env` and fill in a **dedicated test-wallet** private key and a Sepolia RPC URL. **Never use your main wallet or upload `.env`.** Fund that wallet with testnet Sepolia ETH for gas.
5. Run `npm run deploy:sepolia`. This deploys both contracts, wires the NFT contract to the election contract, creates a demo election, and generates `frontend/config.js` with real contract addresses.
6. Run `npx http-server frontend -p 8080` (if prompted, approve installing the server package) or use VS Code Live Server on `frontend/index.html`. Visit `http://localhost:8080`.
7. Switch MetaMask to Sepolia, connect, and use the admin wallet to register a voter. Use the voter wallet to cast a vote. Admin submits station results and consolidated totals, then anyone verifies. Use a separate wallet to test NFT transfer.

## Demo in 2–3 minutes
Connect wallet → admin registers a demo voter (VoterPass NFT) → voter casts a vote → repeat vote fails → mint and transfer a parody collectible → admin shows sample station totals vs mismatched consolidated totals → verify and show discrepancy. Prepare transactions in advance; testnet confirmations can take time.

## Assignment compliance
Custom ERC-721 token, Solidity main contract with **8 core business functions**, HTML/CSS/JS + ethers.js, MetaMask, testnet deployment script, theme-consistent visuals, README and tests. Inherited ERC-721 methods and NFT issuance methods are additional standard/supporting functions. Submit ZIP, screenshots, GitHub URL, and **actual deployed addresses** once deployed.

## Current status
Source-code starter build only. Deployment, tests and live browser functionality must be verified on your machine; no testnet address, screenshot or GitHub URL is claimed here.
