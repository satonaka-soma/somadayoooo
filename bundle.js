const { useState, useEffect, useMemo } = React;

/**
 * スタンプカード React版 v10.4
 * - v10.1 全機能フル再現
 * - 背景テーマ (island / notebook / wood / night) 正しく表示
 * - カード削除ボタン
 * - ご褒美削除ボタン
 * - ポイントをヘッダー下で大きく強調
 */

// ========== ユーティリティ ==========
function todayKey() { return new Date().toLocaleDateString("en-CA"); }
function keyOf(d) { return new Date(d).toLocaleDateString("en-CA"); }
function fmtJP(d) { return new Date(d).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" }); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function daysDiff(a, b) { return Math.floor((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24)); }

function generateMonth(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // 月曜スタート
  const end = new Date(last);
  end.setDate(last.getDate() + (7 - ((last.getDay() + 6) % 7) - 1));
  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  return days;
}

// ========== 背景 ==========
function IslandBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-100" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-emerald-300 to-emerald-200 rounded-t-[50%]" />
    </div>
  );
}

function NightBackground() {
  const stars = Array.from({ length: 90 }).map((_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-indigo-950 via-slate-900 to-black">
      {stars.map(i => (
        <span key={i} className="absolute rounded-full bg-white"
          style={{ width: 2, height: 2, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, opacity: 0.7 }} />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_20%,rgba(255,255,255,.12),transparent_40%)]" />
    </div>
  );
}

function NotebookBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10"
      style={{
        backgroundColor: "#fefefe",
        backgroundImage: "repeating-linear-gradient(0deg,#e5e7eb 0px,#e5e7eb 1px,transparent 1px,transparent 32px)"
      }}
    />
  );
}

function WoodBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10"
      style={{
        backgroundColor: "#f9f5f0",
        backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')"
      }}
    />
  );
}

function Background({ theme }) {
  if (theme === "night") return <NightBackground />;
  if (theme === "notebook") return <NotebookBackground />;
  if (theme === "wood") return <WoodBackground />;
  return <IslandBackground />;
}
// ========== スペシャル連続日数 ==========
const STREAK_SPECIALS = [
  { n: 30, icon: "party", label: "30日連続!!", effect: "confetti" },
  { n: 20, icon: "gem", label: "20日連続!!" },
  { n: 15, icon: "bouquet", label: "15日連続!!" },
  { n: 10, icon: "car", label: "10日連続!!" },
  { n: 5,  icon: "gift", label: "5日連続!!" },
  { n: 3,  icon: "frog", label: "3日連続!!" },
];

function computeStreakFromDate(stamps, restDays, dateKey) {
  let s = 0; const d0 = new Date(dateKey);
  for (let i = 0; i < 500; i++) {
    const d = new Date(d0); d.setDate(d0.getDate() - i); const k = keyOf(d);
    const mark = !!(stamps && stamps[k]); const rest = !!(restDays && restDays[k]);
    if (mark || rest) s++; else break;
  }
  return s;
}

