const map = L.map('map').setView([0, 0], 2)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

L.marker([0, 0]).addTo(map).bindPopup('Middle').openPopup();

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

function applySelection(value) {
  activityLayers.forEach(activity => {
    if (map.hasLayer(activity.layer)) map.removeLayer(activity.layer);
  });

  if (value === 'all') {
    activityLayers.forEach(activity => {
      map.addLayer(activity.layer);
    });
    return;
  }

  const idx = Number(value);
  const entry = activityLayers.find(activity => activity.index === idx);
  
  if (entry) map.addLayer(entry.layer);

}

function createActivityLayers() {
  const control = L.control({ position: 'topright' });

  control.onAdd = function() {
    const container = L.DomUtil.create('div', 'activity-control');
    container.style.background = 'white';
    container.style.padding = '6px';
    container.style.borderRadius = '4px';
    container.style.maxHeight = '220px';
    container.style.overflowY = 'auto';

    const select = document.createElement('select');
    select.id = 'activity-select';
    select.style.width = '220px';

    const options = document.createElement('option')
    options.value = 'all';
    options.text = 'Reveal all';
    select.appendChild(options);

    activityLayers.forEach(activity => {
      const option = document.createElement('option');
      option.value = String(activity.index);
      option.text = activity.label;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
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
    const res = await fetch('./data.json', { cache: 'no-store' });

    console.log('Fetching:', res.url, res.status);

    if (!res.ok) {
      throw new Error(`Could not fetch data.json (${res.status} ${res.statusText})`);
    }

    const text = await res.text();
    if (!text || !text.trim()) {
      throw new Error(`Empty json from ${res.url} (${res.status})`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse text from json. First 100 chars:', text.slice(0, 100));
      throw err;
    }

    showActivities(data);
  } catch (err) {
    console.error('There was a problem fetching activities', err);
  }
}

function showActivities(activities) {
  if (!Array.isArray(activities)) {
    console.warn('Activities did not return an array/list', activities);
    return;
  }

  activityLayers.length = 0;

  activities.forEach((activity, idx) => {
    const polyline = activity?.map?.summary_polyline;
    if (!polyline) return;

    const latlng = L.Polyline.fromEncoded(polyline).getLatLngs();
    
    const layer = L.layerGroup();
    L.polyline(
      latlng,
      { color: 'red' }
    ).addTo(layer);

    const label = activity.start_date_local
      ? new Date(activity.start_date_local).toLocaleString()
      : `Activity ${idx}`;

    activityLayers.push({
      index: idx,
      id: activity.id ?? idx,
      label,
      layer
    });
  });

  activityLayers.forEach(activity => map.addLayer(activity.layer));
  if (activityLayers.length) createActivityLayers();
}

fetchActivities();