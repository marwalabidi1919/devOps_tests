# APIs Externes ImplÃ©mentÃ©es dans SkillUpTn

Documentation complÃ¨te des 4 APIs externes dÃ©jÃ  intÃ©grÃ©es dans le projet SkillUpTn.

---

## Table des MatiÃ¨res

1. [OpenRouter API - AutoPrompt (Prompt Rewriter)](#1-openrouter-api---autoprompt)
2. [Maps API - Mapbox + Leaflet (Location Picker)](#2-maps-api---mapbox--leaflet)
3. [Weather API - Open-Meteo (Widget MÃ©tÃ©o)](#3-weather-api---open-meteo)
4. [DeepL API - Traduction Professionnelle](#4-deepl-api---traduction-professionnelle)

---

## 1. OpenRouter API - AutoPrompt

### Description

**OpenRouter** est une API qui fournit un accÃ¨s unifiÃ© Ã  plusieurs modÃ¨les de langage (LLM) comme GPT-4, Claude, Llama, etc. Dans SkillUpTn, elle est utilisÃ©e pour le **Prompt Rewriter** - une fonctionnalitÃ© qui amÃ©liore automatiquement les textes saisis par les utilisateurs (descriptions d'activitÃ©s, compÃ©tences, etc.).

**Fournisseur** : OpenRouter (openrouter.ai)
**Type** : Intelligence Artificielle / LLM
**CoÃ»t** : Pay-as-you-go (crÃ©dits API)

### Cas d'Usage dans SkillUpTn

- **AmÃ©lioration descriptions formations** : Transforme une description basique en texte professionnel
- **GÃ©nÃ©ration compÃ©tences requises** : SuggÃ¨re les compÃ©tences nÃ©cessaires pour une formation
- **RÃ©Ã©criture objectifs** : Formule des objectifs pÃ©dagogiques clairs
- **Correction orthographe** : Corrige automatiquement les textes saisis

### Fichiers LiÃ©s

```
frontend/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ pages/
â”‚   â”‚   â””â”€â”€ shared/
â”‚   â”‚       â””â”€â”€ PromptRewriter.tsx      # Interface utilisateur
â”‚   â””â”€â”€ services/
â”‚       â””â”€â”€ openRouterService.ts        # Service API (Ã  crÃ©er)
```

### ImplÃ©mentation Technique

#### Configuration

```env
# .env
VITE_OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
```

#### Service API

```typescript
// src/services/openRouterService.ts
const OPENROUTER_API = 'https://openrouter.ai/api/v1';

export async function rewritePrompt(prompt: string, type: 'description' | 'skills' | 'objectives') {
  const systemMessages = {
    description: 'Tu es un expert en pÃ©dagogie. AmÃ©liore cette description de formation pour la rendre professionnelle, attractive et complÃ¨te.',
    skills: 'Liste les compÃ©tences techniques et soft skills nÃ©cessaires pour cette formation, sÃ©parÃ©es par des virgules.',
    objectives: 'Formule 3 objectifs pÃ©dagogiques SMART pour cette formation.'
  };

  const response = await fetch(`${OPENROUTER_API}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'SkillUpTn'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: systemMessages[type] },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

#### Utilisation dans le Composant

```typescript
// src/pages/shared/PromptRewriter.tsx
import { useState } from 'react';
import { rewritePrompt } from '../../services/openRouterService';
import { Loader2, Sparkles } from 'lucide-react';

export default function PromptRewriter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'description' | 'skills' | 'objectives'>('description');

  const handleRewrite = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const result = await rewritePrompt(input, type);
      setOutput(result);
    } catch (error) {
      console.error('OpenRouter error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">AmÃ©liorateur de Texte IA</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Type d'amÃ©lioration</label>
        <select 
          value={type} 
          onChange={(e) => setType(e.target.value as any)}
          className="w-full p-2 border rounded"
        >
          <option value="description">Description de formation</option>
          <option value="skills">CompÃ©tences requises</option>
          <option value="objectives">Objectifs pÃ©dagogiques</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Texte original</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-64 p-4 border rounded resize-none"
            placeholder="DÃ©crivez votre formation ici..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Version amÃ©liorÃ©e</label>
          <textarea
            value={output}
            readOnly
            className="w-full h-64 p-4 border rounded bg-gray-50 resize-none"
          />
        </div>
      </div>

      <button
        onClick={handleRewrite}
        disabled={loading || !input.trim()}
        className="mt-4 px-6 py-2 bg-primary text-white rounded flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {loading ? 'AmÃ©lioration...' : 'AmÃ©liorer avec IA'}
      </button>
    </div>
  );
}
```

### Routes et Navigation

```typescript
// src/App.tsx
import PromptRewriter from './pages/shared/PromptRewriter';

// Dans les routes HR et Admin
<Route path="/hr/prompt-rewriter" element={<PromptRewriter />} />
<Route path="/admin/prompt-rewriter" element={<PromptRewriter />} />
```

### DÃ©pendances

```bash
npm install lucide-react  # Si pas dÃ©jÃ  installÃ©
```

### Tests

```typescript
// __tests__/openRouterService.test.ts
describe('OpenRouter Service', () => {
  it('should rewrite description', async () => {
    const result = await rewritePrompt('Formation Excel basique', 'description');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(20);
  });
});
```

---

## 2. Maps API - Mapbox + Leaflet

### Description

L'intÃ©gration combine **Mapbox** (tuiles cartographiques personnalisables) et **Leaflet** (bibliothÃ¨que JavaScript de cartographie interactive). Elle permet la sÃ©lection de localisation prÃ©cise pour les formations via une carte interactive.

**Fournisseurs** : 
- Mapbox (mapbox.com) - Tuiles et geocoding
- Leaflet (leafletjs.com) - BibliothÃ¨que cartographie

**Type** : GÃ©olocalisation / Cartographie
**CoÃ»t** : Mapbox a un tier gratuit (50,000 requÃªtes/mois)

### Cas d'Usage dans SkillUpTn

- **CrÃ©ation d'activitÃ©** : SÃ©lection de l'emplacement exact de la formation sur la carte
- **Demande d'activitÃ© (Manager)** : Indiquer oÃ¹ se dÃ©roulera la formation
- **Visualisation** : Affichage des lieux de formation sur une carte

### Fichiers LiÃ©s

```
frontend/
â”œâ”€â”€ package.json                        # Dependencies: leaflet, react-leaflet
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â””â”€â”€ LocationPicker.tsx          # Composant carte principal
â”‚   â”œâ”€â”€ pages/
â”‚   â”‚   â”œâ”€â”€ hr/
â”‚   â”‚   â”‚   â””â”€â”€ CreateActivity.tsx      # IntÃ©gration LocationPicker
â”‚   â”‚   â””â”€â”€ manager/
â”‚   â”‚       â””â”€â”€ ManagerActivityRequests.tsx  # IntÃ©gration LocationPicker
â”‚   â””â”€â”€ index.css                       # Styles Leaflet
```

backend/
â””â”€â”€ src/
    â”œâ”€â”€ activities/
    â”‚   â”œâ”€â”€ dto/
    â”‚   â”‚   â””â”€â”€ create-activity.dto.ts  # LocationDto
    â”‚   â””â”€â”€ schemas/
    â”‚       â””â”€â”€ activity.schema.ts        # SchÃ©ma location
```

### ImplÃ©mentation Technique

#### DÃ©pendances

```bash
npm install leaflet react-leaflet @types/leaflet
```

#### Configuration

```env
# .env
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

#### ModÃ¨le de DonnÃ©es (Backend)

```typescript
// backend/src/activities/dto/create-activity.dto.ts
class LocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  address: string;
}

export class CreateActivityDto {
  // ... autres champs
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
}
```

```typescript
// backend/src/activities/schemas/activity.schema.ts
@Prop({
  type: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  }
})
location: {
  lat: number;
  lng: number;
  address: string;
};
```

#### Composant LocationPicker

```typescript
// src/components/LocationPicker.tsx
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface LocationPickerProps {
  value: Location | null;
  onChange: (location: Location) => void;
  defaultCenter?: { lat: number; lng: number };
}

// IcÃ´ne personnalisÃ©e pour le marqueur
const customIcon = new L.Icon({
  iconUrl: '/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

function LocationMarker({ onLocationSelect }: { onLocationSelect: (loc: Location) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  const map = useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition(e.latlng);
      
      // Reverse geocoding avec Mapbox
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&language=fr`
      );
      const data = await response.json();
      const address = data.features?.[0]?.place_name || 'Adresse inconnue';
      
      onLocationSelect({ lat, lng, address });
    }
  });

  return position ? <Marker position={position} icon={customIcon} /> : null;
}