// ========== SVGアイコン ==========
const Svg = {
  leaf: (p) => (<svg viewBox="0 0 64 64" {...p}><path d="M56 8C38 10 22 18 14 30S8 56 8 56s14 2 26-6S54 26 56 8Z" fill="#10b981"/><path d="M32 16c0 20-4 28-20 40" stroke="#065f46" strokeWidth="3" fill="none"/></svg>),
  paw: (p) => (<svg viewBox="0 0 64 64" {...p}><circle cx="20" cy="20" r="6" fill="#0ea5e9"/><circle cx="44" cy="20" r="6" fill="#0ea5e9"/><circle cx="28" cy="12" r="5" fill="#38bdf8"/><circle cx="36" cy="12" r="5" fill="#38bdf8"/><ellipse cx="32" cy="40" rx="14" ry="10" fill="#0ea5e9"/></svg>),
  flower: (p) => (<svg viewBox="0 0 64 64" {...p}><circle cx="32" cy="32" r="6" fill="#f59e0b"/><g fill="#f472b6"><circle cx="16" cy="24" r="10"/><circle cx="48" cy="24" r="10"/><circle cx="16" cy="44" r="10"/><circle cx="48" cy="44" r="10"/></g></svg>),
  frog: (p) => (<svg viewBox="0 0 64 64" {...p}><circle cx="22" cy="20" r="8" fill="#34d399"/><circle cx="42" cy="20" r="8" fill="#34d399"/><ellipse cx="32" cy="40" rx="18" ry="14" fill="#10b981"/><circle cx="22" cy="20" r="3" fill="#111"/><circle cx="42" cy="20" r="3" fill="#111"/></svg>),
  gift: (p) => (<svg viewBox="0 0 64 64" {...p}><rect x="8" y="24" width="48" height="28" rx="4" fill="#ef4444"/><rect x="30" y="16" width="4" height="40" fill="#fbbf24"/><rect x="8" y="34" width="48" height="4" fill="#fbbf24"/><path d="M24 20c0-6 8-8 8-2 0-6 8-4 8 2" stroke="#fbbf24" strokeWidth="4" fill="none"/></svg>),
  car: (p) => (<svg viewBox="0 0 64 64" {...p}><rect x="10" y="28" width="44" height="14" rx="4" fill="#3b82f6"/><path d="M16 28l8-8h16l8 8z" fill="#60a5fa"/><circle cx="22" cy="46" r="6" fill="#111"/><circle cx="42" cy="46" r="6" fill="#111"/></svg>),
  bouquet: (p) => (<svg viewBox="0 0 64 64" {...p}><g fill="#f87171"><circle cx="18" cy="20" r="6"/><circle cx="32" cy="16" r="6"/><circle cx="46" cy="20" r="6"/></g><path d="M32 22v28" stroke="#16a34a" strokeWidth="3"/><path d="M20 34l12 16M44 34L32 50" stroke="#16a34a" strokeWidth="3"/></svg>),
  gem: (p) => (<svg viewBox="0 0 64 64" {...p}><polygon points="16,24 32,8 48,24 40,48 24,48" fill="#22d3ee"/><path d="M32 8L24 48M32 8l8 40" stroke="#0891b2" strokeWidth="2" fill="none"/></svg>),
  party: (p) => (<svg viewBox="0 0 64 64" {...p}><path d="M10 52l14-30 30 14z" fill="#f59e0b"/><g fill="#f43f5e"><circle cx="36" cy="16" r="3"/><circle cx="48" cy="10" r="2"/><circle cx="20" cy="12" r="2"/></g></svg>),
  capsuleTop: (p) => (<svg viewBox="0 0 120 80" {...p}><path d="M10 40a30 30 0 0 1 30-30h40a30 30 0 0 1 30 30" fill="#fde68a" stroke="#f59e0b" strokeWidth="4"/></svg>),
  capsuleBottom: (p) => (<svg viewBox="0 0 120 80" {...p}><path d="M10 40a30 30 0 0 0 30 30h40a30 30 0 0 0 30-30" fill="#fca5a5" stroke="#ef4444" strokeWidth="4"/></svg>),
};
const NORMAL_ICONS = ["leaf", "paw", "flower"];
function Icon({ iconKey, className }) { const C = Svg[iconKey] || (() => null); return <C className={className} />; }

// ========== CSSアニメーション ==========
const keyframesCSS = `
@keyframes sparkle { 0% { filter: drop-shadow(0 0 0 rgba(255,255,255,0)); transform: scale(1);} 50% { filter: drop-shadow(0 0 12px rgba(255,255,255,1)); transform: scale(1.12);} 100% { filter: drop-shadow(0 0 0 rgba(255,255,255,0)); transform: scale(1);} }
@keyframes pop { 0% { transform: translateY(-12px) scale(0.9); opacity: 0;} 60% { transform: translateY(0) scale(1.06); opacity: 1;} 100% { transform: translateY(0) scale(1); opacity: 1;} }
@keyframes confetti { 0% { transform: translateY(-10%) rotate(0deg); opacity: 1;} 100% { transform: translateY(120vh) rotate(720deg); opacity: 0;} }
@keyframes spinSnap { 0% { transform: rotate(0deg);} 70% { transform: rotate(320deg);} 100% { transform: rotate(360deg);} }
.animate-sparkle { animation: sparkle 900ms ease-in-out; }
.animate-pop { animation: pop 500ms cubic-bezier(.2,.9,.2,1); }
.animate-confetti { animation: confetti 1500ms ease-in forwards; }
.animate-spin-slow-snap { animation: spinSnap 1.1s ease-out; }
`;

