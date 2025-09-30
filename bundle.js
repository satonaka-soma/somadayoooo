// React (UMD)
const { useEffect, useMemo, useState } = React;

/**
 * スタンプカード v10.4 完全版（UMD / GHP直置き）
 * - 背景テーマ4種: island / notebook / wood / night（白抜け防止＆可読色最適化）
 * - 「作成」ボタンでカード生成、カード削除・ご褒美削除
 * - 各カード下に「交換可能なご褒美」＋「交換！」（使用可能ptから即時引落＝全体ポイント基準）
 * - ガチャ（1日1回）：ボーナス自動加算、中央配置、テーマ別で「回す！」のコントラスト最適化
 * - 休息日（当日/翌日不可）・連続日数・ストリーク演出・コンフェッティ
 * - localStorage 永続化（stampcard_v10 / stampcard_theme / stampcard_gacha / stampcard_points_spent / stampcard_redeem_hist）
 */

/* ========= utils ========= */
const todayKey = () => new Date().toLocaleDateString("en-CA");
const keyOf = (d) => new Date(d).toLocaleDateString("en-CA");
const fmtJP = (d) => new Date(d).toLocaleDateString("ja-JP",{ year:"numeric", month:"short", day:"numeric" });
const uid = () => Math.random().toString(36).slice(2,10);
const daysDiff = (a,b)=>Math.floor((new Date(a)-new Date(b))/(1000*60*60*24));

function generateMonth(date){
  const y=date.getFullYear(), m=date.getMonth();
  const first=new Date(y,m,1), last=new Date(y,m+1,0);
  const start=new Date(first); start.setDate(first.getDate()-((first.getDay()+6)%7));
  const end=new Date(last); end.setDate(last.getDate()+ (7-((last.getDay()+6)%7)-1));
  const days=[]; for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)) days.push(new Date(d));
  return days;
}

/* ========= streak / specials ========= */
const STREAK_SPECIALS = [
  { n:30, icon:"party",   label:"30日連続!!", effect:"confetti" },
  { n:20, icon:"gem",     label:"20日連続!!" },
  { n:15, icon:"bouquet", label:"15日連続!!" },
  { n:10, icon:"car",     label:"10日連続!!" },
  { n:5,  icon:"gift",    label:"5日連続!!" },
  { n:3,  icon:"frog",    label:"3日連続!!" },
];
function computeStreakFromDate(stamps, restDays, dateKey){
  let s=0; const d0=new Date(dateKey);
  for(let i=0;i<500;i++){
    const d=new Date(d0); d.setDate(d0.getDate()-i); const k=keyOf(d);
    const mark=!!stamps[k]; const rest=!!(restDays&&restDays[k]);
    if(mark||rest) s++; else break;
  }
  return s;
}

/* ========= SVG ========= */
const Svg = {
  leaf:(p)=>(<svg viewBox="0 0 64 64" {...p}><path d="M56 8C38 10 22 18 14 30S8 56 8 56s14 2 26-6S54 26 56 8Z" fill="#10b981"/><path d="M32 16c0 20-4 28-20 40" stroke="#065f46" strokeWidth="3" fill="none"/></svg>),
  paw:(p)=>(<svg viewBox="0 0 64 64" {...p}><circle cx="20" cy="20" r="6" fill="#0ea5e9"/><circle cx="44" cy="20" r="6" fill="#0ea5e9"/><circle cx="28" cy="12" r="5" fill="#38bdf8"/><circle cx="36" cy="12" r="5" fill="#38bdf8"/><ellipse cx="32" cy="40" rx="14" ry="10" fill="#0ea5e9"/></svg>),
  flower:(p)=>(<svg viewBox="0 0 64 64" {...p}><circle cx="32" cy="32" r="6" fill="#f59e0b"/><g fill="#f472b6"><circle cx="16" cy="24" r="10"/><circle cx="48" cy="24" r="10"/><circle cx="16" cy="44" r="10"/><circle cx="48" cy="44" r="10"/></g></svg>),
  frog:(p)=>(<svg viewBox="0 0 64 64" {...p}><circle cx="22" cy="20" r="8" fill="#34d399"/><circle cx="42" cy="20" r="8" fill="#34d399"/><ellipse cx="32" cy="40" rx="18" ry="14" fill="#10b981"/><circle cx="22" cy="20" r="3" fill="#111"/><circle cx="42" cy="20" r="3" fill="#111"/></svg>),
  gift:(p)=>(<svg viewBox="0 0 64 64" {...p}><rect x="8" y="24" width="48" height="28" rx="4" fill="#ef4444"/><rect x="30" y="16" width="4" height="40" fill="#fbbf24"/><rect x="8" y="34" width="48" height="4" fill="#fbbf24"/><path d="M24 20c0-6 8-8 8-2 0-6 8-4 8 2" stroke="#fbbf24" strokeWidth="4" fill="none"/></svg>),
  car:(p)=>(<svg viewBox="0 0 64 64" {...p}><rect x="10" y="28" width="44" height="14" rx="4" fill="#3b82f6"/><path d="M16 28l8-8h16l8 8z" fill="#60a5fa"/><circle cx="22" cy="46" r="6" fill="#111"/><circle cx="42" cy="46" r="6" fill="#111"/></svg>),
  bouquet:(p)=>(<svg viewBox="0 0 64 64" {...p}><g fill="#f87171"><circle cx="18" cy="20" r="6"/><circle cx="32" cy="16" r="6"/><circle cx="46" cy="20" r="6"/></g><path d="M32 22v28" stroke="#16a34a" strokeWidth="3"/><path d="M20 34l12 16M44 34L32 50" stroke="#16a34a" strokeWidth="3"/></svg>),
  gem:(p)=>(<svg viewBox="0 0 64 64" {...p}><polygon points="16,24 32,8 48,24 40,48 24,48" fill="#22d3ee"/><path d="M32 8L24 48M32 8l8 40" stroke="#0891b2" strokeWidth="2" fill="none"/></svg>),
  party:(p)=>(<svg viewBox="0 0 64 64" {...p}><path d="M10 52l14-30 30 14z" fill="#f59e0b"/><g fill="#f43f5e"><circle cx="36" cy="16" r="3"/><circle cx="48" cy="10" r="2"/><circle cx="20" cy="12" r="2"/></g></svg>),
  capsuleTop:(p)=>(<svg viewBox="0 0 120 80" {...p}><path d="M10 40a30 30 0 0 1 30-30h40a30 30 0 0 1 30 30" fill="#fde68a" stroke="#f59e0b" strokeWidth="4"/></svg>),
  capsuleBottom:(p)=>(<svg viewBox="0 0 120 80" {...p}><path d="M10 40a30 30 0 0 0 30 30h40a30 30 0 0 0 30-30" fill="#fca5a5" stroke="#ef4444" strokeWidth="4"/></svg>),
};
const NORMAL_ICONS=["leaf","paw","flower"];

