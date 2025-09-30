/* bundle.js (ES5, production-lite) */

/* 安全な待機: React/ReactDOMのUMDが先に来る想定だが、念のため待つ */
(function startWhenReady() {
  if (typeof window.React === "undefined" || typeof window.ReactDOM === "undefined") {
    setTimeout(startWhenReady, 10);
    return;
  }
  startApp();
})();

function startApp() {
  var e = React.createElement;

  // --- アプリ本体（ここにスタンプカードUIを拡張していけばOK） ---
  function App() {
    return e(
      "main",
      { style: {
          width:"min(960px, 94vw)",
          background:"#ffffff",
          borderRadius:"16px",
          padding:"24px",
          boxShadow:"0 10px 30px rgba(0,0,0,.06)"
        }},
      e("h1", { style:{ margin:"0 0 12px 0", fontSize:"20px" } }, "スタンプカード React版"),
      e("p",  { style:{ margin:"4px 0 20px 0", opacity:.7 } }, "実装成功！（GitHub Pages / 本番モード）"),

      // 例: スタンプ(10)を貯めるUIのダミー
      e(StampCard, { total: 10 })
    );
  }

  function StampCard(props) {
    var total = (props && props.total) || 10;
    var _React = React, useState = _React.useState;
    var _useState = useState(0), count = _useState[0], setCount = _useState[1];

    var cells = [];
    for (var i=0; i<total; i++) {
      var filled = i < count;
      cells.push(e("div", {
        key: "cell-"+i,
        style: {
          width:"48px", height:"48px",
          borderRadius:"50%",
          border: "2px solid " + (filled ? "#10b981" : "#d1d5db"),
          background: filled ? "#10b981" : "transparent",
          transition:"all .15s ease"
        }
      }));
    }

    return e("section", null,
      e("div", { style:{ display:"grid", gridTemplateColumns:"repeat(5, 52px)", gap:"10px" } }, cells),
      e("div", { style:{ marginTop:"16px", display:"flex", gap:"8px" } },
        e("button", {
          onClick:function(){ if (count < total) setCount(count + 1); },
          style:btnStyle()
        }, "スタンプを押す"),
        e("button", {
          onClick:function(){ if (count > 0) setCount(count - 1); },
          style:btnStyle("#111827","#e5e7eb")
        }, "戻す"),
        e("button", {
          onClick:function(){ setCount(0); },
          style:btnStyle("#b91c1c","#fee2e2")
        }, "リセット")
      )
    );
  }

  function btnStyle(color, bg) {
    var c = color || "#ffffff";
    var b = bg || "#10b981";
    return {
      fontSize:"14px", padding:"10px 14px", borderRadius:"12px",
      border:"1px solid rgba(0,0,0,.06)", cursor:"pointer",
      background:b, color:c
    };
  }

  var rootEl = document.getElementById("root");
  // React 18+: createRoot があれば使う（なければ render）
  if (ReactDOM && typeof ReactDOM.createRoot === "function") {
    ReactDOM.createRoot(rootEl).render(React.createElement(App));
  } else {
    ReactDOM.render(React.createElement(App), rootEl);
  }
}
