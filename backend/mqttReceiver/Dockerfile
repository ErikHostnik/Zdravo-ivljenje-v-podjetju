FROM python:3.11

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY receiver.py ./receiver.py

COPY .env .env

CMD ["python", "receiver.py"]
