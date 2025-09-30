// Use React UMD globals
const { useState, useEffect, useMemo } = React;

/**
 * スタンプカード React版 v10.2 完全版（UMD/Babel 直読み）
 * - v10.1 全機能維持：スタンプ押し／休息／連続日数／ガチャ（演出）／ご褒美管理／localStorage
 * - 追加要望対応：
 *   1) カード削除ボタン（各カード）
 *   2) ご褒美設定削除ボタン（赤く、行ごと）
 *   3) テーマ4種（island / notebook / wood / night）を正しく反映
 *   4) ポイント表示をヘッダー下で大きく目立たせる
 */

// ---------- utils ----------
function todayKey() { return new Date().toLocaleDateString("en-CA"); } // YYYY-MM-DD
function keyOf(d) { return new Date(d).toLocaleDateString("en-CA"); }
function fmtJP(d) { return new Date(d).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" }); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function daysDiff(a, b) { return Math.floor((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24)); }

function generateMonth(date) {
  var y = date.getFullYear();
  var m = date.getMonth();
  var first = new Date(y, m, 1);
  var last = new Date(y, m + 1, 0);
  var start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // 月曜スタート
  var end = new Date(last);
  end.setDate(last.getDate() + (7 - ((last.getDay() + 6) % 7) - 1));
  var days = [];
  for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  return days;
}

// ---------- streak ----------
var STREAK_SPECIALS = [
  { n: 30, icon: "party", label: "30日連続!!", effect: "confetti" },
  { n: 20, icon: "gem", label: "20日連続!!" },
  { n: 15, icon: "bouquet", label: "15日連続!!" },
  { n: 10, icon: "car", label: "10日連続!!" },
  { n: 5, icon: "gift", label: "5日連続!!" },
  { n: 3, icon: "frog", label: "3日連続!!" },
];
function computeStreakFromDate(stamps, restDays, dateKey) {
  var s = 0; var d0 = new Date(dateKey);
  for (var i = 0; i < 500; i++) {
    var d = new Date(d0); d.setDate(d0.getDate() - i); var k = keyOf(d);
    var mark = !!(stamps && stamps[k]); var rest = !!(restDays && restDays[k]);
    if (mark || rest) s++; else break;
  }
  return s;
}

// ---------- SVG ----------
var Svg = {
  leaf: function(p){ return (<svg viewBox="0 0 64 64" {...p}><path d="M56 8C38 10 22 18 14 30S8 56 8 56s14 2 26-6S54 26 56 8Z" fill="#10b981"/><path d="M32 16c0 20-4 28-20 40" stroke="#065f46" strokeWidth="3" fill="none"/></svg>); },
  paw: function(p){ return (<svg viewBox="0 0 64 64" {...p}><circle cx="20" cy="20" r="6" fill="#0ea5e9"/><circle cx="44" cy="20" r="6" fill="#0ea5e9"/><circle cx="28" cy="12" r="5" fill="#38bdf8"/><circle cx="36" cy="12" r="5" fill="#38bdf8"/><ellipse cx="32" cy="40" rx="14" ry="10" fill="#0ea5e9"/></svg>); },
  flower: function(p){ return (<svg viewBox="0 0 64 64" {...p}><circle cx="32" cy="32" r="6" fill="#f59e0b"/><g fill="#f472b6"><circle cx="16" cy="24" r="10"/><circle cx="48" cy="24" r="10"/><circle cx="16" cy="44" r="10"/><circle cx="48" cy="44" r="10"/></g></svg>); },
  frog: function(p){ return (<svg viewBox="0 0 64 64" {...p}><circle cx="22" cy="20" r="8" fill="#34d399"/><circle cx="42" cy="20" r="8" fill="#34d399"/><ellipse cx="32" cy="40" rx="18" ry="14" fill="#10b981"/><circle cx="22" cy="20" r="3" fill="#111"/><circle cx="42" cy="20" r="3" fill="#111"/></svg>); },
  gift: function(p){ return (<svg viewBox="0 0 64 64" {...p}><rect x="8" y="24" width="48" height="28" rx="4" fill="#ef4444"/><rect x="30" y="16" width="4" height="40" fill="#fbbf24"/><rect x="8" y="34" width="48" height="4" fill="#fbbf24"/><path d="M24 20c0-6 8-8 8-2 0-6 8-4 8 2" stroke="#fbbf24" strokeWidth="4" fill="none"/></svg>); },
  car: function(p){ return (<svg viewBox="0 0 64 64" {...p}><rect x="10" y="28" width="44" height="14" rx="4" fill="#3b82f6"/><path d="M16 28l8-8h16l8 8z" fill="#60a5fa"/><circle cx="22" cy="46" r="6" fill="#111"/><circle cx="42" cy="46" r="6" fill="#111"/></svg>); },
  bouquet: function(p){ return (<svg viewBox="0 0 64 64" {...p}><g fill="#f87171"><circle cx="18" cy="20" r="6"/><circle cx="32" cy="16" r="6"/><circle cx="46" cy="20" r="6"/></g><path d="M32 22v28" stroke="#16a34a" strokeWidth="3"/><path d="M20 34l12 16M44 34L32 50" stroke="#16a34a" strokeWidth="3"/></svg>); },
  gem: function(p){ return (<svg viewBox="0 0 64 64" {...p}><polygon points="16,24 32,8 48,24 40,48 24,48" fill="#22d3ee"/><path d="M32 8L24 48M32 8l8 40" stroke="#0891b2" strokeWidth="2" fill="none"/></svg>); },
  party: function(p){ return (<svg viewBox="0 0 64 64" {...p}><path d="M10 52l14-30 30 14z" fill="#f59e0b"/><g fill="#f43f5e"><circle cx="36" cy="16" r="3"/><circle cx="48" cy="10" r="2"/><circle cx="20" cy="12" r="2"/></g></svg>); },
  capsuleTop: function(p){ return (<svg viewBox="0 0 120 80" {...p}><path d="M10 40a30 30 0 0 1 30-30h40a30 30 0 0 1 30 30" fill="#fde68a" stroke="#f59e0b" strokeWidth="4"/></svg>); },
  capsuleBottom: function(p){ return (<svg viewBox="0 0 120 80" {...p}><path d="M10 40a30 30 0 0 0 30 30h40a30 30 0 0 0 30-30" fill="#fca5a5" stroke="#ef4444" strokeWidth="4"/></svg>); },
};
var NORMAL_ICONS = ["leaf", "paw", "flower"];

// ---------- backgrounds ----------
function IslandBackground(){ return (<div className="pointer-events-none absolute inset-0 -z-10"><div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-100"/><div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-emerald-300 to-emerald-200 rounded-t-[50%]"/></div>); }
function NightBackground(){
  var stars = Array.from({ length: 90 }).map(function(_, i){return i;});
  return (<div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-indigo-950 via-slate-900 to-black">
    {stars.map(function(i){ return <span key={i} className="absolute rounded-full bg-white" style={{ width: 2, height: 2, top: (Math.random()*100)+"%", left: (Math.random()*100)+"%", opacity: .7 }} /> })}
  </div>);
}
function NotebookBackground(){
  return (<div className="pointer-events-none absolute inset-0 -z-10" style={{ backgroundImage: "repeating-linear-gradient(0deg, #e5e7eb 0px, #e5e7eb 1px, transparent 1px, transparent 32px)" }} />);
}
function WoodBackground(){
  return (<div className="pointer-events-none absolute inset-0 -z-10" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')" }} />);
}
function Background(props){
  var theme = props.theme;
  if (theme === "night") return <NightBackground/>;
  if (theme === "notebook") return <NotebookBackground/>;
  if (theme === "wood") return <WoodBackground/>;
  return <IslandBackground/>;
}
function Icon(props){ var C = Svg[props.iconKey] || function(){return null}; return <C className={props.className} />; }

// ---------- animations ----------
var keyframesCSS = `
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
function ConfettiOverlay(){
  var pieces = Array.from({ length: 80 }).map(function(_, i){return i;});
  return (<div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
    {pieces.map(function(i){
      return (<span key={i} className="absolute animate-confetti" style={{ left: (Math.random()*100)+"%", top: "-5%", animationDelay: (Math.random()*0.8)+"s", fontSize: (12+Math.random()*16)+"px", transform: "rotate("+(Math.random()*360)+"deg)" }}>
        {["🎊", "✨", "🎉", "🌸", "🍃"][i % 5]}
      </span>);
    })}
  </div>);
}

// ---------- App ----------
function App(){
  // 状態
  var [habits, setHabits] = useState(function(){ try { return JSON.parse(localStorage.getItem("stampcard_v10") || "[]"); } catch(e){ return []; } });
  var [theme, setTheme] = useState(function(){ try { return JSON.parse(localStorage.getItem("stampcard_theme") || '"island"'); } catch(e){ return "island"; } });
  var [reduceMotion, setReduceMotion] = useState(false);
  var [view, setView] = useState("cards"); // cards | shop | reward_settings
  var [currentMonth, setCurrentMonth] = useState(new Date());
  var [banner, setBanner] = useState(null);

  // ガチャ/ポイント
  var [gachaHistory, setGachaHistory] = useState(function(){ try { return JSON.parse(localStorage.getItem("stampcard_gacha") || "{}"); } catch(e){ return {}; } });
  var [pointsSpent, setPointsSpent] = useState(function(){ try { return JSON.parse(localStorage.getItem("stampcard_points_spent") || "0"); } catch(e){ return 0; } });
  var [redeemHistory, setRedeemHistory] = useState(function(){ try { return JSON.parse(localStorage.getItem("stampcard_redeem_hist") || "[]"); } catch(e){ return []; } });

  // 永続化
  useEffect(function(){ localStorage.setItem("stampcard_v10", JSON.stringify(habits)); }, [habits]);
  useEffect(function(){ localStorage.setItem("stampcard_theme", JSON.stringify(theme)); }, [theme]);
  useEffect(function(){ localStorage.setItem("stampcard_gacha", JSON.stringify(gachaHistory)); }, [gachaHistory]);
  useEffect(function(){ localStorage.setItem("stampcard_points_spent", JSON.stringify(pointsSpent)); }, [pointsSpent]);
  useEffect(function(){ localStorage.setItem("stampcard_redeem_hist", JSON.stringify(redeemHistory)); }, [redeemHistory]);

  // ポイント
  var stampPoints = useMemo(function(){
    return habits.reduce(function(s, h){
      var count = Object.values(h.stamps || {}).filter(Boolean).length;
      return s + count;
    }, 0);
  }, [habits]);
  var bonusPoints = useMemo(function(){
    return Object.values(gachaHistory).reduce(function(s, r){
      var b = r && r.bonus ? r.bonus : 0;
      return s + b;
    }, 0);
  }, [gachaHistory]);
  var totalPoints = stampPoints + bonusPoints;
  var availablePoints = Math.max(0, totalPoints - pointsSpent);

  // 月
  var days = useMemo(function(){ return generateMonth(currentMonth); }, [currentMonth]);

  // 操作
  function addHabit(name, rule){
    setHabits(function(prev){ return prev.concat([{ id: uid(), name: name, rule: rule, created_at: todayKey(), stamps: {}, restDays: {}, rewards: [] }]); });
  }
  function deleteHabit(id){
    if (!confirm("このカードを削除しますか？")) return;
    setHabits(function(prev){ return prev.filter(function(h){ return h.id !== id; }); });
  }
  function stampToday(habitId){
    var k = todayKey();
    setHabits(function(prev){
      return prev.map(function(h){
        if (h.id !== habitId) return h;
        var next = { id: h.id, name: h.name, rule: h.rule, created_at: h.created_at, stamps: Object.assign({}, h.stamps || {}), restDays: Object.assign({}, h.restDays || {}), rewards: (h.rewards || []) };
        next.stamps[k] = !next.stamps[k];
        if (next.restDays[k]) delete next.restDays[k];
        return next;
      });
    });
    var h = habits.find(function(x){ return x.id === habitId; });
    var newStamps = Object.assign({}, (h && h.stamps) || {}); newStamps[k] = !(h && h.stamps && h.stamps[k]);
    var streak = computeStreakFromDate(newStamps, (h && h.restDays) || {}, k);
    var special = STREAK_SPECIALS.find(function(s){ return s.n === streak; });
    if (special){
      setBanner({ text: special.label, iconKey: special.icon, effect: special.effect });
      setTimeout(function(){ setBanner(null); }, 2400);
    }
  }
  function toggleRest(habitId, dateKey){
    if (daysDiff(todayKey(), dateKey) > -2) return; // 当日・明日は不可
    setHabits(function(prev){
      return prev.map(function(h){
        if (h.id !== habitId) return h;
        var next = { id: h.id, name: h.name, rule: h.rule, created_at: h.created_at, stamps: Object.assign({}, h.stamps || {}), restDays: Object.assign({}, h.restDays || {}), rewards: (h.rewards || []) };
        next.restDays[dateKey] = !next.restDays[dateKey];
        return next;
      });
    });
  }
  function addReward(habitId, threshold, label){
    if (!threshold || threshold <= 0) return;
    setHabits(function(prev){
      return prev.map(function(h){
        if (h.id !== habitId) return h;
        var nextRewards = (h.rewards || []).concat([{ threshold: threshold, label: label }]).sort(function(a,b){ return a.threshold - b.threshold; });
        return Object.assign({}, h, { rewards: nextRewards });
      });
    });
  }
  function removeReward(habitId, idx){
    setHabits(function(prev){
      return prev.map(function(h){
        if (h.id !== habitId) return h;
        var arr = (h.rewards || []).filter(function(_, i){ return i !== idx; });
        return Object.assign({}, h, { rewards: arr });
      });
    });
  }

  // ガチャ
  function spinGacha(){
    var k = todayKey();
    if (gachaHistory[k]) return;
    setBanner({ text: "ガチャ回転中…", iconKey: "gift" });
    setTimeout(function(){
      var r = Math.random(); var outcome = "miss", bonus = 0;
      if (r < 0.01) { outcome = "jackpot"; bonus = 10; }
      else if (r < 0.11) { outcome = "hit"; bonus = 1; }
      setGachaHistory(function(prev){
        var next = Object.assign({}, prev); next[k] = { outcome: outcome, bonus: bonus, at: new Date().toISOString() }; return next;
      });
      if (outcome === "jackpot") setBanner({ text: "超大当たり!! +10pt", iconKey: "gem", effect: "confetti" });
      else if (outcome === "hit") setBanner({ text: "あたり！ +1pt", iconKey: "gift" });
      else setBanner(null);
    }, 1100);
  }
  function redeem(label, cost){
    if (availablePoints < cost) { alert("ポイントが足りません"); return; }
    setPointsSpent(pointsSpent + cost);
    setRedeemHistory(function(prev){
      var next = [{ id: uid(), at: new Date().toISOString(), label: label, cost: cost }].concat(prev);
      return next.slice(0, 200);
    });
    setBanner({ text: "「"+label+"」を受け取り！", iconKey: "party", effect: "confetti" });
    setTimeout(function(){ setBanner(null); }, 2000);
  }

  // 新規カード
  var [newName, setNewName] = useState(""); var [newRule, setNewRule] = useState("");
  function addHabitFromForm(){
    addHabit(newName || "マイ・スタンプ", newRule || "毎日1回、できたらスタンプ");
    setNewName(""); setNewRule("");
  }

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
            <select value={theme} onChange={function(e){ setTheme(e.target.value); }} className="px-2 py-1 rounded-lg border bg-white/80">
              <option value="island">アイランド</option>
              <option value="notebook">ノート</option>
              <option value="wood">木目</option>
              <option value="night">夜空</option>
            </select>
            <button onClick={function(){ setView("cards"); }} className={"px-3 py-1.5 rounded-xl border "+(view==="cards"?"bg-emerald-600 text-white":"bg-white/70 hover:bg-white")}>カード</button>
            <button onClick={function(){ setView("shop"); }} className={"px-3 py-1.5 rounded-xl border "+(view==="shop"?"bg-emerald-600 text-white":"bg-white/70 hover:bg-white")}>ご褒美</button>
            <button onClick={function(){ setView("reward_settings"); }} className={"px-3 py-1.5 rounded-xl border "+(view==="reward_settings"?"bg-emerald-600 text-white":"bg-white/70 hover:bg-white")}>ごほうびせってい</button>
            <label className="flex items-center gap-2 text-sm ml-2"><input type="checkbox" checked={!!reduceMotion} onChange={function(e){ setReduceMotion(e.target.checked); }} />アニメ少なめ</label>
          </div>
        </div>
      </header>

      {/* ポイント表示（強調） */}
      <div className="text-center py-3 bg-white/60 backdrop-blur border-b">
        <div className="text-sm text-gray-700">総ポイント</div>
        <div className="text-4xl font-extrabold text-emerald-600">{totalPoints}</div>
        <div className="text-xs text-gray-500">使用済: {pointsSpent} / 使用可能: <b>{availablePoints}</b></div>
      </div>

      {/* バナー */}
      {banner && (
        <div className={"fixed top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl shadow-xl border bg-amber-50/95 flex items-center gap-2 "+(reduceMotion?"":"animate-pop")}>
          <Icon iconKey={banner.iconKey} className="w-6 h-6" />
          <span className="font-semibold">{banner.text}</span>
        </div>
      )}
      {banner && banner.effect === "confetti" && !reduceMotion && <ConfettiOverlay />}

      {/* ビュー */}
      {view === "cards" ? (
        <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">
          {/* ガチャ */}
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border p-4 mb-4 flex flex-col items-center">
            <div className="font-semibold mb-3">今日のガチャ</div>
            {gachaHistory[todayKey()] ? (
              <div className="flex items-center gap-2 text-sm">
                <span>結果：</span>
                {gachaHistory[todayKey()].outcome === "miss" && <span className="px-2 py-1 rounded-lg bg-gray-100 border">残念…また明日！</span>}
                {gachaHistory[todayKey()].outcome === "hit" && <span className="px-2 py-1 rounded-lg bg-amber-100 border">あたり！+1pt</span>}
                {gachaHistory[todayKey()].outcome === "jackpot" && <span className="px-2 py-1 rounded-lg bg-pink-100 border">超大当たり！！+10pt</span>}
              </div>
            ) : (
              <button onClick={spinGacha} className={"relative w-36 h-36 md:w-44 md:h-44 rounded-full shadow-xl overflow-hidden "+(reduceMotion?"":"animate-spin-slow-snap")}>
                <div className="absolute inset-x-0 top-3 flex items-center justify-center"><Svg.capsuleTop className="w-32 h-16" /></div>
                <div className="absolute inset-x-0 bottom-3 flex items-center justify-center"><Svg.capsuleBottom className="w-32 h-16" /></div>
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl mix-blend-overlay">回す！</div>
              </button>
            )}
            <div className="text-xs text-gray-600 mt-2">ポイント：スタンプ + ボーナス（結果は自動加算）</div>
          </div>

          {/* 新規カード */}
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border p-4 mb-6">
            <div className="font-semibold mb-3">新しいスタンプカード</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={newName} onChange={function(e){ setNewName(e.target.value); }} placeholder="名前（例：英語シャドーイング）" className="px-3 py-2 rounded-xl border w-full" />
              <input value={newRule} onChange={function(e){ setNewRule(e.target.value); }} placeholder="ルール（例：1日15分やったら押す）" className="px-3 py-2 rounded-xl border w-full" />
              <button onClick={addHabitFromForm} className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:opacity-90">追加</button>
            </div>
          </div>

          {/* 月ナビ */}
          <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <button onClick={function(){ setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); }} className="h-9 px-3 rounded-xl border bg-white/70 hover:bg-white">← 前月</button>
              <div className="font-semibold">{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</div>
              <button onClick={function(){ setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); }} className="h-9 px-3 rounded-xl border bg-white/70 hover:bg-white">翌月 →</button>
              <button onClick={function(){ setCurrentMonth(new Date()); }} className="h-9 px-3 rounded-xl border bg-white/70 hover:bg-white">今月</button>
            </div>
            <div className="text-sm bg-white/70 rounded-xl px-3 py-1.5 border">総pt: <b>{totalPoints}</b> / 使用済: {pointsSpent} / 使用可能: <b>{availablePoints}</b></div>
          </div>

          {/* カード一覧 */}
          <div className="space-y-6">
            {habits.length === 0 && (<div className="text-gray-700 text-sm bg-white/70 rounded-xl p-3 inline-block">まずカードを作成してください。</div>)}
            {habits.map(function(h){
              return (<HabitCard key={h.id} habit={h} days={days} currentMonth={currentMonth} onStampToday={function(){ stampToday(h.id); }} onToggleRest={function(d){ toggleRest(h.id, d); }} onDeleteCard={deleteHabit} totalPoints={totalPoints} />);
            })}
          </div>
        </main>
      ) : view === "shop" ? (
        <ShopView totalPoints={totalPoints} availablePoints={availablePoints} pointsSpent={pointsSpent} setPointsSpent={setPointsSpent} redeemHistory={redeemHistory} redeem={redeem} />
      ) : (
        <RewardSettings habits={habits} addReward={addReward} removeReward={removeReward} />
      )}

      <footer className="relative z-10 max-w-5xl mx-auto px-4 py-8 text-xs text-gray-700">ローカル保存（localStorage）。端末を変えると共有されません。</footer>
    </div>
  );
}

// ---------- sub components ----------
function HabitCard(props){
  var habit = props.habit, days = props.days, currentMonth = props.currentMonth, onStampToday = props.onStampToday, onToggleRest = props.onToggleRest, onDeleteCard = props.onDeleteCard, totalPoints = props.totalPoints;
  var name = habit.name, rule = habit.rule;
  var stamps = habit.stamps || {}; var restDays = habit.restDays || {}; var rewards = habit.rewards || [];
  var total = Object.values(stamps).filter(Boolean).length;
  var streakToday = useMemo(function(){ return computeStreakFromDate(stamps, restDays, todayKey()); }, [stamps, restDays]);

  var rewardStatuses = useMemo(function(){
    return (rewards || []).map(function(r){
      return { label: r.label, threshold: r.threshold, can: total >= r.threshold, remain: Math.max(0, r.threshold - total) };
    }).sort(function(a,b){ return a.threshold - b.threshold; });
  }, [rewards, total]);

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
        <button onClick={onStampToday} className={"px-4 py-2 rounded-xl border ml-2 "+(stamps[todayKey()]?"bg-emerald-600 text-white":"bg-white hover:bg-emerald-50")}>{stamps[todayKey()]?"できた！✓":"できた！"}</button>
        <button onClick={function(){ onDeleteCard(habit.id); }} className="ml-2 px-2 py-1 text-xs rounded-lg border text-red-600 hover:bg-red-50">削除</button>
      </div>

      {/* 月カレンダー */}
      <div className="px-4 pb-4">
        <div className="rounded-3xl p-3 border bg-[linear-gradient(135deg,#f7f5ef,#efe9dc)] shadow-inner">
          <div className="grid grid-cols-7 gap-1 text-[12px] text-gray-700 mb-1 font-medium">{["月","火","水","木","金","土","日"].map(function(w){ return <div key={w} className="text-center">{w}</div>; })}</div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(function(d, idx){
              var k = keyOf(d);
              var marked = !!stamps[k];
              var rest = !!restDays[k];
              var isToday = k === todayKey();
              var restAllowed = daysDiff(todayKey(), k) <= -2; // 二日後以降のみ
              var isOtherMonth = d.getMonth() !== currentMonth.getMonth();
              var streak = (marked || rest) ? computeStreakFromDate(stamps, restDays, k) : 0;
              var special = STREAK_SPECIALS.find(function(s){ return s.n === streak; }) || null;
              var iconKey = special ? special.icon : (marked ? NORMAL_ICONS[idx % NORMAL_ICONS.length] : null);
              return (
                <div key={k} className="relative">
                  <button
                    title={isToday ? (fmtJP(k)+" — 今日だけ押せます") : (restAllowed ? (fmtJP(k)+" — 長押し/下のボタンで休息切替") : (fmtJP(k)+" — 休息は二日後以降"))}
                    onClick={function(){ if (isToday) onStampToday(); }}
                    onContextMenu={function(e){ e.preventDefault(); if (restAllowed) onToggleRest(k); }}
                    className={"relative w-full aspect-square rounded-2xl border flex items-center justify-center select-none "+
                      (isOtherMonth ? "opacity-60 " : "") +
                      (marked ? "bg-emerald-500/90 border-emerald-600 text-white " : (rest ? "bg-emerald-50/60 border-emerald-200 " : "bg-emerald-50/80 "))+
                      (isToday ? "ring-2 ring-amber-400 " : "")
                    }
                  >
                    <span className={"absolute top-1 left-1 text-[14px] "+(marked ? "text-white/90" : "text-emerald-800/70")}>{d.getDate()}</span>
                    {iconKey ? <Icon iconKey={iconKey} className={"w-12 h-12 "+(marked?"animate-sparkle":"")} /> : (!rest && <Icon iconKey="leaf" className="w-9 h-9 opacity-20" />)}
                    {special && (<span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 border border-amber-300 shadow">{special.label}</span>)}
                    {rest && <span className="absolute bottom-1 right-1 text-[11px] px-1 rounded bg-white/90 border">休息</span>}
                  </button>
                  {restAllowed && !isToday && (
                    <button onClick={function(){ onToggleRest(k); }} className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0.5 rounded-full bg-white border shadow hover:bg-gray-50">休息切替</button>
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
        <div className="mb-2">所有ポイント：<b>{totalPoints}</b></div>
        {(!rewards || rewards.length === 0) ? (
          <div className="text-gray-600">ご褒美は未設定です。「ごほうびせってい」から追加してください。</div>
        ) : (
          <ul className="space-y-1">
            {rewardStatuses.map(function(rs, i){
              return (
                <li key={i} className="flex items-center justify-between">
                  <span>{rs.label}（{rs.threshold}スタンプ）</span>
                  {rs.can ? <span className="text-emerald-600 font-semibold">交換可能！</span> : <span className="text-gray-700">あと {rs.remain} スタンプ！</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ShopView(props){
  var totalPoints = props.totalPoints, availablePoints = props.availablePoints, pointsSpent = props.pointsSpent, setPointsSpent = props.setPointsSpent, redeemHistory = props.redeemHistory, redeem = props.redeem;
  var [label, setLabel] = useState(""); var [cost, setCost] = useState(10);
  return (
    <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border p-4 mb-6 grid md:grid-cols-2 gap-4">
        <div>
          <div className="font-semibold">ご褒美ポイント</div>
          <div className="text-gray-700 mt-1">総pt: <b>{totalPoints}</b> / 使用済: {pointsSpent} / 使用可能: <b>{availablePoints}</b></div>
          <div className="text-xs text-gray-500 mt-1">ポイント = スタンプ数 + ガチャボーナス</div>
        </div>
        <div className="flex items-center gap-2">
          <input value={label} onChange={function(e){ setLabel(e.target.value); }} placeholder="ご褒美名（例：映画、スパ、スイーツ）" className="px-3 py-2 rounded-xl border w-56" />
          <input type="number" min={1} value={cost} onChange={function(e){ setCost(parseInt(e.target.value || "0", 10)); }} placeholder="ポイント" className="px-3 py-2 rounded-xl border w-28" />
          <button onClick={function(){ redeem(label || "ご褒美", cost); }} className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:opacity-90">受け取る</button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border p-4">
        <div className="font-semibold mb-2">受け取り履歴</div>
        {(!redeemHistory || redeemHistory.length === 0) ? (
          <div className="text-sm text-gray-600">まだ履歴はありません。</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {redeemHistory.map(function(rec){
              return (<li key={rec.id} className="flex items-center justify-between border-b py-1"><span>{fmtJP(rec.at)} — {rec.label}</span><span className="text-gray-700">-{rec.cost} pt</span></li>);
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function RewardSettings(props){
  var habits = props.habits, addReward = props.addReward, removeReward = props.removeReward;
  var [selected, setSelected] = useState((habits[0] && habits[0].id) || null);
  var [label, setLabel] = useState(""); var [threshold, setThreshold] = useState(10);
  var h = habits.find(function(x){ return x.id === selected; });
  useEffect(function(){ if (!habits.find(function(x){ return x.id === selected; })) setSelected((habits[0] && habits[0].id) || null); }, [habits, selected]);

  return (
    <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border p-4 mb-4">
        <div className="font-semibold mb-2">ごほうびせってい</div>
        {habits.length === 0 ? (
          <div className="text-sm text-gray-600">まずカードを作成してください。</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <select className="px-2 py-1 rounded-lg border" value={selected || ""} onChange={function(e){ setSelected(e.target.value); }}>
                {habits.map(function(h){ return <option key={h.id} value={h.id}>{h.name}</option>; })}
              </select>
              <input type="number" min={1} value={threshold} onChange={function(e){ setThreshold(parseInt(e.target.value || "0", 10)); }} className="px-3 py-2 rounded-xl border w-36" placeholder="しきい値" />
              <input value={label} onChange={function(e){ setLabel(e.target.value); }} className="px-3 py-2 rounded-xl border w-72" placeholder="ご褒美名" />
              <button onClick={function(){ if (selected) addReward(selected, threshold, label || (threshold+"回達成ご褒美")); setLabel(""); }} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">追加</button>
            </div>
            {!h ? (
              <div className="text-sm text-gray-600">カードが選択されていません。</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-600"><th className="py-1">しきい値</th><th className="py-1">内容</th><th className="py-1">操作</th></tr></thead>
                  <tbody>
                    {(h.rewards || []).sort(function(a,b){ return a.threshold - b.threshold; }).map(function(r, i){
                      return (
                        <tr key={i} className="border-t">
                          <td className="py-2">{r.threshold}</td>
                          <td className="py-2">{r.label}</td>
                          <td className="py-2">
                            <button onClick={function(){ removeReward(h.id, i); }} className="px-2 py-1 rounded-lg border text-red-600 hover:bg-red-50">削除</button>
                          </td>
                        </tr>
                      );
                    })}
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

// ---------- mount ----------
(function mount(){
  var rootEl = document.getElementById('root');
  if (!rootEl) { setTimeout(mount, 16); return; }
  if (ReactDOM.createRoot) {
    ReactDOM.createRoot(rootEl).render(<App />);
  } else {
    ReactDOM.render(<App />, rootEl);
  }
})();
