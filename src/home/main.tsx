import { createRoot } from "react-dom/client";
import "./home.css";
import FullscreenControl from "../shared/fullscreen-control";
import { recoverPending } from "../shared/survey";
import { isKiosk } from "../shared/mode";
import mauritiaLogo from "../mauritia/assets/mauritia-logo.png";
import sidetempoLogo from "../sidetempo/assets/sidetempo-logo.png";

recoverPending();

function Home() {
  return <div className="home-shell">
    <main className="home-main">
      <p className="home-label">COFFEE DNA</p>
      <h1>내 취향의 커피,<br />어떤 맛일까?</h1>
      <p className="home-description">테스트할 매장을 선택해 주세요.</p>
      <nav className="home-brands" aria-label="매장 선택">
        <a className="home-brand mauritia" href="./mauritia/"><img src={mauritiaLogo} alt="" /><span>모리티아</span></a>
        <a className="home-brand sidetempo" href="./sidetempo/"><img src={sidetempoLogo} alt="" /><span>사이드템포</span></a>
      </nav>
      <p className="home-note">10문항 · 약 2분</p>
    </main>
    {isKiosk() ? <footer className="home-footer"><span className="home-mode">매장 태블릿 모드</span><FullscreenControl /></footer> : null}
  </div>;
}

createRoot(document.getElementById("root")!).render(<Home />);
