import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import qrcode from "qrcode-generator";
import "./share.css";

/** 유형별 공유 페이지 주소. brandRoot는 현재 페이지에서 브랜드 폴더까지의 상대 경로입니다. */
export function shareUrl(brandRoot: string, code: string, source?: string) {
  const url = new URL("result/" + code + "/", new URL(brandRoot, window.location.href));
  if (source) url.searchParams.set("ch", source);
  return url.href;
}

/** 온라인: 휴대폰의 공유 창으로 링크 보내기 + 카드 이미지 저장 */
export function ShareActions({ url, title, text, cardSrc, code }: { url: string; title: string; text: string; cardSrc: string; code: string }) {
  const [message, setMessage] = useState("");
  async function share() {
    setMessage("");
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); return; }
      await navigator.clipboard.writeText(url);
      setMessage("링크를 복사했어요. 원하는 곳에 붙여 넣어 주세요.");
    } catch (error) {
      // Closing the share sheet is not an error worth reporting.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("공유하지 못했어요. 주소창의 링크를 복사해 주세요.");
    }
  }
  return <section className="share-box" aria-label="결과 공유">
    <h2>친구에게 내 커피 DNA 보여주기</h2>
    <div className="share-buttons">
      <button className="primary share-button" onClick={share}><Share2 size={18} aria-hidden="true" />결과 공유하기</button>
      <a className="share-button share-save" href={cardSrc} download={"coffee-dna-" + code + ".png"}><Download size={18} aria-hidden="true" />카드 이미지 저장</a>
    </div>
    {message ? <p className="share-message" role="status">{message}</p> : null}
  </section>;
}

/** 매장 태블릿: QR을 찍어 내 휴대폰에서 결과 열기 */
export function ResultQr({ url }: { url: string }) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  return <section className="share-box share-qr" aria-label="내 휴대폰으로 결과 가져가기">
    <img src={qr.createDataURL(6, 12)} alt="결과 페이지로 가는 QR 코드" width={168} height={168} />
    <div>
      <h2>내 결과 가져가기</h2>
      <p>휴대폰 카메라로 QR을 찍으면 내 유형 카드를 저장하고 친구에게 공유할 수 있어요.</p>
    </div>
  </section>;
}