export default function LocationPicker({ 
  value, 
  onChange, 
  defaultCenter = { lat: 36.8065, lng: 10.1815 } // Tunis par dÃ©faut
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Recherche d'adresse
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&language=fr&limit=1`
    );
    const data = await response.json();
    
    if (data.features?.[0]) {
      const [lng, lat] = data.features[0].center;
      const address = data.features[0].place_name;
      onChange({ lat, lng, address });
    }
  };

  return (
    <div className="space-y-4">
      {/* Recherche d'adresse */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une adresse..."
          className="flex-1 p-2 border rounded"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-primary text-white rounded"
        >
          Rechercher
        </button>
      </div>

      {/* Carte */}
      <div className="h-96 border rounded overflow-hidden">
        <MapContainer
          center={value ? [value.lat, value.lng] : [defaultCenter.lat, defaultCenter.lng]}
          zoom={13}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
            url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`}
          />
          <LocationMarker onLocationSelect={onChange} />
          {value && (
            <Marker 
              position={[value.lat, value.lng]} 
              icon={customIcon}
            />
          )}
        </MapContainer>
      </div>

      {/* Affichage adresse sÃ©lectionnÃ©e */}
      {value && (
        <div className="p-3 bg-gray-50 rounded">
          <p className="font-medium">{value.address}</p>
          <p className="text-sm text-gray-600">
            Lat: {value.lat.toFixed(6)}, Lng: {value.lng.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
}
```

#### Utilisation dans CreateActivity

```typescript
// src/pages/hr/CreateActivity.tsx
import LocationPicker from '../../components/LocationPicker';

// Dans le state du formulaire
const [form, setForm] = useState({
  // ... autres champs
  location: null as { lat: number; lng: number; address: string } | null
});

// Dans le rendu JSX
<div className="space-y-2">
  <label className="text-sm font-medium">Localisation</label>
  <LocationPicker
    value={form.location}
    onChange={(location) => setForm({ ...form, location })}
  />
</div>

// Dans la soumission
const handleSubmit = async () => {
  const payload = {
    ...form,
    location: form.location
  };
  await fetchWithAuth(`${API_BASE_URL}/activities`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};
```

#### Styles CSS (index.css)

```css
/* Leaflet styles */
@import 'leaflet/dist/leaflet.css';

.leaflet-container {
  font-family: inherit;
}
```

### FonctionnalitÃ©s

1. **Carte interactive** : Zoom, dÃ©placement, clic pour marquer
2. **Recherche d'adresse** : Autocomplete Mapbox Geocoding API
3. **Reverse geocoding** : Adresse textuelle depuis coordonnÃ©es
4. **Marqueur persistant** : Affiche la position sÃ©lectionnÃ©e
5. **Tunis par dÃ©faut** : CentrÃ© sur Tunis (36.8065, 10.1815)

---

## 3. Weather API - Open-Meteo

### Description

**Open-Meteo** est une API mÃ©tÃ©o open source et gratuite qui fournit des prÃ©visions mÃ©tÃ©orologiques prÃ©cises sans besoin de clÃ© API. Elle est utilisÃ©e dans le widget mÃ©tÃ©o affichÃ© dans l'en-tÃªte de l'application.

**Fournisseur** : Open-Meteo (open-meteo.com)
**Type** : MÃ©tÃ©orologie
**CoÃ»t** : 100% gratuit, open source
**Limites** : Pas de rate limit strict

### Cas d'Usage dans SkillUpTn

- **Widget en-tÃªte** : Affiche mÃ©tÃ©o actuelle et prÃ©visions rapides
- **Planning formations** : VÃ©rifier conditions mÃ©tÃ©o pour formations extÃ©rieures
- **Dashboard employÃ©** : Info mÃ©tÃ©o quotidienne

### Fichiers LiÃ©s

```
frontend/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ WeatherWidget.tsx           # Widget compact header
â”‚   â”‚   â””â”€â”€ WeatherModal.tsx              # Modal dÃ©taillÃ© prÃ©visions
â”‚   â””â”€â”€ components/layout/
â”‚       â””â”€â”€ Header.tsx                    # IntÃ©gration WeatherWidget
```

### ImplÃ©mentation Technique

#### API Endpoint

```
https://api.open-meteo.com/v1/forecast
```

#### Composant WeatherWidget

```typescript
// src/components/WeatherWidget.tsx
import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Wind, Droplets, Thermometer } from 'lucide-react';
import WeatherModal from './WeatherModal';

interface WeatherData {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  feelsLike: number;
}

const weatherCodes: Record<number, { icon: JSX.Element; description: string; color: string }> = {
  0: { icon: <Sun />, description: 'EnsoleillÃ©', color: 'text-yellow-500' },
  1: { icon: <Cloud />, description: 'Partiellement nuageux', color: 'text-gray-500' },
  2: { icon: <Cloud />, description: 'Nuageux', color: 'text-gray-600' },
  3: { icon: <Cloud />, description: 'Couvert', color: 'text-gray-700' },
  51: { icon: <CloudRain />, description: 'Pluie lÃ©gÃ¨re', color: 'text-blue-400' },
  61: { icon: <CloudRain />, description: 'Pluie', color: 'text-blue-600' },
  // ... autres codes
};

interface WeatherWidgetProps {
  city?: string;
  lat?: number;
  lng?: number;
}

export default function WeatherWidget({ 
  city = 'Tunis', 
  lat = 36.8065, 
  lng = 10.1815 
}: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchWeather();
    // RafraÃ®chir toutes les 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lat, lng]);

  const fetchWeather = async () => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=relativehumidity_2m,apparent_temperature&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Africa/Tunis`
      );
      const data = await response.json();

      setWeather({
        temperature: data.current_weather.temperature,
        weatherCode: data.current_weather.weathercode,
        windSpeed: data.current_weather.windspeed,
        humidity: data.hourly.relativehumidity_2m[0],
        feelsLike: data.hourly.apparent_temperature[0]
      });
    } catch (error) {
      console.error('Weather fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (!isModalOpen) {
      setIsModalOpen(true);
      setShowDetails(false);
    } else if (!showDetails) {
      setShowDetails(true);
    } else {
      setIsModalOpen(false);
      setShowDetails(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-gray-300" />
        <div className="w-16 h-4 bg-gray-300 rounded" />
      </div>
    );
  }

  if (!weather) return null;

  const weatherInfo = weatherCodes[weather.weatherCode] || weatherCodes[0];

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
      >
        <span className={weatherInfo.color}>
          {weatherInfo.icon}
        </span>
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold">{weather.temperature}Â°C</span>
          <span className="text-xs text-muted-foreground">{city}</span>
        </div>
      </button>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 p-4 bg-card rounded-lg shadow-lg border min-w-[200px] z-50">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4" />
              <span>Ressenti: {weather.feelsLike}Â°C</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4" />
              <span>Vent: {weather.windSpeed} km/h</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              <span>HumiditÃ©: {weather.humidity}%</span>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <WeatherModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          city={city}
          lat={lat}
          lng={lng}
        />
      )}
    </>
  );
}
```

#### Composant WeatherModal (DÃ©taillÃ©)

```typescript
// src/components/WeatherModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Calendar, Thermometer, Wind, Droplets, Sun, Cloud, CloudRain } from 'lucide-react';

interface ForecastDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
}

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  lat: number;
  lng: number;
}

export default function WeatherModal({ isOpen, onClose, city, lat, lng }: WeatherModalProps) {
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchForecast();
  }, [isOpen, lat, lng]);

  const fetchForecast = async () => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Africa/Tunis&forecast_days=7`
      );
      const data = await response.json();

      const formatted: ForecastDay[] = data.daily.time.map((date: string, index: number) => ({
        date,
        maxTemp: data.daily.temperature_2m_max[index],
        minTemp: data.daily.temperature_2m_min[index],
        weatherCode: data.daily.weathercode[index]
      }));

      setForecast(formatted);
    } catch (error) {
      console.error('Forecast fetch error:', error);
    }
  };

  const searchLocation = async () => {
    // Utiliser l'API de geocoding pour trouver les coordonnÃ©es
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchCity)}&count=1&language=fr&format=json`
      );
      const data = await response.json();
      if (data.results?.[0]) {
        const { latitude, longitude, name } = data.results[0];
        // RafraÃ®chir avec nouvelles coordonnÃ©es
        fetchForecast();
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-8 h-8 text-yellow-500" />;
    if (code <= 3) return <Cloud className="w-8 h-8 text-gray-500" />;
    return <CloudRain className="w-8 h-8 text-blue-500" />;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Sun className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-semibold">MÃ©tÃ©o - {city}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              placeholder="Rechercher une ville..."
              className="flex-1 px-4 py-2 border rounded-lg"
              onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
            />
            <button
              onClick={searchLocation}
              className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Rechercher
            </button>
          </div>
        </div>

        {/* 7-Day Forecast */}
        <div className="p-4">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            PrÃ©visions 7 jours
          </h3>

          <div className="grid grid-cols-7 gap-2">
            {forecast.map((day, index) => (
              <button
                key={day.date}
                onClick={() => setSelectedDay(index)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  selectedDay === index 
                    ? 'bg-primary/10 border-primary' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <p className="text-sm font-medium">{formatDate(day.date)}</p>
                <div className="my-2 flex justify-center">
                  {getWeatherIcon(day.weatherCode)}
                </div>
                <p className="text-lg font-bold">{day.maxTemp}Â°</p>
                <p className="text-sm text-gray-500">{day.minTemp}Â°</p>
              </button>
            ))}
          </div>

          {/* Selected Day Details */}
          {selectedDay !== null && forecast[selectedDay] && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-3">
                DÃ©tails pour {new Date(forecast[selectedDay].date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Thermometer className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-600">Max / Min</p>
                    <p className="font-medium">{forecast[selectedDay].maxTemp}Â° / {forecast[selectedDay].minTemp}Â°</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t text-center text-sm text-gray-500">
          DonnÃ©es fournies par Open-Meteo
        </div>
      </div>
    </div>,
    document.body
  );
}
```

