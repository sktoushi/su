const HIST_DB_NAME='skyHistory';
const HIST_STORE='links';
const HIST_VERSION=1;

function recordHistory(url){
  if(!url) return;
  try{
    let arr=JSON.parse(localStorage.getItem('skyway250628v3History')||'[]');
    if(!Array.isArray(arr)) arr=[];
    arr=arr.filter(u=>u!==url); arr.push(url);
    if(arr.length>10) arr=arr.slice(-10);
    localStorage.setItem('skyway250628v3History',JSON.stringify(arr));
  }catch{}
  try{
    const req=indexedDB.open(HIST_DB_NAME,HIST_VERSION);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains(HIST_STORE))
        db.createObjectStore(HIST_STORE,{keyPath:'id'});
    };
    req.onsuccess=()=>{
      const db=req.result;
      const tx=db.transaction(HIST_STORE,'readwrite');
      const st=tx.objectStore(HIST_STORE);
      const get=st.get(url);
      get.onsuccess=()=>{
        const r=get.result||{id:url,url,freq:0,lastSeen:0};
        r.freq=(r.freq||0)+1; r.lastSeen=Date.now();
        st.put(r);
      };
    };
  }catch{}
}

(function(){
  try{
    const desc=Object.getOwnPropertyDescriptor(Location.prototype,'href');
    if(desc&&desc.set){
      Object.defineProperty(Location.prototype,'href',{
        get:desc.get,
        set:function(url){ recordHistory(url); desc.set.call(this,url); }
      });
    }
  }catch{}
  const origAssign=window.location.assign.bind(window.location);
  window.location.assign=function(url){ recordHistory(url); return origAssign(url); };
  const origReplace=window.location.replace.bind(window.location);
  window.location.replace=function(url){ recordHistory(url); return origReplace(url); };
  const origOpen=window.open;
  window.open=function(url,...args){ if(typeof url==='string') recordHistory(url); return origOpen.call(window,url,...args); };
})();
