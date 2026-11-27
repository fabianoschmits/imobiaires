import { CENTER, MAP_PROVIDERS } from './config.js';
import { esc, getCompactPrice } from './catalog.js';

export function createMapController({ onRender, onSelect, onMapError, onMapClick }) {
  let map = null;
  let satLayer = null;
  let streetLayer = null;
  let group = null;
  let streetOn = false;
  let drawing = false;
  let points = [];
  let drawLayer = null;

  function init() {
    if (!window.L) {
      onMapError(true);
      return null;
    }
    map = L.map('map', { zoomControl: false, maxZoom: 20 }).setView(CENTER, 14);
    satLayer = L.tileLayer(MAP_PROVIDERS.satellite.url, {
      maxZoom: MAP_PROVIDERS.satellite.maxZoom,
      maxNativeZoom: MAP_PROVIDERS.satellite.maxNativeZoom,
      attribution: MAP_PROVIDERS.satellite.attribution,
    });
    streetLayer = L.tileLayer(MAP_PROVIDERS.street.url, {
      maxZoom: MAP_PROVIDERS.street.maxZoom,
      attribution: MAP_PROVIDERS.street.attribution,
    });

    satLayer.addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);
    group = L.layerGroup().addTo(map);

    let errors = 0;
    satLayer.on('tileerror', () => {
      if (++errors > 5 && !streetOn) onMapError(true);
    });
    satLayer.on('tileload', () => {
      onMapError(false);
      errors = 0;
    });
    streetLayer.on('tileload', () => onMapError(false));
    map.on('moveend zoomend', () => {
      if (!drawing) onRender();
    });
    map.on('click', (e) => {
      if (drawing) {
        points.push([e.latlng.lat, e.latlng.lng]);
        renderDraw();
      } else if (onMapClick) {
        onMapClick();
      }
    });
    setTimeout(() => map.invalidateSize(), 100);
    return map;
  }

  function setLayer(street) {
    if (!map) return;
    streetOn = street;
    map.removeLayer(street ? satLayer : streetLayer);
    (street ? streetLayer : satLayer).addTo(map);
    onMapError(false);
  }

  function renderMarkers(properties, activeId) {
    if (!map || drawing) return;
    group.clearLayers();
    properties.forEach((p) => {
      if (p.points.length >= 3 && map.getZoom() >= 16) {
        L.polygon(p.points, {
          color: '#63ebad',
          fillColor: '#36b98b',
          fillOpacity: 0.25,
          weight: 2,
          dashArray: '5 4',
        })
          .addTo(group)
          .on('click', () => onSelect(p.id, false));
      }
      const icon = L.divIcon({
        className: 't360-marker',
        html:
          '<span class="pin ' +
          (activeId === p.id ? 'active' : '') +
          '">' +
          esc(getCompactPrice(p)) +
          (p.offers.length > 1 ? ' <small>· ' + p.offers.length + '</small>' : '') +
          '</span>',
        iconSize: [100, 32],
        iconAnchor: [50, 32],
      });
      L.marker([p.lat, p.lng], {
        icon,
        title: p.title,
        keyboard: true,
        zIndexOffset: activeId === p.id ? 1000 : 0,
      })
        .addTo(group)
        .on('click', () => onSelect(p.id, false));
    });
  }

  function flyTo(lat, lng) {
    if (map) map.flyTo([lat, lng], Math.max(map.getZoom(), 17), { duration: 0.55 });
  }

  function centerCity() {
    map?.setView(CENTER, 14);
  }

  function fitAll(properties) {
    if (!map) return;
    if (properties.length) {
      map.fitBounds(
        properties.map((x) => [x.lat, x.lng]),
        { padding: [45, 60], maxZoom: 16 }
      );
    } else {
      map.setView(CENTER, 14);
    }
  }

  function startDraw() {
    if (!map) return false;
    drawing = true;
    points = [];
    group.clearLayers();
    drawLayer = L.layerGroup().addTo(map);
    map.getContainer().style.cursor = 'crosshair';
    return true;
  }

  function renderDraw() {
    drawLayer.clearLayers();
    points.forEach((p) =>
      L.circleMarker(p, {
        radius: 5,
        color: '#fff',
        fillColor: '#15966c',
        fillOpacity: 1,
      }).addTo(drawLayer)
    );
    if (points.length > 1) {
      L.polyline(points, { color: '#6ef1b4', weight: 3 }).addTo(drawLayer);
    }
    if (points.length >= 3) {
      L.polygon(points, { color: '#6ef1b4', fillOpacity: 0.15 }).addTo(drawLayer);
    }
    document.getElementById('finishDraw').disabled = !points.length;
  }

  function undoDrawPoint() {
    points.pop();
    renderDraw();
  }

  function endDraw(save) {
    let result = null;
    if (save && points.length) {
      const lat = points.reduce((s, p) => s + p[0], 0) / points.length;
      const lng = points.reduce((s, p) => s + p[1], 0) / points.length;
      result = { lat, lng, points: points.length >= 3 ? points : [] };
    }
    drawing = false;
    if (drawLayer) map.removeLayer(drawLayer);
    map.getContainer().style.cursor = '';
    return result;
  }

  return {
    init,
    getMap: () => map,
    setLayer,
    renderMarkers,
    flyTo,
    centerCity,
    fitAll,
    startDraw,
    undoDrawPoint,
    endDraw,
    invalidateSize: () => map?.invalidateSize(),
  };
}

