
const SEPOLIA_CHAIN_ID = 11155111;

const crowdfundingAbi = [
  "function createCampaign(string title,uint256 goalWei,uint256 durationSeconds) returns (uint256)",
  "function getCampaignCount() view returns (uint256)",
  "function getCampaign(uint256 id) view returns (address creator,string title,uint256 goalWei,uint256 deadline,uint256 raisedWei,bool finalized,bool successful)",
  "function contribute(uint256 id) payable",
  "function finalize(uint256 id)",
  "function claimRefund(uint256 id)",
  "function contributions(uint256 id,address user) view returns (uint256)"
];

const erc20Abi = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

let provider, signer, userAddress;

const el = (id) => document.getElementById(id);
const status = (msg, ok=true) => {
  el("status").innerHTML = `<span class="${ok ? "ok" : "bad"}">${msg}</span>`;
};

async function requireConnected() {
  if (!signer || !userAddress) throw new Error("Connect MetaMask first");
}

async function connect() {
  if (!window.ethereum) {
    status("MetaMask not found", false);
    return;
  }
  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  userAddress = await signer.getAddress();

  const net = await provider.getNetwork();
  const chainId = Number(net.chainId);

  el("wallet").textContent = userAddress;
  el("network").textContent = `${net.name} (${chainId})`;

  if (chainId !== SEPOLIA_CHAIN_ID) {
    status("Please switch MetaMask network to Sepolia", false);
  } else {
    status("Connected to Sepolia ", true);
  }

  await refreshBalances();
}

async function refreshBalances() {
  await requireConnected();

  const eth = await provider.getBalance(userAddress);
  el("ethBal").textContent = `${ethers.formatEther(eth)} ETH`;

  const tokenAddr = el("tokenAddr").value.trim();
  if (ethers.isAddress(tokenAddr)) {
    const token = new ethers.Contract(tokenAddr, erc20Abi, provider);
    const [dec, sym, bal] = await Promise.all([
      token.decimals(),
      token.symbol(),
      token.balanceOf(userAddress)
    ]);
    el("tokBal").textContent = `${ethers.formatUnits(bal, dec)} ${sym}`;
  } else {
    el("tokBal").textContent = "-";
  }
}

function getContracts() {
  const crowdAddr = el("crowdAddr").value.trim();
  const tokenAddr = el("tokenAddr").value.trim();

  if (!ethers.isAddress(crowdAddr)) throw new Error("Invalid crowdfunding address");
  if (!ethers.isAddress(tokenAddr)) throw new Error("Invalid token address");

  const crowdRead = new ethers.Contract(crowdAddr, crowdfundingAbi, provider);
  const crowdWrite = new ethers.Contract(crowdAddr, crowdfundingAbi, signer);
  const tokenRead = new ethers.Contract(tokenAddr, erc20Abi, provider);

  return { crowdRead, crowdWrite, tokenRead };
}

async function loadCampaigns() {
  await requireConnected();

  const { crowdRead } = getContracts();
  const count = Number(await crowdRead.getCampaignCount());

  const container = el("campaigns");
  container.innerHTML = `<div class="muted">Found ${count} campaigns</div>`;

  for (let i = 0; i < count; i++) {
    const c = await crowdRead.getCampaign(i);
    const creator = c[0];
    const title = c[1];
    const goalWei = c[2];
    const deadline = c[3];
    const raisedWei = c[4];
    const finalized = c[5];
    const successful = c[6];

    const nowSec = Math.floor(Date.now()/1000);
    const left = Number(deadline) > nowSec ? (Number(deadline) - nowSec) : 0;

    const myContrib = await crowdRead.contributions(i, userAddress);

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h4>#${i} — ${title}</h4>
      <div class="muted">
        Creator: <code>${creator}</code><br/>
        Goal: <code>${ethers.formatEther(goalWei)} ETH</code><br/>
        Raised: <code>${ethers.formatEther(raisedWei)} ETH</code><br/>
        Deadline: <code>${new Date(Number(deadline)*1000).toLocaleString()}</code><br/>
        Time left: <code>${Math.floor(left/60)} min</code><br/>
        Finalized: <code>${finalized}</code>, Successful: <code>${successful}</code><br/>
        Your contribution: <code>${ethers.formatEther(myContrib)} ETH</code>
      </div>

      <div class="row" style="margin-top:10px;">
        <div>
          <label>Contribute (ETH)</label>
          <input id="amt-${i}" placeholder="0.01" />
          <button id="btnContrib-${i}">Contribute</button>
        </div>
        <div>
          <label>Actions</label>
          <button id="btnFinalize-${i}">Finalize</button>
          <button id="btnRefund-${i}" style="margin-left:8px;">Claim Refund</button>
        </div>
      </div>
      <div id="res-${i}" class="muted" style="margin-top:8px;"></div>
    `;

    container.appendChild(card);

    el(`btnContrib-${i}`).onclick = async () => {
      try {
        const { crowdWrite } = getContracts();
        const amt = el(`amt-${i}`).value.trim();
        const value = ethers.parseEther(amt || "0");
        el(`res-${i}`).textContent = "Sending transaction...";
        const tx = await crowdWrite.contribute(i, { value });
        await tx.wait();
        el(`res-${i}`).textContent = "Contributed!";
        await refreshBalances();
        await loadCampaigns();
      } catch (e) {
        el(`res-${i}`).textContent = `${e.message || e}`;
      }
    };

    el(`btnFinalize-${i}`).onclick = async () => {
      try {
        const { crowdWrite } = getContracts();
        el(`res-${i}`).textContent = "Finalizing...";
        const tx = await crowdWrite.finalize(i);
        await tx.wait();
        el(`res-${i}`).textContent = "Finalized!";
        await refreshBalances();
        await loadCampaigns();
      } catch (e) {
        el(`res-${i}`).textContent = `${e.message || e}`;
      }
    };

    el(`btnRefund-${i}`).onclick = async () => {
      try {
        const { crowdWrite } = getContracts();
        el(`res-${i}`).textContent = "Claiming refund...";
        const tx = await crowdWrite.claimRefund(i);
        await tx.wait();
        el(`res-${i}`).textContent = "Refunded!";
        await refreshBalances();
        await loadCampaigns();
      } catch (e) {
        el(`res-${i}`).textContent = `${e.message || e}`;
      }
    };
  }
}

async function createCampaign() {
  await requireConnected();

  const { crowdWrite } = getContracts();

  const title = el("cTitle").value.trim();
  const goalEth = el("cGoalEth").value.trim();
  const durationMin = el("cDurationMin").value.trim();

  const goalWei = ethers.parseEther(goalEth || "0");
  const durationSeconds = BigInt(Math.floor(Number(durationMin || "0") * 60));

  el("createRes").textContent = "Sending transaction...";
  const tx = await crowdWrite.createCampaign(title, goalWei, durationSeconds);
  await tx.wait();
  el("createRes").textContent = "Campaign created!";
  await loadCampaigns();
}

el("btnConnect").onclick = connect;
el("btnLoad").onclick = async () => { try { await loadCampaigns(); } catch(e){ status(e.message || String(e), false);} };
el("btnCreate").onclick = async () => { try { await createCampaign(); } catch(e){ el("createRes").textContent = `${e.message || e}`; } };

window.ethereum?.on?.("accountsChanged", () => window.location.reload());
window.ethereum?.on?.("chainChanged", () => window.location.reload());
