import sys
import json
import base64
from io import BytesIO
from pathlib import Path
from PIL import Image
import numpy as np
import cv2


def safe_percentile(arr, q, default=0.0):
    arr = np.asarray(arr)
    arr = arr[np.isfinite(arr)]
    if arr.size == 0:
        return float(default)
    return float(np.percentile(arr, q))


def estimate_noise_cv2(gray, mask=None):
    """Estimate high-frequency noise using Laplacian operator on masked pixels."""
    gray = gray.astype(np.float32)
    if gray.shape[0] < 5 or gray.shape[1] < 5:
        return 0.0
    kernel = np.array([[1, -2, 1], [-2, 4, -2], [1, -2, 1]], dtype=np.float32)
    response = cv2.filter2D(gray, cv2.CV_32F, kernel)
    if mask is None:
        valid = np.ones(gray.shape, dtype=bool)
    else:
        valid = mask.astype(bool).copy()
        # Avoid boundary edge effects
        valid[:2, :] = False
        valid[-2:, :] = False
        valid[:, :2] = False
        valid[:, -2:] = False
        
    vals = np.abs(response[valid])
    if vals.size == 0:
        return 0.0
    
    # Calculate noise sigma
    sigma = float(np.sum(vals) * np.sqrt(0.5 * np.pi) / max(1.0, 6 * np.sum(valid)))
    return sigma


def alpha_aware_arrays(img):
    rgba = np.array(img.convert("RGBA"), dtype=np.uint8)
    rgb = rgba[:, :, :3]
    alpha = rgba[:, :, 3]
    visible = alpha > 8
    
    # Composite onto neutral gray only for dense operations
    # This prevents transparent pixels from being interpreted as black.
    bg = np.full_like(rgb, 128, dtype=np.uint8)
    a = (alpha.astype(np.float32) / 255.0)[:, :, None]
    composited = np.clip(rgb.astype(np.float32) * a + bg.astype(np.float32) * (1 - a), 0, 255).astype(np.uint8)
    gray = cv2.cvtColor(composited, cv2.COLOR_RGB2GRAY)
    return rgba, rgb, alpha, visible, gray


def detect_edge_halo(rgb, alpha):
    """
    Priority 1 & 5: Detect matte fringing/halos around semi-transparent edges.
    Compares the brightness and chromatic difference of semi-transparent edge pixels (alpha 10-240)
    with the adjacent fully opaque pixels.
    """
    if not np.any(alpha < 255):
        return 0.0  # No alpha channel, no halo risk
        
    edge_mask = (alpha > 10) & (alpha < 240)
    if np.sum(edge_mask) < 100:
        return 0.0
        
    solid_mask = (alpha >= 240)
    if np.sum(solid_mask) < 100:
        return 0.0
        
    # Dilate solid mask to find opaque pixels adjacent to edge
    solid_border = cv2.dilate(solid_mask.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~solid_mask
    
    gray_img = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)
    edge_pixels = gray_img[edge_mask]
    solid_border_pixels = gray_img[solid_border]
    
    if edge_pixels.size == 0 or solid_border_pixels.size == 0:
        return 0.0
        
    mean_solid = np.mean(solid_border_pixels)
    mean_edge = np.mean(edge_pixels)
    
    # Absolute brightness difference
    diff = np.abs(mean_edge - mean_solid)
    
    # Check color spread/saturation in the edge zone
    edge_rgb = rgb[edge_mask].astype(np.float32)
    edge_std = np.mean(np.std(edge_rgb, axis=0))
    
    # Halo score is higher when there is a sharp halo offset or color fringe
    halo_score = min(100.0, (diff * 3.0) + (edge_std * 0.8))
    return float(halo_score)


def edge_metrics(rgb, alpha, visible):
    partial = (alpha > 8) & (alpha < 247)
    partial_pct = float(partial.mean() * 100.0)
    transparent_pct = float((alpha <= 8).mean() * 100.0)
    
    halo_risk = detect_edge_halo(rgb, alpha)
    
    return {
        "has_alpha": bool(np.any(alpha < 255)),
        "transparent_percent": round(transparent_pct, 3),
        "partial_alpha_percent": round(partial_pct, 3),
        "edge_halo_risk_percent": round(halo_risk, 3),
        "edge_status": "Review edge/matte" if halo_risk > 22 else "Alpha edge acceptable"
    }


