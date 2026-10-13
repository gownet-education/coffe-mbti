import type { ReactNode } from "react";
import "./mode";
import { ShareActions, shareUrl } from "./share";

type CoffeeType = { code: string; name: string; subtitle: string; description: string; coffee: string; drink: string; dessert: string; reason: string };

/** 유형별 공유 페이지(…/result/BFPE/). 테스트 응답 없이 유형 카드와 추천 메뉴만 보여줍니다. */
export default function ResultPage({ brand, footer, wordmark, types, cardVersion }: { brand: string; footer: string; wordmark: ReactNode; types: CoffeeType[]; cardVersion: string }) {
  // 주소의 result 다음 칸이 유형 코드입니다.
  const parts = window.location.pathname.split("/").filter(Boolean);
  const code = parts[parts.indexOf("result") + 1]?.toUpperCase() ?? "";
  const type = types.find(item => item.code === code);
  // QR로 자기 결과를 가져온 사람은 qr, 공유받은 사람은 share로 유입을 남깁니다.
  const testLink = "../../?ch=" + (new URLSearchParams(window.location.search).get("ch") === "qr" ? "qr" : "share");
  if (!type) return <div className="site-shell"><main className="result-main"><p>결과를 찾지 못했어요.</p><div className="result-actions"><a className="primary" href={testLink}>테스트하러 가기</a></div></main></div>;
  const cardSrc = "../../type-cards/" + code + ".png?v=" + cardVersion;
  return <div className="site-shell">
    <header className="site-header"><a href={testLink} className="wordmark" aria-label={brand + " 커피 취향 테스트"}>{wordmark}</a><span className="header-label">COFFEE DNA</span></header>
    <main className="result-main">
      <div className="result-intro"><span className="test-label">커피 DNA</span><p>{brand}에서 발견한 취향</p></div>
      <div className="result-layout">
        <figure className="type-card-figure"><h1 className="sr-only">{type.name} · {type.subtitle}</h1><img src={cardSrc} alt={code + " 커피 유형 카드"} width={4532} height={5481} decoding="async" /></figure>
        <section className="result-copy">
          <h2>{type.subtitle}</h2><p>{type.description}</p>
          <div className="result-actions share-test"><a className="primary" href={testLink}>나도 테스트하기</a><p>10문항 · 약 2분</p></div>
        </section>
      </div>
      <section className="menu-section">
        <div className="menu-heading"><div><h2>이 취향에 어울리는 메뉴</h2></div></div>
        <div className="menu-grid">{[["커피", type.coffee], ["음료", type.drink], ["디저트", type.dessert]].map(([label, value]) => <article key={label} className="menu-item"><div><span className="eyebrow">{label}</span><h3>{value}</h3></div></article>)}</div>
        <p className="menu-reason">{type.reason}</p>
      </section>
      <ShareActions url={shareUrl("../../", code)} title={brand + " COFFEE DNA"} text={"나의 커피 DNA는 " + code + "! 너는 어떤 유형이야?"} cardSrc={cardSrc} code={code} />
    </main>
    <footer className="site-footer"><span>{footer}</span></footer>
  </div>;
}
