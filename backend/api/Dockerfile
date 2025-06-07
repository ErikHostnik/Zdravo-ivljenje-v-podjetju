FROM node:18-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir \
    opencv-contrib-python \
    numpy \
    mtcnn \
    scikit-learn \
    tensorflow \
    requests

WORKDIR /usr/src/app

COPY ./api/package*.json ./
RUN npm install
COPY ./api ./
COPY ./scripts /usr/src/app/scripts

EXPOSE 3001
CMD ["npm", "start"]
