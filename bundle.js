// React (UMD)
const { useEffect, useMemo, useState } = React;

/* ========= utils ========= */
const todayKey = () => new Date().toLocaleDateString("en-CA");
const keyOf = (d) => new Date(d).toLocaleDateString("en-CA");
const fmtJP = (d) =>
  new Date(d).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
const uid = () => Math.random().toString(36).slice(2, 10);
const daysDiff = (a, b) => Math.floor((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));

function generateMonth(date) {
  const y = date.getFullYear(), m = date.getMonth();
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

/* ========= specials ========= */
const STREAK_SPECIALS = [
  { n: 30, icon: "party", label: "30日連続!!", effect: "confetti" },
  { n: 20, icon: "gem", label: "20日連続!!" },
  { n: 15, icon: "bouquet", label: "15日連続!!" },
  { n: 10, icon: "car", label: "10日連続!!" },
  { n: 5,  icon: "gift", label: "5日連続!!" },
  { n: 3,  icon: "frog", label: "3日連続!!" },
];
function computeStreakFromDate(stamps, restDays, dateKey) {
  let s = 0, d0 = new Date(dateKey);
  for (let i = 0; i < 500; i++) {
    const d = new Date(d0); d.setDate(d0.getDate() - i); const k = keyOf(d);
    const mark = !!stamps[k], rest = !!(restDays && restDays[k]);
    if (mark || rest) s++; else break;
  }
  return s;
}

/* ========= backgrounds ========= */
function IslandBackground() {
  return (
    <div className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-emerald-400 to-emerald-200 rounded-t-[50%]" />
    </div>
  );
}
function NightBackground() {
  const stars = Array.from({ length: 70 });
  return (
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-900 via-slate-900 to-black">
      {stars.map((_, i) => (
        <span key={i} className="absolute bg-white rounded-full"
          style={{ width: 2, height: 2, top: `${Math.random()*100}%`, left: `${Math.random()*100}%` }} />
      ))}
    </div>
  );
}
function NotebookBackground() {
  return (
    <div className="absolute inset-0 -z-10"
      style={{
        backgroundColor: "#fff",
        backgroundImage: "repeating-linear-gradient(0deg,#e5e7eb 0px,#e5e7eb 1px,transparent 1px,transparent 32px)"
      }} />
  );
}
function WoodBackground() {
  return (
    <div className="absolute inset-0 -z-10 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-repeat bg-[#f8f5f0]" />
  );
}
function Background({ theme }) {
  if (theme === "night") return <NightBackground />;
  if (theme === "notebook") return <NotebookBackground />;
  if (theme === "wood") return <WoodBackground />;
  return <IslandBackground />;
}

/* ========= main App ========= */
function App() {
  const [habits, setHabits] = useState(() => JSON.parse(localStorage.getItem("stampcard") || "[]"));
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "island");
  const [view, setView] = useState("cards");
  const [banner, setBanner] = useState(null);
  const [pointsSpent, setPointsSpent] = useState(0);

  useEffect(() => localStorage.setItem("stampcard", JSON.stringify(habits)), [habits]);
  useEffect(() => localStorage.setItem("theme", theme), [theme]);

  const totalPoints = habits.reduce((s, h) => s + Object.values(h.stamps||{}).filter(Boolean).length, 0);
  const availablePoints = totalPoints - pointsSpent;

  const addHabit = (name, rule) =>
    setHabits([...habits, { id: uid(), name, rule, stamps: {}, restDays: {}, rewards: [] }]);

  const deleteHabit = (id) => setHabits(habits.filter(h => h.id !== id));

  const stampToday = (id) => {
    const k = todayKey();
    setHabits(habits.map(h => h.id===id ? { ...h, stamps: { ...h.stamps, [k]: !h.stamps[k] } } : h));
  };

  const addReward = (habitId, threshold, label) =>
    setHabits(habits.map(h => h.id===habitId ? { ...h, rewards: [...h.rewards, {threshold, label}] } : h));

  const removeReward = (habitId, idx) =>
    setHabits(habits.map(h => h.id===habitId ? { ...h, rewards: h.rewards.filter((_,i)=>i!==idx) } : h));

  const redeemReward = (habitId, idx) => {
    const h = habits.find(x => x.id === habitId);
    if (!h) return;
    const reward = h.rewards[idx];
    if (totalPoints < reward.threshold) { alert("ポイントが足りません"); return; }
    setPointsSpent(pointsSpent + reward.threshold);
    setBanner({ text: `「${reward.label}」を交換！`, iconKey: "party" });
    setTimeout(()=>setBanner(null),2000);
  };

  const [newName, setNewName] = useState(""), [newRule, setNewRule] = useState("");
  const handleCreate = () => { addHabit(newName||"マイカード", newRule||"ルールなし"); setNewName(""); setNewRule(""); };

  return (
    <div className="min-h-screen relative">
      <Background theme={theme} />

      {/* header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur p-2 flex gap-2 border-b">
        <button onClick={()=>setView("cards")}>カード</button>
        <button onClick={()=>setView("rewards")}>ごほうび</button>
        <select value={theme} onChange={e=>setTheme(e.target.value)} className="ml-auto">
          <option value="island">アイランド</option>
          <option value="notebook">ノート</option>
          <option value="wood">木目</option>
          <option value="night">夜空</option>
        </select>
      </header>

      {banner && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-yellow-100 px-3 py-1 rounded-xl shadow">
          {banner.text}
        </div>
      )}

      {/* cards */}
      {view==="cards" && (
        <main className="p-4 space-y-6">
          {/* 新規作成 */}
          <div className="bg-white/80 p-3 rounded-xl shadow border">
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="名前" className="border px-2 py-1 mr-2"/>
            <input value={newRule} onChange={e=>setNewRule(e.target.value)} placeholder="ルール" className="border px-2 py-1 mr-2"/>
            <button onClick={handleCreate} className="bg-emerald-600 text-white px-3 py-1 rounded">作成</button>
          </div>

          {habits.map((h,idx)=>(
            <div key={h.id} className="bg-white/80 p-3 rounded-xl shadow border">
              <div className="flex justify-between">
                <div>
                  <div className="font-bold">{h.name}</div>
                  <div className="text-sm">{h.rule}</div>
                </div>
                <div>
                  <button onClick={()=>stampToday(h.id)} className="border px-2 py-1 mr-2">スタンプ</button>
                  <button onClick={()=>deleteHabit(h.id)} className="border px-2 py-1 text-red-600">削除</button>
                </div>
              </div>

              {/* 交換可能なご褒美 */}
              <div className="mt-3 border-t pt-2">
                <div className="font-semibold text-sm mb-1">交換可能なご褒美</div>
                {h.rewards.filter(r=>totalPoints>=r.threshold).length===0
                  ? <div className="text-xs text-gray-600">まだ交換可能なご褒美はありません</div>
                  : h.rewards.map((r,i)=> totalPoints>=r.threshold && (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span>{r.label} ({r.threshold}pt)</span>
                        <button onClick={()=>redeemReward(h.id,i)} className="bg-emerald-600 text-white px-2 py-1 rounded">交換！</button>
                      </div>
                    ))
                }
              </div>
            </div>
          ))}
        </main>
      )}

      {/* rewards view */}
      {view==="rewards" && (
        <main className="p-4">
          {habits.map(h=>(
            <div key={h.id} className="bg-white/80 p-3 rounded-xl shadow mb-4">
              <div className="font-semibold">{h.name}</div>
              <ul>
                {h.rewards.map((r,i)=>(
                  <li key={i} className="flex justify-between items-center text-sm border-b">
                    <span>{r.label} ({r.threshold}pt)</span>
                    <button onClick={()=>removeReward(h.id,i)} className="text-red-600 text-xs">削除</button>
                  </li>
                ))}
              </ul>
              <RewardAdder onAdd={(thr,label)=>addReward(h.id,thr,label)} />
            </div>
          ))}
        </main>
      )}
    </div>
  );
}

function RewardAdder({onAdd}) {
  const [t,setT]=useState(10), [l,setL]=useState("");
  return (
    <div className="mt-2 flex gap-2">
      <input type="number" value={t} onChange={e=>setT(+e.target.value)} className="border px-2 py-1 w-20"/>
      <input value={l} onChange={e=>setL(e.target.value)} placeholder="ご褒美名" className="border px-2 py-1 flex-1"/>
      <button onClick={()=>{if(t>0)onAdd(t,l||`${t}回達成ご褒美`); setL("");}} className="bg-emerald-600 text-white px-2 py-1 rounded">追加</button>
    </div>
  );
}

/* ========= mount ========= */
(function mount(){
  const root=document.getElementById("root");
  if(!root)return setTimeout(mount,20);
  if(ReactDOM.createRoot) ReactDOM.createRoot(root).render(<App />);
  else ReactDOM.render(<App />,root);
})();
