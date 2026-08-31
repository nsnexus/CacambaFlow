import { theme } from '../constants/theme';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export type MapPoint = { id: string; label: string; color: string; latitude: number; longitude: number };

/**
 * Monta o HTML de um mapa Google Maps com o ponto do motorista (opcional) e
 * pontos de destino coloridos. Diferente do Leaflet que usávamos antes, o SDK
 * do Google não dá pra embutir localmente (termos de uso) — carrega de
 * maps.googleapis.com toda vez, então a primeira renderização depende de rede
 * (igual sempre dependeu pros tiles do mapa em si).
 *
 * `drawRouteFromDriver: true` desenha a rota de carro do motorista até o
 * primeiro ponto de destino (usado na tela do atendimento, não na aba Mapa
 * geral que tem vários destinos).
 */
export function buildMapHtml(
  driverPoint: { latitude: number; longitude: number } | null,
  jobPoints: MapPoint[],
  fallbackCenter = { latitude: -23.5505, longitude: -46.6333 },
  options?: { drawRouteFromDriver?: boolean }
) {
  const center = driverPoint ?? jobPoints[0] ?? fallbackCenter;
  const initialZoom = driverPoint || jobPoints.length ? 15 : 4;

  const jobMarkersScript = jobPoints
    .map(
      (p) => `
        new google.maps.Marker({
          position: { lat: ${p.latitude}, lng: ${p.longitude} },
          map: window.__map,
          title: ${JSON.stringify(p.label)},
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '${p.color}', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }
        });
      `
    )
    .join('\n');

  const driverMarkerScript = driverPoint
    ? `
      window.__driverMarker = new google.maps.Marker({
        position: { lat: ${driverPoint.latitude}, lng: ${driverPoint.longitude} },
        map: window.__map,
        title: 'Você está aqui',
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#3B82F6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
        zIndex: 999
      });
    `
    : '';

  // Cria o serviço de rota mesmo sem a posição do motorista ainda — ela chega
  // depois via updateDriverPositionScript (injectJavaScript), que já checa se
  // esses objetos existem pra calcular a rota assim que tiver as duas pontas.
  const routeScript =
    options?.drawRouteFromDriver && jobPoints[0]
      ? `
        window.__routeDestination = { lat: ${jobPoints[0].latitude}, lng: ${jobPoints[0].longitude} };
        window.__directionsService = new google.maps.DirectionsService();
        window.__directionsRenderer = new google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: { strokeColor: '${theme.colors.primary}', strokeWeight: 5 }
        });
        window.__directionsRenderer.setMap(window.__map);
        ${
          driverPoint
            ? `window.__directionsService.route({
          origin: { lat: ${driverPoint.latitude}, lng: ${driverPoint.longitude} },
          destination: window.__routeDestination,
          travelMode: google.maps.TravelMode.DRIVING
        }, function(result, status) {
          if (status === 'OK') window.__directionsRenderer.setDirections(result);
        });`
            : ''
        }
      `
      : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${theme.colors.background}; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}"></script>
  <script>
    window.__map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: ${center.latitude}, lng: ${center.longitude} },
      zoom: ${initialZoom},
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy'
    });
    ${driverMarkerScript}
    ${jobMarkersScript}
    ${routeScript}
  </script>
</body>
</html>
  `;
}

/**
 * JS injetado via WebView.injectJavaScript pra mover só o marcador do
 * motorista (e recalcular a rota, se houver), sem recriar o mapa/marcadores
 * de destino inteiros — evita recarregar tudo a cada atualização de GPS.
 */
export function updateDriverPositionScript(latitude: number, longitude: number): string {
  return `
    (function() {
      if (!window.__map) return true;
      var pos = { lat: ${latitude}, lng: ${longitude} };
      if (window.__driverMarker) {
        window.__driverMarker.setPosition(pos);
      } else {
        window.__driverMarker = new google.maps.Marker({
          position: pos, map: window.__map, title: 'Você está aqui',
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#3B82F6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
          zIndex: 999
        });
      }
      if (window.__directionsService && window.__directionsRenderer && window.__routeDestination) {
        window.__directionsService.route({
          origin: pos,
          destination: window.__routeDestination,
          travelMode: google.maps.TravelMode.DRIVING
        }, function(result, status) {
          if (status === 'OK') window.__directionsRenderer.setDirections(result);
        });
      }
    })();
    true;
  `;
}
