// script.js - frontend logic (ethers.js v5 + MetaMask + Ganache)

const INFO = window.CONTRACT_INFO || {};
let provider, signer, board, counter, account;

const $ = (id) => document.getElementById(id);

// Show a message in the status line
function setStatus(text, cls) {
  $("status").textContent = text;
  $("status").className = cls || "";
}

// Escape text so user input cannot inject HTML
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Clean error text from MetaMask / ethers
function errText(err) {
  return (err && (err.reason || (err.data && err.data.message) || err.message)) || String(err);
}

// Is the contract info there? (it only exists after `truffle migrate`)
function hasContracts() {
  return INFO.feedbackBoard && INFO.feedbackBoard.address;
}

// 🧱 Show the deployed addresses
if (hasContracts()) {
  $("addr1").textContent = INFO.feedbackBoard.address;
  if (INFO.visitCounter) $("addr2").textContent = INFO.visitCounter.address;
} else {
  setStatus("Run 'truffle migrate' first (contract-info.js is empty)", "err");
}

// Make sure MetaMask is on the Ganache network, else ask it to switch/add it
async function ensureGanacheNetwork() {
  const wantedHex = "0x" + Number(INFO.chainId || 1337).toString(16);
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: wantedHex }] });
  } catch (e) {
    // 4902 = network not added yet in MetaMask
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: wantedHex,
        chainName: "Ganache Local",
        rpcUrls: ["http://127.0.0.1:7545"],
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }
      }]
    });
  }
}

// 💰 Connect MetaMask
async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask!");
    setStatus("MetaMask not found", "err");
    return;
  }
  if (!hasContracts()) {
    setStatus("Run 'truffle migrate' first", "err");
    return;
  }
  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    account = accounts[0];

    let net = await provider.getNetwork();
    if (net.chainId !== Number(INFO.chainId)) {
      await ensureGanacheNetwork();
      provider = new ethers.providers.Web3Provider(window.ethereum);
      net = await provider.getNetwork();
    }

    signer = provider.getSigner();
    board = new ethers.Contract(INFO.feedbackBoard.address, INFO.feedbackBoard.abi, signer);
    if (INFO.visitCounter) counter = new ethers.Contract(INFO.visitCounter.address, INFO.visitCounter.abi, signer);

    $("account").textContent = account;
    $("network").textContent = "Ganache (chainId " + net.chainId + ")";
    const bal = await provider.getBalance(account);
    $("balance").textContent = Number(ethers.utils.formatEther(bal)).toFixed(4) + " ETH";
    setStatus("Connected ✅", "ok");
    await loadBoard();
    await loadVisits();
  } catch (err) {
    setStatus("Connection failed: " + errText(err), "err");
  }
}

// 📖 READ: count, average, latest 5 feedbacks
async function loadBoard() {
  if (!board) return;
  try {
    const count = (await board.getFeedbackCount()).toNumber();
    const avg = (await board.getAverageRating()).toNumber();

    $("count").textContent = count;
    $("average").textContent = count === 0 ? "No ratings yet" : (avg / 100).toFixed(2) + " / 5";

    const list = $("feedbackList");
    list.innerHTML = "";
    if (count === 0) {
      list.innerHTML = "<li>No feedback yet. Be the first!</li>";
      return;
    }
    for (let i = count - 1; i >= 0 && i >= count - 5; i--) {
      const f = await board.getFeedback(i);
      const r = f[3].toNumber();
      const stars = "★".repeat(r) + "☆".repeat(5 - r);
      const when = new Date(f[4].toNumber() * 1000).toLocaleString();
      const li = document.createElement("li");
      li.innerHTML = "<strong>" + esc(f[1]) + "</strong> <span class='stars'>" + stars + "</span><br>" +
        esc(f[2]) + "<br><span class='small'>" + when + " | from " + f[0].slice(0, 6) + "..." + f[0].slice(-4) + "</span>";
      list.appendChild(li);
    }
  } catch (err) {
    $("txResult").innerHTML = "<span class='err'>Read failed: " + esc(errText(err)) + "</span>";
  }
}

// ✍️ WRITE: post a feedback transaction
async function postFeedback() {
  const result = $("txResult");
  if (!board) { await connectWallet(); if (!board) return; }

  const name = $("name").value.trim();
  const message = $("message").value.trim();
  const rating = $("rating").value;
  if (!name || !message) {
    result.innerHTML = "<span class='err'>Please enter your name and a message.</span>";
    return;
  }

  const btn = $("postBtn");
  try {
    btn.disabled = true;
    result.textContent = "⏳ Waiting for MetaMask confirmation...";
    const tx = await board.postFeedback(name, message, rating);
    result.innerHTML = "📤 Transaction sent: <code>" + tx.hash + "</code><br>⏳ Waiting for it to be mined...";

    const receipt = await tx.wait();
    result.innerHTML = "<span class='ok'>✅ Confirmed in block " + receipt.blockNumber + "</span><br>Hash: <code>" +
      tx.hash + "</code><br>Gas used: " + receipt.gasUsed.toString();

    $("message").value = "";
    await loadBoard();
  } catch (err) {
    result.innerHTML = "<span class='err'>❌ Transaction failed: " + esc(errText(err)) + "</span>";
  } finally {
    btn.disabled = false;
  }
}

// 🎁 BONUS: read visit counter
async function loadVisits() {
  if (!counter) return;
  try {
    $("visits").textContent = (await counter.getVisits()).toString();
    $("myVisits").textContent = (await counter.getMyVisits(account)).toString();
  } catch (err) {
    $("visitResult").innerHTML = "<span class='err'>Read failed: " + esc(errText(err)) + "</span>";
  }
}

// 🎁 BONUS: write visit counter
async function registerVisit() {
  const result = $("visitResult");
  if (!counter) { await connectWallet(); if (!counter) return; }
  try {
    $("visitBtn").disabled = true;
    result.textContent = "⏳ Waiting for MetaMask confirmation...";
    const tx = await counter.visit();
    await tx.wait();
    result.innerHTML = "<span class='ok'>✅ Visit recorded. Hash: </span><code>" + tx.hash + "</code>";
    await loadVisits();
  } catch (err) {
    result.innerHTML = "<span class='err'>❌ Failed: " + esc(errText(err)) + "</span>";
  } finally {
    $("visitBtn").disabled = false;
  }
}

// Reload if the user switches account or network in MetaMask
if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => location.reload());
  window.ethereum.on("chainChanged", () => location.reload());
}
