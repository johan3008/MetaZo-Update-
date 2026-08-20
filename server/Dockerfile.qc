FROM python:3.12-slim
WORKDIR /app
COPY server/requirements-qc.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY server/image_analyzer.py ./image_analyzer.py
COPY server/qc_service.py ./qc_service.py
EXPOSE 8088
ENV QC_HOST=0.0.0.0 QC_PORT=8088
CMD ["python3", "qc_service.py"]