function ConfettiOverlay() {
  const pieces = Array.from({ length: 80 }).map((_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {pieces.map(i => (
        <span key={i} className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-5%`,
            animationDelay: `${Math.random() * 0.8}s`,
            fontSize: `${12 + Math.random() * 16}px`,
            transform: `rotate(${Math.random() * 360}deg)`
          }}>
          {["🎊", "✨", "🎉", "🌸", "🍃"][i % 5]}
        </span>
      ))}
    </div>
  );
}

// ========== App 本体 ==========
function App() {
  const [habits, setHabits] = useState(() => JSON.parse(localStorage.getItem("stampcard_v10") || "[]"));
  const [theme, setTheme] = useState(() => JSON.parse(localStorage.getItem("stampcard_theme") || '"island"'));
  const [reduceMotion, setReduceMotion] = useState(false);
  const [view, setView] = useState("cards");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [banner, setBanner] = useState(null);

  const [gachaHistory, setGachaHistory] = useState(() => JSON.parse(localStorage.getItem("stampcard_gacha") || "{}"));
  const [pointsSpent, setPointsSpent] = useState(() => JSON.parse(localStorage.getItem("stampcard_points_spent") || "0"));
  const [redeemHistory, setRedeemHistory] = useState(() => JSON.parse(localStorage.getItem("stampcard_redeem_hist") || "[]"));

  // 永続化
  useEffect(() => localStorage.setItem("stampcard_v10", JSON.stringify(habits)), [habits]);
  useEffect(() => localStorage.setItem("stampcard_theme", JSON.stringify(theme)), [theme]);
  useEffect(() => localStorage.setItem("stampcard_gacha", JSON.stringify(gachaHistory)), [gachaHistory]);
  useEffect(() => localStorage.setItem("stampcard_points_spent", JSON.stringify(pointsSpent)), [pointsSpent]);
  useEffect(() => localStorage.setItem("stampcard_redeem_hist", JSON.stringify(redeemHistory)), [redeemHistory]);

  // ポイント計算
  const stampPoints = useMemo(() => habits.reduce((s, h) => s + Object.values(h.stamps || {}).filter(Boolean).length, 0), [habits]);
  const bonusPoints = useMemo(() => Object.values(gachaHistory).reduce((s, r) => s + (r?.bonus || 0), 0), [gachaHistory]);
  const totalPoints = stampPoints + bonusPoints;
  const availablePoints = Math.max(0, totalPoints - pointsSpent);

  const days = useMemo(() => generateMonth(currentMonth), [currentMonth]);

  // 操作関数（カード追加/削除・スタンプ・休息など）は Part3 で続きます…
  return (
    <div className="min-h-screen relative text-gray-900 overflow-x-hidden">
      <Background theme={theme} />
      <style>{keyframesCSS}</style>

      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
          <span className="text-2xl">🍃</span>
          <h1 className="text-xl font-bold">スタンプカード</h1>
          <div className="ml-auto flex items-center gap-2">
            <select value={theme} onChange={(e)=>setTheme(e.target.value)} className="px-2 py-1 rounded-lg border bg-white/80">
              <option value="island">アイランド</option>
              <option value="notebook">ノート</option>
              <option value="wood">木目</option>
              <option value="night">夜空</option>
            </select>
            <button onClick={()=>setView("cards")} className={`px-3 py-1.5 rounded-xl border ${view==="cards"?"bg-emerald-600 text-white":"bg-white/70 hover:bg-white"}`}>カード</button>
            <button onClick={()=>setView("shop")} className={`px-3 py-1.5 rounded-xl border ${view==="shop"?"bg-emerald-600 text-white":"bg-white/70 hover:bg-white"}`}>ご褒美</button>
            <button onClick={()=>setView("reward_settings")} className={`px-3 py-1.5 rounded-xl border ${view==="reward_settings"?"bg-emerald-600 text-white":"bg-white/70 hover:bg-white"}`}>ごほうびせってい</button>
            <label className="flex items-center gap-2 text-sm ml-2"><input type="checkbox" checked={reduceMotion} onChange={(e)=>setReduceMotion(e.target.checked)} />アニメ少なめ</label>
          </div>
        </div>
      </header>

      {/* ポイント強調表示 */}
      <div className="text-center py-3 bg-white/60 backdrop-blur border-b">
        <div className="text-sm text-gray-700">総ポイント</div>
        <div className="text-4xl font-extrabold text-emerald-600">{totalPoints}</div>
        <div className="text-xs text-gray-500">使用済: {pointsSpent} / 使用可能: <b>{availablePoints}</b></div>
      </div>

      {/* バナー */}
      {banner && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl shadow-xl border bg-amber-50/95 flex items-center gap-2 ${reduceMotion?"":"animate-pop"}`}>
          <Icon iconKey={banner.iconKey} className="w-6 h-6" />
          <span className="font-semibold">{banner.text}</span>
        </div>
      )}
      {banner?.effect === "confetti" && !reduceMotion && <ConfettiOverlay />}
      {/* メインビュー */}
      {view === "cards" ? (
        <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={()=>{
                const n = prompt("カード名を入力");
                if(!n) return;
                const r = prompt("ルール（例：毎日30分勉強）");
                setHabits([...habits, { id: uid(), name: n, rule: r||"", stamps:{}, restDays:{}, rewards:[] }]);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:opacity-90"
            >＋ カード追加</button>
          </div>

          {habits.length===0 && <div className="text-gray-600">まだカードがありません。</div>}

          {habits.map(h=>(
            <HabitCard key={h.id}
              habit={h}
              days={days}
              currentMonth={currentMonth}
              onStampToday={()=>stampToday(h.id)}
              onToggleRest={(d)=>toggleRest(h.id,d)}
              onDeleteCard={deleteHabit}
              totalPoints={totalPoints}
            />
          ))}
        </main>
      ) : view==="shop" ? (
        <ShopView
          totalPoints={totalPoints}
          availablePoints={availablePoints}
          pointsSpent={pointsSpent}
          setPointsSpent={setPointsSpent}
          redeemHistory={redeemHistory}
          redeem={redeem}
        />
      ) : (
        <RewardSettings habits={habits} addReward={addReward} removeReward={removeReward} />
      )}

      <footer className="relative z-10 max-w-5xl mx-auto px-4 py-6 text-xs text-gray-700">
        データは localStorage に保存されます（端末を変えると共有されません）
      </footer>
    </div>
  );

  // ===== 操作関数群 =====
  function stampToday(hid){
    setHabits(habits.map(h=>{
      if(h.id!==hid) return h;
      const k=todayKey();
      return { ...h, stamps:{...h.stamps,[k]:!h.stamps?.[k]} };
    }));
  }
  function toggleRest(hid,d){
    setHabits(habits.map(h=> h.id===hid ? { ...h, restDays:{...h.restDays,[d]:!h.restDays?.[d]} } : h ));
  }
  function deleteHabit(hid){
    if(confirm("このカードを削除しますか？")) setHabits(habits.filter(h=>h.id!==hid));
  }
  function addReward(hid,thr,label){
    setHabits(habits.map(h=> h.id===hid ? { ...h, rewards:[...(h.rewards||[]),{threshold:thr,label}] } : h ));
  }
  function removeReward(hid,idx){
    setHabits(habits.map(h=>{
      if(h.id!==hid) return h;
      const arr=[...(h.rewards||[])]; arr.splice(idx,1);
      return { ...h, rewards:arr };
    }));
  }
  function redeem(label,cost){
    if(availablePoints<cost) return alert("ポイント不足です");
    setPointsSpent(pointsSpent+cost);
    setRedeemHistory([...redeemHistory,{id:uid(),label,cost,at:todayKey()}]);
  }
}

// ========== HabitCard ==========
function HabitCard({ habit, days, currentMonth, onStampToday, onToggleRest, onDeleteCard, totalPoints }) {
  const { id,name,rule,stamps={},restDays={},rewards=[] } = habit;
  const total = Object.values(stamps).filter(Boolean).length;
  const streakToday = useMemo(()=>computeStreakFromDate(stamps,restDays,todayKey()),[stamps,restDays]);
  return (
    <div className="rounded-3xl border shadow-sm overflow-hidden bg-white/80 backdrop-blur mb-6">
      <div className="p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold truncate">{name}</div>
          <div className="text-sm text-gray-600">{rule}</div>
        </div>
        <div className="text-right mr-2">
          <div className="text-xs text-gray-500">通算</div>
          <div className="text-2xl font-extrabold">{total}</div>
        </div>
        <button onClick={onStampToday}
          className={`px-4 py-2 rounded-xl border ${stamps[todayKey()]?"bg-emerald-600 text-white":"bg-white hover:bg-emerald-50"}`}>
          {stamps[todayKey()]?"できた！✓":"できた！"}
        </button>
        <button onClick={()=>onDeleteCard(id)}
          className="ml-2 px-2 py-1 text-xs rounded-lg border text-red-600 hover:bg-red-50">削除</button>
      </div>

      {/* カレンダー */}
      <div className="px-4 pb-4">
        <div className="rounded-2xl border bg-white/60 p-2 grid grid-cols-7 gap-1 text-sm">
          {["月","火","水","木","金","土","日"].map(w=><div key={w} className="text-center text-xs">{w}</div>)}
          {days.map((d,idx)=>{
            const k=keyOf(d); const marked=!!stamps[k]; const rest=!!restDays[k];
            const isToday=k===todayKey(); const isOther=d.getMonth()!==currentMonth.getMonth();
            return (
              <button key={k}
                onClick={()=>isToday&&onStampToday()}
                onContextMenu={e=>{e.preventDefault();onToggleRest(k);}}
                className={`aspect-square rounded-xl border flex items-center justify-center relative
                  ${isOther?"opacity-40":""} ${marked?"bg-emerald-500 text-white":rest?"bg-gray-100":"bg-white/80"}`}>
                <span className="absolute top-0.5 left-0.5 text-[10px]">{d.getDate()}</span>
                {marked&&<Icon iconKey={NORMAL_ICONS[idx%NORMAL_ICONS.length]} className="w-6 h-6" />}
                {rest&&<span className="text-[10px]">休</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ご褒美一覧 */}
      <div className="px-4 pb-4 text-sm">
        <div className="mb-1 text-gray-700">所有ポイント: <b>{totalPoints}</b></div>
        {rewards.length===0? <div className="text-gray-500">ご褒美なし</div> :
          <ul>{rewards.map((r,i)=><li key={i} className="flex justify-between items-center border-t py-1">
            <span>{r.label}（{r.threshold}スタンプ）</span>
          </li>)}</ul>}
      </div>
    </div>
  );
}

// ========== ShopView ==========
function ShopView({ totalPoints, availablePoints, pointsSpent, setPointsSpent, redeemHistory, redeem }) {
  const [label,setLabel]=useState(""); const [cost,setCost]=useState(10);
  return (
    <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">
      <div className="bg-white/80 rounded-2xl border p-4 mb-6">
        <div className="mb-2 font-semibold">ご褒美ポイント</div>
        <div className="text-sm">総: {totalPoints} / 使用済: {pointsSpent} / 使用可能: {availablePoints}</div>
        <div className="flex gap-2 mt-2">
          <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="ご褒美名" className="border px-2 py-1 rounded"/>
          <input type="number" value={cost} onChange={e=>setCost(+e.target.value)} className="border px-2 py-1 w-20 rounded"/>
          <button onClick={()=>redeem(label||"ご褒美",cost)} className="px-3 py-1 rounded bg-emerald-600 text-white">受け取る</button>
        </div>
      </div>
      <div className="bg-white/80 rounded-2xl border p-4">
        <div className="mb-2 font-semibold">履歴</div>
        {redeemHistory.length===0?<div className="text-sm text-gray-500">履歴なし</div>:
          <ul>{redeemHistory.map(r=><li key={r.id} className="text-sm border-t py-1 flex justify-between"><span>{r.at} {r.label}</span><span>-{r.cost}pt</span></li>)}</ul>}
      </div>
    </main>
  );
}

// ========== RewardSettings ==========
function RewardSettings({ habits, addReward, removeReward }) {
  const [selected,setSelected]=useState(habits[0]?.id||""); const [label,setLabel]=useState(""); const [thr,setThr]=useState(10);
  const h=habits.find(x=>x.id===selected);
  return (
    <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">
      <div className="bg-white/80 rounded-2xl border p-4">
        <div className="font-semibold mb-2">ごほうびせってい</div>
        {habits.length===0?<div className="text-gray-500">カードを作ってください</div>:
          <>
            <div className="flex gap-2 mb-3">
              <select value={selected} onChange={e=>setSelected(e.target.value)} className="border rounded px-2 py-1">
                {habits.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <input type="number" value={thr} onChange={e=>setThr(+e.target.value)} className="border px-2 py-1 w-20 rounded"/>
              <input value={label} onChange={e=>setLabel(e.target.value)} className="border px-2 py-1 rounded flex-1" placeholder="ご褒美名"/>
              <button onClick={()=>{addReward(selected,thr,label);setLabel("");}} className="px-3 py-1 bg-emerald-600 text-white rounded">追加</button>
            </div>
            {h && <ul>{(h.rewards||[]).map((r,i)=>
              <li key={i} className="flex justify-between items-center border-t py-1">
                <span>{r.threshold} — {r.label}</span>
                <button onClick={()=>removeReward(h.id,i)} className="text-red-600 text-xs border px-2 py-0.5 rounded">削除</button>
              </li>)}</ul>}
          </>
        }
      </div>
    </main>
  );
}

// ========== Mount ==========
(function mount(){
  const el=document.getElementById("root"); if(!el) return setTimeout(mount,16);
  ReactDOM.createRoot(el).render(<App />);
})();