def banding_score(gray, visible_mask):
    """
    Priority 5: Detect color banding (posterization) in slow gradient areas.
    Looks for quantized 'steps' in regions of low, slow gradients.
    """
    if np.sum(visible_mask) < 500:
        return 0.0
        
    # Smooth to suppress high-frequency noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    gx = cv2.Sobel(blurred, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(blurred, cv2.CV_32F, 0, 1, ksize=3)
    grad = np.sqrt(gx**2 + gy**2)
    
    # Slow gradient regions (where banding is visible, excluding flat backgrounds and sharp borders)
    slow_grad_mask = (grad > 0.1) & (grad < 5.0) & visible_mask
    if np.sum(slow_grad_mask) < 200:
        return 0.0
        
    local_gray = gray[slow_grad_mask]
    val_range = np.max(local_gray) - np.min(local_gray)
    if val_range < 8:
        return 0.0  # too flat to be considered banding
        
    unique_vals = len(np.unique(local_gray))
    step_ratio = unique_vals / float(val_range)
    
    # If step_ratio is very low, it indicates quantization steps (banding)
    if step_ratio < 0.35:
        score = (0.35 - step_ratio) * 285.7  # scale to 0-100
        return float(min(100.0, max(0.0, score)))
    return 0.0


def jpeg_blocking_score(gray, visible_mask):
    """
    Priority 5: Mathematically rigorous JPEG blocking artifact detector.
    Compares pixel differences at 8x8 boundaries to differences internal to the 8x8 blocks.
    """
    h, w = gray.shape
    if h < 16 or w < 16:
        return 0.0
        
    diff_block = []
    diff_internal = []
    
    # Horizontal gradients
    for x in range(1, w - 1):
        left = gray[:, x - 1].astype(np.float32)
        right = gray[:, x].astype(np.float32)
        m = visible_mask[:, x - 1] & visible_mask[:, x]
        if not np.any(m):
            continue
        diffs = np.abs(left[m] - right[m])
        if x % 8 == 0:
            diff_block.extend(diffs.tolist())
        else:
            diff_internal.extend(diffs.tolist())
            
    # Vertical gradients
    for y in range(1, h - 1):
        top = gray[y - 1, :].astype(np.float32)
        bottom = gray[y, :].astype(np.float32)
        m = visible_mask[y - 1, :] & visible_mask[y, :]
        if not np.any(m):
            continue
        diffs = np.abs(top[m] - bottom[m])
        if y % 8 == 0:
            diff_block.extend(diffs.tolist())
        else:
            diff_internal.extend(diffs.tolist())
            
    if len(diff_block) < 100 or len(diff_internal) < 100:
        return 0.0
        
    med_block = np.median(diff_block)
    med_internal = np.median(diff_internal)
    
    if med_internal < 0.1:
        med_internal = 0.1
        
    ratio = med_block / med_internal
    
    # Ratio > 1.05 indicates blockiness (block boundary transitions are sharper than internal details)
    if ratio > 1.05:
        score = (ratio - 1.05) * 166.7  # mapping ratio 1.05-1.65 to 0-100
        return float(min(100.0, max(0.0, score)))
    return 0.0


