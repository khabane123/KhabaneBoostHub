let mode="login", me=null;

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
async function api(url,opts={}){const r=await fetch(url,{headers:{"Content-Type":"application/json",...(opts.headers||{})},...opts});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"An samu matsala");return d}

$$(".auth-tabs button").forEach(b=>b.onclick=()=>{mode=b.dataset.auth;$$(".auth-tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#authSubmit").textContent=mode==="login"?"Shiga Account":"Create Account";$("#authMsg").textContent=""});
$("#authForm").onsubmit=async e=>{e.preventDefault();$("#authMsg").textContent="Ana aiki...";try{await api(mode==="login"?"/api/login":"/api/register",{method:"POST",body:JSON.stringify({username:$("#username").value,password:$("#password").value})});await start()}catch(err){$("#authMsg").textContent=err.message}};

async function start(){try{const d=await api("/api/me");if(!d.loggedIn)throw 0;me=d;$("#auth").classList.add("hidden");$("#app").classList.remove("hidden");$("#welcome").textContent=me.user.username;$("#avatar").textContent=me.user.username[0].toUpperCase();render("dashboard")}catch(e){}}
function money(n){return "₦"+Number(n||0).toLocaleString("en-NG",{minimumFractionDigits:2,maximumFractionDigits:2})}
function serviceCard(icon,title,sub,page){return `<div class="card service-card"><div class="service-icon">${icon}</div><div><h3>${title}</h3><p>${sub}</p></div><button class="primary" onclick="render('${page}')">Open</button></div>`}
function base(title,body){return `<h2 class="page-title">${title}</h2>${body}`}
function render(page){
  $$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===page));
  let h="";
  if(page==="dashboard"){
    h=`<div class="wallet"><div>MAIN WALLET · NGN</div><div class="amount">${money(me.user.balance)}</div><p>Account: KhabaneBoostHub Wallet</p><div class="wallet-actions"><button onclick="render('wallet')">＋ Add Money</button><button onclick="render('logs')">◷ History</button><button onclick="moveEarnings()">⇄ Move Earnings</button></div></div>
    <h2 class="page-title">Services</h2><div class="grid">
    ${serviceCard("▥","Data Plans","Wholesale bundles","data")}${serviceCard("▯","Airtime","2–5% discount","airtime")}${serviceCard("▱","Cable TV","DStv · GOtv · StarTimes","cable")}${serviceCard("ϟ","Electricity","All DISCOs","electricity")}${serviceCard("◎","Foreign Numbers V1","Standard routing","foreign1")}${serviceCard("◉","Foreign Numbers V2","Pool tiers","foreign2")}${serviceCard("🚀","Social Boosting","IG · TikTok · YT","boosting")}${serviceCard("▤","Marketplace","Templates & goods","marketplace")}</div>
    <div class="card" style="margin-top:24px"><h2>Rewards & Activity</h2><div class="reward-grid"><div class="metric">REWARD BALANCE<strong>${money(me.user.reward_balance)}</strong></div><div class="metric">REFERRAL EARNINGS<strong>${money(me.user.referral_earnings)}</strong></div><div class="metric">TOTAL TRANSACTIONS<strong>${me.totalTransactions}</strong></div></div></div>`;
  } else if(page==="wallet"){
    h=base("Fund Wallet",`<div class="card"><h3>Wallet Balance: ${money(me.user.balance)}</h3><form class="service-form" onsubmit="addMoney(event)"><label>Amount<input id="amount" type="number" min="1" step="0.01" placeholder="e.g. 5000" required></label><button class="primary">Add Money (Demo)</button></form><p class="muted">Wannan demo ne. Za a iya haɗa Paystack/Flutterwave daga baya don biyan kuɗi na gaske.</p></div>`);
  } else if(page==="earnings"){
    h=base("Move Earnings",`<div class="card"><h3>Earnings ɗinka</h3><div class="reward-grid"><div class="metric">Reward<strong>${money(me.user.reward_balance)}</strong></div><div class="metric">Referral<strong>${money(me.user.referral_earnings)}</strong></div></div><button class="primary" style="margin-top:20px" onclick="moveEarnings()">Move zuwa Wallet</button></div>`);
  } else if(page==="logs"){
    h=base("Recent Activity",`<div class="card"><table class="table"><thead><tr><th>DATE</th><th>TYPE</th><th>REFERENCE</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>${(me.recent||[]).map(x=>`<tr><td>${new Date(x.created_at).toLocaleDateString()}</td><td>${x.type}</td><td>${x.reference||"-"}</td><td>${money(x.amount)}</td><td>${x.status}</td></tr>`).join("")||`<tr><td colspan="5">Babu transaction tukuna.</td></tr>`}</tbody></table></div>`);
  } else if(page==="referrals"){
    h=base("Referrals",`<div class="card"><h2>Earn ₦500 for every friend who joins</h2><p class="muted">Share your code. Ka iya saita referral reward ɗinka daga backend.</p><div class="ref-box"><span class="code">${me.user.referral_code}</span><button class="primary" onclick="navigator.clipboard.writeText('${me.user.referral_code}');toast('An kwafi referral code')">Copy code</button></div></div>`);
  } else if(page==="profile"){
    h=base("Profile",`<div class="card"><h3>Account</h3><p>Username: <b>${me.user.username}</b></p><p>Referral code: <b>${me.user.referral_code}</b></p><button class="primary danger" onclick="logout()">Log out</button></div>`);
  } else {
    const names={data:["Data Plans","▥","Wholesale data bundles"],airtime:["Airtime","▯","2–5% discount"],cable:["Cable TV","▱","DStv · GOtv · StarTimes"],electricity:["Electricity","ϟ","All DISCOs"],foreign1:["Foreign Numbers V1","◎","Standard routing"],foreign2:["Foreign Numbers V2","◉","Pool tiers"],boosting:["Social Boosting","🚀","IG · TikTok · YT"],marketplace:["Marketplace","▤","Templates & goods"]};
    const n=names[page];
    h=base(n[0],`<div class="card"><div class="service-icon">${n[1]}</div><h2>${n[0]}</h2><p class="muted">${n[2]}</p><form class="service-form" onsubmit="purchase(event,'${n[0]}')"><label>Amount<input id="amount" type="number" min="1" step="0.01" placeholder="Enter amount" required></label><button class="primary">Continue Purchase</button></form><p class="muted">An tsara wannan shafin ne domin daga nan a haɗa provider/API na wannan service.</p></div>`);
  }
  $("#content").innerHTML=h;
}
async function refresh(){me=await api("/api/me");$("#welcome").textContent=me.user.username;$("#avatar").textContent=me.user.username[0].toUpperCase()}
async function addMoney(e){e.preventDefault();try{await api("/api/wallet/add",{method:"POST",body:JSON.stringify({amount:Number($("#amount").value)})});await refresh();toast("An ƙara kuɗi a demo wallet");render("wallet")}catch(err){toast(err.message)}}
async function moveEarnings(){try{await api("/api/wallet/move-earnings",{method:"POST"});await refresh();toast("An matsar da earnings zuwa wallet");render("earnings")}catch(err){toast(err.message)}}
async function purchase(service){try{await api("/api/service/purchase",{method:"POST",body:JSON.stringify({service,amount:Number($("#amount").value)})});await refresh();toast("Purchase ya kammala a demo");render("logs")}catch(err){toast(err.message)}}
async function logout(){await api("/api/logout",{method:"POST"});location.reload()}

$$("[data-page]").forEach(b=>b.onclick=()=>{render(b.dataset.page);$("#sidebar").classList.remove("open")});
$("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
$("#themeBtn").onclick=()=>document.body.classList.toggle("light");
$("#logout").onclick=logout;
start();
