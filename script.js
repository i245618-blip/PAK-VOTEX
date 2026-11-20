/* PAK VOTEX — direct contract interaction; no mock balances or fake transaction success. */
const electionAbi = [
 'function owner() view returns (address)',
 'function registered(address) view returns (bool)',
 'function hasVoted(address) view returns (bool)',
 'function stationCount() view returns (uint256)',
 'function stationDocumentHash(uint256) view returns (bytes32)',
 'function getElectionData() view returns (string,bool,uint256,uint256,uint256[3],uint256[3],uint256[3],bool,bool)',
 'function registerVoter(address)', 'function castVote(uint8)',
 'function publishStationResult(uint256,uint256[3],bytes32)',
 'function submitConsolidatedResult(uint256[3])', 'function verifyResults()', 'function finalizeElection()'
];
const nftAbi = [
 'function mintCollectible(uint256) returns (uint256)',
 'function ownerOf(uint256) view returns (address)',
 'function kindOf(uint256) view returns (uint8)',
 'function safeTransferFrom(address,address,uint256)',
 'function balanceOf(address) view returns (uint256)'
];
const $ = id => document.getElementById(id);
const names = ['Khan Sahab', 'Sher', 'Teer'];
let provider, signer, election, nft, address;
let isAdmin=false; let refreshBusy=false;
const cfg = window.PAK_VOTEX_CONFIG;
function notice(message, type='') { $('notice').className='notice '+type; $('notice').textContent=message; }
function requireConnected() { if(!election || !nft || !signer) throw Error('Connect MetaMask on the deployed network first.'); }
function getNum(id) { const v=$(id).value.trim(); if(!/^\d+$/.test(v)) throw Error('Enter a valid non-negative whole number: '+id); return BigInt(v); }
function getTotals(prefix) { return [0,1,2].map(i=>getNum(prefix+i)); }
function short(a) { return a ? a.slice(0,7)+'…'+a.slice(-5) : '—'; }
function formatTotals(id, totals) { $(id).innerHTML=names.map((n,i)=>`<div class="audit-line"><span>${n}</span><strong>${totals[i].toString()}</strong></div>`).join(''); }
async function run(label, action) {
 try { requireConnected(); notice(label+' — confirm in MetaMask if prompted.'); const tx=await action(); notice(label+' — transaction sent: '+tx.hash+' (waiting for confirmation)'); await tx.wait(); notice(label+' — confirmed on blockchain: '+tx.hash,'ok'); await refresh(); }
 catch(err) {
  if(label==='Cast vote') { try { if(await election.hasVoted(address)) { showVoteBlocked('This wallet has already voted in this election. Your previous vote remains recorded on-chain.'); return; } } catch(_) {} }
  notice((err.shortMessage || err.reason || err.message || String(err)).slice(0,350),'error');
 }
}
async function connect() {
 try {
  if(!window.ethereum) throw Error('MetaMask not detected. Install MetaMask first.');
  if(!cfg) throw Error('Missing frontend/config.js. Deploy contracts using npm run deploy:sepolia first.');
  provider=new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts',[]);
  const net=await provider.getNetwork();
  if(Number(net.chainId)!==Number(cfg.chainId)) throw Error(`Wrong network. Switch MetaMask to chain ID ${cfg.chainId} and reconnect.`);
  signer=await provider.getSigner(); address=await signer.getAddress();
  election=new ethers.Contract(cfg.election,electionAbi,signer);
  nft=new ethers.Contract(cfg.nft,nftAbi,signer);
  $('walletAddress').textContent=short(address); $('network').textContent=Number(net.chainId)===11155111?'SEPOLIA TESTNET':'CHAIN '+net.chainId;
  $('connect').textContent='Wallet connected';
  isAdmin=(await election.owner()).toLowerCase()===address.toLowerCase();
  document.getElementById('admin').hidden=!isAdmin;
  document.querySelectorAll('.admin-only').forEach(el=>el.hidden=!isAdmin);
  $('roleBadge').textContent=isAdmin?'ADMIN ACCESS':'STUDENT VOTER';
  notice('Connected: '+address+(isAdmin?' (Admin)':' (Voter)'),'ok'); await refresh();
 } catch(err) { notice(err.shortMessage||err.message,'error'); }
}
async function refresh() {
 if(refreshBusy || !election)return; refreshBusy=true;
 try { requireConnected(); const d=await election.getElectionData();
  $('electionTitle').textContent=d[0]||'Election not created'; $('registered').textContent=d[2].toString(); $('cast').textContent=d[3].toString(); $('stations').textContent=(await election.stationCount()).toString();
  $('auditStatus').textContent=d[7]?(d[8]?'MISMATCH':'MATCH'):'NOT VERIFIED';
  const total=Number(d[3]); $('results').innerHTML=names.map((name,i)=>`<div class="result-row"><span>${name}</span><div class="bar"><div class="fill" style="width:${total?Number(d[4][i])*100/total:0}%"></div></div><strong>${d[4][i].toString()}</strong></div>`).join('');
  formatTotals('stationTotals',d[5]);formatTotals('consolidatedTotals',d[6]);
  const diffs=names.map((n,i)=>({n,d:BigInt(d[6][i])-BigInt(d[5][i])})).filter(x=>x.d!==0n);
  $('difference').textContent=!d[7]?'Verification not run yet.':diffs.length?'Discrepancy detected: '+diffs.map(x=>x.n+' '+(x.d>0n?'+':'')+x.d).join(', '):'All consolidated totals match submitted station totals.';
  $('eligibility').textContent='VoterPass registered: '+(await election.registered(address)?'YES':'NO')+' | Already voted: '+(await election.hasVoted(address)?'YES':'NO')+' | Election finalized: '+(d[1]?'YES':'NO');
  $('liveStatus').textContent='LIVE • '+d[3].toString()+' votes received'+(d[1]?' • CLOSED':' • OPEN');
 } catch(err) { notice('Refresh failed: '+(err.shortMessage||err.message),'error'); }
 finally {refreshBusy=false;}
}
async function hashFile(file) { if(!file) throw Error('Select a document file first.'); const bytes=await file.arrayBuffer(); const digest=await crypto.subtle.digest('SHA-256',bytes); return '0x'+Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join(''); }
function action(id,fn) { $(id).addEventListener('click',fn); }
action('connect',connect); action('refresh',refresh);
// Clear, on-page duplicate-vote feedback instead of relying on the Overview notice.
function showVoteBlocked(message) {
 const previous=document.getElementById('votex-vote-alert'); if(previous) previous.remove();
 const overlay=document.createElement('div'); overlay.id='votex-vote-alert';
 Object.assign(overlay.style,{position:'fixed',inset:'0',background:'rgba(3,5,20,.86)',zIndex:'100000',display:'grid',placeItems:'center',padding:'20px'});
 const panel=document.createElement('div');
 Object.assign(panel.style,{width:'min(430px,100%)',background:'#12172e',border:'1px solid #ff4d9d',borderRadius:'18px',padding:'28px',color:'#eef6ff',boxShadow:'0 0 48px rgba(255,77,157,.25)',fontFamily:'inherit',textAlign:'center'});
 const symbol=document.createElement('div');symbol.textContent='⛔';symbol.style.fontSize='38px';
 const title=document.createElement('h2');title.textContent='VOTE ALREADY CAST';title.style.color='#ff6caa';title.style.margin='10px 0';
 const body=document.createElement('p');body.textContent=message;body.style.lineHeight='1.6';
 const button=document.createElement('button');button.textContent='Got it';
 Object.assign(button.style,{background:'#7c3aed',border:'0',borderRadius:'9px',padding:'12px 25px',color:'white',fontWeight:'bold',cursor:'pointer',marginTop:'12px'});
 const close=()=>overlay.remove();button.onclick=close;
 overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
 panel.append(symbol,title,body,button);overlay.append(panel);document.body.append(overlay);button.focus();
}
action('castVote',async()=>{
 try {
  requireConnected();
  // Query the contract first so a duplicate attempt never opens a needless MetaMask gas prompt.
  if(await election.hasVoted(address)) {
   showVoteBlocked('This wallet has already voted in this election. Only one vote per registered wallet is allowed. Your previous vote remains recorded on-chain.');
   return;
  }
  await run('Cast vote',()=>election.castVote(Number(document.querySelector('input[name="candidate"]:checked').value)));
 } catch(err) {
  const msg=err.shortMessage||err.reason||err.message||String(err);
  // Also handle the case where a vote was recorded while the page was open.
  try { if(await election.hasVoted(address)) { showVoteBlocked('This wallet has already voted in this election. Your previous vote remains recorded on-chain.');return; } } catch(_) {}
  notice(msg.slice(0,350),'error');
 }
});
action('register',()=>run('Issue VoterPass',()=>election.registerVoter($('voterAddress').value.trim())));
action('publish',()=>run('Publish station result',async()=>election.publishStationResult(getNum('stationId'),getTotals('s'),await hashFile($('stationFile').files[0]))));
action('submit',()=>run('Submit consolidated result',()=>election.submitConsolidatedResult(getTotals('c'))));
action('verify',()=>run('Verify results',()=>election.verifyResults()));
action('finalize',()=>{ if(confirm('Finalizing is permanent. Continue?')) run('Finalize election',()=>election.finalizeElection()); });
// Mint confirmation: derive the exact NFT ID from the ERC-721 Transfer event.
const transferEventInterface = new ethers.Interface([
 'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
]);
function showMintReceipt(tokenId, mascot) {
 const title = ['','Khan Sahab • PTI','Sher Sahab • PML-N','Teer Sahab • PPP'][mascot] || 'Candidate collectible';
 const old = document.getElementById('votex-mint-receipt'); if (old) old.remove();
 const overlay = document.createElement('div'); overlay.id='votex-mint-receipt';
 Object.assign(overlay.style,{position:'fixed',inset:'0',background:'rgba(3,5,20,.85)',zIndex:'99999',display:'grid',placeItems:'center',padding:'20px'});
 const panel = document.createElement('div');
 Object.assign(panel.style,{width:'min(440px,100%)',background:'#12172e',border:'1px solid #00e5ff',borderRadius:'18px',padding:'28px',color:'#eef6ff',boxShadow:'0 0 48px rgba(124,58,237,.4)',fontFamily:'inherit'});
 const heading = document.createElement('h2');heading.textContent='🎉 NFT MINTED!';heading.style.color='#00e5ff';
 const subtitle=document.createElement('p');subtitle.textContent=title;
 const idLine=document.createElement('p');idLine.textContent='Token ID: #'+tokenId;idLine.style.fontSize='22px';idLine.style.fontWeight='bold';
 const ownerLine=document.createElement('p');ownerLine.textContent='Owner: '+address;ownerLine.style.overflowWrap='anywhere';ownerLine.style.fontSize='13px';
 const buttons=document.createElement('div');Object.assign(buttons.style,{display:'flex',gap:'10px',flexWrap:'wrap',marginTop:'18px'});
 const verify=document.createElement('button');verify.textContent='Check Ownership';
 const close=document.createElement('button');close.textContent='Close';
 for(const b of [verify,close]) Object.assign(b.style,{background:'#7c3aed',border:'0',borderRadius:'9px',padding:'12px 15px',color:'white',fontWeight:'bold',cursor:'pointer'});
 verify.onclick=()=>{ $('lookupId').value=tokenId; overlay.remove(); $('lookup').click(); };
 close.onclick=()=>overlay.remove();
 buttons.append(verify,close);panel.append(heading,subtitle,idLine,ownerLine,buttons);overlay.append(panel);document.body.append(overlay);
}
action('mint',async()=>{
 try {
  requireConnected();
  const mascot=Number($('mascot').value);
  notice('Mint collectible — confirm in MetaMask if prompted.');
  const tx=await nft.mintCollectible(BigInt(mascot));
  notice('Mint collectible — waiting for confirmation: '+tx.hash);
  const receipt=await tx.wait();
  if(!receipt || receipt.status!==1) throw Error('Mint transaction did not succeed.');
  let tokenId;
  for(const log of receipt.logs){
   if(log.address.toLowerCase()!==cfg.nft.toLowerCase()) continue;
   try {
    const parsed=transferEventInterface.parseLog(log);
    if(parsed && parsed.name==='Transfer' && parsed.args.from===ethers.ZeroAddress && parsed.args.to.toLowerCase()===address.toLowerCase()) {
      tokenId=parsed.args.tokenId.toString();break;
    }
   } catch(_) { /* other event */ }
  }
  if(!tokenId) throw Error('Transaction confirmed, but mint Token ID was not found in its receipt.');
  notice('NFT #'+tokenId+' minted successfully!','ok');
  showMintReceipt(tokenId,mascot);
  await refresh();
 } catch(err){notice((err.shortMessage||err.reason||err.message||String(err)).slice(0,350),'error');}
});
action('transfer',()=>run('Transfer collectible',()=>nft.safeTransferFrom(address,$('transferTo').value.trim(),getNum('transferId'))));
action('lookup',async()=>{ try{requireConnected();const id=getNum('lookupId');const [owner,kind]=await Promise.all([nft.ownerOf(id),nft.kindOf(id)]);$('ownerResult').textContent='NFT #'+id+' | '+['VoterPass (locked)','ResultProof (locked)','Collectible (transferable)'][Number(kind)]+' | Owner: '+owner;}catch(err){$('ownerResult').textContent=err.shortMessage||err.message;} });
action('checkDocument',async()=>{ try{requireConnected();const id=getNum('checkStation');const local=await hashFile($('checkFile').files[0]);const stored=await election.stationDocumentHash(id);$('fileResult').textContent=stored===ethers.ZeroHash?'No registered document for station '+id:local.toLowerCase()===stored.toLowerCase()?'MATCH — local file matches recorded SHA-256 hash':'MISMATCH — selected file differs from recorded fingerprint';}catch(err){$('fileResult').textContent=err.message;} });
if(window.ethereum){window.ethereum.on('accountsChanged',()=>location.reload());window.ethereum.on('chainChanged',()=>location.reload());}

