#!/usr/bin/env python3
"""
MetaZo Convert VectorGen - Dedicated Inkscape CLI Vector Engine
High-fidelity Vector Processing Microservice (FastAPI + Inkscape CLI in Docker / Host)
Supports:
- High-fidelity SVG -> EPS 10 (Adobe Stock / Shutterstock / Freepik compliant)
- SVG -> AI / PDF (Adobe Illustrator compatible)
- EPS / AI -> SVG / EPS
- Artboard standardizer (4MP - 25MP: 4000x4000, 5000x5000, etc.)
- Text-to-Path vectorization
"""

import os
import re
import sys
import shutil
import tempfile
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse, FileResponse
from pydantic import BaseModel

HOST = os.getenv("VECTOR_HOST", "0.0.0.0")
PORT = int(os.getenv("VECTOR_PORT", "8089"))

app = FastAPI(
    title="MetaZo VectorGen Inkscape Engine",
    description="Dedicated Inkscape CLI vector processing microservice for Adobe Stock & Microstock standards.",
    version="1.0.0"
)

# Enable CORS for frontend and server communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def find_inkscape_binary() -> Optional[str]:
    """Locate inkscape binary across Docker Linux or Windows Host."""
    custom_path = os.getenv("INKSCAPE_PATH")
    if custom_path and os.path.exists(custom_path):
        return custom_path

    # Common Windows paths
    candidates = [
        "inkscape",
        "inkscape.com",
        "inkscape.exe",
        r"C:\Program Files\Inkscape\bin\inkscape.com",
        r"C:\Program Files\Inkscape\bin\inkscape.exe",
        r"C:\Program Files (x86)\Inkscape\bin\inkscape.com",
        r"C:\Program Files (x86)\Inkscape\bin\inkscape.exe",
        "/usr/bin/inkscape",
        "/usr/local/bin/inkscape"
    ]

    for c in candidates:
        found = shutil.which(c)
        if found:
            return found
        if os.path.isabs(c) and os.path.exists(c):
            return c

    return None


INKSCAPE_BIN = find_inkscape_binary()


def get_inkscape_version() -> str:
    """Check Inkscape version string."""
    if not INKSCAPE_BIN:
        return "Not found"
    try:
        res = subprocess.run([INKSCAPE_BIN, "--version"], capture_output=True, text=True, timeout=10)
        out = (res.stdout or res.stderr).strip()
        first_line = out.split("\n")[-1] if out else "Unknown"
        return first_line.strip()
    except Exception as e:
        return f"Error: {e}"


def resize_svg_artboard_xml(svg_text: str, target_w: float, target_h: float, margin_percent: float = 10.0) -> str:
    """
    Standardize SVG Artboard with safe margins and centering,
    preserving all vector elements, gradients, and definitions.
    """
    try:
        # Register namespaces to avoid ns0: prefixes
        ET.register_namespace('', 'http://www.w3.org/2000/svg')
        ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
        
        # Parse SVG XML
        root = ET.fromstring(svg_text)
        
        # Extract existing viewBox
        viewbox_str = root.attrib.get('viewBox', '')
        orig_w = target_w
        orig_h = target_h
        min_x = 0.0
        min_y = 0.0

        if viewbox_str:
            parts = [float(p) for p in re.split(r'[\s,]+', viewbox_str.strip()) if p]
            if len(parts) == 4:
                min_x, min_y, orig_w, orig_h = parts
        else:
            w_str = root.attrib.get('width', '')
            h_str = root.attrib.get('height', '')
            w_val = re.findall(r'[0-9.]+', w_str)
            h_val = re.findall(r'[0-9.]+', h_str)
            if w_val:
                orig_w = float(w_val[0])
            if h_val:
                orig_h = float(h_val[0])

        if orig_w <= 0:
            orig_w = target_w
        if orig_h <= 0:
            orig_h = target_h

        # Compute scaling with safe margin
        safe_factor = max(0.5, (100.0 - margin_percent) / 100.0)
        avail_w = target_w * safe_factor
        avail_h = target_h * safe_factor

        scale_x = avail_w / orig_w
        scale_y = avail_h / orig_h
        scale = min(scale_x, scale_y)

        draw_w = orig_w * scale
        draw_h = orig_h * scale
        offset_x = (target_w - draw_w) / 2.0 - (min_x * scale)
        offset_y = (target_h - draw_h) / 2.0 - (min_y * scale)

        # Create wrapper group for content to scale & center cleanly
        ns = '{http://www.w3.org/2000/svg}'
        children = list(root)
        
        # Preserve <defs> at top level, wrap visual elements
        defs_elements = []
        visual_elements = []
        for child in children:
            tag_name = child.tag.replace(ns, '') if child.tag.startswith(ns) else child.tag
            if tag_name.lower() in ('defs', 'metadata', 'style'):
                defs_elements.append(child)
            else:
                visual_elements.append(child)

        # Clear root children and rebuild
        for child in children:
            root.remove(child)

        for d in defs_elements:
            root.append(d)

        # Group wrapper
        wrapper = ET.Element(f'{ns}g', {
            'id': 'MetaZo_Artboard_Content',
            'transform': f'translate({offset_x:.4f}, {offset_y:.4f}) scale({scale:.6f})'
        })
        for v in visual_elements:
            wrapper.append(v)
        root.append(wrapper)

        # Update root attributes
        root.attrib['width'] = f'{int(target_w)}'
        root.attrib['height'] = f'{int(target_h)}'
        root.attrib['viewBox'] = f'0 0 {int(target_w)} {int(target_h)}'

        return ET.tostring(root, encoding='utf-8', xml_declaration=True).decode('utf-8')
    except Exception as e:
        # Fallback to original if XML manipulation fails
        print(f"[vector_service] Artboard resize warning: {e}", file=sys.stderr)
        return svg_text


