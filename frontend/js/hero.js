function updateClock() {
    const timeEl = document.getElementById('hero-time');
    const dateEl = document.getElementById('hero-date');
    if (!timeEl || !dateEl) return;

    const now = new Date();
    const hr = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const sec = String(now.getSeconds()).padStart(2, '0');

    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear());

    dateEl.textContent = `${dd}.${mm}.${yy}`
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

        const res = await fetch(`http://127.0.0.1:5000/api/weather?${params.toString()}`);

        if (!res.ok) {
            const weatherEl = document.getElementById('hero-weather-text');
            if (weatherEl) weatherEl.textContent = 'Weather could not be fetched';
            return;
        }
        const data = await res.json();
        const weatherEl = document.getElementById('hero-weather-text')
        if (weatherEl) weatherEl.textContent = `${data?.current?.temp_c}\u00B0C`;
        console.log(data);
    } catch (err) {
        const weatherEl = document.getElementById('hero-weather-text');
        if (weatherEl) weatherEl.textContent = 'Weather fetch error';
        console.error('weather fetch error', err);
    }
}

function onGeoSuccess(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const locEl = document.getElementById('hero-loc');
    if (locEl) locEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    fetchWeather(lat, lng);
}

function onGeoFail(err) {
    console.error('could not get geolocation info', err);
    const weatherEl = document.getElementById('hero-weather-text');
    if (weatherEl) weatherEl.textContent = 'access was DENIED!';
}

function initGeoloc() {
    if (!navigator.geolocation) {
        const weatherEl = document.getElementById('hero-weather-text')
        if (weatherEl) weatherEl.textContent = 'geolocation not allowed';
        return;
    }
    navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoFail, { timeout: 10000 });
}

initGeoloc();