/* ========= keyframes ========= */
const keyframesCSS=`
@keyframes sparkle{0%{filter:drop-shadow(0 0 0 rgba(255,255,255,0));transform:scale(1)}50%{filter:drop-shadow(0 0 12px rgba(255,255,255,1));transform:scale(1.12)}100%{filter:drop-shadow(0 0 0 rgba(255,255,255,0));transform:scale(1)}}
@keyframes pop{0%{transform:translateY(-12px) scale(.9);opacity:0}60%{transform:translateY(0) scale(1.06);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}
@keyframes confetti{0%{transform:translateY(-10%) rotate(0);opacity:1}100%{transform:translateY(120vh) rotate(720deg);opacity:0}}
@keyframes spinSnap{0%{transform:rotate(0)}70%{transform:rotate(320deg)}100%{transform:rotate(360deg)}}
.animate-sparkle{animation:sparkle .9s ease-in-out}
.animate-pop{animation:pop .5s cubic-bezier(.2,.9,.2,1)}
.animate-confetti{animation:confetti 1.5s ease-in forwards}
.animate-spin-slow-snap{animation:spinSnap 1.1s ease-out}
`;

/* ========= backgrounds ========= */
function IslandBackground(){
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0" style={{background:"linear-gradient(to bottom,#bae6fd,#e0f2fe 40%,#d1fae5 100%)"}}/>
      <div className="absolute bottom-0 left-0 right-0 h-40" style={{background:"linear-gradient(to top,#6ee7b7,#a7f3d0)"}}/>
    </div>
  );
}
function NightBackground(){
  const stars=Array.from({length:120}).map((_,i)=>i);
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" style={{background:"linear-gradient(to bottom,#1e1b4b,#0f172a 60%,#000)"}}>
      {stars.map(i=><span key={i} className="absolute rounded-full bg-white" style={{width:2,height:2,top:`${Math.random()*100}%`,left:`${Math.random()*100}%`,opacity:.8}}/>)}
    </div>
  );
}
function NotebookBackground(){
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" style={{backgroundColor:"#fefefe",backgroundImage:"repeating-linear-gradient(0deg,#e5e7eb 0px,#e5e7eb 1px,transparent 1px,transparent 32px)"}}/>
  );
}
function WoodBackground(){
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" style={{background:"linear-gradient(135deg,#f8f5f0,#f3ece3 35%,#efe5d8 70%)"}}/>
  );
}
function Background({theme}){
  if(theme==="night") return <NightBackground/>;
  if(theme==="notebook") return <NotebookBackground/>;
  if(theme==="wood") return <WoodBackground/>;
  return <IslandBackground/>;
}

