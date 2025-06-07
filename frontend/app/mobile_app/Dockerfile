FROM cirrusci/flutter:stable AS builder

WORKDIR /usr/src/app

COPY pubspec.* ./
RUN flutter pub get
COPY . .

# Zgradimo release APK
RUN flutter build apk --release

FROM scratch AS export
# kopiramo samo apk
COPY --from=builder /usr/src/app/build/app/outputs/flutter-apk/app-release.apk /app-release.apk

ENTRYPOINT ["cat", "/app-release.apk"]