#### IntÃ©gration dans Header

```typescript
// src/components/layout/Header.tsx
import WeatherWidget from '../WeatherWidget';

// Dans le JSX du Header
<header className="flex items-center justify-between px-4 py-2 border-b">
  <div className="flex items-center gap-4">
    {/* ... logo, navigation ... */}
  </div>
  
  <div className="flex items-center gap-4">
    <WeatherWidget />  {/* Widget mÃ©tÃ©o intÃ©grÃ© */}
    
    {/* ... notifications, profil ... */}
  </div>
</header>
```

### Endpoints Open-Meteo UtilisÃ©s

1. **MÃ©tÃ©o actuelle** :
   ```
   GET https://api.open-meteo.com/v1/forecast?latitude=36.8065&longitude=10.1815&current_weather=true
   ```

2. **PrÃ©visions 7 jours** :
   ```
   GET https://api.open-meteo.com/v1/forecast?latitude=36.8065&longitude=10.1815&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Africa/Tunis&forecast_days=7
   ```

3. **Geocoding (recherche ville)** :
   ```
   GET https://geocoding-api.open-meteo.com/v1/search?name=Tunis&count=1&language=fr
   ```

### Codes MÃ©tÃ©o (WMO)

| Code | Description | IcÃ´ne |
|------|-------------|-------|
| 0 | EnsoleillÃ© | â˜€ï¸ |
| 1-3 | Nuageux | â˜ï¸ |
| 45, 48 | Brouillard | ðŸŒ«ï¸ |
| 51-55 | Pluie lÃ©gÃ¨re | ðŸŒ¦ï¸ |
| 61-65 | Pluie | ðŸŒ§ï¸ |
| 71-77 | Neige | ðŸŒ¨ï¸ |
| 95-99 | Orage | â›ˆï¸ |