/* ========= helpers: theme vars ========= */
function useThemeVars(theme){
  // CSS変数で色を配信（可読性改善）。返り値：ガチャ文字色と影。
  return useMemo(()=>{
    if(theme==="night"){
      return {
        style:{
          "--fg":"#f8fafc",
          "--fgMuted":"#cbd5e1",
          "--cardBg":"rgba(30,41,59,.6)",
          "--chipBg":"rgba(15,23,42,.5)",
          "--accent":"#22d3ee",
        },
        gachaText:"#ffffff",
        gachaShadow:"0 0 10px rgba(0,0,0,.6)"
      };
    }
    if(theme==="wood"){
      return {
        style:{
          "--fg":"#3a2b25",
          "--fgMuted":"#6b5a52",
          "--cardBg":"rgba(255,255,255,.82)",
          "--chipBg":"rgba(255,255,255,.75)",
          "--accent":"#10b981",
        },
        gachaText:"#231815",
        gachaShadow:"0 1px 2px rgba(255,255,255,.6), 0 0 8px rgba(0,0,0,.15)"
      };
    }
    if(theme==="notebook"){
      return {
        style:{
          "--fg":"#111827",
          "--fgMuted":"#6b7280",
          "--cardBg":"rgba(255,255,255,.86)",
          "--chipBg":"rgba(255,255,255,.8)",
          "--accent":"#10b981",
        },
        gachaText:"#111827",
        gachaShadow:"0 1px 2px rgba(255,255,255,.7)"
      };
    }
    // island（default）
    return {
      style:{
        "--fg":"#0f172a",
        "--fgMuted":"#475569",
        "--cardBg":"rgba(255,255,255,.85)",
        "--chipBg":"rgba(255,255,255,.8)",
        "--accent":"#059669",
      },
      gachaText:"#0f172a",
      gachaShadow:"0 1px 2px rgba(255,255,255,.7)"
    };
  },[theme]);
}

/* ========= Confetti ========= */
function ConfettiOverlay(){
  const pieces=Array.from({length:80}).map((_,i)=>i);
  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {pieces.map(i=>(
        <span key={i} className="absolute animate-confetti" style={{left:`${Math.random()*100}%`,top:`-5%`,animationDelay:`${Math.random()*.8}s`,fontSize:`${12+Math.random()*16}px`,transform:`rotate(${Math.random()*360}deg)`}}>
          {["🎊","✨","🎉","🌸","🍃"][i%5]}
        </span>
      ))}
    </div>
  );
}

