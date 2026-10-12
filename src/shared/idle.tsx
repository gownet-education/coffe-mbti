import { useEffect, useRef, useState } from "react";
import "./idle.css";

/**
 * After `seconds` without touch or key input, counts down `warning` seconds and then calls `onTimeout`.
 * Any input cancels the countdown. Pass 0 seconds to switch it off. Returns the seconds left while warning.
 */
export function useIdle(seconds: number, warning: number, onTimeout: () => void, resetKey: unknown) {
  const [left, setLeft] = useState<number | null>(null);
  const callback = useRef(onTimeout);
  useEffect(() => { callback.current = onTimeout; });
  useEffect(() => {
    if (!seconds) return;
    let timer: ReturnType<typeof setTimeout>, ticker: ReturnType<typeof setInterval>;
    const arm = () => {
      clearTimeout(timer); clearInterval(ticker); setLeft(null);
      timer = setTimeout(() => {
        let remaining = warning;
        setLeft(remaining);
        ticker = setInterval(() => {
          remaining--;
          if (remaining > 0) { setLeft(remaining); return; }
          clearInterval(ticker); setLeft(null); callback.current();
        }, 1000);
      }, seconds * 1000);
    };
    arm();
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);
    return () => {
      clearTimeout(timer); clearInterval(ticker); setLeft(null);
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [seconds, warning, resetKey]);
  return left;
}

export function IdleWarning({ left }: { left: number | null }) {
  if (left === null) return null;
  return <div className="idle-warning" role="alertdialog" aria-modal="true" aria-labelledby="idle-warning-title">
    <div className="idle-warning-box">
      <p id="idle-warning-title" className="idle-warning-title">아직 계신가요?</p>
      <p className="idle-warning-count" aria-live="polite"><b>{left}</b>초 뒤 처음 화면으로 돌아갑니다.</p>
      {/* Any touch already cancels the countdown; the button makes that obvious. */}
      <button className="primary idle-warning-button" autoFocus>계속하기</button>
    </div>
  </div>;
}