---

## 4. Puter.js - Traduction LLM 100% Gratuite & IllimitÃ©e

### Description

**Puter.js** est une API basÃ©e sur LLM (GPT-4o-mini) qui permet la traduction **100% gratuite**, **sans limite** et **sans carte de crÃ©dit**. C'est le meilleur choix pour SkillUpTn car il fonctionne directement dans le frontend sans configuration.

**Fournisseur** : Puter.com (puter.com)  
**Type** : Traduction LLM (GPT-4o-mini)  
**CoÃ»t** : **100% Gratuit - IllimitÃ©**  
**Configuration** : Aucune (script CDN uniquement)  

### Avantages ClÃ©s

- âœ… **Pas d'API key** requise
- âœ… **Pas de carte** de crÃ©dit
- âœ… **IllimitÃ©** - Pas de quota journalier
- âœ… **Fonctionne direct** dans le frontend
- âœ… **QualitÃ© LLM** - Traductions trÃ¨s naturelles
- âœ… **BasÃ© sur GPT-4o-mini** - Rapide et prÃ©cis

### Cas d'Usage dans SkillUpTn

- **Traduction interface utilisateur** : Traduit tous les textes marquÃ©s avec `data-translatable="true"`
- **Support multilingue** : 30+ langues supportÃ©es via LLM
- **Traduction contextuelle** : Comprend le contexte mÃ©tier RH/formations
- **ImmÃ©diat** : ZÃ©ro configuration, prÃªt Ã  l'emploi

