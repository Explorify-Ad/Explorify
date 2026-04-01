import React, { useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const API_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY;

function buildHTML(lat, lon, landmarks, expeditions = []) {
  const expeditionsJS = expeditions
    .filter((exp) => exp.landmark_lat != null && exp.landmark_lon != null)
    .map((exp) => `
      (function() {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;width:48px;height:48px;cursor:pointer;';

        var ring = document.createElement('div');
        ring.style.cssText = [
          'position:absolute','top:0','left:0',
          'width:48px','height:48px','border-radius:50%',
          'border:2px solid rgba(255,107,107,0.55)',
          'animation:expPulse 1.8s ease-out infinite',
        ].join(';');

        var dot = document.createElement('div');
        dot.style.cssText = [
          'position:absolute','top:10px','left:10px',
          'width:28px','height:28px','border-radius:50%',
          'background:#FF6B6B','border:2.5px solid white',
          'box-shadow:0 2px 8px rgba(255,107,107,0.5)',
          'font-size:13px','line-height:28px','text-align:center',
        ].join(';');
        dot.textContent = '\\uD83D\\uDDFA';

        wrap.appendChild(ring);
        wrap.appendChild(dot);

        wrap.addEventListener('touchstart', function(e) {
          e.stopPropagation(); e.preventDefault();
        }, { passive: false });
        wrap.addEventListener('touchend', function(e) {
          e.stopPropagation();
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'expeditionPress', id: '${exp.id}' })
          );
        });
        wrap.addEventListener('click', function(e) { e.stopPropagation(); });

        new tt.Marker({ element: wrap, anchor: 'center' })
          .setLngLat([${exp.landmark_lon}, ${exp.landmark_lat}])
          .addTo(map);
      })();
    `).join('\n');

  const markersJS = landmarks
    .map((lm) => {
      const color =
        lm.tier === 'hidden' ? '#3D2B8E' : lm.tier === 'discovered' ? '#00C9B1' : '#F5A623';
      const glow =
        lm.tier === 'hidden'
          ? 'rgba(61,43,142,0.55)'
          : lm.tier === 'discovered'
          ? 'rgba(0,201,177,0.55)'
          : 'rgba(245,166,35,0.55)';
      return `
        (function() {
          // Wrapper — anchor point is its bottom centre
          var wrap = document.createElement('div');
          wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform 0.15s;';

          // Orb — radial gradient gives a sphere highlight
          var orb = document.createElement('div');
          orb.style.cssText = [
            'width:28px', 'height:28px', 'border-radius:50%',
            'background:radial-gradient(circle at 35% 30%, rgba(255,255,255,0.7) 0%, ${color} 55%)',
            'border:2.5px solid white',
            'box-shadow:0 0 10px ${glow}, 0 3px 6px rgba(0,0,0,0.4)',
          ].join(';');

          // Stem
          var stem = document.createElement('div');
          stem.style.cssText = [
            'width:3px', 'height:14px',
            'background:linear-gradient(to bottom, ${color} 0%, rgba(0,0,0,0.1) 100%)',
            'border-radius:0 0 2px 2px',
          ].join(';');

          // Ground shadow ellipse
          var shadow = document.createElement('div');
          shadow.style.cssText = [
            'width:12px', 'height:5px', 'border-radius:50%',
            'background:rgba(0,0,0,0.18)',
            'margin-top:1px',
          ].join(';');

          wrap.appendChild(orb);
          wrap.appendChild(stem);
          wrap.appendChild(shadow);

          wrap.onmouseenter = function() { wrap.style.transform = 'scale(1.25)'; };
          wrap.onmouseleave = function() { wrap.style.transform = 'scale(1)'; };
          // Use touchstart+preventDefault to block MapboxGL from receiving the
          // touch as a pan gesture, then fire on touchend.
          wrap.addEventListener('touchstart', function(e) {
            e.stopPropagation();
            e.preventDefault();
          }, { passive: false });
          wrap.addEventListener('touchend', function(e) {
            e.stopPropagation();
            wrap.style.transform = 'scale(1.25)';
            setTimeout(function() { wrap.style.transform = 'scale(1)'; }, 150);
            window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: 'markerPress', id: '${lm.id}' })
            );
          });
          // Fallback for desktop/simulator
          wrap.addEventListener('click', function(e) { e.stopPropagation(); });

          new tt.Marker({ element: wrap, anchor: 'bottom' })
            .setLngLat([${lm.lon}, ${lm.lat}])
            .addTo(map);
        })();
      `;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" type="text/css" href="https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css"/>
<script src="https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:100%; height:100%; overflow:hidden; }
  #map { position:absolute; top:0; right:0; bottom:0; left:0; }
  .mapboxgl-ctrl-logo,
  .mapboxgl-ctrl-attrib,
  .tt-copyright { display:none !important; }
  @keyframes expPulse {
    0%   { transform: scale(1);   opacity: 0.8; }
    100% { transform: scale(2.4); opacity: 0; }
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = tt.map({
    key: '${API_KEY}',
    container: 'map',
    center: [${lon}, ${lat}],
    zoom: 17,
    pitch: 60,
    bearing: 0,
    dragRotate: true,
    pitchWithRotate: true,
  });

  // User location dot
  (function() {
    var el = document.createElement('div');
    el.style.cssText = [
      'width:16px', 'height:16px', 'border-radius:50%',
      'background:#4A90D9', 'border:3px solid white',
      'box-shadow:0 2px 8px rgba(0,0,0,0.5)',
    ].join(';');
    new tt.Marker({ element: el }).setLngLat([${lon}, ${lat}]).addTo(map);
  })();

  map.on('load', function() {
    // --- 3D buildings ---
    try {
      var style = map.getStyle();

      // Find the first symbol layer to insert buildings beneath labels
      var firstSymbol;
      for (var i = 0; i < style.layers.length; i++) {
        if (style.layers[i].type === 'symbol') { firstSymbol = style.layers[i].id; break; }
      }

      // Find the vector tile source (works regardless of its key name)
      var srcId = Object.keys(style.sources).find(function(k) {
        return style.sources[k].type === 'vector';
      });

      if (srcId) {
        // TomTom vector tiles use 'Building' as the source-layer name
        // We also provide a constant default height so flat-roof buildings still extrude
        map.addLayer({
          id: '3d-buildings',
          source: srcId,
          'source-layer': 'Building',
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': [
              'interpolate', ['linear'],
              ['coalesce', ['get', 'height'], 0],
              0,  '#e8dcc8',
              20, '#d4c5a9',
              60, '#c4b494',
            ],
            'fill-extrusion-height': ['coalesce', ['get', 'height'], 6],
            'fill-extrusion-base':   ['coalesce', ['get', 'min_height'], 0],
            'fill-extrusion-opacity': 0.9,
          },
        }, firstSymbol);
      }
    } catch(e) {}

    // --- Expedition markers ---
    ${expeditionsJS}

    // --- Landmark markers ---
    ${markersJS}
  });

  map.on('moveend', function() {
    var c = map.getCenter();
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'mapMove', lat: c.lat, lon: c.lng, zoom: map.getZoom()
    }));
  });

  window.drawRoute = function(waypoints) {
    if (!waypoints || waypoints.length < 2) {
      if (map.getLayer('route')) map.removeLayer('route');
      if (map.getSource('route')) map.removeSource('route');
      return;
    }
    
    if (map.getLayer('route')) map.removeLayer('route');
    if (map.getSource('route')) map.removeSource('route');

    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: waypoints.map(function(w) { return [w.lon || w.lng, w.lat]; })
        }
      }
    });

    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#FF6B6B',
        'line-width': 6,
        'line-opacity': 0.85
      }
    });

    try {
      var bounds = new tt.LngLatBounds();
      waypoints.forEach(function(w) { bounds.extend([w.lon || w.lng, w.lat]); });
      map.fitBounds(bounds, { padding: 60, duration: 1000 });
    } catch(e) {}
  };

