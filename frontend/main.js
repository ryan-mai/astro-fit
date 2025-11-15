const map = L.map('map').setView([0, 0], 2)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

L.marker([0, 0]).addTo(map).bindPopup('Middle').openPopup();

async function fetchActivities() {
  try {
    const res = await fetch('http://127.0.0.1:3000/activities');

    if (!res.ok) {
      throw new Error('Could not connect with api', res.status);
    }

    const data = await res.json();
    showActivities(data)

  } catch (err) {
    console.error('There was a problem fetching activities', err)
  }
}

function showActivities(activities) {
  if (!Array.isArray(activities)) {
    console.warn('Activities did not return an array/list', activities)
    return;
  }
  activities.forEach(activity => {
    console.log(activity)
  });
}

fetchActivities();