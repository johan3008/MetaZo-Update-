# MetaZo Serious Image QC Service

This service keeps Python 3 + OpenCV out of the Vercel/serverless runtime while retaining forensic pixel analysis.

## Run

```bash
cd server
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements-qc.txt
python3 qc_service.py
```

Set the Node app environment variable:

```text
IMAGE_QC_PYTHON_URL=http://YOUR-QC-SERVICE:8088
```

The Node server calls `POST /analyze`. The service returns objective pixel evidence. Resolution, megapixels, and file size are informational only and are never quality gates.

For production, use the supplied `Dockerfile.qc` to deploy the service to a Python-capable container host.
