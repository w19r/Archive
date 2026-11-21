import base64
import io
import json
from pathlib import Path
from urllib.parse import unquote
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent

DATA_FILES = [
    ("abdulmajeed", ROOT / "assets" / "data" / "abdulmajeed.json"),
    ("mohammed", ROOT / "assets" / "data" / "mohammed.json"),
]

COVER_IMAGES = [
    ("mohammed_cover", ROOT / "assets" / "img" / "mohammed" / "IMG_7032_Original.jpeg"),
    ("abdulmajeed_cover", ROOT / "assets" / "img" / "abdulmajeed" / "IMG_0782.jpeg"),
]

OUT_BASE = ROOT / "assets" / "img" / "optimized"


def to_rgb_safe(img: Image.Image) -> Image.Image:
    # تصحيح دوران صور الهواتف (EXIF) قبل المعالجة
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "LA", "P"):
        # دمج الخلفية الشفافة مع لون خلفية الثيم #FAF6F0
        bg = Image.new("RGB", img.size, (250, 246, 240))
        if img.mode == "P":
            img = img.convert("RGBA")
        bg.paste(img, mask=img.split()[-1] if "A" in img.mode else None)
        return bg
    if img.mode != "RGB":
        return img.convert("RGB")
    return img


def make_webp(img: Image.Image, max_size: int, quality: int, out_path: Path) -> int:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    copy = img.copy()
    copy.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    copy.save(out_path, "WEBP", quality=quality, method=6)
    return out_path.stat().st_size


def make_blur_data_uri(img: Image.Image) -> str:
    tiny = img.copy()
    tiny.thumbnail((24, 24), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    tiny.save(buf, "WEBP", quality=35)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/webp;base64,{b64}"


def resolve_disk_path(json_img_path: str) -> Path:
    # تحويل "../assets/img/..." إلى مسار فعلي من جذر المشروع
    decoded = unquote(json_img_path).replace("\\", "/").lstrip("./")
    return ROOT / decoded


def process_archive(slug: str, json_path: Path):
    if not json_path.exists():
        print(f"⚠️ الملف غير موجود: {json_path}")
        return

    with json_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    gallery = data.get("record", {}).get("gallery", [])
    total_orig = 0
    total_thumb = 0
    processed = 0

    for item in gallery:
        raw_path = item.get("image", "")
        if not raw_path or raw_path.startswith("http"):
            continue

        disk_path = resolve_disk_path(raw_path)
        if not disk_path.exists():
            print(f"  ❌ لم يتم العثور على الصورة: {disk_path}")
            continue

        orig_size = disk_path.stat().st_size
        total_orig += orig_size

        stem = disk_path.stem
        thumb_path = OUT_BASE / slug / "thumb" / f"{stem}.webp"
        view_path = OUT_BASE / slug / "view" / f"{stem}.webp"

        with Image.open(disk_path) as raw_img:
            img = to_rgb_safe(raw_img)
            w, h = img.size
            thumb_bytes = make_webp(img, max_size=720, quality=80, out_path=thumb_path)
            make_webp(img, max_size=1600, quality=85, out_path=view_path)
            blur_uri = make_blur_data_uri(img)

        total_thumb += thumb_bytes
        item["thumb"] = f"../assets/img/optimized/{slug}/thumb/{stem}.webp"
        item["view"] = f"../assets/img/optimized/{slug}/view/{stem}.webp"
        item["blur"] = blur_uri
        item["width"] = w
        item["height"] = h
        item["sizeBytes"] = orig_size
        processed += 1

    with json_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    orig_mb = total_orig / (1024 * 1024)
    thumb_mb = total_thumb / (1024 * 1024)
    print(f"✅ [{slug}] {processed} صورة | الأصل: {orig_mb:.1f} MB -> العرض السريع: {thumb_mb:.1f} MB")


def process_covers():
    for name, disk_path in COVER_IMAGES:
        if not disk_path.exists():
            print(f"⚠️ صورة الغلاف غير موجودة: {disk_path}")
            continue
        out_path = OUT_BASE / "covers" / f"{name}.webp"
        with Image.open(disk_path) as raw_img:
            img = to_rgb_safe(raw_img)
            size_kb = make_webp(img, max_size=900, quality=82, out_path=out_path) / 1024
        print(f"✅ غلاف [{name}] جاهز بحجم {size_kb:.0f} KB")


if __name__ == "__main__":
    print("🚀 جاري ضغط الصور وتحديث ملفات JSON...")
    for slug, json_path in DATA_FILES:
        process_archive(slug, json_path)
    process_covers()
    print("🎉 انتهت المعالجة بنجاح دون المساس بالصور الأصلية.")