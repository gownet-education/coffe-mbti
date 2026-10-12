
import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

export default function FullscreenControl() {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef(false);

  useEffect(() => {
    const sync = () => setActive(Boolean(document.fullscreenElement));
    sync();
    setReady(true);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  async function toggle() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.fullscreenEnabled && document.documentElement.requestFullscreen) {
        // Keep this call in the user gesture, targeting the persistent document.
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      } else {
        setMessage("이 브라우저에서는 전체화면을 지원하지 않아요. 태블릿의 Chrome에서 사이트를 열어주세요.");
      }
    } catch {
      setMessage("전체화면으로 전환하지 못했어요. Chrome에서 다시 눌러주세요.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <div className="fullscreen-control">
    <button className="text-button fullscreen-button" onClick={toggle} disabled={!ready || busy} aria-pressed={active}>
      {active ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
      {active ? "전체화면 종료" : "전체화면"}
    </button>
    {message ? <p className="fullscreen-message" role="status">{message}</p> : null}
  </div>;
}
