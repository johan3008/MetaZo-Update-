import sys
import json
import base64
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageStat
import numpy as np
import cv2


def safe_percentile(arr, q, default=0.0):
    arr = np.asarray(arr)
    arr = arr[np.isfinite(arr)]
    if arr.size == 0:
        return float(default)
    return float(np.percentile(arr, q))


def estimate_noise_cv2(gray, mask=None):
    """Estimate high-frequency noise while ignoring transparent pixels."""
    gray = gray.astype(np.float32)
    if gray.shape[0] < 5 or gray.shape[1] < 5:
        return 0.0
    kernel = np.array([[1, -2, 1], [-2, 4, -2], [1, -2, 1]], dtype=np.float32)
    response = cv2.filter2D(gray, cv2.CV_32F, kernel)
    if mask is None:
        valid = np.ones(gray.shape, dtype=bool)
    else:
        valid = mask.astype(bool)
        valid[:2, :] = False
        valid[-2:, :] = False
        valid[:, :2] = False
        valid[:, -2:] = False
    vals = np.abs(response[valid])
    if vals.size == 0:
        return 0.0
    h, w = gray.shape
    sigma = float(np.sum(vals) * np.sqrt(0.5 * np.pi) / max(1.0, 6 * (w - 2) * (h - 2)))
    return sigma


def alpha_aware_arrays(img):
    rgba = np.array(img.convert("RGBA"), dtype=np.uint8)
    rgb = rgba[:, :, :3]
    alpha = rgba[:, :, 3]
    visible = alpha > 8
    # Composite onto neutral gray only for operations that require a dense image.
    # This prevents transparent pixels from being interpreted as black.
    bg = np.full_like(rgb, 128, dtype=np.uint8)
    a = (alpha.astype(np.float32) / 255.0)[:, :, None]
    composited = np.clip(rgb.astype(np.float32) * a + bg.astype(np.float32) * (1 - a), 0, 255).astype(np.uint8)
    gray = cv2.cvtColor(composited, cv2.COLOR_RGB2GRAY)
    return rgba, rgb, alpha, visible, gray


def edge_metrics(rgb, alpha, visible):
    partial = (alpha > 8) & (alpha < 247)
    partial_pct = float(partial.mean() * 100.0)
    transparent_pct = float((alpha <= 8).mean() * 100.0)

    # Estimate whether RGB values near transparent edges are wildly different from
    # nearby visible pixels (possible matte contamination / halo). This is a warning
    # signal only; transparency itself is not an error.
    edge_band = cv2.dilate((alpha > 8).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=1).astype(bool)
    near = edge_band & (alpha <= 247)
    halo_risk = 0.0
    if np.any(near):
        # High saturation/difference in semi-transparent pixels can indicate a matte.
        pix = rgb[near].astype(np.float32)
        spread = np.std(pix, axis=1)
        halo_risk = float(np.mean(spread > 55) * 100.0)

    return {
        "has_alpha": bool(np.any(alpha < 255)),
        "transparent_percent": round(transparent_pct, 3),
        "partial_alpha_percent": round(partial_pct, 3),
        "edge_halo_risk_percent": round(halo_risk, 3),
        "edge_status": "Review edge/matte" if halo_risk > 18 else "Alpha edge acceptable"
    }


def banding_score(gray, visible):
    # Detect suspiciously repetitive long flat gradients using local gradient quantization.
    gx = np.abs(cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3))
    gy = np.abs(cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3))
    grad = np.sqrt(gx * gx + gy * gy)
    vals = grad[visible]
    if vals.size < 100:
        return 0.0
    low_grad = float(np.mean(vals < 1.0))
    unique_ratio = float(len(np.unique(gray[visible])) / max(1, vals.size))
    score = max(0.0, min(100.0, (low_grad * 100.0) * (1.0 - min(1.0, unique_ratio * 50.0))))
    return score


def jpeg_blocking_score(gray, visible):
    # Conservative 8x8 boundary discontinuity estimate. Only meaningful for JPEG.
    h, w = gray.shape
    if h < 24 or w < 24:
        return 0.0
    boundary = []
    for x in range(8, w, 8):
        left = gray[:, x-1].astype(np.float32)
        right = gray[:, x].astype(np.float32)
        m = visible[:, x-1] & visible[:, x]
        if np.any(m):
            boundary.extend(np.abs(left[m] - right[m]).tolist())
    for y in range(8, h, 8):
        top = gray[y-1, :].astype(np.float32)
        bottom = gray[y, :].astype(np.float32)
        m = visible[y-1, :] & visible[y, :]
        if np.any(m):
            boundary.extend(np.abs(top[m] - bottom[m]).tolist())
    if not boundary:
        return 0.0
    # Compare block boundaries to nearby non-boundary edges. This is a weak indicator.
    med = float(np.median(boundary))
    return round(min(100.0, max(0.0, (med - 3.0) * 8.0)), 2)