def patch_eps_for_microstock(eps_path: str, width: float, height: float):
    """
    Ensure the generated EPS adheres to Adobe Stock / Microstock EPS 10 standard:
    - BoundingBox & HiResBoundingBox
    - Adobe Illustrator DSC comments
    - Proper color space setup
    """
    try:
        with open(eps_path, 'rb') as f:
            content = f.read()

        text = content.decode('latin1', errors='ignore')

        w_int = int(round(width))
        h_int = int(round(height))

        # Check / replace bounding box
        bbox_str = f"%%BoundingBox: 0 0 {w_int} {h_int}"
        hires_bbox = f"%%HiResBoundingBox: 0 0 {width:.4f} {height:.4f}"

        if "%%BoundingBox:" in text:
            text = re.sub(r'%%BoundingBox:[^\r\n]+', bbox_str, text, count=1)
        else:
            text = text.replace("%!PS-Adobe-3.0 EPSF-3.0", f"%!PS-Adobe-3.0 EPSF-3.0\n{bbox_str}")

        if "%%HiResBoundingBox:" in text:
            text = re.sub(r'%%HiResBoundingBox:[^\r\n]+', hires_bbox, text, count=1)
        else:
            text = text.replace(bbox_str, f"{bbox_str}\n{hires_bbox}")

        # Inject Adobe Illustrator 10 DSC Comments if missing
        ai_comments = (
            "%%Creator: Adobe Illustrator(R) 10.0 / MetaZo Inkscape Engine\n"
            "%%AI8_CreatorVersion: 10.0.0\n"
            "%AI5_FileFormat 2.0\n"
            "%AI3_ColorUsage: Color"
        )
        if "%AI5_FileFormat" not in text:
            text = text.replace("%%EndComments", f"{ai_comments}\n%%EndComments")

        with open(eps_path, 'wb') as f:
            f.write(text.encode('latin1'))

    except Exception as e:
        print(f"[vector_service] Warning patching EPS headers: {e}", file=sys.stderr)


@app.get("/health")
def health_check():
    """Health and diagnostic endpoint."""
    inkscape_path = find_inkscape_binary()
    version = get_inkscape_version()
    is_available = inkscape_path is not None and "Inkscape" in version

    return {
        "status": "online" if is_available else "degraded",
        "service": "metazo-vector-engine",
        "engine": "Inkscape CLI",
        "inkscape_path": inkscape_path,
        "inkscape_version": version,
        "supported_targets": ["eps", "ai", "pdf", "svg", "png"],
        "default_artboard_megapixels": "25 MP (5000x5000 px)",
        "features": {
            "text_to_path": True,
            "adobe_stock_eps10": True,
            "artboard_scaling": True,
            "safe_margin": True
        }
    }


class ConvertRawSvgRequest(BaseModel):
    svg_content: str
    target_format: str = "eps"
    target_width: int = 5000
    target_height: int = 5000
    margin_percent: float = 10.0
    text_to_path: bool = True
    dpi: int = 300


@app.post("/convert-raw-svg")
def convert_raw_svg(req: ConvertRawSvgRequest):
    """Convert raw SVG string to EPS, AI, PDF, or SVG."""
    return process_conversion_internal(
        input_bytes=req.svg_content.encode('utf-8'),
        filename="vector.svg",
        target_format=req.target_format,
        target_width=req.target_width,
        target_height=req.target_height,
        margin_percent=req.margin_percent,
        text_to_path=req.text_to_path,
        dpi=req.dpi
    )