def local_region_analysis(gray, visible_mask):
    """
    Priority 3: Local-region grid analysis.
    Divides the visible area of the image into a 3x3 grid to detect localized softness, noise, or clipping.
    """
    ys, xs = np.where(visible_mask)
    if len(xs) == 0:
        return {}
        
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    
    w = x1 - x0
    h = y1 - y0
    if w < 30 or h < 30:
        return {}
        
    gw = w // 3
    gh = h // 3
    
    local_metrics = []
    
    for row in range(3):
        for col in range(3):
            rx0 = x0 + col * gw
            rx1 = rx0 + gw if col < 2 else x1
            ry0 = y0 + row * gh
            ry1 = ry0 + gh if row < 2 else y1
            
            cell_gray = gray[ry0:ry1, rx0:rx1]
            cell_mask = visible_mask[ry0:ry1, rx0:rx1]
            
            if np.sum(cell_mask) < 50:
                continue
                
            # Sharpness of this cell (Laplacian variance)
            lap = cv2.Laplacian(cell_gray, cv2.CV_64F)
            lap_var = float(np.var(lap[cell_mask])) if np.any(cell_mask) else 0.0
            sharp_val = float(np.sqrt(lap_var))
            
            # Noise of this cell
            noise_val = estimate_noise_cv2(cell_gray, cell_mask)
            
            # Brightness of this cell
            cell_pixels = cell_gray[cell_mask]
            mean_bright = float(np.mean(cell_pixels))
            
            # Clipping in this cell
            high_clip_pct = float(np.mean(cell_pixels >= 250) * 100.0)
            low_clip_pct = float(np.mean(cell_pixels <= 5) * 100.0)
            
            local_metrics.append({
                "region": f"R{row+1}C{col+1}",
                "sharpness": sharp_val,
                "noise": noise_val,
                "brightness": mean_bright,
                "high_clipping_percent": high_clip_pct,
                "low_clipping_percent": low_clip_pct
            })
            
    if not local_metrics:
        return {}
        
    sharpnesses = [m["sharpness"] for m in local_metrics]
    noises = [m["noise"] for m in local_metrics]
    brightnesses = [m["brightness"] for m in local_metrics]
    high_clips = [m["high_clipping_percent"] for m in local_metrics]
    low_clips = [m["low_clipping_percent"] for m in local_metrics]
    
    # Calculate local variations
    min_sharp = min(sharpnesses)
    max_sharp = max(sharpnesses)
    max_noise = max(noises)
    min_noise = min(noises)
    
    # High variance in local sharpness indicates localized blur (e.g. out-of-focus background or motion blurred limbs)
    sharpness_uniformity = min_sharp / max_sharp if max_sharp > 0 else 1.0
    
    return {
        "regions": local_metrics,
        "min_local_sharpness": round(min_sharp, 4),
        "max_local_sharpness": round(max_sharp, 4),
        "sharpness_uniformity": round(sharpness_uniformity, 3),
        "max_local_noise": round(max_noise, 4),
        "min_local_noise": round(min_noise, 4),
        "max_local_high_clipping": round(max(high_clips), 2),
        "max_local_low_clipping": round(max(low_clips), 2),
        "mean_local_brightness": round(np.mean(brightnesses), 2)
    }


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
        
        # Priority 1: ERODE visible mask to get SOLID pixels (fully inside the object boundaries)
        # This prevents transparent borders or background compositing boundaries from leaking into Laplacian/noise stats!
        if np.any(alpha < 255):
            kernel_erode = np.ones((5, 5), np.uint8)
            solid_mask = cv2.erode(visible.astype(np.uint8), kernel_erode, iterations=2).astype(bool)
            # If eroded too aggressively and became empty, fallback to visible
            if np.sum(solid_mask) < 200:
                solid_mask = visible
        else:
            solid_mask = np.ones((height, width), dtype=bool)
            
        # Detect pure white/black studio backgrounds (exclude them from highlights/shadows clipping checks)
        # Studio backgrounds are usually uniform at the borders
        is_studio_white = False
        is_studio_black = False
        
        # Check border gray levels
        border_pixels = []
        border_pixels.extend(gray[0, :].tolist())
        border_pixels.extend(gray[-1, :].tolist())
        border_pixels.extend(gray[:, 0].tolist())
        border_pixels.extend(gray[:, -1].tolist())
        border_pixels = np.array(border_pixels)
        
        if border_pixels.size > 0:
            border_mean = np.mean(border_pixels)
            border_std = np.std(border_pixels)
            if border_mean >= 253 and border_std < 2.0:
                is_studio_white = True
            elif border_mean <= 3 and border_std < 2.0:
                is_studio_black = True
                
        # Exclude pure white background from overexposure checks if it's studio white
        exposure_mask = solid_mask.copy()
        if is_studio_white:
            exposure_mask = exposure_mask & (gray < 254)
        if is_studio_black:
            exposure_mask = exposure_mask & (gray > 2)
            
        visible_gray = gray[exposure_mask]
        if visible_gray.size == 0:
            exposure_mask = solid_mask
            visible_gray = gray[exposure_mask]
            
        # Robust brightness and contrast (Priority 2)
        p01 = safe_percentile(visible_gray, 1, 0)
        p10 = safe_percentile(visible_gray, 10, 32)
        p50 = safe_percentile(visible_gray, 50, 128)
        p90 = safe_percentile(visible_gray, 90, 224)
        p99 = safe_percentile(visible_gray, 99, 255)
        
        brightness_val = int(round((p50 / 255.0) * 100))
        clipped_high_pct = float(np.mean(visible_gray >= 250) * 100.0) if not is_studio_white else 0.0
        clipped_low_pct = float(np.mean(visible_gray <= 5) * 100.0) if not is_studio_black else 0.0
        
        if clipped_high_pct > 4.5:
            brightness_status = "Highlights clipping risk (blown-out)"
        elif clipped_low_pct > 7.0:
            brightness_status = "Shadow clipping risk (crushed)"
        elif brightness_val > 84:
            brightness_status = "Overexposed / Very Bright"
        elif brightness_val < 18:
            brightness_status = "Underexposed / Very Dark"
        else:
            brightness_status = "Optimal"
            
        robust_range = max(1.0, p90 - p10)
        contrast_val = min(100, int(round((robust_range / 255.0) * 100)))
        contrast_status = "High Contrast" if contrast_val > 80 else ("Low Contrast" if contrast_val < 22 else "Normal")
        
        # Histogram on solid_mask
        hist, _ = np.histogram(gray[solid_mask], bins=32, range=(0, 256))
        max_bin = float(np.max(hist)) if np.max(hist) > 0 else 1.0
        histogram = [int(round((v / max_bin) * 100)) for v in hist]
        
        # Sharpness of solid parts (Priority 2 & 1)
        ys, xs = np.where(solid_mask)
        if len(xs) > 0:
            x0, x1 = max(0, int(xs.min())), min(width, int(xs.max()) + 1)
            y0, y1 = max(0, int(ys.min())), min(height, int(ys.max()) + 1)
            focus_gray = gray[y0:y1, x0:x1]
            focus_mask = solid_mask[y0:y1, x0:x1]
        else:
            focus_gray, focus_mask = gray, np.ones_like(gray, dtype=bool)
            
        lap = cv2.Laplacian(focus_gray, cv2.CV_64F)
        lap_var = float(np.var(lap[focus_mask])) if np.any(focus_mask) else 0.0
        sharpness_score = float(np.sqrt(max(0.0, lap_var)))
        
        # Contrast normalization: a clean flat graphic will have low raw laplacian score but is sharp.
        # Scale sharpness score based on the contrast range of solid pixels to avoid false blurry flags on flat art.
        contrast_factor = max(0.1, robust_range / 128.0)
        normalized_sharpness = sharpness_score / contrast_factor
        
        # Map to 0-100
        sharpness_val = min(100, int(round(normalized_sharpness * 2.8)))
        
        if sharpness_val < 15:
            sharpness_status = "Extremely blurry / Out-of-focus"
        elif sharpness_val < 26:
            sharpness_status = "Soft focus / Out of focus — inspect at 100%"
        elif sharpness_val < 42:
            sharpness_status = "Acceptable sharpness"
        else:
            sharpness_status = "Tack-sharp / Pin-sharp"
            
        # Noise estimation in solid areas (Priority 2)
        sigma = estimate_noise_cv2(gray, solid_mask)
        noise_val = min(100, int(round((sigma / 4.5) * 100)))
        noise_status = "High Noise / Grain" if noise_val > 30 else ("Medium Noise" if noise_val > 12 else "Low Noise / Clean")
        
        # Local-region grid analysis (Priority 3)
        local_grid = local_region_analysis(gray, solid_mask)
        
        # Check local sharpness variation
        local_sharpness_alert = False
        if local_grid and local_grid.get("sharpness_uniformity", 1.0) < 0.35:
            # High local sharpness variance indicates a partially blurry image
            # Let's check if the min local sharpness is extremely low
            if local_grid.get("min_local_sharpness", 0.0) < 3.0:
                local_sharpness_alert = True
                
        # Additional forensics (Priority 5)
        edges = edge_metrics(rgb, alpha, visible)
        banding = banding_score(gray, solid_mask)
        ext = Path(file_path).suffix.lower() if file_path else ""
        jpeg_blocking = jpeg_blocking_score(gray, solid_mask) if ext in {".jpg", ".jpeg"} else 0.0
        
        report = {
            "resolution": f"{width} x {height} ({mp:.2f} MP)",
            "width": width,
            "height": height,
            "megapixels": round(mp, 3),
            "color_space": f"{img.mode} (Pillow decoded)",
            "histogram": histogram,
            "brightness": {
                "value": brightness_val,
                "status": brightness_status,
                "median": round(p50, 2),
                "p01": round(p01, 2),
                "p99": round(p99, 2),
                "clipped_high_percent": round(clipped_high_pct, 3),
                "clipped_low_percent": round(clipped_low_pct, 3),
                "is_studio_white_bg": is_studio_white,
                "is_studio_black_bg": is_studio_black
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
                "laplacian_variance": round(lap_var, 4),
                "normalized_score": round(normalized_sharpness, 4),
                "has_local_blur_anomaly": local_sharpness_alert
            },
            "noise": {
                "value": noise_val,
                "status": noise_status,
                "raw_sigma": round(float(sigma), 4)
            },
            "transparency": edges,
            "banding": {
                "score": round(float(banding), 2),
                "status": "Review possible banding" if banding > 65 else "No strong banding signal"
            },
            "jpeg_blocking": {
                "score": round(float(jpeg_blocking), 2),
                "status": "Review compression" if jpeg_blocking > 65 else "No strong blocking signal"
            },
            "local_analysis": local_grid,
            "visible_pixel_analysis": True,
            "file_validation": "Valid (Passed Alpha-Aware Pixel Analysis)",
            "file_size_kb": file_size_kb
        }

        print(json.dumps(report, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": f"Python image analysis failed: {str(e)}"}))


if __name__ == '__main__':
    main()