/* ========= App ========= */
function App(){
  // 状態
  const [habits,setHabits]=useState(()=>{try{return JSON.parse(localStorage.getItem("stampcard_v10")||"[]")}catch{return[]}});
  const [theme,setTheme]=useState(()=>{try{return JSON.parse(localStorage.getItem("stampcard_theme")||'"island"')}catch{return "island"}});
  const [reduceMotion,setReduceMotion]=useState(false);
  const [view,setView]=useState("cards"); // cards | shop | reward_settings
  const [currentMonth,setCurrentMonth]=useState(new Date());
  const [banner,setBanner]=useState(null); // {text,iconKey,effect?}

  // ガチャ/ポイント
  const [gachaHistory,setGachaHistory]=useState(()=>{try{return JSON.parse(localStorage.getItem("stampcard_gacha")||"{}")}catch{return{}}});
  const [pointsSpent,setPointsSpent]=useState(()=>{try{return JSON.parse(localStorage.getItem("stampcard_points_spent")||"0")}catch{return 0}});
  const [redeemHistory,setRedeemHistory]=useState(()=>{try{return JSON.parse(localStorage.getItem("stampcard_redeem_hist")||"[]")}catch{return[]}});

  // 永続化
  useEffect(()=>localStorage.setItem("stampcard_v10",JSON.stringify(habits)),[habits]);
  useEffect(()=>localStorage.setItem("stampcard_theme",JSON.stringify(theme)),[theme]);
  useEffect(()=>localStorage.setItem("stampcard_gacha",JSON.stringify(gachaHistory)),[gachaHistory]);
  useEffect(()=>localStorage.setItem("stampcard_points_spent",JSON.stringify(pointsSpent)),[pointsSpent]);
  useEffect(()=>localStorage.setItem("stampcard_redeem_hist",JSON.stringify(redeemHistory)),[redeemHistory]);

  // ポイント
  const stampPoints=useMemo(()=>habits.reduce((s,h)=>s+Object.values(h.stamps||{}).filter(Boolean).length,0),[habits]);
  const bonusPoints=useMemo(()=>Object.values(gachaHistory).reduce((s,r)=>s+(r?.bonus||0),0),[gachaHistory]);
  const totalPoints=stampPoints+bonusPoints;
  const availablePoints=Math.max(0,totalPoints-pointsSpent);

  // 月データ
  const days=useMemo(()=>generateMonth(currentMonth),[currentMonth]);

  // 操作
  const addHabit=(name,rule)=>setHabits(prev=>[...prev,{id:uid(),name,rule,created_at:todayKey(),stamps:{},restDays:{},rewards:[]}]);
  const deleteHabit=(id)=>{ if(confirm("このカードを削除しますか？")) setHabits(prev=>prev.filter(h=>h.id!==id)); };

  const stampToday=(habitId)=>{
    const k=todayKey();
    setHabits(prev=>prev.map(h=>{
      if(h.id!==habitId)return h;
      const next={...h,stamps:{...(h.stamps||{})},restDays:{...(h.restDays||{})}};
      next.stamps[k]=!next.stamps[k];
      if(next.restDays[k]) delete next.restDays[k];
      return next;
    }));
    const h=habits.find(x=>x.id===habitId);
    const newStamps={...(h?.stamps||{}),[k]:!(h?.stamps?.[k])};
    const streak=computeStreakFromDate(newStamps,h?.restDays||{},k);
    const special=STREAK_SPECIALS.find(s=>s.n===streak);
    if(special){ setBanner({text:special.label,iconKey:special.icon,effect:special.effect}); setTimeout(()=>setBanner(null),2400); }
  };

  const toggleRest=(habitId,dateKey)=>{
    if(daysDiff(todayKey(),dateKey)>-2) return; // 当日・翌日は不可
    setHabits(prev=>prev.map(h=>{
      if(h.id!==habitId) return h;
      const next={...h,restDays:{...(h.restDays||{})}};
      next.restDays[dateKey]=!next.restDays[dateKey];
      return next;
    }));
  };

  const addReward=(habitId,threshold,label)=>{
    if(!threshold||threshold<=0) return;
    setHabits(prev=>prev.map(h=>h.id===habitId?{...h,rewards:[...(h.rewards||[]),{threshold,label}].sort((a,b)=>a.threshold-b.threshold)}:h));
  };
  const removeReward=(habitId,idx)=>{
    setHabits(prev=>prev.map(h=>h.id!==habitId?h:({...h,rewards:(h.rewards||[]).filter((_,i)=>i!==idx)})));
  };

  // カード内から交換（全体ポイントから引落）
  const redeemFromCard=(habitId,rewardIndex)=>{
    const h=habits.find(x=>x.id===habitId); if(!h) return;
    const r=(h.rewards||[])[rewardIndex]; if(!r) return;
    if(availablePoints<r.threshold){ alert("ポイントが足りません"); return; }
    setPointsSpent(ps=>ps+r.threshold);
    setRedeemHistory(prev=>[{id:uid(),at:new Date().toISOString(),label:r.label,cost:r.threshold,habitId},...prev].slice(0,200));
    setBanner({text:`「${r.label}」を受け取り！`,iconKey:"party",effect:"confetti"}); setTimeout(()=>setBanner(null),2000);
  };

  // 新規カードフォーム
  const [newName,setNewName]=useState("");
  const [newRule,setNewRule]=useState("");
  const createByButton=()=>{ addHabit(newName||"マイ・スタンプ", newRule||"毎日1回、できたらスタンプ"); setNewName(""); setNewRule(""); };

  // テーマ変数
  const themeVars=useThemeVars(theme);

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{...themeVars.style,color:"var(--fg)"}}>
      <Background theme={theme}/>
      <style>{keyframesCSS}</style>

      {/* ヘッダー */}
      <header className="sticky top-0 z-20 border-b" style={{background:"rgba(255,255,255,.75)",backdropFilter:"blur(6px)"}}>
        <div className="max-w-5xl mx-auto px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl">🍃</span>
            <h1 className="text-lg md:text-xl font-bold" style={{color:"var(--fg)"}}>スタンプカード</h1>
            <div className="ml-auto flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-2xl border" style={{background:"var(--chipBg)", color:"var(--fg)"}}>
                <span style={{opacity:.7}}>総pt</span> <b className="text-xl md:text-2xl align-middle">{totalPoints}</b>
                <span className="mx-1" style={{opacity:.5}}>/</span>
                <span style={{opacity:.7}}>可</span> <b className="text-xl md:text-2xl align-middle" style={{color:"var(--accent)"}}>{availablePoints}</b>
              </div>
            </div>
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar flex-nowrap items-center">
            {["cards","shop","reward_settings"].map(t=>(
              <button key={t} onClick={()=>setView(t)}
                className="h-9 px-3 rounded-xl border whitespace-nowrap text-sm"
                style={{background: view===t?"var(--accent)":"var(--chipBg)", color: view===t?"#fff":"var(--fg)"}}>
                {t==="cards"?"カード":t==="shop"?"ご褒美":"ごほうびせってい"}
              </button>
            ))}
            <select value={theme} onChange={(e)=>setTheme(e.target.value)} className="h-9 px-2 rounded-lg border text-sm ml-auto" style={{background:"var(--chipBg)",color:"var(--fg)"}}>
              <option value="island">アイランド</option>
              <option value="notebook">ノート</option>
              <option value="wood">木目</option>
              <option value="night">夜空</option>
            </select>
            <label className="flex items-center gap-1 text-xs whitespace-nowrap ml-1" style={{color:"var(--fgMuted)"}}>
              <input type="checkbox" checked={reduceMotion} onChange={(e)=>setReduceMotion(e.target.checked)} />
              アニメ少なめ
            </label>
          </div>
        </div>
      </header>

      {/* バナー */}
      {banner && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl shadow-xl border ${reduceMotion?"":"animate-pop"}`} style={{background:"rgba(255,247,237,.95)",color:"#7c2d12"}}>
          <span className="inline-block w-5 h-5 align-middle mr-2">
            {/* ざっくりアイコン出し分け */}
            {banner.iconKey && React.createElement(Svg[banner.iconKey]||(()=>null),{className:"w-5 h-5"})}
          </span>
          <span className="font-semibold align-middle">{banner.text}</span>
        </div>
      )}
      {banner?.effect==="confetti" && !reduceMotion && <ConfettiOverlay/>}

      {/* ビュー */}
      {view==="cards" ? (
        <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">
          {/* ガチャ */}
          <div className="rounded-2xl shadow-sm border p-4 mb-4" style={{background:"var(--cardBg)"}}>
            <div className="font-semibold mb-3 text-center" style={{color:"var(--fg)"}}>今日のガチャ</div>
            <div className="w-full flex items-center justify-center">
              {gachaHistory[todayKey()] ? (
                <div className="flex items-center gap-2 text-sm" style={{color:"var(--fg)"}}>
                  <span>結果：</span>
                  {gachaHistory[todayKey()].outcome==="miss"     && <span className="px-2 py-1 rounded-lg border" style={{background:"rgba(0,0,0,.04)"}}>残念…また明日！</span>}
                  {gachaHistory[todayKey()].outcome==="hit"      && <span className="px-2 py-1 rounded-lg border" style={{background:"rgba(251,191,36,.2)"}}>あたり！+1pt</span>}
                  {gachaHistory[todayKey()].outcome==="jackpot"  && <span className="px-2 py-1 rounded-lg border" style={{background:"rgba(236,72,153,.2)"}}>超大当たり！！+10pt</span>}
                </div>
              ) : (
                <button onClick={()=>{
                  if(gachaHistory[todayKey()]) return;
                  setBanner({text:"ガチャ回転中…",iconKey:"gift"});
                  setTimeout(()=>{
                    const r=Math.random(); let outcome="miss", bonus=0;
                    if(r<0.01){ outcome="jackpot"; bonus=10; }
                    else if(r<0.11){ outcome="hit"; bonus=1; }
                    setGachaHistory(prev=>{ const n={...prev}; n[todayKey()]={outcome,bonus,at:new Date().toISOString()}; return n; });
                    if(outcome==="jackpot") setBanner({text:"超大当たり!! +10pt",iconKey:"gem",effect:"confetti"});
                    else if(outcome==="hit") setBanner({text:"あたり！ +1pt",iconKey:"gift"});
                    else setBanner(null);
                  },1000);
                }} className={`relative w-36 h-36 md:w-44 md:h-44 rounded-full shadow-xl overflow-hidden ${reduceMotion?"":"animate-spin-slow-snap"}`}>
                  <div className="absolute inset-x-0 top-3 flex items-center justify-center"><Svg.capsuleTop className="w-32 h-16"/></div>
                  <div className="absolute inset-x-0 bottom-3 flex items-center justify-center"><Svg.capsuleBottom className="w-32 h-16"/></div>
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-xl"
                       style={{color:themeVars.gachaText, textShadow:themeVars.gachaShadow}}>回す！</div>
                </button>
              )}
            </div>
            <div className="text-xs mt-2 text-center" style={{color:"var(--fgMuted)"}}>ポイント：スタンプ + ボーナス（結果は自動加算）</div>
          </div>

          {/* 新規カード */}
          <div className="rounded-2xl shadow-sm border p-4 mb-6" style={{background:"var(--cardBg)"}}>
            <div className="font-semibold mb-3" style={{color:"var(--fg)"}}>新しいスタンプカード</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="名前（例：英語シャドーイング）" className="px-3 py-2 rounded-xl border w-full" style={{background:"var(--chipBg)",color:"var(--fg)"}}/>
              <input value={newRule} onChange={e=>setNewRule(e.target.value)} placeholder="ルール（例：1日15分やったら押す）" className="px-3 py-2 rounded-xl border w-full" style={{background:"var(--chipBg)",color:"var(--fg)"}}/>
              <button onClick={createByButton} className="px-4 py-2 rounded-xl" style={{background:"var(--accent)",color:"#fff"}}>作成</button>
            </div>
          </div>

          {/* 月ナビ + 合計 */}
          <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <button onClick={()=>setCurrentMonth(new Date(currentMonth.getFullYear(),currentMonth.getMonth()-1,1))} className="h-9 px-3 rounded-xl border" style={{background:"var(--chipBg)",color:"var(--fg)"}}>← 前月</button>
              <div className="font-semibold" style={{color:"var(--fg)"}}>{currentMonth.getFullYear()}年 {currentMonth.getMonth()+1}月</div>
              <button onClick={()=>setCurrentMonth(new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,1))} className="h-9 px-3 rounded-xl border" style={{background:"var(--chipBg)",color:"var(--fg)"}}>翌月 →</button>
              <button onClick={()=>setCurrentMonth(new Date())} className="h-9 px-3 rounded-xl border" style={{background:"var(--chipBg)",color:"var(--fg)"}}>今月</button>
            </div>
            <div className="text-sm rounded-xl px-3 py-1.5 border" style={{background:"var(--chipBg)",color:"var(--fg)"}}>
              総pt: <b className="text-lg align-middle">{totalPoints}</b> / 使用済: {pointsSpent} / 使用可能: <b className="text-lg align-middle" style={{color:"var(--accent)"}}>{availablePoints}</b>
            </div>
          </div>

          {/* カード一覧 */}
          <div className="space-y-6">
            {habits.length===0 && (<div className="text-sm rounded-xl p-3 inline-block" style={{background:"var(--chipBg)",color:"var(--fg)"}}>まずカードを作成してください。</div>)}
            {habits.map(h=>(
              <HabitCard key={h.id}
                habit={h}
                days={days}
                currentMonth={currentMonth}
                onStampToday={()=>stampToday(h.id)}
                onToggleRest={(d)=>toggleRest(h.id,d)}
                onDeleteCard={()=>deleteHabit(h.id)}
                availablePoints={availablePoints}
                onRedeem={(idx)=>redeemFromCard(h.id,idx)}
              />
            ))}
          </div>
        </main>
      ) : view==="shop" ? (
        <ShopView
          totalPoints={totalPoints}
          availablePoints={availablePoints}
          pointsSpent={pointsSpent}
          setPointsSpent={setPointsSpent}
          redeemHistory={redeemHistory}
          redeem={(label,cost)=>{
            if(availablePoints<cost){ alert("ポイントが足りません"); return; }
            setPointsSpent(ps=>ps+cost);
            setRedeemHistory(prev=>[{id:uid(),at:new Date().toISOString(),label,cost},...prev].slice(0,200));
            setBanner({text:`「${label}」を受け取り！`,iconKey:"party",effect:"confetti"}); setTimeout(()=>setBanner(null),2000);
          }}
        />
      ) : (
        <RewardSettings habits={habits} addReward={addReward} removeReward={removeReward}/>
      )}

      <footer className="relative z-10 max-w-5xl mx-auto px-4 py-8 text-xs" style={{color:"var(--fgMuted)"}}>
        ローカル保存（localStorage）。端末を変えると共有されません。
      </footer>
    </div>
  );
}

/* ========= sub components ========= */
function HabitCard({habit,days,currentMonth,onStampToday,onToggleRest,onDeleteCard,availablePoints,onRedeem}){
  const {name,rule,stamps={},restDays={},rewards=[]}=habit;
  const total=Object.values(stamps).filter(Boolean).length;
  const streakToday=useMemo(()=>computeStreakFromDate(stamps,restDays,todayKey()),[stamps,restDays]);

  const rewardStatuses=useMemo(()=>(
    (rewards||[]).map(r=>({label:r.label,threshold:r.threshold,can:total>=r.threshold,remain:Math.max(0,r.threshold-total)})).sort((a,b)=>a.threshold-b.threshold)
  ),[rewards,total]);

  const exchangeable=(rewards||[]).map((r,i)=>({...r,i})).filter(r=>availablePoints>=r.threshold);

  return (
    <div className="rounded-3xl border shadow-sm overflow-hidden" style={{background:"var(--cardBg)"}}>
      {/* ヘッダー */}
      <div className="p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold truncate flex items-center gap-2" style={{color:"var(--fg)"}}>
            <span className="inline-block px-2 py-0.5 rounded-full text-xs" style={{background:"rgba(16,185,129,.15)",color:"var(--accent)"}}>
              連続 {streakToday} 日
            </span>
            <span className="truncate">{name}</span>
          </div>
          <div className="text-sm truncate" style={{color:"var(--fgMuted)"}}>{rule}</div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{color:"var(--fgMuted)"}}>通算</div>
          <div className="text-2xl font-extrabold" style={{color:"var(--fg)"}}>{total}</div>
        </div>
        <button onClick={onStampToday} className="px-4 py-2 rounded-xl border ml-2"
          style={{background: (stamps?.[todayKey()]?"var(--accent)":"var(--chipBg)"), color:(stamps?.[todayKey()]?"#fff":"var(--fg)")}}>
          {stamps?.[todayKey()]?"できた！✓":"できた！"}
        </button>
        <button onClick={onDeleteCard} className="ml-2 px-2 py-1 text-xs rounded-lg border hover:opacity-80" style={{color:"#dc2626",background:"var(--chipBg)"}}>削除</button>
      </div>

      {/* 月カレンダー */}
      <div className="px-4 pb-4">
        <div className="rounded-3xl p-3 border shadow-inner" style={{background:"linear-gradient(135deg,#f7f5ef,#efe9dc)"}}>
          <div className="grid grid-cols-7 gap-1 text-[12px] mb-1 font-medium" style={{color:"var(--fg)"}}>
            {["月","火","水","木","金","土","日"].map(w=><div key={w} className="text-center">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d,idx)=>{
              const k=keyOf(d);
              const marked=!!stamps[k];
              const rest=!!restDays[k];
              const isToday=k===todayKey();
              const restAllowed=daysDiff(todayKey(),k)<=-2;
              const isOtherMonth=d.getMonth()!==currentMonth.getMonth();
              const streak=marked||rest?computeStreakFromDate(stamps,restDays,k):0;
              const special=STREAK_SPECIALS.find(s=>s.n===streak)||null;
              const iconKey=special?special.icon:marked?NORMAL_ICONS[idx%NORMAL_ICONS.length]:null;

              return (
                <div key={k} className="relative">
                  <button
                    title={isToday?`${fmtJP(k)} — 今日だけ押せます`:restAllowed?`${fmtJP(k)} — 右下「休」で休息切替`:`${fmtJP(k)} — 休息は二日後以降`}
                    onClick={()=>isToday && onStampToday()}
                    onContextMenu={(e)=>{e.preventDefault(); if(restAllowed) onToggleRest(k);}}
                    className={`relative w-full aspect-square rounded-2xl border flex items-center justify-center select-none ${isOtherMonth?'opacity-60':''} ${isToday?'ring-2':''}`}
                    style={{
                      background: marked? "rgba(16,185,129,.92)": (rest? "rgba(16,185,129,.10)":"rgba(16,185,129,.12)"),
                      borderColor: marked? "#065f46":"rgba(16,185,129,.35)",
                      color: marked? "#fff":"var(--fg)",
                      ringColor: "#f59e0b"
                    }}
                  >
                    <span className="absolute top-1 left-1 text-[12px]" style={{opacity:marked?.9:.8}}>{d.getDate()}</span>

                    {/* 中央アイコン */}
                    {iconKey ? (
                      <div className={marked?"animate-sparkle":""}><Svg[iconKey] className="w-10 h-10"/></div>
                    ) : (!rest && <Svg.leaf className="w-8 h-8" style={{opacity:.2}}/>)}

                    {/* スペシャルバッジ（小型化して重ならないように） */}
                    {special && (
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold px-1 py-0.5 rounded-full border"
                            style={{background:"rgba(251,191,36,.8)", color:"#7c2d12", borderColor:"#f59e0b"}}>
                        {special.label}
                      </span>
                    )}

                    {/* 休息バッジ（セル内右下・超小型） */}
                    {rest && (
                      <span className="absolute bottom-0.5 right-0.5 text-[9px] leading-none px-1 rounded border"
                            style={{background:"rgba(255,255,255,.9)", color:"#0f172a", borderColor:"rgba(15,23,42,.15)"}}>
                        休
                      </span>
                    )}

                    {/* 休息切替トグル（セル内右下、当日/翌日以外のみ表示） */}
                    {restAllowed && !isToday && (
                      <button onClick={()=>onToggleRest(k)}
                        className="absolute bottom-0.5 right-0.5 text-[9px] leading-none px-1 rounded border hover:opacity-90"
                        style={{background:"rgba(255,255,255,.9)", color:"#0f172a", borderColor:"rgba(15,23,42,.15)"}}>
                        休
                      </button>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* 交換可能なご褒美（カード直下） */}
          <div className="mt-4 rounded-2xl border p-2" style={{background:"var(--chipBg)"}}>
            <div className="font-semibold text-sm mb-1" style={{color:"var(--fg)"}}>交換可能なご褒美</div>
            {exchangeable.length===0 ? (
              <div className="text-xs" style={{color:"var(--fgMuted)"}}>まだ交換可能なご褒美はありません。</div>
            ) : (
              <ul className="space-y-1">
                {exchangeable.map(r=>(
                  <li key={r.i} className="flex items-center justify-between text-sm" style={{color:"var(--fg)"}}>
                    <span>{r.label}（{r.threshold}pt）</span>
                    <button onClick={()=>onRedeem(r.i)} className="px-2 py-1 rounded-lg hover:opacity-90" style={{background:"var(--accent)",color:"#fff"}}>交換！</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>

      {/* 所有ポイント＆ご褒美（状態表示のみ） */}
      <div className="px-4 pb-4 text-sm" style={{color:"var(--fg)"}}>
        <div className="mb-2">このカードのスタンプ数：<b>{total}</b></div>
        {(rewards||[]).length===0 ? (
          <div style={{color:"var(--fgMuted)"}}>ご褒美は未設定です。「ごほうびせってい」から追加してください。</div>
        ) : (
          <ul className="space-y-1">
            {rewardStatuses.map((rs,i)=>(
              <li key={i} className="flex items-center justify-between">
                <span>{rs.label}（{rs.threshold}スタンプ）</span>
                {rs.can ? <span style={{color:"var(--accent)",fontWeight:600}}>交換可能！</span> : <span style={{color:"var(--fgMuted)"}}>あと {rs.remain} スタンプ！</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ShopView({totalPoints,availablePoints,pointsSpent,setPointsSpent,redeemHistory,redeem}){
  const [label,setLabel]=useState(""); const [cost,setCost]=useState(10);
  return (
    <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">
      <div className="rounded-2xl shadow-sm border p-4 mb-6 grid md:grid-cols-2 gap-4" style={{background:"var(--cardBg)",color:"var(--fg)"}}>
        <div>
          <div className="font-semibold">ご褒美ポイント</div>
          <div className="mt-1">総pt: <b className="text-xl align-middle">{totalPoints}</b> / 使用済: {pointsSpent} / 使用可能: <b className="text-xl align-middle" style={{color:"var(--accent)"}}>{availablePoints}</b></div>
          <div className="text-xs mt-1" style={{color:"var(--fgMuted)"}}>ポイント = スタンプ数 + ガチャボーナス</div>
        </div>
        <div className="flex items-center gap-2">
          <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="ご褒美名（例：映画、スパ、スイーツ）" className="px-3 py-2 rounded-xl border w-56" style={{background:"var(--chipBg)",color:"var(--fg)"}}/>
          <input type="number" min={1} value={cost} onChange={e=>setCost(parseInt(e.target.value||"0",10))} placeholder="ポイント" className="px-3 py-2 rounded-xl border w-28" style={{background:"var(--chipBg)",color:"var(--fg)"}}/>
          <button onClick={()=>redeem(label||"ご褒美",cost)} className="px-4 py-2 rounded-xl hover:opacity-90" style={{background:"var(--accent)",color:"#fff"}}>受け取る</button>
        </div>
      </div>

      <div className="rounded-2xl shadow-sm border p-4" style={{background:"var(--cardBg)",color:"var(--fg)"}}>
        <div className="font-semibold mb-2">受け取り履歴</div>
        {redeemHistory.length===0 ? (
          <div className="text-sm" style={{color:"var(--fgMuted)"}}>まだ履歴はありません。</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {redeemHistory.map(rec=>(
              <li key={rec.id} className="flex items-center justify-between border-b py-1" style={{borderColor:"rgba(15,23,42,.08)"}}>
                <span>{fmtJP(rec.at)} — {rec.label}</span>
                <span style={{color:"var(--fgMuted)"}}>-{rec.cost} pt</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function RewardSettings({habits,addReward,removeReward}){
  const [selected,setSelected]=useState(habits[0]?.id||null);
  const [label,setLabel]=useState(""); const [threshold,setThreshold]=useState(10);
  const h=habits.find(x=>x.id===selected);
  useEffect(()=>{ if(!habits.find(x=>x.id===selected)) setSelected(habits[0]?.id||null); },[habits,selected]);

  return (
    <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">
      <div className="rounded-2xl shadow-sm border p-4 mb-4" style={{background:"var(--cardBg)",color:"var(--fg)"}}>
        <div className="font-semibold mb-2">ごほうびせってい</div>
        {habits.length===0 ? (
          <div className="text-sm" style={{color:"var(--fgMuted)"}}>まずカードを作成してください。</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <select className="px-2 py-1 rounded-lg border" value={selected||''} onChange={e=>setSelected(e.target.value)} style={{background:"var(--chipBg)",color:"var(--fg)"}}>
                {habits.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <input type="number" min={1} value={threshold} onChange={e=>setThreshold(parseInt(e.target.value||"0",10))} className="px-3 py-2 rounded-xl border w-36" placeholder="しきい値" style={{background:"var(--chipBg)",color:"var(--fg)"}}/>
              <input value={label} onChange={e=>setLabel(e.target.value)} className="px-3 py-2 rounded-xl border w-72" placeholder="ご褒美名" style={{background:"var(--chipBg)",color:"var(--fg)"}}/>
              <button onClick={()=>{ if(selected) addReward(selected,threshold,label||`${threshold}回達成ご褒美`); setLabel(""); }} className="px-4 py-2 rounded-xl" style={{background:"var(--accent)",color:"#fff"}}>追加</button>
            </div>
            {!h ? (
              <div className="text-sm" style={{color:"var(--fgMuted)"}}>カードが選択されていません。</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left" style={{color:"var(--fgMuted)"}}>
                      <th className="py-1">しきい値</th><th className="py-1">内容</th><th className="py-1">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(h.rewards||[]).sort((a,b)=>a.threshold-b.threshold).map((r,i)=>(
                      <tr key={i} className="border-t" style={{borderColor:"rgba(15,23,42,.08)"}}>
                        <td className="py-2">{r.threshold}</td>
                        <td className="py-2">{r.label}</td>
                        <td className="py-2">
                          <button onClick={()=>removeReward(h.id,i)} className="px-2 py-1 rounded-lg border hover:opacity-85" style={{color:"#dc2626",background:"var(--chipBg)"}}>削除</button>
                        </td>
                      </tr>
                    ))}
                    {(!h.rewards||h.rewards.length===0) && (<tr><td colSpan={3} className="py-3" style={{color:"var(--fgMuted)"}}>まだご褒美がありません。</td></tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/* ========= mount ========= */
(function mount(){
  const root=document.getElementById('root');
  if(!root) return setTimeout(mount,20);
  if(ReactDOM.createRoot){
    ReactDOM.createRoot(root).render(<App/>);
  }else{
    ReactDOM.render(<App/>, root);
  }
})();
