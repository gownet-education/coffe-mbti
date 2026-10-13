// 한 사이트, 두 모드.
// 온라인(기본): 인스타·공유 링크로 들어온 개인 휴대폰. 무조작 초기화 없음, 결과 공유 버튼.
// 매장: 태블릿에서 ?kiosk=1 로 한 번 열면 그 기기에 기억됩니다. ?kiosk=0 으로 해제.
const KIOSK_KEY = "coffee-dna-kiosk";
const SOURCE_KEY = "coffee-dna-source";
const SOURCES = ["insta", "share", "qr"];

function store(storage: () => Storage, action: (s: Storage) => string | null | void) {
  try { return action(storage()) ?? null; } catch { return null; }
}

// Read the link parameters once per page load, then drop ?kiosk so the address is not passed on.
const params = new URLSearchParams(window.location.search);
const kioskParam = params.get("kiosk");
if (kioskParam === "1") store(() => localStorage, s => s.setItem(KIOSK_KEY, "1"));
if (kioskParam === "0") store(() => localStorage, s => s.removeItem(KIOSK_KEY));
const sourceParam = params.get("ch");
if (sourceParam && SOURCES.includes(sourceParam)) store(() => sessionStorage, s => s.setItem(SOURCE_KEY, sourceParam));
if (kioskParam !== null) {
  params.delete("kiosk");
  const query = params.toString();
  window.history.replaceState(null, "", window.location.pathname + (query ? "?" + query : ""));
}

export function isKiosk() { return store(() => localStorage, s => s.getItem(KIOSK_KEY)) === "1"; }

/** 시트의 '채널' 값 */
export function channel() { return isKiosk() ? "매장" : "온라인"; }

/** 시트의 '유입' 값: 온라인 테스트가 어느 링크로 들어왔는지. 매장은 비웁니다. */
export function source() {
  if (isKiosk()) return "";
  return store(() => sessionStorage, s => s.getItem(SOURCE_KEY)) ?? "direct";
}
