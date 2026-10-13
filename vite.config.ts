import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// 공개 주소. 링크 미리보기(og:image)는 절대 주소가 필요합니다. 저장소 이름이나 도메인을 바꾸면 여기도 바꿉니다.
const SITE_URL = "https://gownet-education.github.io/coffee-mbti";
const BRANDS = [{ id: "mauritia", label: "모리티아" }, { id: "sidetempo", label: "사이드템포" }];

type CoffeeType = { code: string; name: string; subtitle: string };
const read = (brand: string): CoffeeType[] => JSON.parse(readFileSync(`src/${brand}/quiz-data.json`, "utf8")).types;
// 카드에 적힌 한글 유형 이름(강렬한 탐험가 등)은 두 브랜드가 같고, 모리티아 자료에 들어 있습니다.
const koreanNames = Object.fromEntries(read("mauritia").map(type => [type.code, type.subtitle]));

// 유형별 공유 페이지(<brand>/result/<CODE>/index.html)를 만듭니다. 미리보기 정보가 HTML에 들어 있어야 해서 유형마다 한 장씩 필요합니다.
const input: Record<string, string> = { home: "index.html" };
for (const brand of BRANDS) {
  input[brand.id] = `${brand.id}/index.html`;
  for (const type of read(brand.id)) {
    const dir = `${brand.id}/result/${type.code}`, url = `${SITE_URL}/${dir}/`;
    const title = `${koreanNames[type.code]} · ${type.code} | ${brand.label} COFFEE DNA`;
    const description = `${brand.label} 커피 취향 테스트 결과예요. 10개의 질문으로 나의 커피 DNA도 찾아보세요.`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/index.html`, `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="${description}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${brand.label} COFFEE DNA" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${SITE_URL}/${brand.id}/og/${type.code}.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" href="../../favicon.svg" />
</head>
<body>
<div id="root"></div>
<script type="module" src="../../../src/${brand.id}/result-main.tsx"></script>
</body>
</html>
`);
    input[`${brand.id}-${type.code}`] = `${dir}/index.html`;
  }
}

// Relative base: assets resolve under any GitHub Pages repository path.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: { rollupOptions: { input } },
});