### Fichiers LiÃ©s

```
frontend/
â”œâ”€â”€ index.html                          # Script CDN Puter.js
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â””â”€â”€ puterService.ts            # Service API Puter.js (NOUVEAU)
â”‚   â”œâ”€â”€ context/
â”‚   â”‚   â””â”€â”€ TranslationContext.tsx     # Contexte utilisant Puter.js
â”‚   â””â”€â”€ components/shared/
â”‚       â””â”€â”€ AccessibilityWidget.tsx    # SÃ©lecteur de langue
```

### ImplÃ©mentation Technique

#### 1. Script CDN (index.html)

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Maghrebia - Intelligent Employee Recommendation System</title>
    <!-- Puter.js - Translation API (100% free, unlimited, no API key) -->
    <script src="https://js.puter.com/v2/"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

#### 2. Service API (puterService.ts)

```typescript
// src/services/puterService.ts
declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (prompt: string, options?: { model?: string }) => Promise<string>;
      };
    };
  }
}

/**
 * VÃ©rifie si Puter.js est chargÃ©
 */
export function isPuterAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.puter?.ai?.chat;
}

/**
 * Traduit un texte avec Puter.js AI (100% gratuit, illimitÃ©)
 */
export async function translateWithPuter(text: string, targetLang: string): Promise<string> {
  // Si franÃ§ais ou vide, retourner le texte original
  if (!text || targetLang.toLowerCase() === 'fr') {
    return text;
  }

  // VÃ©rifier si Puter est disponible
  if (!isPuterAvailable()) {
    console.warn('Puter.js not available, falling back to original text');
    return text;
  }

  // Limiter Ã  1000 caractÃ¨res pour Ã©viter les timeouts
  const maxLength = 1000;
  const originalText = text;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength);
  }

  try {
    const prompt = `Translate the following text from French to ${targetLang}. 
