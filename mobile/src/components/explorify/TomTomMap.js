import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const API_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY;

function buildHTML(lat, lon, landmarks) {
  const markersJS = landmarks
    .map((lm) => {
      const color =
        lm.tier === 'hidden' ? '#3D2B8E' : lm.tier === 'discovered' ? '#00C9B1' : '#F5A623';
      const safeId = 'm' + String(lm.id).replace(/[^a-zA-Z0-9]/g, '_');
      const safeName = (lm.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const safeCat = (lm.category || '').replace(/'/g, "\\'");
      return `
        (function() {
          var el = document.createElement('div');
          el.style.cssText = 'width:14px;height:14px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:pointer;transition:transform 0.15s;';
          el.onmouseenter = function(){ el.style.transform='scale(1.4)'; };
          el.onmouseleave = function(){ el.style.transform='scale(1)'; };
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: '${lm.id}' }));
          });
          new tt.Marker({ element: el })
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
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = tt.map({
    key: '${API_KEY}',
    container: 'map',
    center: [${lon}, ${lat}],
    zoom: 15,
    dragRotate: false,
    pitchWithRotate: false,
  });

  // User location blue dot
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
    ${markersJS}
  });

  map.on('moveend', function() {
    var c = map.getCenter();
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'mapMove', lat: c.lat, lon: c.lng, zoom: map.getZoom()
    }));
  });
</script>
</body>
</html>`;
}

const TomTomMap = forwardRef(function TomTomMap(
  { lat, lon, landmarks = [], style, onMarkerPress, onMapMove },
  ref,
) {
  const webRef = useRef(null);

  useImperativeHandle(ref, () => ({
    flyTo: (newLat, newLon, zoom = 16) => {
      webRef.current?.injectJavaScript(
        `map.flyTo({ center: [${newLon}, ${newLat}], zoom: ${zoom}, essential: true }); true;`,
      );
    },
  }));

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerPress') onMarkerPress?.(data.id);
      if (data.type === 'mapMove') onMapMove?.(data);
    } catch {}
  };

  return (
    <WebView
      ref={webRef}
      style={[styles.map, style]}
      source={{ html: buildHTML(lat, lon, landmarks), baseUrl: 'https://api.tomtom.com' }}
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
