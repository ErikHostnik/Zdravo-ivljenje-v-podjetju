FROM ghcr.io/cirruslabs/flutter:3.32.2

RUN adduser --disabled-password --gecos '' --uid 1000 appuser && \
    chown -R appuser:appuser /home

WORKDIR /app

USER appuser

COPY --chown=appuser:appuser pubspec.* ./

RUN flutter pub get

COPY --chown=appuser:appuser . .
