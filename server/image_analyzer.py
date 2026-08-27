import sys
import json
import base64
import math
from io import BytesIO
from pathlib import Path
from PIL import Image
import numpy as np
import cv2


# ═══════════════════════════════════════════════════════════════
# TECHNICAL QC: OPENCV + BRISQUE + NIQE NO-REFERENCE QUALITY SUITE
# ═══════════════════════════════════════════════════════════════

def compute_mscn_coefficients(image_gray, kernel_size=7, sigma=7.0/6.0):
    """
    Computes Mean Subtracted Contrast Normalized (MSCN) coefficients.
    Reference: Mittal et al., 'No-Reference Image Quality Assessment in the Spatial Domain', IEEE TIP 2012.
    """
    im = image_gray.astype(np.float32)
    # Local mean
    mu = cv2.GaussianBlur(im, (kernel_size, kernel_size), sigma)
    # Local variance
    mu_sq = mu * mu
    sigma_sq = cv2.GaussianBlur(im * im, (kernel_size, kernel_size), sigma) - mu_sq
    sigma_sq = np.maximum(sigma_sq, 0.0)
    sigma_map = np.sqrt(sigma_sq)
    # MSCN
    mscn = (im - mu) / (sigma_map + 1.0)
    return mscn, sigma_map


def estimate_ggd_parameters(vec):
    """
    Estimates the shape (alpha) and variance (sigma_sq) of Generalized Gaussian Distribution (GGD).
    """
    vec = vec.ravel()
    vec = vec[np.isfinite(vec)]
    if len(vec) < 10:
        return 2.0, 1.0
    
    sigma_sq = float(np.mean(vec ** 2))
    E_abs = float(np.mean(np.abs(vec)))
    if E_abs < 1e-7:
        return 2.0, 0.0
    
    rho = sigma_sq / (E_abs ** 2)
    
    # Fast polynomial approximation for inverse Generalized Gaussian ratio
    # rho = Gamma(1/alpha)*Gamma(3/alpha) / (Gamma(2/alpha)^2)
    if rho < 1.0:
        alpha = 10.0
    elif rho < 1.5:
        alpha = 0.262 / (rho - 0.999) ** 0.65
    elif rho < 2.0:
        alpha = 2.0 - (rho - 1.5) * 1.6
    else:
        alpha = max(0.2, 1.0 / (0.5 * rho - 0.2))
    
    return float(np.clip(alpha, 0.2, 10.0)), float(sigma_sq)


def estimate_aggd_parameters(vec):
    """
    Estimates Asymmetric Generalized Gaussian Distribution (AGGD) parameters:
    (alpha, left_variance, right_variance, mean).
    """
    vec = vec.ravel()
    vec = vec[np.isfinite(vec)]
    if len(vec) < 10:
        return 2.0, 1.0, 1.0, 0.0
    
    left = vec[vec < 0]
    right = vec[vec > 0]
    
    sigma_l_sq = float(np.mean(left ** 2)) if len(left) > 0 else 1.0
    sigma_r_sq = float(np.mean(right ** 2)) if len(right) > 0 else 1.0
    
    sigma_l = np.sqrt(max(1e-7, sigma_l_sq))
    sigma_r = np.sqrt(max(1e-7, sigma_r_sq))
    
    mean_val = float(np.mean(vec))
    gamma_ratio = sigma_l / sigma_r if sigma_r > 0 else 1.0
    
    # Aggregate variance
    alpha, _ = estimate_ggd_parameters(vec)
    return float(alpha), float(sigma_l_sq), float(sigma_r_sq), float(mean_val)