def main():
    try:
        import os
        img = None
        file_size_kb = 0
        file_path = None

        if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
            file_path = sys.argv[1]
            file_size_kb = int(os.path.getsize(file_path) / 1024)
            img = Image.open(file_path)
        else:
            input_data = sys.stdin.read().strip()
            if not input_data:
                print(json.dumps({"error": "No input received via stdin or arguments"}))
                return
            if ',' in input_data:
                input_data = input_data.split(',', 1)[1]
            image_bytes = base64.b64decode(input_data)
            file_size_kb = int(len(image_bytes) / 1024)
            img = Image.open(BytesIO(image_bytes))

        width, height = img.size
        mp = (width * height) / 1_000_000.0
        rgba, rgb, alpha, visible, gray = alpha_aware_arrays(img)
        visible_gray = gray[visible]
        if visible_gray.size == 0:
            visible = np.ones((height, width), dtype=bool)
            visible_gray = gray.reshape(-1)

        resolution = f"{width} x {height} ({mp:.2f} MP)"
        color_space = f"{img.mode} (Pillow decoded)"
        has_alpha = bool(np.any(alpha < 255))

        # 1. Brightness: use visible pixels only and robust percentiles.
        p01 = safe_percentile(visible_gray, 1, 0)
        p50 = safe_percentile(visible_gray, 50, 128)
        p99 = safe_percentile(visible_gray, 99, 255)
        brightness_val = int(round((p50 / 255.0) * 100))
        clipped_high_pct = float(np.mean(visible_gray >= 250) * 100.0)
        clipped_low_pct = float(np.mean(visible_gray <= 5) * 100.0)
        if clipped_high_pct > 5:
            brightness_status = "Highlights clipping risk"
        elif clipped_low_pct > 8:
            brightness_status = "Shadow clipping risk"
        elif brightness_val > 85:
            brightness_status = "Bright; inspect highlights"
        elif brightness_val < 20:
            brightness_status = "Dark; inspect shadows"
        else:
            brightness_status = "Optimal"

        # 2. Contrast using robust percentiles rather than transparent-black contamination.
        p10 = safe_percentile(visible_gray, 10, 32)
        p90 = safe_percentile(visible_gray, 90, 224)
        robust_range = max(1.0, p90 - p10)
        contrast_val = min(100, int(round((robust_range / 255.0) * 100)))
        contrast_status = "High Contrast" if contrast_val > 80 else ("Low Contrast" if contrast_val < 25 else "Normal")

        # 3. Histogram of visible pixels only.
        hist, _ = np.histogram(visible_gray, bins=32, range=(0, 256))
        max_bin = float(np.max(hist)) if np.max(hist) > 0 else 1.0
        histogram = [int(round((v / max_bin) * 100)) for v in hist]

        # 4. Sharpness. Ignore fully transparent pixels and use the visible bounding box.
        ys, xs = np.where(visible)
        if len(xs) > 0:
            x0, x1 = max(0, int(xs.min())), min(width, int(xs.max()) + 1)
            y0, y1 = max(0, int(ys.min())), min(height, int(ys.max()) + 1)
            focus_gray = gray[y0:y1, x0:x1]
            focus_mask = visible[y0:y1, x0:x1]
        else:
            focus_gray, focus_mask = gray, np.ones_like(gray, dtype=bool)
        lap = cv2.Laplacian(focus_gray, cv2.CV_64F)
        lap_var = float(np.var(lap[focus_mask])) if np.any(focus_mask) else 0.0
        sharpness_score = float(np.sqrt(max(0.0, lap_var)))
        sharpness_val = min(100, int(round(sharpness_score * 2.5)))
        if sharpness_val < 18:
            sharpness_status = "Soft / Blurry — inspect at 100%"
        elif sharpness_val < 40:
            sharpness_status = "Moderate sharpness"
        else:
            sharpness_status = "Sharp"

        # 5. Noise, alpha-aware.
        sigma = estimate_noise_cv2(gray, visible)
        noise_val = min(100, int(round((sigma / 5.0) * 100)))
        noise_status = "High Noise / Artifacts" if noise_val > 35 else ("Medium Noise" if noise_val > 15 else "Low Noise / Clean")

        # 6. Additional forensic signals.
        edges = edge_metrics(rgb, alpha, visible)
        banding = banding_score(gray, visible)
        ext = Path(file_path).suffix.lower() if file_path else ""
        jpeg_blocking = jpeg_blocking_score(gray, visible) if ext in {".jpg", ".jpeg"} else 0.0

        report = {
            "resolution": resolution,
            "width": width,
            "height": height,
            "megapixels": round(mp, 3),
            "color_space": color_space,
            "histogram": histogram,
            "brightness": {
                "value": brightness_val,
                "status": brightness_status,
                "median": round(p50, 2),
                "p01": round(p01, 2),
                "p99": round(p99, 2),
                "clipped_high_percent": round(clipped_high_pct, 3),
                "clipped_low_percent": round(clipped_low_pct, 3)
            },
            "contrast": {
                "value": contrast_val,
                "status": contrast_status,
                "p10": round(p10, 2),
                "p90": round(p90, 2)
            },
            "sharpness": {
                "value": sharpness_val,
                "status": sharpness_status,
                "raw_score": round(sharpness_score, 4),
                "laplacian_variance": round(lap_var, 4)
            },
            "noise": {
                "value": noise_val,
                "status": noise_status,
                "raw_sigma": round(float(sigma), 4)
            },
            "transparency": edges,
            "banding": {
                "score": round(float(banding), 2),
                "status": "Review possible banding" if banding > 70 else "No strong banding signal"
            },
            "jpeg_blocking": {
                "score": round(float(jpeg_blocking), 2),
                "status": "Review compression" if jpeg_blocking > 70 else "No strong blocking signal"
            },
            "visible_pixel_analysis": True,
            "file_validation": "Valid (Passed Alpha-Aware Pixel Analysis)",
            "file_size_kb": file_size_kb
        }

        print(json.dumps(report, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": f"Python image analysis failed: {str(e)}"}))


if __name__ == '__main__':
    main()
