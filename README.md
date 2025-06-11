# Fit Office

*Kratek opis: Fit Office je celovita rešitev za spremljanje in vizualizacijo vaše športne aktivnosti, dostopna prek spletne aplikacije (React + Node.js) in mobilne aplikacije (Flutter).*

---

## Vsebina datoteke

1. [Opis projekta](#opis-projekta)  
2. [Predpogoji (Prerequisites)](#predpogoji-prerequisites)  
3. [Prenos (Download)](#prenos-download)  
4. [Namestitev](#namestitev)  
5. [Konfiguracija](#konfiguracija)  
6. [Zagon aplikacije](#zagon-aplikacije)  
7. [Uporaba](#uporaba)  
8. [Reševanje težav (Troubleshooting)](#reševanje-težav-troubleshooting)  
9. [Pogosta vprašanja (FAQ)](#pogosta-vprasanja-faq)  
10. [Kontakt](#kontakt)  

---

## Opis projekta

- **Kaj je to?**  
  Fit Office je sistem za zbiranje, analiziranje in prikazovanje podatkov iz različnih senzorjev (temperatura, gibanje) mobilne naprave, s katero spremljate podrobnejšo statistiko vaših tekov, pohodov itd.  
- **Zakaj?**  
  Ker je zastojn odprtokodno optimizirano tudi za stare mobilne naprave.

## Predpogoji (Prerequisites)

Preden začnete, poskrbite, da imate nameščeno:

- **Operacijski sistem**  
  - Windows 10 ali novejši  
  - macOS 10.15 (Catalina) ali novejši  
  - Linux (Ubuntu 20.04+ ali ekvivalent)  
- **Node.js** (v1.2. verzija 14.x ali novejša)  
- **npm** (priporočeno 6.x ali novejša) ali **yarn**  
- **Git** (za kloniranje repozitorija)  
- **Docker & Docker Compose** (za zagon containeriziranega okolja)  
- **Python 3.8+** (za MQTT skripto)  
- **Android Studio** (za Android) in/ali **Xcode** (za iOS) – le, če boste gradili mobilno aplikacijo iz Flutter kode

> **Namig**:  
> - Node.js & npm: https://nodejs.org/  
> - Git: https://git-scm.com/  
> - Docker: https://www.docker.com/get-started  

## Prenos (Download)

Klonirajte repozitorij z GitHub-a:

```bash
git clone (https://github.com/ErikHostnik/Zdravo-ivljenje-v-podjetju.git)
cd fit-office
```

## Namestitev

### 1. Backend (Node.js + Python MQTT Receiver + Mosquitto)

```bash
cd root/backend

# 1. Namestite Node odvisnosti
npm install

# 2. Namestite Python odvisnosti
pip install -r mqttReciever/requirements.txt
```

### 2. Frontend (React)

```bash
cd ../frontend
npm install
```

### 3. Mobilna aplikacija (Flutter)

```bash
cd ../mobile
flutter pub get
```

## Konfiguracija

V mapi `root/backend` ustvarite datoteko `.env` z naslednjimi spremenljivkami:

```ini
# Node.js API
PORT=3000
MONGODB_URI=mongodb://localhost:27017/fitoffice
JWT_SECRET=vaš_super_tajni_ključ

# MQTT
MQTT_BROKER_URL=localhost
MQTT_BROKER_PORT=1883
MQTT_TOPIC=senzorji/#

# Mosquitto (če želite spreminjati nastavitev brokerja)
# konfiguracija se nahaja v root/backend/mosquitto/mosquitto.conf
```

## Zagon aplikacije

### 1. Zagon lokalnega MQTT brokera (Mosquitto)

```bash
cd root/backend/mosquitto
mosquitto -c mosquitto.conf
```

### 2. Zagon Python MQTT receiver

```bash
cd ../mqttReciever
python ./receiver.py
```

### 3. Zagon Node.js strežnika

```bash
cd ../
npm run dev
```

### 4. Zagon React aplikacije

```bash
cd ../frontend
npm start
```

### 5. Zagon Flutter mobilne aplikacije

```bash
cd ../mobile
flutter run
```

### 6. (Opcijsko) Celoten projekt z Docker Compose

```bash
docker-compose up --build
```

## Uporaba

- Dostop do **spletne aplikacije**: [http://localhost:3000](http://localhost:3000)  
- Dostop do **API dokumentacije** (Swagger): [http://localhost:3000/api-docs](http://localhost:3000/api-docs)  
- **Mobilna aplikacija**: zaganjajte na vašem emulatorju ali napravi; aplikacija samodejno pošilja in sprejema MQTT podatke.  

## Reševanje težav (Troubleshooting)

- **MQTT se ne poveže**  
  - Preverite, ali je mosquitto dejansko zagnan (`ps aux | grep mosquitto`).  
  - Preverite, ali je `MQTT_BROKER_URL` v `.env` pravilno nastavljen.

- **Node.js napake pri zagonu**  
  - Prepričajte se, da ste namestili vse odvisnosti (`npm install`).  
  - Preverite spremenljivke v `.env`.

- **Flutter build ne uspe**  
  - Zaženite `flutter doctor` in odpravite opozorila.  
  - Posodobite Android Studio/Xcode do najnovejše verzije.

### Pogosta vprašanja (FAQ)

**1. Kako spremenim MQTT temo?**  
- Uredite `MQTT_TOPIC` v `.env` in ustrezno nastavite `receiver.py`, da posluša novo temo.

**2. Kako dodam nove senzorje?**  
- V mobilni aplikaciji definirajte nov kanal za senzor in na strežniku/receiverju dodajte ustrezno obdelavo.

**3. Kako povečam zmogljivost backend baze?**  
- Razmislite o namestitvi MongoDB v repliku ali na ločen strežnik in prilagodite `MONGODB_URI`.

## Kontakt

- Avtor: Martin Jevševar, Erik Hostnik 
- E-pošta: martin.jevsevar@gmail.com, erikhostnik@gmail.com
- GitHub: [(https://github.com/ErikHostnik/Zdravo-ivljenje-v-podjetju.git) ]
