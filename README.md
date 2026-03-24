# 🤖 Kişisel AI Asistan

React Native Expo ile geliştirilmiş kapsamlı kişisel AI asistan uygulaması.

## 🚀 Özellikler

### 🤖 AI Özellikleri
- **Claude API (Opus 4.6)** ile güçlü AI asistan
- **Sesli komut** (Expo Audio + Whisper API)
- **Text-to-Speech** yanıtlar
- **Sabah brifing** otomatik oluşturma
- **Proaktif tavsiye** motoru
- **Haftalık özet** raporu

### 📧 Mail Entegrasyonu
- **Gmail API** - mail okuma, özetleme, kategorileme
- **Microsoft Outlook** (Graph API) - kurumsal mail desteği
- **AI ile mail analizi** - önem derecesi ve kategori atama

### 📅 Takvim
- **Google Calendar API** senkronizasyonu
- **Outlook Calendar** entegrasyonu
- Haftalık görünüm ve etkinlik detayları

### 🎤 Toplantı Zekası
- **Canlı ses kaydı** (Expo Audio)
- **OpenAI Whisper** ile transkript
- **Otomatik özet**: Genel özet, kararlar, aksiyonlar, açık sorular
- **Aksiyon maddeleri** → görev listesine otomatik ekleme
- **Katılımcılara özet maili** gönderme

### 📍 Günlük Optimizasyon
- Sesli/yazılı günlük plan girişi
- Mail, takvim, görevler ve konum entegrasyonu
- **Google Maps API** ile rota optimizasyonu
- **OpenWeather API** ile hava durumu entegrasyonu
- **Google Places API** ile yakın yer önerileri
- Gün içi plan değişikliği desteği

### 📌 Görev Yönetimi
- 4 kategori: **Aile, İş, Sosyal, Notlar**
- Öncelik seviyeleri (Yüksek/Orta/Düşük)
- Kaynak takibi (manuel/toplantı/AI/mail)
- Firebase Firestore senkronizasyonu

### 📱 Konum Bazlı Özellikler
- **Expo Location** arka plan konum takibi
- İşyerinde → iş görevleri öne çıkar
- Evde → aile görevleri öne çıkar
- **Google Places** yakın yer önerileri

### 📬 Telegram Bot
- Bot mesajlarını uygulama içinde görüntüleme
- Bot'tan kullanıcıya bildirim gönderme
- Sabah brifing bildirimleri

## 🛠 Kurulum

### 1. Bağımlılıkları Yükle
```bash
npm install
```

### 2. Ortam Değişkenlerini Ayarla
```bash
cp .env.example .env
# .env dosyasını kendi API anahtarlarınızla doldurun
```

### 3. Firebase Kurulumu
1. [Firebase Console](https://console.firebase.google.com)'da yeni proje oluşturun
2. Authentication → Google Sign-In'i etkinleştirin
3. Firestore Database oluşturun
4. `google-services.json` (Android) ve `GoogleService-Info.plist` (iOS) dosyalarını indirin

### 4. Google API Kurulumu
1. [Google Cloud Console](https://console.cloud.google.com)'da proje oluşturun
2. Gmail API, Calendar API, Maps API, Places API'yi etkinleştirin
3. OAuth 2.0 client ID oluşturun

### 5. Uygulamayı Çalıştır
```bash
npx expo start
```

## 📁 Proje Yapısı

```
src/
├── constants/          # Renkler, konfigürasyon, kategoriler
├── types/              # TypeScript tip tanımları
├── services/           # API servisleri
│   ├── firebase/       # Auth & Firestore
│   ├── claude/         # Anthropic Claude AI
│   ├── gmail/          # Gmail API
│   ├── calendar/       # Google Calendar
│   ├── outlook/        # Microsoft Graph
│   ├── telegram/       # Telegram Bot
│   ├── whisper/        # OpenAI Whisper (transkript)
│   ├── weather/        # OpenWeather API
│   └── location/       # Expo Location & Google Maps
├── store/              # Zustand state yönetimi
├── navigation/         # React Navigation
├── screens/            # Uygulama ekranları
└── components/         # Yeniden kullanılabilir bileşenler
```

## 🔑 Gerekli API Anahtarları

| Servis | Nerede Alınır |
|--------|---------------|
| Firebase | console.firebase.google.com |
| Anthropic Claude | console.anthropic.com |
| OpenAI Whisper | platform.openai.com |
| Google Maps/Places | console.cloud.google.com |
| OpenWeather | openweathermap.org/api |
| Telegram Bot | @BotFather (Telegram) |
| Microsoft Graph | portal.azure.com |

## 🏗 Mimari

- **State Yönetimi**: Zustand
- **Navigasyon**: React Navigation v6
- **Veritabanı**: Firebase Firestore (gerçek zamanlı)
- **Auth**: Firebase Auth + Google Sign-In
- **AI**: Claude Opus 4.6 (streaming + adaptive thinking)
- **Ses**: Expo Audio + OpenAI Whisper
- **Stil**: StyleSheet (custom, gradient)
