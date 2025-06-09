FROM node:18-bullseye

WORKDIR /app

RUN mkdir -p uploads/tmp uploads/verify

RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    build-essential cmake pkg-config \
    libjpeg-dev libtiff-dev libpng-dev \
    libavcodec-dev libavformat-dev libswscale-dev \
    libv4l-dev libxvidcore-dev libx264-dev \
    libgtk-3-dev libatlas-base-dev gfortran \
  && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /pyenv

RUN ln -s /pyenv/bin/python /usr/local/bin/python

COPY requirements.txt ./
RUN /pyenv/bin/pip install --upgrade pip \
 && /pyenv/bin/pip install --no-cache-dir -r requirements.txt

ENV PATH="/pyenv/bin:$PATH"

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
