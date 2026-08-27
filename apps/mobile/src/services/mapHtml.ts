import { theme } from '../constants/theme';
import { LEAFLET_JS, LEAFLET_CSS } from './leafletAssets';

export type MapPoint = { id: string; label: string; color: string; latitude: number; longitude: number };

/**
 * Monta o HTML de um mapa Leaflet com o ponto do motorista (opcional) e
 * pontos de destino coloridos. O JS/CSS do Leaflet vai inline (ver
 * leafletAssets.ts) — nada de CDN, então a primeira renderização não
 * depende de rede pra carregar a biblioteca em si (só os tiles do mapa).
 *
 * `driverMarkerId` identifica o <script> de cada marcador pra permitir
 * atualização via injectJavaScript sem recarregar a página inteira
 * (ver updateMapPositionScript).
 */
export function buildMapHtml(
  driverPoint: { latitude: number; longitude: number } | null,
  jobPoints: MapPoint[],
  fallbackCenter = { latitude: -23.5505, longitude: -46.6333 }
) {
  const center = driverPoint ?? jobPoints[0] ?? fallbackCenter;
  const initialZoom = driverPoint || jobPoints.length ? 13 : 4;

  const jobMarkers = jobPoints
    .map(
      (p) => `
        L.circleMarker([${p.latitude}, ${p.longitude}], {
          radius: 9, color: '#fff', weight: 2, fillColor: '${p.color}', fillOpacity: 1
        }).addTo(map).bindPopup(${JSON.stringify(p.label)});
      `
    )
    .join('\n');

  const driverMarkerScript = driverPoint
    ? `
      window.__driverMarker = L.circleMarker([${driverPoint.latitude}, ${driverPoint.longitude}], {
        radius: 10, color: '#fff', weight: 3, fillColor: '#3B82F6', fillOpacity: 1
      }).addTo(map).bindPopup('Você está aqui');
    `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>${LEAFLET_CSS}</style>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${theme.colors.background}; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>${LEAFLET_JS}</script>
  <script>
    window.__map = L.map('map').setView([${center.latitude}, ${center.longitude}], ${initialZoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(window.__map);
    ${driverMarkerScript}
    ${jobMarkers}
  </script>
</body>
</html>
  `;
}

/**
 * JS injetado via WebView.injectJavaScript pra mover só o marcador do
 * motorista, sem recriar o mapa/tiles/marcadores de destino inteiros — é o
 * que evita recarregar tudo (e rebaixar o Leaflet) a cada atualização de GPS.
 */
export function updateDriverPositionScript(latitude: number, longitude: number): string {
  return `
    (function() {
      if (!window.__map) return true;
      var latlng = [${latitude}, ${longitude}];
      if (window.__driverMarker) {
        window.__driverMarker.setLatLng(latlng);
      } else {
        window.__driverMarker = L.circleMarker(latlng, {
          radius: 10, color: '#fff', weight: 3, fillColor: '#3B82F6', fillOpacity: 1
        }).addTo(window.__map).bindPopup('Você está aqui');
      }
    })();
    true;
  `;
}