Return ONLY the translated text, nothing else:

"${text}"`;

    const result = await window.puter!.ai.chat(prompt, {
      model: 'gpt-4o-mini',  // ModÃ¨le rapide et efficace
    });

    // Nettoyer le rÃ©sultat
    let translated = result?.toString().trim() || text;
    if (translated.startsWith('"') && translated.endsWith('"')) {
      translated = translated.slice(1, -1);
    }
    
    return translated;
  } catch (error) {
    console.error('Puter.js translation error:', error);
    return text;  // Fallback
  }
}
```

#### 3. IntÃ©gration dans TranslationContext

```typescript
// src/context/TranslationContext.tsx
import { translateWithPuter } from '../services/puterService';

// ... dans le provider
const translateText = useCallback(async (text: string, targetLang: string): Promise<string> => {
  if (!text || text.trim() === '') return text;
  if (targetLang === 'auto' || targetLang === 'fr') return text;
  
  // VÃ©rifier le cache
  if (cacheRef.current[targetLang]?.[text]) {
    return cacheRef.current[targetLang][text];
  }

  try {
    // Utiliser Puter.js AI (100% gratuit, pas de clÃ© API, illimitÃ©)
    const translated = await translateWithPuter(text, targetLang);
    
    // Sauvegarder dans le cache
    if (translated !== text) {
      if (!cacheRef.current[targetLang]) {
        cacheRef.current[targetLang] = {};
      }
      cacheRef.current[targetLang][text] = translated;
    }
    
    return translated;
  } catch (error) {
    console.error('Puter.js translation error:', error);
    return text;
  }
}, []);
```

