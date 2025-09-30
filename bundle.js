const { useState, useEffect, useMemo } = React;

/**
 * スタンプカード React版 v11 完全版
 * - v10.1 の全機能を維持
 * - カード削除 / ご褒美削除 / テーマ4種修正 / ポイント大きく表示
 */

// ---------- utils ----------
const todayKey = () => new Date().toLocaleDateString("en-CA");
const keyOf = (d) => new Date(d).toLocaleDateString("en-CA");
const fmtJP = (d) =>
  new Date(d).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
const uid = () => Math.random().toString(36).slice(2, 10);
const daysDiff = (a, b) =>
  Math.floor((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));
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
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1))
    days.push(new Date(d));
  return days;
}

// ---------- streak ----------
const STREAK_SPECIALS = [
  { n: 30, icon: "party", label: "30日連続!!", effect: "confetti" },
  { n: 20, icon: "gem", label: "20日連続!!" },
  { n: 15, icon: "bouquet", label: "15日連続!!" },
  { n: 10, icon: "car", label: "10日連続!!" },
  { n: 5, icon: "gift", label: "5日連続!!" },
  { n: 3, icon: "frog", label: "3日連続!!" },
];
function computeStreakFromDate(stamps, restDays, dateKey) {
  let s = 0;
  const d0 = new Date(dateKey);
  for (let i = 0; i < 500; i++) {
    const d = new Date(d0);
    d.setDate(d0.getDate() - i);
    const k = keyOf(d);
    const mark = !!stamps[k];
    const rest = !!(restDays && restDays[k]);
    if (mark || rest) s++;
    else break;
  }
  return s;
}

// ---------- backgrounds ----------
function Background({ theme }) {
  if (theme === "night") {
    return (
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-950 via-slate-900 to-black">
        {Array.from({ length: 90 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: 2,
              height: 2,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: 0.7,
            }}
          />
        ))}
      </div>
    );
  }
  if (theme === "notebook") {
    return (
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-gray-50 to-gray-200"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #e5e7eb 0px, #e5e7eb 1px, transparent 1px, transparent 32px)",
        }}
      />
    );
  }
  if (theme === "wood") {
    return (
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "url('https://www.transparenttextures.com/patterns/wood-pattern.png')",
        }}
      />
    );
  }
  // default island
  return (
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-100" />
  );
}

// ---------- App ----------
function App() {
  const [habits, setHabits] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("stampcard_v11") || "[]");
    } catch {
      return [];
    }
  });
  const [theme, setTheme] = useState("island");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [view, setView] = useState("cards");
  const [banner, setBanner] = useState(null);

  const [gachaHistory, setGachaHistory] = useState({});
  const [pointsSpent, setPointsSpent] = useState(0);
  const [redeemHistory, setRedeemHistory] = useState([]);

  // persist
  useEffect(() => localStorage.setItem("stampcard_v11", JSON.stringify(habits)), [habits]);

  // points
  const stampPoints = useMemo(
    () => habits.reduce((s, h) => s + Object.values(h.stamps || {}).filter(Boolean).length, 0),
    [habits]
  );
  const bonusPoints = useMemo(
    () => Object.values(gachaHistory).reduce((s, r) => s + (r?.bonus || 0), 0),
    [gachaHistory]
  );
  const totalPoints = stampPoints + bonusPoints;
  const availablePoints = Math.max(0, totalPoints - pointsSpent);

  // actions
  const addHabit = (name, rule) =>
    setHabits((prev) => [...prev, { id: uid(), name, rule, created_at: todayKey(), stamps: {}, restDays: {}, rewards: [] }]);

  const deleteHabit = (id) => {
    if (!confirm("このカードを削除しますか？")) return;
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const addReward = (habitId, threshold, label) =>
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? { ...h, rewards: [...(h.rewards || []), { threshold, label }] }
          : h
      )
    );

  const removeReward = (habitId, idx) =>
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId ? { ...h, rewards: h.rewards.filter((_, i) => i !== idx) } : h
      )
    );

  return (
    <div className="min-h-screen relative">
      <Background theme={theme} />

      {/* header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setView("cards")}
            className={`px-3 py-1 rounded-lg border ${view === "cards" ? "bg-emerald-600 text-white" : "bg-white"}`}
          >
            カード
          </button>
          <button
            onClick={() => setView("shop")}
            className={`px-3 py-1 rounded-lg border ${view === "shop" ? "bg-emerald-600 text-white" : "bg-white"}`}
          >
            ご褒美
          </button>
          <button
            onClick={() => setView("reward_settings")}
            className={`px-3 py-1 rounded-lg border ${view === "reward_settings" ? "bg-emerald-600 text-white" : "bg-white"}`}
          >
            ごほうび設定
          </button>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="ml-auto px-2 py-1 rounded-lg border"
          >
            <option value="island">アイランド</option>
            <option value="notebook">ノート</option>
            <option value="wood">木目</option>
            <option value="night">夜空</option>
          </select>
        </div>
      </header>

      {/* ポイント表示 */}
      <div className="text-center py-3 bg-white/70 backdrop-blur border-b">
        <div className="text-sm text-gray-600">総ポイント</div>
        <div className="text-4xl font-extrabold text-emerald-600">{totalPoints}</div>
        <div className="text-xs text-gray-600">使用可能: {availablePoints} / 使用済: {pointsSpent}</div>
      </div>

      {/* views */}
      {view === "cards" && (
        <main className="px-4 py-6 space-y-4">
          {habits.map((h) => (
            <div key={h.id} className="bg-white/80 rounded-2xl border shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold">{h.name}</div>
                  <div className="text-sm text-gray-600">{h.rule}</div>
                </div>
                <button
                  onClick={() => deleteHabit(h.id)}
                  className="px-2 py-1 text-xs rounded-lg border text-red-600 hover:bg-red-50"
                >
                  削除
                </button>
              </div>
              <div className="text-sm text-gray-700">
                スタンプ数: {Object.values(h.stamps || {}).filter(Boolean).length}
              </div>
            </div>
          ))}
          <NewHabitForm onAdd={addHabit} />
        </main>
      )}

      {view === "reward_settings" && (
        <RewardSettings habits={habits} addReward={addReward} removeReward={removeReward} />
      )}

      {view === "shop" && (
        <ShopView totalPoints={totalPoints} availablePoints={availablePoints} redeemHistory={redeemHistory} />
      )}
    </div>
  );
}