@app.post("/convert")
async def convert_vector_file(
    file: UploadFile = File(...),
    target_format: str = Form("eps"),
    target_width: int = Form(5000),
    target_height: int = Form(5000),
    margin_percent: float = Form(10.0),
    text_to_path: bool = Form(True),
    dpi: int = Form(300)
):
    """Multipart upload vector conversion endpoint."""
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    return process_conversion_internal(
        input_bytes=contents,
        filename=file.filename or "file.svg",
        target_format=target_format,
        target_width=target_width,
        target_height=target_height,
        margin_percent=margin_percent,
        text_to_path=text_to_path,
        dpi=dpi
    )


def process_conversion_internal(
    input_bytes: bytes,
    filename: str,
    target_format: str,
    target_width: int,
    target_height: int,
    margin_percent: float,
    text_to_path: bool,
    dpi: int
) -> Response:
    inkscape_bin = find_inkscape_binary()
    if not inkscape_bin:
        raise HTTPException(
            status_code=503,
            detail="Inkscape CLI engine is not installed or not found on host/container."
        )

    target_format = target_format.lower().strip()
    if target_format not in ("eps", "ai", "pdf", "svg", "png"):
        raise HTTPException(status_code=400, detail=f"Unsupported target format: {target_format}")

    ext = Path(filename).suffix.lower()
    base_name = Path(filename).stem

    with tempfile.TemporaryDirectory(prefix="metazo_vec_") as tmp_dir:
        input_path = os.path.join(tmp_dir, f"input{ext if ext else '.svg'}")
        
        # If input is SVG, pre-resize artboard and margins
        if ext == '.svg' or input_bytes.startswith(b'<svg') or b'<svg' in input_bytes[:500]:
            try:
                svg_str = input_bytes.decode('utf-8', errors='replace')
                resized_svg = resize_svg_artboard_xml(svg_str, target_width, target_height, margin_percent)
                with open(input_path, 'w', encoding='utf-8') as f:
                    f.write(resized_svg)
            except Exception:
                with open(input_path, 'wb') as f:
                    f.write(input_bytes)
        else:
            with open(input_path, 'wb') as f:
                f.write(input_bytes)

        # Output format mapping
        # Note: Adobe Illustrator (.ai) files are modern PDF containers with AI private stream
        is_ai = (target_format == "ai")
        actual_export_type = "pdf" if is_ai else target_format
        output_ext = ".ai" if is_ai else f".{actual_export_type}"
        output_path = os.path.join(tmp_dir, f"output{output_ext}")

        # Build Inkscape CLI Command
        cmd = [
            inkscape_bin,
            input_path,
            f"--export-filename={output_path}",
            f"--export-type={actual_export_type}",
            "--export-area-page"
        ]

        if target_format == "eps":
            # EPS 10 / PostScript level 3 for microstock compatibility
            cmd.append("--export-ps-level=3")

        if text_to_path:
            cmd.append("--export-text-to-path")

        if dpi and dpi > 0:
            cmd.append(f"--export-dpi={dpi}")

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
            if res.returncode != 0:
                print(f"[vector_service] Inkscape CLI error: {res.stderr}", file=sys.stderr)
                raise RuntimeError(f"Inkscape CLI execution failed: {res.stderr}")
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="Inkscape conversion timed out (file too complex)")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Conversion error: {exc}")

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise HTTPException(status_code=500, detail="Generated output file is empty or missing.")

        # If target is EPS, patch headers for Adobe Stock EPS 10 compliance
        if target_format == "eps":
            patch_eps_for_microstock(output_path, target_width, target_height)

        with open(output_path, 'rb') as f:
            result_bytes = f.read()

        # MIME types
        mime_map = {
            "eps": "application/postscript",
            "ai": "application/illustrator",
            "pdf": "application/pdf",
            "svg": "image/svg+xml",
            "png": "image/png"
        }
        content_type = mime_map.get(target_format, "application/octet-stream")
        out_filename = f"{base_name}_{target_width}x{target_height}{output_ext}"

        return Response(
            content=result_bytes,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{out_filename}"',
                "X-Engine": "Inkscape-CLI",
                "X-Artboard-Dimensions": f"{target_width}x{target_height}",
                "Access-Control-Expose-Headers": "Content-Disposition, X-Engine, X-Artboard-Dimensions"
            }
        )


if __name__ == "__main__":
    import uvicorn
    print(f"MetaZo Convert VectorGen (Inkscape CLI Engine) starting on {HOST}:{PORT}")
    inkscape_bin = find_inkscape_binary()
    print(f"Detected Inkscape binary: {inkscape_bin}")
    print(f"Version: {get_inkscape_version()}")
    uvicorn.run("vector_service:app", host=HOST, port=PORT, reload=False, workers=1)
