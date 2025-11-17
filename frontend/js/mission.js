function updateClock() {
  const timeEl = document.getElementById("mission-time");
  const dateEl = document.getElementById("mission-date");
  if (!timeEl || !dateEl) return;

  const now = new Date();
  const hr = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const sec = String(now.getSeconds()).padStart(2, "0");

  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear());

  dateEl.textContent = `${dd}.${mm}.${yy}`;
  timeEl.textContent = `${hr}:${min}:${sec}`;
}

updateClock();
setInterval(updateClock, 1000);

async function fetchWeather(lat, lng) {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
    });

    const res = await fetch(
      `http://127.0.0.1:5000/api/weather?${params.toString()}`
    );

    if (!res.ok) {
      const weatherEl = document.getElementById("mission-weather-text");
      if (weatherEl) weatherEl.textContent = "Weather could not be fetched";
      return;
    }
    const data = await res.json();
    const weatherEl = document.getElementById("mission-weather-text");
    if (weatherEl) weatherEl.textContent = `${data?.current?.temp_c}\u00B0C`;
    console.log(data);
  } catch (err) {
    const weatherEl = document.getElementById("mission-weather-text");
    if (weatherEl) weatherEl.textContent = "Weather fetch error";
    console.error("weather fetch error", err);
  }
}

function onGeoSuccess(pos) {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const locEl = document.getElementById("mission-loc");
  if (locEl) locEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  fetchWeather(lat, lng);
}

function onGeoFail(err) {
  console.error("could not get geolocation info", err);
  const weatherEl = document.getElementById("mission-weather-text");
  if (weatherEl) weatherEl.textContent = "access was DENIED!";
}

function initGeoloc() {
  if (!navigator.geolocation) {
    const weatherEl = document.getElementById("mission-weather-text");
    if (weatherEl) weatherEl.textContent = "geolocation not allowed";
    return;
  }
  navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoFail, {
    timeout: 10000,
  });
}

// initGeoloc();

