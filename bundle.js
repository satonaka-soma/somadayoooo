// React (UMD)
const { useEffect, useMemo, useState } = React;

/**
 * スタンプカード v10.2（フル機能・スマホ最適化・GHP直置き）
 * - import/export なし（UMDの React/ReactDOM を使用）
 * - ヘッダー2段 & 横スクロールタブ（nowrap）
 * - ガチャは常に「中央配置」＆ SPで小さめ / PCで大きめ
 * - localStorage 永続化、休息日、連続日数、ガチャ、ポイント、ご褒美設定 完全実装
 */

/* ========= utils ========= */
const todayKey = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
const keyOf = (d) => new Date(d).toLocaleDateString("en-CA");
const fmtJP = (d) =>
  new Date(d).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
const uid = () => Math.random().toString(36).slice(2, 10);
const daysDiff = (a, b) => Math.floor((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));

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

/* ========= streak / specials ========= */
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
    const mark = !!stamps[k]; const rest = !!(restDays && restDays[k]);
    if (mark || rest) s++; else break;
  }
  return s;
}

/* ========= SVG ========= */
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

/* ========= decorations ========= */
const keyframesCSS = `
@keyframes sparkle { 0% { filter: drop-shadow(0 0 0 rgba(255,255,255,0)); transform: scale(1);} 50% { filter: drop-shadow(0 0 12px rgba(255,255,255,1)); transform: scale(1.12);} 100% { filter: drop-shadow(0 0 0 rgba(255,255,255,0)); transform: scale(1);} }
@keyframes pop { 0% { transform: translateY(-12px) scale(0.9); opacity: 0;} 60% { transform: translateY(0) scale(1.06); opacity: 1;} 100% { transform: translateY(0) scale(1); opacity: 1;} }
@keyframes cloud1 { 0% { transform: translateX(0px) } 100% { transform: translateX(30px) } }
@keyframes cloud2 { 0% { transform: translateX(0px) } 100% { transform: translateX(-40px) } }
@keyframes confetti { 0% { transform: translateY(-10%) rotate(0deg); opacity: 1;} 100% { transform: translateY(120vh) rotate(720deg); opacity: 0;} }
@keyframes spinSnap { 0% { transform: rotate(0deg);} 70% { transform: rotate(320deg);} 100% { transform: rotate(360deg);} }
.animate-sparkle { animation: sparkle 900ms ease-in-out; }
.animate-pop { animation: pop 500ms cubic-bezier(.2,.9,.2,1); }
.animate-cloud1 { animation: cloud1 6s ease-in-out infinite alternate; }
.animate-cloud2 { animation: cloud2 7s ease-in-out infinite alternate; }
.animate-confetti { animation: confetti 1500ms ease-in forwards; }
.animate-spin-slow-snap { animation: spinSnap 1.1s ease-out; }
`;
function IslandBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-100" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-emerald-300 to-emerald-200 rounded-t-[50%]" />
      <div className="absolute top-10 left-10 w-40 h-10 bg-white/80 rounded-full blur-sm shadow animate-cloud1" />
      <div className="absolute top-20 right-12 w-56 h-12 bg-white/70 rounded-full blur-sm shadow animate-cloud2" />
    </div>
  );
}
function NightBackground() {
  const stars = Array.from({ length: 90 }).map((_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-indigo-950 via-slate-900 to-black">
      {stars.map(i => (
        <span key={i} className="absolute rounded-full bg-white" style={{ width: 2, height: 2, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, opacity: 0.7 }} />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_20%,rgba(255,255,255,.15),transparent_40%)]" />
    </div>
  );
}
function Icon({ iconKey, className }) { const C = Svg[iconKey] || (() => null); return <C className={className} />; }
function ConfettiOverlay() {
  const pieces = Array.from({ length: 80 }).map((_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {pieces.map((i) => (
        <span key={i} className="absolute animate-confetti" style={{ left: `${Math.random() * 100}%`, top: `-5%`, animationDelay: `${Math.random() * 0.8}s`, fontSize: `${12 + Math.random() * 16}px`, transform: `rotate(${Math.random() * 360}deg)` }}>
          {["🎊", "✨", "🎉", "🌸", "🍃"][i % 5]}
        </span>
      ))}
    </div>
  );
}

/* ========= App ========= */
function App() {
  // 状態
  const [habits, setHabits] = useState(() => { try { return JSON.parse(localStorage.getItem("stampcard_v10") || "[]"); } catch { return []; } });
  const [theme, setTheme] = useState(() => { try { return JSON.parse(localStorage.getItem("stampcard_theme") || '"island"'); } catch { return "island"; } });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [view, setView] = useState("cards"); // cards | shop | reward_settings
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [banner, setBanner] = useState(null); // {text, iconKey, effect?}

  // ガチャ/ポイント
  const [gachaHistory, setGachaHistory] = useState(() => { try { return JSON.parse(localStorage.getItem("stampcard_gacha") || "{}"); } catch { return {}; } });
  const [pointsSpent, setPointsSpent] = useState(() => { try { return JSON.parse(localStorage.getItem("stampcard_points_spent") || "0"); } catch { return 0; } });
  const [redeemHistory, setRedeemHistory] = useState(() => { try { return JSON.parse(localStorage.getItem("stampcard_redeem_hist") || "[]"); } catch { return []; } });

  // 永続化
  useEffect(() => localStorage.setItem("stampcard_v10", JSON.stringify(habits)), [habits]);
  useEffect(() => localStorage.setItem("stampcard_theme", JSON.stringify(theme)), [theme]);
  useEffect(() => localStorage.setItem("stampcard_gacha", JSON.stringify(gachaHistory)), [gachaHistory]);
  useEffect(() => localStorage.setItem("stampcard_points_spent", JSON.stringify(pointsSpent)), [pointsSpent]);
  useEffect(() => localStorage.setItem("stampcard_redeem_hist", JSON.stringify(redeemHistory)), [redeemHistory]);

  // ポイント
  const stampPoints = useMemo(() => habits.reduce((s, h) => s + Object.values(h.stamps || {}).filter(Boolean).length, 0), [habits]);
  const bonusPoints = useMemo(() => Object.values(gachaHistory).reduce((s, r) => s + (r?.bonus || 0), 0), [gachaHistory]);
  const totalPoints = stampPoints + bonusPoints;
  const availablePoints = Math.max(0, totalPoints - pointsSpent);

  // 月データ
  const days = useMemo(() => generateMonth(currentMonth), [currentMonth]);

  // 操作
  const addHabit = (name, rule) => setHabits(prev => [...prev, { id: uid(), name, rule, created_at: todayKey(), stamps: {}, restDays: {}, rewards: [] }]);

  const stampToday = (habitId) => {
    const k = todayKey();
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h;
      const next = { ...h, stamps: { ...(h.stamps || {}) }, restDays: { ...(h.restDays || {}) } };
      next.stamps[k] = !next.stamps[k];
      if (next.restDays[k]) delete next.restDays[k];
      return next;
    }));

    const h = habits.find(x => x.id === habitId);
    const newStamps = { ...(h?.stamps || {}), [k]: !(h?.stamps?.[k]) };
    const streak = computeStreakFromDate(newStamps, h?.restDays || {}, k);
    const special = STREAK_SPECIALS.find(s => s.n === streak);
    if (special) { setBanner({ text: special.label, iconKey: special.icon, effect: special.effect }); setTimeout(() => setBanner(null), 2400); }
  };

  const toggleRest = (habitId, dateKey) => {
    if (daysDiff(todayKey(), dateKey) > -2) return; // 当日・明日は不可（休息は二日後以降）
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h;
      const next = { ...h, restDays: { ...(h.restDays || {}) } };
      next.restDays[dateKey] = !next.restDays[dateKey];
      return next;
    }));
  };

  const addReward = (habitId, threshold, label) => {
    if (!threshold || threshold <= 0) return;
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, rewards: [...(h.rewards || []), { threshold, label }].sort((a, b) => a.threshold - b.threshold) } : h));
  };
  const removeReward = (habitId, idx) => setHabits(prev => prev.map(h => h.id !== habitId ? h : ({ ...h, rewards: h.rewards.filter((_, i) => i !== idx) })));

  // ガチャ（1日1回）
  const spinGacha = () => {
    const k = todayKey();
    if (gachaHistory[k]) return; // 既に回済
    setBanner({ text: 'ガチャ回転中…', iconKey: 'gift' });
    setTimeout(() => {
      const r = Math.random();
      let outcome = 'miss', bonus = 0;
      if (r < 0.01) { outcome = 'jackpot'; bonus = 10; }
      else if (r < 0.11) { outcome = 'hit'; bonus = 1; }
      setGachaHistory(prev => ({ ...prev, [k]: { outcome, bonus, at: new Date().toISOString() } }));
      if (outcome === 'jackpot') setBanner({ text: '超大当たり!! +10pt', iconKey: 'gem', effect: 'confetti' });
      else if (outcome === 'hit') setBanner({ text: 'あたり！ +1pt', iconKey: 'gift' });
      else setBanner(null);
    }, 1100);
  };

  // 新規カードフォーム
  const [newName, setNewName] = useState("");
  const [newRule, setNewRule] = useState("");
  const addHabitFromForm = () => { addHabit(newName || "マイ・スタンプ", newRule || "毎日1回、できたらスタンプ"); setNewName(""); setNewRule(""); };

  return (
    <div className="min-h-screen relative text-gray-900 overflow-x-hidden">
      {/* 背景 */}
      {theme === 'night' ? <NightBackground /> : <IslandBackground />}
      <style>{keyframesCSS}</style>

      {/* ヘッダー（2段・横スクロールタブ・安全域） */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b pt-[var(--safe-top)]">
        <div className="max-w-5xl mx-auto px-3 py-2">
          {/* 上段：タイトル */}
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl">🍃</span>
            <h1 className="text-lg md:text-xl font-bold">スタンプカード</h1>
          </div>

          {/* 下段：タブ + 設定 */}
          <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar flex-nowrap items-center">
            <button onClick={() => setView('cards')} className={`h-9 px-3 rounded-xl border whitespace-nowrap text-sm ${view === 'cards' ? 'bg-emerald-600 text-white' : 'bg-white/80'}`}>カード</button>
            <button onClick={() => setView('shop')} className={`h-9 px-3 rounded-xl border whitespace-nowrap text-sm ${view === 'shop' ? 'bg-emerald-600 text-white' : 'bg-white/80'}`}>ご褒美</button>
            <button onClick={() => setView('reward_settings')} className={`h-9 px-3 rounded-xl border whitespace-nowrap text-sm ${view === 'reward_settings' ? 'bg-emerald-600 text-white' : 'bg-white/80'}`}>ごほうびせってい</button>

            <select value={theme} onChange={(e) => setTheme(e.target.value)} className="h-9 px-2 rounded-lg border bg-white/80 text-sm ml-auto">
              <option value="island">アイランド</option>
              <option value="notebook">ノート</option>
              <option value="wood">木目</option>
              <option value="night">夜空</option>
            </select>
            <label className="flex items-center gap-1 text-xs whitespace-nowrap">
              <input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />
              アニメ少なめ
            </label>
          </div>
        </div>
      </header>

      {/* バナー */}
      {banner && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl shadow-xl border bg-amber-50/95 flex items-center gap-2 ${reduceMotion ? '' : 'animate-pop'}`}>
          <Icon iconKey={banner.iconKey} className="w-6 h-6" />
          <span className="font-semibold">{banner.text}</span>
        </div>
      )}
      {banner?.effect === 'confetti' && !reduceMotion && <ConfettiOverlay />}

      {/* ビュー */}
      {view === 'cards' ? (
        <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">
          {/* ガチャ（常に中央寄せ & 可変サイズ） */}
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border p-4 mb-4">
            <div className="font-semibold mb-3 text-center">今日のガチャ</div>
            <div className="w-full flex items-center justify-center">
              {gachaHistory[todayKey()] ? (
                <div className="flex items-center gap-2 text-sm">
                  <span>結果：</span>
                  {gachaHistory[todayKey()].outcome === 'miss' && <span className="px-2 py-1 rounded-lg bg-gray-100 border">残念…また明日！</span>}
                  {gachaHistory[todayKey()].outcome === 'hit' && <span className="px-2 py-1 rounded-lg bg-amber-100 border">あたり！+1pt</span>}
                  {gachaHistory[todayKey()].outcome === 'jackpot' && <span className="px-2 py-1 rounded-lg bg-pink-100 border">超大当たり！！+10pt</span>}
                </div>
              ) : (
                <button onClick={spinGacha} className={`relative w-36 h-36 md:w-44 md:h-44 rounded-full shadow-xl overflow-hidden ${reduceMotion ? '' : 'animate-spin-slow-snap'}`}>
                  <div className="absolute inset-x-0 top-3 flex items-center justify-center"><Svg.capsuleTop className="w-32 h-16" /></div>
                  <div className="absolute inset-x-0 bottom-3 flex items-center justify-center"><Svg.capsuleBottom className="w-32 h-16" /></div>
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl mix-blend-overlay">回す！</div>
                </button>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-2 text-center">ポイント：スタンプ + ボーナス（結果は自動加算）</div>
          </div>

          {/* 新規カード */}
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border p-4 mb-6">
            <div className="font-semibold mb-3">新しいスタンプカード</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="名前（例：英語シャドーイング）" className="px-3 py-2 rounded-xl border w-full" />
              <input value={newRule} onChange={(e) => setNewRule(e.target.value)} placeholder="ルール（例：1日15分やったら押す）" className="px-3 py-2 rounded-xl border w-full" />
              <button onClick={addHabitFromForm} className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:opacity-90">追加</button>
            </div>
          </div>

          {/* 月ナビ + 合計 */}
          <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="h-9 px-3 rounded-xl border bg-white/70 hover:bg-white">← 前月</button>
              <div className="font-semibold">{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</div>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="h-9 px-3 rounded-xl border bg-white/70 hover:bg-white">翌月 →</button>
              <button onClick={() => setCurrentMonth(new Date())} className="h-9 px-3 rounded-xl border bg-white/70 hover:bg-white">今月</button>
            </div>
            <div className="text-sm bg-white/70 rounded-xl px-3 py-1.5 border">総pt: <b>{totalPoints}</b> / 使用済: {pointsSpent} / 使用可能: <b>{availablePoints}</b></div>
          </div>

          {/* カード一覧 */}
          <div className="space-y-6">
            {habits.length === 0 && (<div className="text-gray-700 text-sm bg-white/70 rounded-xl p-3 inline-block">まずカードを作成してください。</div>)}
            {habits.map(h => (
              <HabitCard key={h.id} habit={h} days={days} currentMonth={currentMonth} onStampToday={() => stampToday(h.id)} onToggleRest={(d) => toggleRest(h.id, d)} />
            ))}
          </div>
        </main>
      ) : view === 'shop' ? (
        <ShopView totalPoints={totalPoints} availablePoints={availablePoints} pointsSpent={pointsSpent} setPointsSpent={setPointsSpent} redeemHistory={redeemHistory} redeem={(label, cost)=> {
          if (availablePoints < cost) { alert('ポイントが足りません'); return; }
          setPointsSpent(pointsSpent + cost);
          setRedeemHistory(prev => [{ id: uid(), at: new Date().toISOString(), label, cost }, ...prev].slice(0, 200));
          setBanner({ text: `「${label}」を受け取り！`, iconKey: 'party', effect: 'confetti' });
          setTimeout(() => setBanner(null), 2000);
        }} />
      ) : (
        <RewardSettings habits={habits} addReward={addReward} removeReward={removeReward} />
      )}

      <footer className="relative z-10 max-w-5xl mx-auto px-4 py-8 text-xs text-gray-700">ローカル保存（localStorage）。端末を変えると共有されません。</footer>
    </div>
  );
}

/* ========= sub components ========= */
function HabitCard({ habit, days, currentMonth, onStampToday, onToggleRest }) {
  const { name, rule, stamps = {}, restDays = {}, rewards = [] } = habit;
  const total = Object.values(stamps).filter(Boolean).length;
  const streakToday = useMemo(() => computeStreakFromDate(stamps, restDays, todayKey()), [stamps, restDays]);

  const rewardStatuses = useMemo(() => (
    (rewards || []).map(r => ({ label: r.label, threshold: r.threshold, can: total >= r.threshold, remain: Math.max(0, r.threshold - total) })).sort((a, b) => a.threshold - b.threshold)
  ), [rewards, total]);

  return (
    <div className="rounded-3xl border shadow-sm overflow-hidden bg-white/80 backdrop-blur">
      {/* ヘッダー */}
      <div className="p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold truncate flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">連続 {streakToday} 日</span>
            <span className="truncate">{name}</span>
          </div>
          <div className="text-sm text-gray-700 truncate">{rule}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-600">通算</div>
          <div className="text-2xl font-extrabold">{total}</div>
        </div>
        <button onClick={onStampToday} className={`px-4 py-2 rounded-xl border ml-2 ${stamps?.[todayKey()] ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-emerald-50'}`}>{stamps?.[todayKey()] ? 'できた！✓' : 'できた！'}</button>
      </div>

      {/* 月カレンダー */}
      <div className="px-4 pb-4">
        <div className="rounded-3xl p-3 border bg-[linear-gradient(135deg,#f7f5ef,#efe9dc)] shadow-inner">
          <div className="grid grid-cols-7 gap-1 text-[12px] text-gray-700 mb-1 font-medium">{["月","火","水","木","金","土","日"].map(w=> <div key={w} className="text-center">{w}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, idx) => {
              const k = keyOf(d);
              const marked = !!stamps[k];
              const rest = !!restDays[k];
              const isToday = k === todayKey();
              const restAllowed = daysDiff(todayKey(), k) <= -2; // 二日後以降のみ
              const isOtherMonth = d.getMonth() !== currentMonth.getMonth();
              const streak = marked || rest ? computeStreakFromDate(stamps, restDays, k) : 0;
              const special = STREAK_SPECIALS.find(s => s.n === streak) || null;
              const iconKey = special ? special.icon : marked ? NORMAL_ICONS[idx % NORMAL_ICONS.length] : null;

              return (
                <div key={k} className="relative">
                  <button
                    title={isToday ? `${fmtJP(k)} — 今日だけ押せます` : restAllowed ? `${fmtJP(k)} — 長押し/下のボタンで休息切替` : `${fmtJP(k)} — 休息は二日後以降`}
                    onClick={() => isToday && onStampToday()}
                    onContextMenu={(e) => { e.preventDefault(); if (restAllowed) onToggleRest(k); }}
                    className={`relative w-full aspect-square rounded-2xl border flex items-center justify-center select-none
                      ${isOtherMonth ? 'opacity-60' : ''}
                      ${marked ? 'bg-emerald-500/90 border-emerald-600 text-white' : rest ? 'bg-emerald-50/60 border-emerald-200' : 'bg-emerald-50/80'}
                      ${isToday ? 'ring-2 ring-amber-400' : ''}
                    `}
                  >
                    <span className={`absolute top-1 left-1 text-[14px] ${marked ? 'text-white/90' : 'text-emerald-800/70'}`}>{d.getDate()}</span>
                    {iconKey ? <Icon iconKey={iconKey} className={`w-12 h-12 ${marked ? 'animate-sparkle' : ''}`} /> : (!rest && <Icon iconKey='leaf' className="w-9 h-9 opacity-20" />)}
                    {special && (<span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 border border-amber-300 shadow">{special.label}</span>)}
                    {rest && <span className="absolute bottom-1 right-1 text-[11px] px-1 rounded bg-white/90 border">休息</span>}
                  </button>
                  {restAllowed && !isToday && (
                    <button onClick={() => onToggleRest(k)} className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0.5 rounded-full bg-white border shadow hover:bg-gray-50">休息切替</button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-[11px] text-gray-600 mt-2">※ 休息日は二日後以降（当日・明日は不可）。PC:右クリック / スマホ:長押し or 下のボタン</div>
        </div>
      </div>

      {/* 所有ポイント＆ご褒美一覧（表示のみ） */}
      <div className="px-4 pb-4 text-sm">
        <div className="mb-2">所有ポイント：<b>{Object.values(stamps).filter(Boolean).length}</b></div>
        {(rewards || []).length === 0 ? (
          <div className="text-gray-600">ご褒美は未設定です。「ごほうびせってい」から追加してください。</div>
        ) : (
          <ul className="space-y-1">
            {rewardStatuses.map((rs, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>{rs.label}（{rs.threshold}スタンプ）</span>
                {rs.can ? <span className="text-emerald-600 font-semibold">交換可能！</span> : <span className="text-gray-700">あと {rs.remain} スタンプ！</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ShopView({ totalPoints, availablePoints, pointsSpent, setPointsSpent, redeemHistory, redeem }) {
  const [label, setLabel] = useState("");
  const [cost, setCost] = useState(10);
  return (
    <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border p-4 mb-6 grid md:grid-cols-2 gap-4">
        <div>
          <div className="font-semibold">ご褒美ポイント</div>
          <div className="text-gray-700 mt-1">総pt: <b>{totalPoints}</b> / 使用済: {pointsSpent} / 使用可能: <b>{availablePoints}</b></div>
          <div className="text-xs text-gray-500 mt-1">ポイント = スタンプ数 + ガチャボーナス</div>
        </div>
        <div className="flex items-center gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ご褒美名（例：映画、スパ、スイーツ）" className="px-3 py-2 rounded-xl border w-56" />
          <input type="number" min={1} value={cost} onChange={(e) => setCost(parseInt(e.target.value || '0', 10))} placeholder="ポイント" className="px-3 py-2 rounded-xl border w-28" />
          <button onClick={() => redeem(label || 'ご褒美', cost)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:opacity-90">受け取る</button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border p-4">
        <div className="font-semibold mb-2">受け取り履歴</div>
        {redeemHistory.length === 0 ? (
          <div className="text-sm text-gray-600">まだ履歴はありません。</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {redeemHistory.map(rec => (
              <li key={rec.id} className="flex items-center justify-between border-b py-1">
                <span>{fmtJP(rec.at)} — {rec.label}</span>
                <span className="text-gray-700">-{rec.cost} pt</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function RewardSettings({ habits, addReward, removeReward }) {
  const [selected, setSelected] = useState(habits[0]?.id || null);
  const [label, setLabel] = useState("");
  const [threshold, setThreshold] = useState(10);
  const h = habits.find(x => x.id === selected);
  useEffect(() => { if (!habits.find(x => x.id === selected)) setSelected(habits[0]?.id || null); }, [habits, selected]);
  return (
    <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border p-4 mb-4">
        <div className="font-semibold mb-2">ごほうびせってい</div>
        {habits.length === 0 ? (
          <div className="text-sm text-gray-600">まずカードを作成してください。</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <select className="px-2 py-1 rounded-lg border" value={selected || ''} onChange={(e) => setSelected(e.target.value)}>
                {habits.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <input type="number" min={1} value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value || '0', 10))} className="px-3 py-2 rounded-xl border w-36" placeholder="しきい値" />
              <input value={label} onChange={(e) => setLabel(e.target.value)} className="px-3 py-2 rounded-xl border w-72" placeholder="ご褒美名" />
              <button onClick={() => { if (selected) addReward(selected, threshold, label || `${threshold}回達成ご褒美`); setLabel(''); }} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">追加</button>
            </div>
            {!h ? (
              <div className="text-sm text-gray-600">カードが選択されていません。</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-600"><th className="py-1">しきい値</th><th className="py-1">内容</th><th className="py-1">操作</th></tr></thead>
                  <tbody>
                    {(h.rewards || []).sort((a, b) => a.threshold - b.threshold).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2">{r.threshold}</td>
                        <td className="py-2">{r.label}</td>
                        <td className="py-2"><button onClick={() => removeReward(h.id, i)} className="px-2 py-1 rounded-lg border hover:bg-gray-50">削除</button></td>
                      </tr>
                    ))}
                    {(!h.rewards || h.rewards.length === 0) && (<tr><td colSpan={3} className="py-3 text-gray-600">まだご褒美がありません。</td></tr>)}
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
(function mount() {
  const root = document.getElementById('root');
  if (!root) return setTimeout(mount, 20);
  if (ReactDOM.createRoot) {
    ReactDOM.createRoot(root).render(<App />);
  } else {
    ReactDOM.render(<App />, root);
  }
})();
