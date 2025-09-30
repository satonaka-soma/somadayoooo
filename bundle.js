const { useState, useEffect, useMemo } = React;

/* -----------------------------
   スタンプカード React版 v10.2
   - モバイルUI最適化済
----------------------------- */

function App() {
  const [view, setView] = useState("cards");
  const [theme, setTheme] = useState("island");
  const [reduceMotion, setReduceMotion] = useState(false);

  return (
    <div className="min-h-screen relative text-gray-900">
      {/* 背景 */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-100" />

      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b pt-[var(--safe-top)]">
        <div className="max-w-5xl mx-auto px-3 py-2">
          {/* 上段：タイトル */}
          <div className="flex items-center gap-2">
            <span className="text-xl">🍃</span>
            <h1 className="text-lg font-bold">スタンプカード</h1>
          </div>

          {/* 下段：タブ＋設定 */}
          <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar flex-nowrap">
            <button
              onClick={() => setView("cards")}
              className={`h-9 px-3 rounded-xl border whitespace-nowrap text-sm ${
                view === "cards" ? "bg-emerald-600 text-white" : "bg-white/80"
              }`}
            >
              カード
            </button>
            <button
              onClick={() => setView("shop")}
              className={`h-9 px-3 rounded-xl border whitespace-nowrap text-sm ${
                view === "shop" ? "bg-emerald-600 text-white" : "bg-white/80"
              }`}
            >
              ご褒美
            </button>
            <button
              onClick={() => setView("reward_settings")}
              className={`h-9 px-3 rounded-xl border whitespace-nowrap text-sm ${
                view === "reward_settings"
                  ? "bg-emerald-600 text-white"
                  : "bg-white/80"
              }`}
            >
              ごほうびせってい
            </button>

            {/* 設定類 */}
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="h-9 px-2 rounded-lg border bg-white/80 text-sm ml-auto"
            >
              <option value="island">アイランド</option>
              <option value="notebook">ノート</option>
              <option value="wood">木目</option>
              <option value="night">夜空</option>
            </select>
            <label className="flex items-center gap-1 text-xs whitespace-nowrap">
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
              />
              アニメ少なめ
            </label>
          </div>
        </div>
      </header>

      {/* ビュー */}
      {view === "cards" ? <CardsView /> : <DummyView name={view} />}
    </div>
  );
}

/* ダミー実装（ここに既存のCard/Gacha等を移植する） */
function CardsView() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="bg-white/80 rounded-2xl p-4 shadow mb-6">
        <div className="font-semibold mb-2">今日のガチャ</div>
        <button className="relative w-36 h-36 md:w-44 md:h-44 rounded-full shadow-xl overflow-hidden bg-emerald-200 flex items-center justify-center text-lg">
          回す！
        </button>
      </div>

      <div className="bg-white/80 rounded-2xl p-4 shadow">
        <div className="font-semibold mb-2">新しいスタンプカード</div>
        <input
          placeholder="名前"
          className="px-3 py-2 rounded-xl border w-full mb-2"
        />
        <input
          placeholder="ルール"
          className="px-3 py-2 rounded-xl border w-full mb-2"
        />
        <button className="px-4 py-2 rounded-xl bg-emerald-600 text-white">
          追加
        </button>
      </div>
    </main>
  );
}

function DummyView({ name }) {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="bg-white/80 rounded-2xl p-4 shadow text-gray-600">
        {name} ビューはまだ実装されていません。
      </div>
    </main>
  );
}

/* ReactDOM */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