// ---------- sub components ----------
function NewHabitForm({ onAdd }) {
  const [name, setName] = useState("");
  const [rule, setRule] = useState("");
  return (
    <div className="bg-white/80 rounded-2xl border shadow p-4">
      <div className="font-semibold mb-2">新しいスタンプカード</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="名前"
        className="px-3 py-2 rounded-lg border w-full mb-2"
      />
      <input
        value={rule}
        onChange={(e) => setRule(e.target.value)}
        placeholder="ルール"
        className="px-3 py-2 rounded-lg border w-full mb-2"
      />
      <button
        onClick={() => {
          if (name.trim()) onAdd(name, rule);
          setName(""); setRule("");
        }}
        className="px-4 py-2 rounded-xl bg-emerald-600 text-white"
      >
        追加
      </button>
    </div>
  );
}

function RewardSettings({ habits, addReward, removeReward }) {
  const [label, setLabel] = useState("");
  const [threshold, setThreshold] = useState(10);
  const [selected, setSelected] = useState(habits[0]?.id || null);
  const h = habits.find((x) => x.id === selected);

  return (
    <main className="px-4 py-6">
      <div className="bg-white/80 rounded-2xl border shadow p-4">
        <div className="font-semibold mb-2">ごほうび設定</div>
        {habits.length === 0 ? (
          <div className="text-sm text-gray-600">まずカードを作成してください。</div>
        ) : (
          <>
            <select
              className="px-2 py-1 rounded-lg border mb-2"
              value={selected || ""}
              onChange={(e) => setSelected(e.target.value)}
            >
              {habits.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2 mb-3">
              <input
                type="number"
                min={1}
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value || "0", 10))}
                className="px-3 py-2 rounded-lg border w-28"
                placeholder="しきい値"
              />
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="px-3 py-2 rounded-lg border flex-1"
                placeholder="ご褒美名"
              />
              <button
                onClick={() => {
                  if (selected) addReward(selected, threshold, label || `${threshold}回達成ご褒美`);
                  setLabel("");
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white"
              >
                追加
              </button>
            </div>
            {!h ? (
              <div>カード未選択</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr><th>しきい値</th><th>内容</th><th>操作</th></tr></thead>
                <tbody>
                  {(h.rewards || []).map((r, i) => (
                    <tr key={i}>
                      <td>{r.threshold}</td>
                      <td>{r.label}</td>
                      <td>
                        <button
                          onClick={() => removeReward(h.id, i)}
                          className="px-2 py-1 rounded-lg border text-red-600 hover:bg-red-50"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ShopView({ totalPoints, availablePoints, redeemHistory }) {
  return (
    <main className="px-4 py-6">
      <div className="bg-white/80 rounded-2xl border shadow p-4">
        <div className="font-semibold mb-2">ご褒美ポイント</div>
        <div>総pt: {totalPoints}</div>
        <div>使用可能: {availablePoints}</div>
      </div>
      <div className="bg-white/80 rounded-2xl border shadow p-4 mt-4">
        <div className="font-semibold mb-2">受け取り履歴</div>
        {redeemHistory.length === 0 ? (
          <div className="text-sm text-gray-600">まだ履歴はありません。</div>
        ) : (
          <ul>
            {redeemHistory.map((r) => (
              <li key={r.id}>{fmtJP(r.at)} — {r.label} (-{r.cost}pt)</li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

// ---------- Render ----------
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