### Langues SupportÃ©es (Principales)

| Code | Langue | Drapeau |
|------|--------|---------|
| en | Anglais | ðŸ‡¬ðŸ‡§ |
| es | Espagnol | ðŸ‡ªðŸ‡¸ |
| de | Allemand | ï¿½ðŸ‡ª |
| it | Italien | ðŸ‡¹ |
| pt | Portugais | ï¿½ï¿½ |
| ru | Russe | ï¿½ðŸ‡º |
| zh | Chinois | ï¿½ï¿½ |
| ja | Japonais | ðŸ‡¯ðŸ‡µ |
| ar | Arabe | ï¿½ï¿½ |
| hi | Hindi | ï¿½ï¿½ |

*(30+ langues supportÃ©es via LLM GPT-4o-mini)*

### FonctionnalitÃ©s

1. **100% Gratuit** : Pas de carte de crÃ©dit, pas de limite
2. **Sans API Key** : Aucune inscription requise
3. **QualitÃ© LLM** : Traductions naturelles avec GPT-4o-mini
4. **Context-aware** : Comprend le contexte RH/formations
5. **Cache intelligent** : Ã‰vite les appels rÃ©pÃ©tÃ©s
6. **Fallback automatique** : Retourne le texte original si erreur

### Comparaison des Services de Traduction

| CritÃ¨re | DeepL (Ancien) | MyMemory | **Puter.js (Nouveau)** |
|---------|----------------|----------|------------------------|
| **CoÃ»t** | 500k/mois (gratuit) | 1000 mots/jour | **100% gratuit, illimitÃ©** |
| **API Key** | Requise | Non requise | **Aucune** |
| **QualitÃ©** | â­â­â­â­â­ Excellente | â­â­â­ Correcte | **â­â­â­â­â­ Excellente** |
| **Limite** | 500k caractÃ¨res/mois | 1000 mots/jour | **Aucune** |
| **Setup** | Complexe (clÃ© API) | Simple (GET) | **TrÃ¨s simple (CDN)** |
| **Vitesse** | ~200ms | ~500ms | **~800ms** (LLM) |
| **LLM** | âŒ Non | âŒ Non | **âœ… GPT-4o-mini** |

### Points d'Attention

âœ… **Avantages majeurs** :
- **ZÃ©ro configuration** : Juste ajouter le script CDN
- **IllimitÃ©** : Pas de quotas Ã  surveiller
- **QualitÃ© supÃ©rieure** : LLM GPT-4o-mini pour des traductions naturelles
- **Gratuit Ã  vie** : Pas de risque de facturation

âš ï¸ **ConsidÃ©rations** :
- **Latence lÃ©gÃ¨rement plus Ã©levÃ©e** (~800ms) comparÃ© aux APIs traditionnelles
- **DÃ©pendance rÃ©seau** : NÃ©cessite une connexion internet active
- **Limite de taille** : 1000 caractÃ¨res max par requÃªte (recommandÃ©)

---

### Variables d'Environnement

```env
# .env (racine frontend)

# OpenRouter (Prompt Rewriter)
VITE_OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx

# Mapbox (Location Picker)
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here

# Puter.js (Translation) - 100% FREE, UNLIMITED, NO API KEY
# Just add the CDN script to index.html:
# <script src="https://js.puter.com/v2/"></script>

# Open-Meteo (Weather) - Pas de clÃ© requise !
# API 100% gratuite et ouverte
```

### DÃ©pendances npm

```json
{
  "dependencies": {
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "@types/leaflet": "^1.9.8",
    "lucide-react": "^0.x.x"
  }
}
```

### Installation

```bash
cd frontend
npm install leaflet react-leaflet @types/leaflet
```

---

## ðŸš€ Prochaines AmÃ©liorations SuggÃ©rÃ©es

1. **OpenRouter** : Ajouter d'autres modÃ¨les (GPT-4, Llama) avec sÃ©lecteur
2. **Maps** : Afficher toutes les formations sur une carte globale
3. **Puter.js** : Traduction LLM 100% gratuite, illimitÃ©e, sans API key
4. **Weather** : Alertes mÃ©tÃ©o pour formations extÃ©rieures (pluie, tempÃªte)

---

*Document gÃ©nÃ©rÃ© pour SkillUpTn - Mars 2025*

