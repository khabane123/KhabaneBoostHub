const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, "data", "app.db"));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  reward_balance REAL NOT NULL DEFAULT 0,
  referral_earnings REAL NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  reference TEXT,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000*60*60*24*7 }
}));
app.use(express.static(path.join(__dirname, "public")));

function userFromSession(req) {
  if (!req.session.userId) return null;
  return db.prepare("SELECT id, username, balance, reward_balance, referral_earnings, referral_code FROM users WHERE id=?").get(req.session.userId);
}
function auth(req,res,next) {
  const user = userFromSession(req);
  if (!user) return res.status(401).json({error:"Ba a shiga account ba."});
  req.user = user;
  next();
}

// Create the requested initial account if it does not already exist.
// Password is hashed with bcrypt; it is never stored as plain text.
(async () => {
  const seedUsername = "khabane123@";
  const seedPassword = "khabane123";
  const existing = db.prepare("SELECT id FROM users WHERE username=?").get(seedUsername);
  if (!existing) {
    const hash = await bcrypt.hash(seedPassword, 12);
    db.prepare("INSERT INTO users(username,password_hash,referral_code) VALUES(?,?,?)")
      .run(seedUsername, hash, makeReferralCode(seedUsername));
    console.log("Initial RoyalBoostHub account created.");
  }
})();

function makeReferralCode(username) {
  return username.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8) + Math.random().toString(36).slice(2,7).toUpperCase();
}

app.post("/api/register", async (req,res)=>{
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (!/^[A-Za-z0-9_@.]{3,60}$/.test(username))
    return res.status(400).json({error:"Username ya kasance haruffa/lambobi, aƙalla 3."});
  if (password.length < 6)
    return res.status(400).json({error:"Password ya kamata ya kasance aƙalla haruffa 6."});
  const hash = await bcrypt.hash(password, 12);
  try {
    const code = makeReferralCode(username);
    const info = db.prepare("INSERT INTO users(username,password_hash,referral_code) VALUES(?,?,?)").run(username,hash,code);
    req.session.userId = info.lastInsertRowid;
    res.json({ok:true});
  } catch(e) {
    res.status(409).json({error:"Wannan username ɗin yana nan."});
  }
});

app.post("/api/login", async (req,res)=>{
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const user = db.prepare("SELECT * FROM users WHERE username=?").get(username);
  if (!user || !(await bcrypt.compare(password,user.password_hash)))
    return res.status(401).json({error:"Username ko password ba daidai ba."});
  req.session.userId = user.id;
  res.json({ok:true});
});

app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));

app.get("/api/me",(req,res)=>{
  const user = userFromSession(req);
  if (!user) return res.status(401).json({loggedIn:false});
  const count = db.prepare("SELECT COUNT(*) c FROM transactions WHERE user_id=?").get(user.id).c;
  const recent = db.prepare("SELECT type, reference, amount, status, created_at FROM transactions WHERE user_id=? ORDER BY id DESC LIMIT 10").all(user.id);
  res.json({loggedIn:true,user, totalTransactions:count,recent});
});

app.post("/api/wallet/add",auth,(req,res)=>{
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({error:"Adadin kuɗi bai dace ba."});
  db.prepare("UPDATE users SET balance=balance+? WHERE id=?").run(amount,req.user.id);
  db.prepare("INSERT INTO transactions(user_id,type,reference,amount,status) VALUES(?,?,?,?,?)")
    .run(req.user.id,"Wallet Top-up","TOPUP-"+Date.now(),amount,"Completed");
  res.json({ok:true});
});

app.post("/api/wallet/move-earnings",auth,(req,res)=>{
  const u = db.prepare("SELECT balance,reward_balance,referral_earnings FROM users WHERE id=?").get(req.user.id);
  const amount = u.reward_balance + u.referral_earnings;
  if (amount <= 0) return res.status(400).json({error:"Babu earnings da za a matsar zuwa wallet."});
  db.prepare("UPDATE users SET balance=balance+?, reward_balance=0, referral_earnings=0 WHERE id=?").run(amount,req.user.id);
  db.prepare("INSERT INTO transactions(user_id,type,reference,amount,status) VALUES(?,?,?,?,?)")
    .run(req.user.id,"Move Earnings","EARN-"+Date.now(),amount,"Completed");
  res.json({ok:true});
});

app.post("/api/service/purchase",auth,(req,res)=>{
  const service = String(req.body.service || "").trim();
  const amount = Number(req.body.amount);
  if (!service || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({error:"Bayanan purchase ba su cika ba."});
  const u = db.prepare("SELECT balance FROM users WHERE id=?").get(req.user.id);
  if (u.balance < amount) return res.status(400).json({error:"Balance bai isa ba."});
  db.prepare("UPDATE users SET balance=balance-? WHERE id=?").run(amount,req.user.id);
  db.prepare("INSERT INTO transactions(user_id,type,reference,amount,status) VALUES(?,?,?,?,?)")
    .run(req.user.id,service,service.toUpperCase().replace(/\s/g,"-")+"-"+Date.now(),amount,"Completed");
  res.json({ok:true});
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`RoyalBoostHub app running at http://localhost:${PORT}`));