// Classroom enhancements: owner-only admin UI, sequential batch registrations, live read-only polling.
action('shareLink', async()=>{
 const url=location.href.split('#')[0]+'#vote';
 try {await navigator.clipboard.writeText(url);notice('Student voting link copied: '+url,'ok');}
 catch(_) {prompt('Copy the student voting link:',url);}
});
action('batchRegister',async()=>{
 try {
  requireConnected();if(!isAdmin)throw Error('Only the contract owner can register students.');
  const entries=$('batchAddresses').value.split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean);
  const unique=[...new Set(entries.map(x=>x.toLowerCase()))];
  if(!unique.length||unique.length>30)throw Error('Enter 1 to 30 wallet addresses.');
  if(unique.some(x=>!ethers.isAddress(x)))throw Error('Invalid wallet address in batch.');
  if(!confirm('Register '+unique.length+' wallets? Each eligible address requires a separate Sepolia transaction and MetaMask confirmation.'))return;
  $('batchRegister').disabled=true;
  let completed=0,skipped=0;
  for(const addr of unique){
   $('batchProgress').textContent=`Processing ${completed+skipped+1}/${unique.length}...`;
   if(await election.registered(addr)){skipped++;continue;}
   try {const tx=await election.registerVoter(addr);await tx.wait();completed++;}
   catch(err){$('batchProgress').textContent=`Stopped: ${completed} registered, ${skipped} skipped. ${err.shortMessage||err.message}`;await refresh();return;}
  }
  $('batchProgress').textContent=`Done: ${completed} newly registered, ${skipped} already registered.`;
  await refresh();
 }catch(err){$('batchProgress').textContent=err.shortMessage||err.message;}
 finally{$('batchRegister').disabled=false;}
});
// Poll on-chain data every 12 seconds. This does not write transactions or charge gas.
setInterval(()=>{if(election && document.visibilityState==='visible')refresh();},12000);
