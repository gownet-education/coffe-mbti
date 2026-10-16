import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import "./scroll-hint.css";

/**
 * 결과 화면 아래에 내용이 더 있을 때만 하단에 "추천 메뉴 보기" 버튼을 띄웁니다.
 * 한 번이라도 스크롤하면 사라지고, 누르면 target으로 이동합니다.
 */
export default function ScrollHint({ target, label = "추천 메뉴 보기" }: { target: string; label?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let done = false;
    const hide = () => { done = true; setVisible(false); window.removeEventListener("scroll", onScroll); };
    const onScroll = () => { if (window.scrollY > 40) hide(); };
    // Wait for the card image to take its height before deciding whether anything is below the fold.
    const check = setTimeout(() => {
      if (done) return;
      const below = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight) > 80;
      if (below && window.scrollY <= 40) setVisible(true);
    }, 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(check); window.removeEventListener("scroll", onScroll); };
  }, [target]);
  if (!visible) return null;
  // Rendered into <body>: the animated result container would otherwise pin "fixed" to itself instead of the screen.
  return createPortal(<button className="scroll-hint" onClick={() => {
    setVisible(false);
    document.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }}>{label}<ChevronDown className="scroll-hint-arrow" size={16} aria-hidden="true" /></button>, document.body);
}
