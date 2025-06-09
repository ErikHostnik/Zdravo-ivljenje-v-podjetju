FROM ghcr.io/cirruslabs/flutter:3.32.2

WORKDIR /app

COPY pubspec.* ./

RUN flutter clean
RUN flutter pub get

COPY . .

