// LCIC 공통: 우측 세로 중앙 Back-to-top 버튼
// <script src="assets/back-to-top.js"></script> 한 줄만 포함하면 자동 주입됨.
(function () {
  if (document.getElementById("lcic-back-to-top")) return; // 중복 방지

  // 스타일 주입
  const style = document.createElement("style");
  style.textContent = `
    .lcic-back-to-top {
      position: fixed;
      right: 24px;
      top: 50%;
      transform: translateY(-50%) translateX(8px);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--accent, #3b82f6);
      color: #fff;
      border: none;
      cursor: pointer;
      box-shadow: var(--shadow-accent, 0 8px 24px rgba(59, 130, 246, 0.35));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                  box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                  visibility 0.3s;
      z-index: 50;
    }
    .lcic-back-to-top.visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(-50%) translateX(0);
    }
    .lcic-back-to-top:hover {
      transform: translateY(calc(-50% - 2px)) translateX(0);
      box-shadow: 0 12px 32px rgba(59, 130, 246, 0.45);
    }
    .lcic-back-to-top svg {
      width: 22px;
      height: 22px;
      stroke: currentColor;
      stroke-width: 2.4;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
    }
    @media (max-width: 640px) {
      .lcic-back-to-top {
        right: 14px;
        width: 44px;
        height: 44px;
      }
    }
  `;
  document.head.appendChild(style);

  // 버튼 주입
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "lcic-back-to-top";
  btn.className = "lcic-back-to-top";
  btn.setAttribute("aria-label", "맨 위로 이동");
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 14l6-6 6 6"/>
    </svg>
  `;
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // 보이기/숨기기
  const THRESHOLD = 400;
  function update() {
    if (window.scrollY > THRESHOLD) {
      btn.classList.add("visible");
    } else {
      btn.classList.remove("visible");
    }
  }
  window.addEventListener("scroll", update, { passive: true });

  // DOM 준비되면 추가
  if (document.body) {
    document.body.appendChild(btn);
    update();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.appendChild(btn);
      update();
    });
  }
})();