const map = L.map("map").setView([0, 0], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

setTimeout(() => {
  try {
    map.invalidateSize();
  } catch (err) {
    console.error(err);
  }
}, 200);
// THIS IS FOR FETCHING LIVE FROM STRAVA
// async function fetchActivities() {
//   try {
//     const res = await fetch('http://127.0.0.1:3000/activities');

//     if (!res.ok) {
//       throw new Error('Could not connect with api', res.status);
//     }

//     const data = await res.json();
//     showActivities(data);

//   } catch (err) {
//     console.error('There was a problem fetching activities', err)
//   }
// }

// THIS IS FROM JSON DATA SAVED
const activityLayers = [];

function createActivityLayers() {
  const control = L.control({ position: "topright" });

  control.onAdd = function () {
    const container = L.DomUtil.create("div", "activity-control");
    container.style.background = "white";
    container.style.padding = "6px";
    container.style.borderRadius = "4px";
    container.style.maxHeight = "220px";
    container.style.overflowY = "auto";

    const select = document.createElement("select");
    select.id = "activity-select";
    select.style.width = "220px";

    const options = document.createElement("option");
    options.value = "all";
    options.text = "Reveal all";
    select.appendChild(options);

    activityLayers.forEach((activity) => {
      const option = document.createElement("option");
      option.value = String(activity.index);
      option.text = activity.label;
      select.appendChild(option);
    });

    select.addEventListener("change", (e) => {
      applySelection(e.target.value);
    });

    container.appendChild(select);

    L.DomEvent.disableClickPropagation(container);
    return container;
  };
  control.addTo(map);
}

async function fetchActivities() {
  try {
    const res = await fetch("./data_pub.json", { cache: "no-store" });

    console.log("Fetching:", res.url, res.status);

    if (!res.ok) {
      throw new Error(
        `Could not fetch data.json (${res.status} ${res.statusText})`
      );
    }

    const text = await res.text();
    if (!text || !text.trim()) {
      throw new Error(`Empty json from ${res.url} (${res.status})`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error(
        "Failed to parse text from json. First 100 chars:",
        text.slice(0, 100)
      );
      throw err;
    }

    showActivities(data);
  } catch (err) {
    console.error("There was a problem fetching activities", err);
  }
}

function lngToRa(lng) {
    const ra = lng >= 0 ? lng : lng + 360;
    return (ra + 360) % 360;
}

function pointTouching(point, ring) {
    const ra = point[0];
    const deg = point[1];
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const raX = ring[i][0];
        const degX = ring[i][1];
        const raY = ring[j][0];
        const degY = ring[j][1];
        const first_intersect = ((degX > deg) !== (degY > deg));
        const second_intersect = (ra < (raY - raX) * (deg - degX) / (degY - degX) + raX);
        if (first_intersect && second_intersect) inside = !inside;
    }
    return inside;
}

function pointInside(point, coords) {
    if (!coords || !coords.length) return false;
    if (!pointTouching(point, coords[0])) return false;
    for (let i = 1; i < coords.length; i++) {
        if (pointTouching(point, coords[i])) return false;
    }
    return true;
}

function pointInConst(geom, point) {
    const type = geom.type;
    const coords = geom.coordinates;
    if (type === 'Polygon') {
        return pointInside(point, coords);
    } else if (type === 'MultiPolygon') {
        for (const coord of coords) {
            if (pointInside(point, coord)) return true;
        }
        return false;
    }
    return false;
}

function wrapRa(geom, ra, dec) {
    const cases = [ra, ra + 360, ra - 360];
    for (const deg of cases) {
        if (pointInConst(geom, [deg, dec])) return true;
    }
    return false
}

function matchConst(loc, geo) {
    const points = loc.map(pt => ({
    ra: lngToRa(pt.lng ?? pt[1]),
    dec: pt.lat ?? pt[0]
    }));

    const totalPoints = points.length || 1;
    let match = {
        iau: null,
        score: 0,
        inside: 0,
        totalPoints
    };

    for (const feature of geo.features) {
        let numInside = 0;
        for (const pt of points) {
            if (wrapRa(feature.geometry, pt.ra, pt.dec)) numInside++;
        }
        const score = numInside / totalPoints;
        if (score > match.score) {
            match = {
                iau: feature.properties?.iau,
                score,
                inside: numInside,
                totalPoints
            }
        }
    }
    return match
}

function loadConst() {
    if (window.__CONST_GEO__) return Promise.resolve(window.__CONST_GEO__);
    return fetch('./data/const.geojson', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => { window.__CONST_GEO__ = j; return j; });
}

function getLoc(layer) {
    const out = [];
    if (!layer) return out;

    const flattenArray = (arr) => {
        if (!arr) return;
        const flatten = (a, target) => {
            if (!Array.isArray(a)) {
                if (a && (a.lat !== undefined && a.lng !== undefined)) target.push(a);
                return;
            }
            for (const v of a) flatten(v, target);
        };
        flatten(arr, out);
    };

    if (typeof layer.getLatLngs === 'function') {
        flattenArray(layer.getLatLng());
        return out;
    }
    if (typeof layer.getLayers === 'function') {
        layer.getLayers().forEach((l) => {
            if (typeof l.getLatLngs === 'function') {
                flattenArray(l.getLatLngs());
            } else if (typeof l.getLatLng === 'function') {
                const point = l.getLatLng();
                if (point) out.push(point)
            }
        });
    }
    return out;
}

function getLayerBounds(layer) {
  if (!layer) return null;
  if (typeof layer.getBounds === "function") {
    const bounds = layer.getBounds();
    return bounds && bounds.isValid && bounds.isValid() ? bounds : null;
  }

  if (typeof layer.getLayers === "function") {
    const bounds = L.latLngBounds([]);
    layer.getLayers().forEach((l) => {
      if (typeof l.getBounds === "function") bounds.extend(l.getBounds());
      else if (typeof l.getLatLng === "function") bounds.extend(l.getLatLng());
    });
    return (bounds && bounds.isValid && bounds.isValid()) ? bounds : null;
  }
  return null;
}

let startState = {
    canvas: null,
    ctx: null,
    stars: [],
    raf: null,
    t: 0,
};

function initCanvas() {
    const canvas = document.getElementById('mission-canvas');
    if (!canvas) return;
    startState.canvas = canvas;
    startState.ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
}

function resizeCanvas() {
    const canvas = startState.canvas;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(200, canvas.clientWidth || 300);
    const height = Math.max(120, canvas.clientHeight || 220);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    if (startState.ctx) startState.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function clearCanvas() {
    if (startState.raf) {
        cancelAnimationFrame(startState.raf);
        startState.raf = null;
    }
    if (startState.ctx && startState.canvas) {
        startState.ctx.clearRect(0, 0, startState.canvas.width, startState.canvas.height);
    }
    startState.stars = [];
}

function drawCanvas(loc) {
    initCanvas();
    const ctx = startState.ctx;
    const canvas = startState.canvas;
    if (!ctx || !canvas) return;
    if (!loc || !loc.length) {
        clearCanvas();
        return;
    }

    const dpr = window.devicePixelRatio || 1;
    const points = loc.map(pt => ({ lat: pt.lat, lng: pt.lng }));

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const p of points) {
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
        if (p.lng < minLng) minLng = p.lng;
        if (p.lng > maxLng) maxLng = p.lng;
    }
    if (minLat === maxLat) { minLat -= 0.01; maxLat += 0.01; }
    if (minLng === maxLng) { minLng -= 0.01; maxLng += 0.01; }

    const padding = 10;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const mapX = (lng) => padding + ((lng - minLng) / (maxLng - minLng || 1)) * (w - padding * 2);
    const mapY = (lat) => padding + ((maxLat - lat) / (maxLat - minLat || 1)) * (h - padding * 2);

    const maxStars = 60;
    const sampled = points.length > maxStars
        ? points.filter((_, i) => i % Math.ceil(points.length / maxStars) === 0)
        : points;

    startState.stars = sampled.map(p => ({
        x: mapX(p.lng),
        y: mapY(p.lat),
        r: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.04,
    }));

    if (startState.raf) cancelAnimationFrame(startState.raf);
    startState.t = 0;

    function frame() {
        startState.t++;
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.strokeStyle = "rgba(200,220,255,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < startState.stars.length; i++) {
            const s = startState.stars[i];
            if (i === 0) ctx.moveTo(s.x, s.y);
            else ctx.lineTo(s.x, s.y);
        }
        ctx.stroke();
        ctx.restore();

        for (const s of startState.stars) {
            s.phase += s.speed;
            const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.phase));
            ctx.beginPath();
            ctx.fillStyle = `rgba(255,255,230,${alpha.toFixed(2)})`;
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        startState.raf = requestAnimationFrame(frame);
    }

    frame();
}

