#!/usr/bin/env python3
"""Dedicated Python 3/OpenCV forensic QC microservice for MetaZo.
Run separately from the Node/Vercel app. POST JSON {image: data-url/base64, file_type: ...} to /analyze.
"""
import base64, json, os, tempfile, traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HOST = os.getenv("QC_HOST", "0.0.0.0")
PORT = int(os.getenv("QC_PORT", "8088"))
MAX_BYTES = int(os.getenv("QC_MAX_IMAGE_BYTES", str(50 * 1024 * 1024)))

class Handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/health":
            self._send(200, {"ok": True, "service": "metazo-python-qc", "engine": "OpenCV"})
        else:
            self._send(404, {"error": "Not found"})

    def do_POST(self):
        if self.path != "/analyze":
            return self._send(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BYTES * 2:
                return self._send(413, {"error": "Request too large"})
            body = self.rfile.read(length)
            data = json.loads(body.decode("utf-8"))
            encoded = data.get("image", "")
            if "," in encoded:
                encoded = encoded.split(",", 1)[1]
            image_bytes = base64.b64decode(encoded, validate=True)
            if len(image_bytes) > MAX_BYTES:
                return self._send(413, {"error": "Image too large"})

            suffix = ".png" if "png" in str(data.get("file_type", "")) else ".jpg"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
                f.write(image_bytes)
                temp_path = f.name
            try:
                try:
                    from image_analyzer import analyze_image_file
                    result = analyze_image_file(temp_path)
                except Exception as analyzer_exc:
                    print("[metazo-qc] analyzer exception:", analyzer_exc)
                    traceback.print_exc()
                    return self._send(500, {"error": f"OpenCV analyzer failed: {analyzer_exc}"})
                if result.get("error"):
                    return self._send(422, result)
                result["engine"] = "Python 3 + OpenCV + Pillow"
                result["evidence_policy"] = "pixel evidence only; resolution/file size are not quality gates"
                return self._send(200, result)
            finally:
                try: os.unlink(temp_path)
                except OSError: pass
        except Exception as exc:
            return self._send(500, {"error": str(exc)})

    def log_message(self, fmt, *args):
        print("[metazo-qc] " + fmt % args)

if __name__ == "__main__":
    print(f"MetaZo Python QC listening on {HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
