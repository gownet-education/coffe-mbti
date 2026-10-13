"""링크 미리보기용 이미지(1200x630)를 유형 카드에서 만듭니다. 카드가 바뀌면 다시 실행하세요.

    python scripts/make-og-images.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SIZE = (1200, 630)
BACKGROUNDS = {"mauritia": "#f3ebe3", "sidetempo": "#efefea"}

for brand, background in BACKGROUNDS.items():
    out = ROOT / "public" / brand / "og"
    out.mkdir(parents=True, exist_ok=True)
    for card_path in sorted((ROOT / "public" / brand / "type-cards").glob("*.png")):
        card = Image.open(card_path).convert("RGBA")
        # 미리보기는 가로로 길어서 카드 윗부분(캐릭터·이름·코드)만 씁니다.
        # 설명 문단 앞에서 자르고 아래쪽에 붙여, 카드가 화면 아래로 이어지는 것처럼 보이게 합니다.
        width = 620
        card = card.resize((width, round(card.height * width / card.width)), Image.LANCZOS)
        card = card.crop((0, 0, width, round(card.height * 0.745)))
        canvas = Image.new("RGBA", SIZE, background)
        canvas.alpha_composite(card, ((SIZE[0] - width) // 2, SIZE[1] - card.height))
        canvas.convert("RGB").save(out / (card_path.stem + ".jpg"), quality=86, optimize=True)
        print(brand, card_path.stem)