window.addEventListener('load', initCanvas);

function applySelection(value) {
  activityLayers.forEach((activity) => {
    if (map.hasLayer(activity.layer)) map.removeLayer(activity.layer);
  });

  if (value === "all") {
    const allBounds = L.latLngBounds([]);
    activityLayers.forEach((activity) => {
      map.addLayer(activity.layer);
      const bounds = getLayerBounds(activity.layer);
      if (bounds) allBounds.extend(bounds);
    });
    if (allBounds.isValid && allBounds.isValid()) {
      map.fitBounds(allBounds, { padding: [40, 40] });
    }
    clearCanvas();
    return;
  }

  const idx = Number(value);
  const entry = activityLayers.find((activity) => activity.index === idx);

  if (entry) {
    map.addLayer(entry.layer);

    const bounds = getLayerBounds(entry.layer);
    if (bounds && bounds.isValid && bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [30, 30] });
    } else {
      const first = entry.layer.getLayers && entry.layer.getLayers()[0];
      const latlng = first && (first.getLatLng ? first.getLatLng() : null);
      if (latlng) map.setView(latlng, 13);
    }

    try {
        const loc = getLoc(entry.layer);
        if (loc && loc.length) drawCanvas(loc);
    } catch (err) {
        console.error('fck', err);
    }

    loadConst().then((geom) => {
        const loc = getLoc(entry.layer);
        if (loc && loc.length) {
            const match = matchConst(loc, geom);
            console.log('match constellation', entry, match)
        }
    }) 
  }
}

function showActivities(activities) {
  if (!Array.isArray(activities)) {
    console.warn("Activities did not return an array/list", activities);
    return;
  }

  activityLayers.length = 0;

  activities.forEach((activity, idx) => {
    const polyline = activity?.map?.summary_polyline;
    if (!polyline) return;

    const latlng = L.Polyline.fromEncoded(polyline).getLatLngs();

    const layer = L.layerGroup();
    L.polyline(latlng, { color: "red" }).addTo(layer);

    const label = activity.start_date_local
      ? new Date(activity.start_date_local).toLocaleString()
      : `Activity ${idx}`;

    activityLayers.push({
      index: idx,
      id: activity.id ?? idx,
      label,
      layer,
    });
  });

  activityLayers.forEach((activity) => map.addLayer(activity.layer));
  if (activityLayers.length) {
    const allBounds = L.latLngBounds([]);
    activityLayers.forEach((activity) => {
        const bound = getLayerBounds(activity.layer);
        if (bound) allBounds.extend(bound);
    });
    if (allBounds.isValid && allBounds.isValid()) {
        map.fitBounds(allBounds, { padding: [40, 40] });
    }
    createActivityLayers();

    loadConst().then((geom) => {
        const first = activityLayers[0];
        if (!first) return;
        const loc = getLoc(first.layer);
        if (loc && loc.length) {
            const match = matchConst(loc, geom);
            console.log('matching constellation', match);
        }
        try {
            drawCanvas(first.layer);
        } catch (err) {
            console.error('bruh', err);
        }
    }).catch((e) => console.error('load const failed', e));
  }
  setTimeout(() => {
    try {
      map.invalidateSize();
    } catch (e) {}
  }, 200);
}

fetchActivities();