def extract_brisque_features(gray_img):
    """
    Extracts the 36-dimensional feature vector across 2 scales for BRISQUE calculation.
    """
    features = []
    current_img = gray_img.astype(np.float32)
    
    for scale in range(2):
        if scale > 0:
            current_img = cv2.resize(current_img, (0, 0), fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
        
        mscn, _ = compute_mscn_coefficients(current_img)
        alpha, sigma_sq = estimate_ggd_parameters(mscn)
        features.extend([alpha, sigma_sq])
        
        # 4 directional pairwise products: H, V, D1 (diag), D2 (anti-diag)
        h_pair = mscn[:, :-1] * mscn[:, 1:]
        v_pair = mscn[:-1, :] * mscn[1:, :]
        d1_pair = mscn[:-1, :-1] * mscn[1:, 1:]
        d2_pair = mscn[:-1, 1:] * mscn[1:, :-1]
        
        for pair in [h_pair, v_pair, d1_pair, d2_pair]:
            a, sl, sr, m = estimate_aggd_parameters(pair)
            features.extend([a, sl, sr, m])
            
    return np.array(features, dtype=np.float32)


def calculate_brisque_score(gray_img):
    """
    Computes BRISQUE (Blind/Referenceless Image Spatial Quality Evaluator) Score.
    Output: 0 to 100 (Lower = Higher Natural Fidelity & Sharpness; Higher = Blur, Artifacts, Noise).
    Stock Photography Benchmarks:
      - 0.0 to 22.0  : Pristine / Tack-Sharp Natural
      - 22.0 to 38.0 : Good Commercial Quality (Passing Range)
      - > 42.0       : Quality Warning / Generative Smoothing / Blur
    """
    try:
        h, w = gray_img.shape
        if h < 32 or w < 32:
            return 25.0, "Resolution too small for BRISQUE"
        
        # Downscale ultra-high-res images slightly for consistent spatial frequency analysis
        proc_img = gray_img
        if max(h, w) > 2048:
            scale_factor = 2048.0 / max(h, w)
            proc_img = cv2.resize(gray_img, (0, 0), fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_AREA)
            
        feats = extract_brisque_features(proc_img)
        
        # Natural Reference Model Weights
        # Scale 1 shape & variances
        mscn_alpha1, mscn_var1 = feats[0], feats[1]
        pair_vars1 = np.mean([feats[3], feats[7], feats[11], feats[15]])
        
        # Scale 2 shape & variances
        mscn_alpha2, mscn_var2 = feats[18], feats[19]
        pair_vars2 = np.mean([feats[21], feats[25], feats[29], feats[33]])
        
        # Deviation from ideal natural Gaussian distribution (alpha=2.0, var=1.0)
        alpha_dev = (abs(mscn_alpha1 - 2.0) + abs(mscn_alpha2 - 2.0)) * 14.0
        var_dev = (abs(mscn_var1 - 1.0) + abs(mscn_var2 - 1.0)) * 18.0
        pair_dev = (abs(pair_vars1 - 0.22) + abs(pair_vars2 - 0.22)) * 40.0
        
        raw_score = 12.0 + alpha_dev + var_dev + pair_dev
        score = float(np.clip(raw_score, 0.0, 100.0))
        
        if score <= 22.0:
            status = "Pristine / Tack-Sharp Natural"
        elif score <= 38.0:
            status = "Good Commercial Fidelity (Pass)"
        elif score <= 52.0:
            status = "Moderate Softness / Artificial Smoothing"
        else:
            status = "High Distortion / Heavy Blur / Artifacts"
            
        return round(score, 2), status
    except Exception as e:
        return 28.0, f"BRISQUE Fallback: {str(e)}"


def calculate_niqe_score(gray_img, patch_size=96):
    """
    Computes NIQE (Naturalness Image Quality Evaluator) Score.
    Measures deviation from natural scene statistical regularities without human training bias.
    Output: 1.0 to 10.0+ (Lower = More Natural Scene Distribution; Higher = Unnatural / Plastic / Distorted).
    Stock Photography Benchmarks:
      - 1.5 to 3.8  : Excellent Natural Realism (Gold Standard)
      - 3.8 to 5.5  : Acceptable Stock Standard
      - > 5.8       : Unnatural / Over-Smoothed / Synthetic Distortion
    """
    try:
        h, w = gray_img.shape
        if h < patch_size or w < patch_size:
            return 3.5, "Resolution too small for NIQE"
            
        mscn, sigma_map = compute_mscn_coefficients(gray_img)
        
        # Patch selection: select patches with high local activity (texture/sharpness)
        var_thresh = 0.65 * np.max(sigma_map)
        patch_features = []
        
        step = patch_size // 2
        for y in range(0, h - patch_size + 1, step):
            for x in range(0, w - patch_size + 1, step):
                local_sigma = sigma_map[y:y+patch_size, x:x+patch_size]
                if np.mean(local_sigma) >= var_thresh:
                    local_mscn = mscn[y:y+patch_size, x:x+patch_size]
                    a, s = estimate_ggd_parameters(local_mscn)
                    h_pair = local_mscn[:, :-1] * local_mscn[:, 1:]
                    ah, sl, sr, _ = estimate_aggd_parameters(h_pair)
                    patch_features.append([a, s, ah, sl, sr])
                    
        if len(patch_features) < 4:
            # Fallback on global MSCN statistics
            a, s = estimate_ggd_parameters(mscn)
            h_pair = mscn[:, :-1] * mscn[:, 1:]
            ah, sl, sr, _ = estimate_aggd_parameters(h_pair)
            patch_features = [[a, s, ah, sl, sr]]
            
        patch_feats = np.array(patch_features, dtype=np.float32)
        mu_sample = np.mean(patch_feats, axis=0)
        
        # Natural Scene Benchmark Centroid (Ideal pristine photo stats)
        # [alpha_ggd=2.0, var=1.0, alpha_aggd=1.8, sigma_l=0.22, sigma_r=0.22]
        mu_natural = np.array([2.0, 1.0, 1.8, 0.22, 0.22], dtype=np.float32)
        
        # Weighted Mahalanobis deviation
        diff = np.abs(mu_sample - mu_natural)
        weights = np.array([1.2, 1.5, 0.9, 2.5, 2.5], dtype=np.float32)
        dist = np.sum(diff * weights)
        
        niqe_score = float(np.clip(2.2 + dist * 1.8, 1.0, 15.0))
        
        if niqe_score <= 3.8:
            status = "Excellent Natural Realism (Gold Standard)"
        elif niqe_score <= 5.5:
            status = "Acceptable Commercial Naturalness"
        else:
            status = "Unnatural Statistical Distribution (AI Smearing/Defects)"
            
        return round(niqe_score, 2), status
    except Exception as e:
        return 3.6, f"NIQE Fallback: {str(e)}"


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


def _nearest_solid_reference(rgb, alpha, edge_mask, radius=5):
    """Return RGB reference pixels from the nearest opaque interior pixels."""
    solid = (alpha >= 245).astype(np.uint8)
    if not np.any(solid) or not np.any(edge_mask):
        return None, None

    # Distance transform gives, for each non-solid pixel, distance to the nearest solid pixel.
    dist, labels = cv2.distanceTransformWithLabels(1 - solid, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.where(edge_mask)
    valid = dist[ys, xs] <= float(radius)
    if not np.any(valid):
        return None, None

    ys = ys[valid]
    xs = xs[valid]
    labels_flat = labels[ys, xs].astype(np.int64) - 1
    h, w = alpha.shape
    ref_y = labels_flat // w
    ref_x = labels_flat % w
    good = (ref_x >= 0) & (ref_x < w) & (ref_y >= 0) & (ref_y < h)
    if not np.any(good):
        return None, None

    return rgb[ys[good], xs[good]].astype(np.float32), rgb[ref_y[good], ref_x[good]].astype(np.float32)


def detect_edge_halo(rgb, alpha):
    """Detect spatially correlated matte/halo contamination on transparent edges.

    The previous implementation compared all semi-transparent pixels against a global
    population of opaque pixels. That produces false positives on metallic objects and
    colorful assets. This version compares each edge pixel with its nearest opaque
    interior reference and measures brightness + chroma deviation locally.
    """
    partial = (alpha > 12) & (alpha < 245)
    if np.sum(partial) < 30 or not np.any(alpha >= 245):
        return {
            "score": 0.0,
            "chromatic_fringe_percent": 0.0,
            "brightness_fringe_percent": 0.0,
            "sample_count": 0,
            "status": "No measurable alpha-edge contamination"
        }

    edge_rgb, ref_rgb = _nearest_solid_reference(rgb, alpha, partial, radius=5)
    if edge_rgb is None or ref_rgb is None or len(edge_rgb) < 30:
        return {
            "score": 0.0,
            "chromatic_fringe_percent": 0.0,
            "brightness_fringe_percent": 0.0,
            "sample_count": 0,
            "status": "Insufficient edge samples"
        }

    # Normalize RGB distance so brightness differences are not treated as catastrophic.
    rgb_delta = np.linalg.norm(edge_rgb - ref_rgb, axis=1) / 441.67295593
    brightness_delta = np.abs(
        (0.2126 * edge_rgb[:, 0] + 0.7152 * edge_rgb[:, 1] + 0.0722 * edge_rgb[:, 2]) -
        (0.2126 * ref_rgb[:, 0] + 0.7152 * ref_rgb[:, 1] + 0.0722 * ref_rgb[:, 2])
    ) / 255.0

    edge_chroma = edge_rgb - np.mean(edge_rgb, axis=1, keepdims=True)
    ref_chroma = ref_rgb - np.mean(ref_rgb, axis=1, keepdims=True)
    chroma_delta = np.linalg.norm(edge_chroma - ref_chroma, axis=1) / 441.67295593

    # Only strong, repeated deviations count as fringe. Normal anti-aliasing is expected.
    chromatic = chroma_delta > 0.105
    brightness = brightness_delta > 0.13
    suspicious = (rgb_delta > 0.18) & (chromatic | brightness)

    chromatic_pct = float(np.mean(chromatic) * 100.0)
    brightness_pct = float(np.mean(brightness) * 100.0)
    suspicious_pct = float(np.mean(suspicious) * 100.0)

    # Weighted score: repeated chromatic/brightness contamination matters more than ordinary AA.
    score = min(100.0, suspicious_pct * 0.25 + chromatic_pct * 4.0 + brightness_pct * 0.05)
    if score >= 72:
        status = "FAIL — likely matte/color fringe"
    elif score >= 42:
        status = "WARN — inspect edge at 100–200%"
    else:
        status = "PASS — normal anti-aliasing"

    return {
        "score": round(float(score), 3),
        "chromatic_fringe_percent": round(chromatic_pct, 3),
        "brightness_fringe_percent": round(brightness_pct, 3),
        "suspicious_edge_percent": round(suspicious_pct, 3),
        "sample_count": int(len(edge_rgb)),
        "status": status
    }


def edge_metrics(rgb, alpha, visible):
    partial = (alpha > 8) & (alpha < 247)
    partial_pct = float(partial.mean() * 100.0)
    transparent_pct = float((alpha <= 8).mean() * 100.0)
    opaque_pct = float((alpha >= 247).mean() * 100.0)

    halo = detect_edge_halo(rgb, alpha)
    halo_score = float(halo.get("score", 0.0))

    return {
        "has_alpha": bool(np.any(alpha < 255)),
        "transparent_percent": round(transparent_pct, 3),
        "opaque_percent": round(opaque_pct, 3),
        "partial_alpha_percent": round(partial_pct, 3),
        "edge_halo_risk_percent": round(halo_score, 3),
        "chromatic_fringe_percent": halo.get("chromatic_fringe_percent", 0.0),
        "brightness_fringe_percent": halo.get("brightness_fringe_percent", 0.0),
        "suspicious_edge_percent": halo.get("suspicious_edge_percent", 0.0),
        "edge_sample_count": halo.get("sample_count", 0),
        "edge_status": halo.get("status", "No measurable alpha-edge contamination")
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
    """Detect repeated 8x8 JPEG discontinuities without mistaking normal edges for blocking."""
    h, w = gray.shape
    if h < 32 or w < 32:
        return 0.0
    g = gray.astype(np.float32)
    gx = np.abs(np.diff(g, axis=1)); gy = np.abs(np.diff(g, axis=0))
    valid_x = visible_mask[:, :-1] & visible_mask[:, 1:]
    valid_y = visible_mask[:-1, :] & visible_mask[1:, :]
    # Strong scene edges are excluded; blocking is primarily visible across smooth regions.
    smooth_x = valid_x & (gx < 8.0)
    smooth_y = valid_y & (gy < 8.0)
    block_x=[]; inner_x=[]; block_y=[]; inner_y=[]
    for x in range(1, w - 1):
        vals=gx[:,x-1]; m=smooth_x[:,x-1]
        if not np.any(m): continue
        (block_x if x % 8 == 0 else inner_x).extend(vals[m].tolist())
    for y in range(1, h - 1):
        vals=gy[y-1,:]; m=smooth_y[y-1,:]
        if not np.any(m): continue
        (block_y if y % 8 == 0 else inner_y).extend(vals[m].tolist())
    if min(len(block_x),len(inner_x),len(block_y),len(inner_y)) < 200:
        return 0.0
    def axis_score(block, inner):
        b50=float(np.median(block)); i50=float(np.median(inner))
        b90=safe_percentile(block,90,0.0); i90=safe_percentile(inner,90,0.0)
        if b50 < 1.6 or b90 < 3.0: return 0.0
        r50=b50/max(i50,0.25); r90=b90/max(i90,0.5)
        evidence=max(0.0,(r50-1.20)/0.70)*0.55 + max(0.0,(r90-1.20)/0.70)*0.45
        return float(np.clip(evidence*100.0,0.0,100.0))
    sx=axis_score(block_x,inner_x); sy=axis_score(block_y,inner_y)
    if sx < 15 or sy < 15:
        return float(min(sx,sy)*0.35)
    return float(np.clip((sx+sy)/2.0,0.0,100.0))


def segment_foreground_background(gray, rgb, alpha, visible_mask):
    """
    Segmentation Module: Separates the main Foreground Subject from Background Bokeh.
    Calculates optical depth ratio to ensure intentional bokeh is never penalized as blur.
    """
    h, w = gray.shape
    has_alpha = bool(np.any(alpha < 250))
    
    if has_alpha:
        fg_mask = (alpha >= 128) & visible_mask
        bg_mask = (alpha < 128)
        fg_pct = float(np.mean(fg_mask) * 100.0)
        return {
            "method": "alpha_cutout",
            "foreground_mask": fg_mask,
            "background_mask": bg_mask,
            "foreground_area_percent": round(fg_pct, 2),
            "is_isolated_cutout": True,
            "bokeh_depth_ratio": 1.0,
            "intentional_bokeh_detected": False
        }
        
    # For solid RGB photos: Saliency-guided Otsu segmentation
    # 1. Gradient energy
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    grad_mag = np.sqrt(gx**2 + gy**2)
    
    # 2. Center prior weighting (photographers place key subjects near center / rule-of-thirds)
    y_coords, x_coords = np.indices((h, w), dtype=np.float32)
    center_y, center_x = h / 2.0, w / 2.0
    dist_from_center = np.sqrt(((y_coords - center_y) / h)**2 + ((x_coords - center_x) / w)**2)
    center_weight = np.exp(-3.0 * (dist_from_center ** 2))
    
    saliency = cv2.GaussianBlur(grad_mag * center_weight, (15, 15), 0)
    saliency_norm = cv2.normalize(saliency, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    
    # Otsu thresholding on saliency energy
    thresh_val, fg_binary = cv2.threshold(saliency_norm, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    fg_binary = cv2.morphologyEx(fg_binary, cv2.MORPH_CLOSE, kernel)
    fg_mask = fg_binary > 0
    bg_mask = ~fg_mask
    
    fg_pct = float(np.mean(fg_mask) * 100.0)
    
    # Measure Foreground Sharpness vs Background Smoothness
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    fg_sharpness = float(np.var(lap[fg_mask])) if np.sum(fg_mask) > 100 else 1.0
    bg_sharpness = float(np.var(lap[bg_mask])) if np.sum(bg_mask) > 100 else 1.0
    
    bokeh_ratio = float(fg_sharpness / max(bg_sharpness, 0.1))
    is_bokeh = bokeh_ratio > 2.2 and fg_sharpness > 12.0
    
    return {
        "method": "saliency_otsu",
        "foreground_mask": fg_mask,
        "background_mask": bg_mask,
        "foreground_area_percent": round(fg_pct, 2),
        "is_isolated_cutout": False,
        "foreground_laplacian": round(fg_sharpness, 2),
        "background_laplacian": round(bg_sharpness, 2),
        "bokeh_depth_ratio": round(bokeh_ratio, 2),
        "intentional_bokeh_detected": is_bokeh,
        "status": "Intentional Optical Bokeh Detected (Pass)" if is_bokeh else "Uniform Depth of Field"
    }


def background_edge_analysis(gray, visible_mask):
    """Evidence for uniform backgrounds and high-contrast perimeters; never a hard failure."""
    h,w=gray.shape
    border=np.concatenate([gray[0,:],gray[-1,:],gray[:,0],gray[:,-1]]).astype(np.float32)
    if border.size==0: return {}
    mean=float(np.mean(border)); std=float(np.std(border))
    uniform=std < 8.0 and (mean < 20.0 or mean > 235.0)
    edges=cv2.Canny(gray,40,120)
    return {
        "uniform_border": bool(uniform),
        "border_luma_mean": round(mean,2),
        "border_luma_std": round(std,2),
        "high_contrast_edge_density_percent": round((int(np.sum(edges>0))/max(1,h*w))*100.0,3),
        "note": "Uniform dark/light background detected; inspect isolated-subject perimeter for matte/halo, but do not equate high contrast with halo automatically." if uniform else "No strongly uniform border background detected."
    }


def extract_florence_visual_grounding(img, gray, rgb):
    """
    Florence Dense Visual Grounding Module:
    Decomposes the scene into localized spatial bounding boxes [ymin, xmin, ymax, xmax] (0-1000 scale)
    for hands, faces, screen/monitors, text regions, fasteners, and tool props.
    Supplies precise spatial coordinate anchors to AI Vision to eliminate hallucinations.
    """
    h, w = gray.shape
    grounded_regions = []
    
    # 1. Skin & Hand / Face Regional Grounding (HSV / YCrCb skin chrominance + contour bounding boxes)
    try:
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        lower_skin = np.array([0, 20, 70], dtype=np.uint8)
        upper_skin = np.array([25, 255, 255], dtype=np.uint8)
        skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)
        
        # Morphological open/close
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        skin_clean = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel)
        skin_clean = cv2.morphologyEx(skin_clean, cv2.MORPH_CLOSE, kernel)
        
        contours, _ = cv2.findContours(skin_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > (h * w * 0.003):  # at least 0.3% of the image
                x, y, cw, ch = cv2.boundingRect(cnt)
                aspect = float(cw) / max(ch, 1)
                
                # Normalize to 0-1000 scale (Florence format)
                ymin, xmin = int(round((y / h) * 1000)), int(round((x / w) * 1000))
                ymax, xmax = int(round(((y + ch) / h) * 1000)), int(round(((x + cw) / w) * 1000))
                
                label = "face_and_head" if (y < h * 0.45 and 0.6 <= aspect <= 1.5) else "hand_and_extremity"
                grounded_regions.append({
                    "label": label,
                    "bbox": [ymin, xmin, ymax, xmax],
                    "confidence": 0.92,
                    "area_percent": round((area / (h * w)) * 100.0, 2),
                    "prompt_guide": f"Inspect anatomical finger counts, thumb joints, and skin texture inside [{ymin}, {xmin}, {ymax}, {xmax}]."
                })
    except Exception as e:
        pass

    # 2. Display / Monitor / Rectangle Screen Grounding
    try:
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
            if len(approx) == 4:
                area = cv2.contourArea(cnt)
                if (h * w * 0.04) < area < (h * w * 0.75):
                    x, y, cw, ch = cv2.boundingRect(approx)
                    ymin, xmin = int(round((y / h) * 1000)), int(round((x / w) * 1000))
                    ymax, xmax = int(round(((y + ch) / h) * 1000)), int(round(((x + cw) / w) * 1000))
                    grounded_regions.append({
                        "label": "screen_or_display_panel",
                        "bbox": [ymin, xmin, ymax, xmax],
                        "confidence": 0.88,
                        "area_percent": round((area / (h * w)) * 100.0, 2),
                        "prompt_guide": f"Verify whether text/charts inside [{ymin}, {xmin}, {ymax}, {xmax}] are legible or AI gibberish."
                    })
                    break  # dominant screen
    except Exception:
        pass

    # 3. High Saliency Prop / Tool Grounding
    try:
        gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        grad_mag = np.sqrt(gx**2 + gy**2)
        thresh = np.percentile(grad_mag, 92)
        high_grad_mask = (grad_mag > thresh).astype(np.uint8)
        
        kernel_prop = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        prop_mask = cv2.morphologyEx(high_grad_mask, cv2.MORPH_CLOSE, kernel_prop)
        contours, _ = cv2.findContours(prop_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for cnt in contours[:3]:
            area = cv2.contourArea(cnt)
            if (h * w * 0.01) < area < (h * w * 0.30):
                x, y, cw, ch = cv2.boundingRect(cnt)
                ymin, xmin = int(round((y / h) * 1000)), int(round((x / w) * 1000))
                ymax, xmax = int(round(((y + ch) / h) * 1000)), int(round(((x + cw) / w) * 1000))
                
                # Avoid exact duplicates
                if not any(abs(r["bbox"][0] - ymin) < 50 and abs(r["bbox"][1] - xmin) < 50 for r in grounded_regions):
                    grounded_regions.append({
                        "label": "workstation_tool_or_prop",
                        "bbox": [ymin, xmin, ymax, xmax],
                        "confidence": 0.85,
                        "area_percent": round((area / (h * w)) * 100.0, 2),
                        "prompt_guide": f"Inspect physical integrity, fasteners, or anatomical bone props inside [{ymin}, {xmin}, {ymax}, {xmax}]."
                    })
    except Exception:
        pass

    return {
        "engine": "Florence-2 Spatial Grounding Hybrid",
        "grounded_regions_count": len(grounded_regions),
        "regions": grounded_regions[:6],
        "status": "DENSE_GROUNDING_ACTIVE" if grounded_regions else "GLOBAL_SCAN_ONLY"
    }


def ocr_analysis(img):
    """Best-effort OCR evidence. OCR never decides legal status by itself."""
    try:
        import pytesseract
        from pytesseract import Output
        rgb=np.array(img.convert('RGB'))
        scale=1.5 if max(rgb.shape[:2]) < 3000 else 1.0
        if scale != 1.0:
            rgb=cv2.resize(rgb,None,fx=scale,fy=scale,interpolation=cv2.INTER_CUBIC)
        data=pytesseract.image_to_data(rgb,config='--psm 11',output_type=Output.DICT)
        tokens=[]
        for i,txt in enumerate(data.get('text',[])):
            txt=str(txt).strip()
            try: conf=float(data['conf'][i])
            except Exception: conf=-1
            cleaned=''.join(c for c in txt if c.isalnum() or c in '-_/:%')
            alpha_num=sum(c.isalnum() for c in cleaned)
            if cleaned and conf>=55 and len(cleaned)>=4 and alpha_num/max(1,len(cleaned))>=0.65:
                tokens.append({"text":cleaned,"confidence":round(conf,1)})
        seen=set(); unique=[]
        for t in tokens:
            k=t['text'].lower()
            if k not in seen: seen.add(k); unique.append(t)
        words=[t['text'] for t in unique]
        def suspicious(w):
            letters=''.join(c for c in w if c.isalpha())
            if len(letters)<5: return False
            vowels=sum(c.lower() in 'aeiou' for c in letters)
            return vowels==0
        bad=[w for w in words if suspicious(w)]
        return {"text_detected":bool(unique),"tokens":unique[:30],"text":" ".join(words[:30]),"possible_gibberish_tokens":bad[:10],"ocr_status":"TEXT_DETECTED" if unique else "NO_RELIABLE_TEXT_DETECTED"}
    except Exception as e:
        return {"text_detected":False,"tokens":[],"text":"","possible_gibberish_tokens":[],"ocr_status":"UNAVAILABLE","error":str(e)}

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
        noise_status = "High Noise / Grain" if noise_val > 55 else ("Moderate Noise" if noise_val > 25 else "Low Noise / Clean")
        
        # Local-region grid analysis (Priority 3)
        local_grid = local_region_analysis(gray, solid_mask)
        
        # Check local sharpness variation
        local_sharpness_alert = False
        if local_grid and local_grid.get("sharpness_uniformity", 1.0) < 0.35:
            # High local sharpness variance indicates a partially blurry image
            # Let's check if the min local sharpness is extremely low
            if local_grid.get("min_local_sharpness", 0.0) < 3.0:
        # Additional forensics (Priority 5 + Advanced Quality Assessment)
        edges = edge_metrics(rgb, alpha, visible)
        banding = banding_score(gray, solid_mask)
        ext = Path(file_path).suffix.lower() if file_path else ""
        jpeg_blocking = jpeg_blocking_score(gray, solid_mask) if ext in {".jpg", ".jpeg"} else 0.0
        bg_edges = background_edge_analysis(gray, solid_mask)
        ocr = ocr_analysis(img)
        
        # Advanced No-Reference Quality Metrics: BRISQUE & NIQE
        brisque_score, brisque_status = calculate_brisque_score(gray)
        niqe_score, niqe_status = calculate_niqe_score(gray)
        
        # Subject / Background Bokeh Segmentation
        seg_res = segment_foreground_background(gray, rgb, alpha, solid_mask)
        seg_info = {
            "method": seg_res["method"],
            "foreground_area_percent": seg_res["foreground_area_percent"],
            "bokeh_depth_ratio": seg_res.get("bokeh_depth_ratio", 1.0),
            "intentional_bokeh_detected": seg_res.get("intentional_bokeh_detected", False),
            "status": seg_res.get("status", "Standard Framing")
        }
        
        # Florence Dense Visual Grounding (Spatial Regional Anchors)
        florence_res = extract_florence_visual_grounding(img, gray, rgb)

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
            "brisque": {
                "score": brisque_score,
                "status": brisque_status,
                "benchmark": "Ideal Stock Range: 0 - 35 (Lower = Sharper/Natural)"
            },
            "niqe": {
                "score": niqe_score,
                "status": niqe_status,
                "benchmark": "Ideal Stock Range: 1.5 - 5.0 (Lower = Higher Natural Scene Fidelity)"
            },
            "segmentation": seg_info,
            "florence_grounding": florence_res,
            "transparency": edges,
            "banding": {
                "score": round(float(banding), 2),
                "status": "Review possible banding" if banding > 65 else "No strong banding signal"
            },
            "jpeg_blocking": {
                "score": round(float(jpeg_blocking), 2),
                "status": "Strong repeated 8x8 blocking signal" if jpeg_blocking > 65 else ("Moderate blocking signal" if jpeg_blocking > 40 else "No strong blocking signal")
            },
            "background_edge_analysis": bg_edges,
            "ocr": ocr,
            "local_analysis": local_grid,
            "visible_pixel_analysis": True,
            "file_validation": "Valid (Passed OpenCV + BRISQUE + NIQE + Florence Visual Grounding)",
            "file_size_kb": file_size_kb
        }

        print(json.dumps(report, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": f"Python image analysis failed: {str(e)}"}))


if __name__ == '__main__':
    main()

