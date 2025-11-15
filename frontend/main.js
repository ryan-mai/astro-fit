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
  activities.forEach(activity => {
    const polyline = activity?.map?.summary_polyline;
    if (!polyline) return;

    const latlng = L.Polyline.fromEncoded(polyline).getLatLngs();
    L.polyline(
      latlng,
      { color: 'red' }
    ).addTo(map);
  });
  console.log(activities);
}

fetchActivities();