</script>
</body>
</html>`;
}

const TomTomMap = forwardRef(function TomTomMap(
  { lat, lon, landmarks = [], expeditions = [], style, onMarkerPress, onExpeditionPress, onMapMove },
  ref,
) {
  const webRef = useRef(null);
  // Memoize so a parent re-render (e.g. theme change) never reloads the WebView
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const source = useMemo(
    () => ({ html: buildHTML(lat, lon, landmarks, expeditions), baseUrl: 'https://api.tomtom.com' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lat, lon, JSON.stringify(landmarks), JSON.stringify(expeditions)],
  );

  useImperativeHandle(ref, () => ({
    flyTo: (newLat, newLon, zoom = 16) => {
      webRef.current?.injectJavaScript(
        `map.flyTo({ center: [${newLon}, ${newLat}], zoom: ${zoom}, essential: true }); true;`,
      );
    },
    drawRoute: (waypoints) => {
      webRef.current?.injectJavaScript(
        `window.drawRoute(${JSON.stringify(waypoints)}); true;`,
      );
    },
    clearRoute: () => {
      webRef.current?.injectJavaScript(
        `window.drawRoute(null); true;`,
      );
    },

  }));

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerPress') onMarkerPress?.(data.id);
      if (data.type === 'expeditionPress') onExpeditionPress?.(data.id);
      if (data.type === 'mapMove') onMapMove?.(data);
    } catch {}
  };

  return (
    <WebView
      ref={webRef}
      style={[styles.map, style]}
      source={source}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      onMessage={handleMessage}
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      cacheEnabled={false}
      startInLoadingState={false}
    />
  );
});

export default TomTomMap;

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: '#F2E8C6' },
});
