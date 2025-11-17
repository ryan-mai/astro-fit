import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';


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

const startBtn = document.getElementById('start-mission-btn');
if (startBtn) {
    startBtn.addEventListener('click', () => {
        window.location.href = 'mission.html';
    });
}

const API_BASE = window.__API_BASE__ || 'http://127.0.0.1:5000';

async function fetchWeather(lat, lng) {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
    });

    const res = await fetch(
      `${API_BASE}/api/weather?${params.toString()}`
    );
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

const PLANET_LIST = [
    { name: 'Sun',   path: 'models/sun.glb',    order: 0 },
    // { name: 'Mercury', path: 'models/mercury.glb', order: 1 },
    { name: 'Venus', path: 'models/venus.glb',  order: 2 },
    { name: 'Earth', path: 'models/earth.glb',  order: 3 },
    { name: 'Moon',  path: 'models/moon.glb',   order: 4 },
    { name: 'Mars',  path: 'models/mars.glb',   order: 5 },
    { name: 'Jupiter', path: 'models/jupiter.glb', order: 6 },
    // { name: 'Saturn', path: 'models/saturn.glb', order: 7 },
];
PLANET_LIST.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const planetEl = document.querySelector('.hero-right-planet');
const carouselEl = document.querySelector('.carousel-dots');

if (!planetEl ) {
    console.warn('Planet or Carousel not found!');
}
else {
    planetEl.innerHTML = '';

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(planetEl.clientWidth, planetEl.clientHeight);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    
    planetEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, planetEl.clientWidth / planetEl.clientHeight || 1, 0.25, 5);
    camera.position.set(0, 0, 3.2);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
    directionalLight.position.set(3, 3, 3);
    scene.add(directionalLight);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./gltf/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerPrev = new THREE.Vector2();

    let currentPlanet = null;
    let currentPlanetIdx = 0;
    let isPointerDown = false;
    let isRotating = false;
    let dragDistX = 0;
    let isLoading = false;
    
    function resizeRenderer() {
        if (!planetEl) return;
        renderer.setSize(planetEl.clientWidth, planetEl.clientHeight);
        camera.aspect = planetEl.clientWidth / (planetEl.clientHeight || 1);
        camera.updateProjectionMatrix();
    }

    window.addEventListener('resize', resizeRenderer);
    resizeRenderer();

    function removeModel(model) {
        if (!model) return;
        scene.remove(model);
        model.traverse((obj) => {
            if (obj.isMesh) {
                obj.geometry?.dispose();
                if (Array.isArray(obj.material)) obj.material.forEach((mat) => mat?.dispose());
                else obj.material?.dispose();
            }
        });
    }

    async function loadModel(idx) {
        if (isLoading) return;
        const index = (idx + PLANET_LIST.length) % PLANET_LIST.length;
        const entry = PLANET_LIST[index];
        if (!entry) return;
        isLoading = true;

        try {
            const gltf = await gltfLoader.loadAsync(entry.path);
            removeModel(currentPlanet);
            currentPlanet = gltf.scene;
            currentPlanet.rotation.set(0, Math.PI / 4, 0);
            currentPlanet.position.set(0, -0.2, 0);

            const box = new THREE.Box3().setFromObject(currentPlanet);
            const size = box.getSize(new THREE.Vector3()).length();
            const scale = size > 0 ? 1.8 / size : 1;

            currentPlanet.scale.setScalar(scale);
            scene.add(currentPlanet);
            currentPlanetIdx = index;
        } catch (err) {
            console.error('failed to load model', entry.path, err);
        } finally {
            isLoading = false;
            updateCarousel();
        }
    }

    function updateCarousel() {
        if (!carouselEl) return;
        const dots = carouselEl.querySelectorAll('.dot');
        dots.forEach((dot) => {
            const idx = Number(dot.dataset.index);
            dot.classList.toggle('active', idx === currentPlanetIdx);
            dot.disabled = isLoading && idx === currentPlanetIdx;
        });
    }

    function createCarousel() {
        if (!carouselEl) return;
        carouselEl.innerHTML = '';
        PLANET_LIST.forEach((model, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dot';
            btn.dataset.index = String(idx);
            btn.setAttribute('aria-label', model.name);
            btn.addEventListener('click', () => {
                if (idx !== currentPlanetIdx) loadModel(idx);
            });
            if (idx === currentPlanetIdx) btn.classList.add('active');
            carouselEl.appendChild(btn)
        });
    }

    function updateModel(dir) {
        loadModel(currentPlanetIdx + dir);
    }

    function getPointer(ev, target) {
        const rect = renderer.domElement.getBoundingClientRect();
        target.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        target.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        return target;
    }

    function getTouching(coord) {
        if (!currentPlanet) return false;
        raycaster.setFromCamera(coord, camera);
        return raycaster.intersectObject(currentPlanet, true).length > 0;
    }

    function getPointerDown(ev) {
        if (ev.button !== 0) return;
        isPointerDown = true;
        dragDistX = 0;
        getPointer(ev, pointer);
        pointerPrev.copy(pointer);
        isRotating = getTouching(pointer);
        renderer.domElement.setPointerCapture(ev.pointerId);
    }

    function getPointerMove(ev) {
        if (!isPointerDown) return;
        getPointer(ev, pointer);
        
        const dx = pointer.x - pointerPrev.x;
        const dy = pointer.y - pointerPrev.y;
        
        if (isRotating && currentPlanet) {
            currentPlanet.rotation.y -= dx * -Math.PI;
            currentPlanet.rotation.x -= dy * Math.PI;
            currentPlanet.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, currentPlanet.rotation.x));
        } else {
            dragDistX += ev.movementX;
        }
        pointerPrev.copy(pointer);
    }

    function releasePointer(ev) {
        if (!isPointerDown) return;
        renderer.domElement.releasePointerCapture?.(ev.pointerId);
        if (!isRotating && currentPlanet) {
            const dir = dragDistX < 0 ? 1 : -1;
            updateModel(dir);
        }
        isPointerDown = false;
        dragDistX = 0;
    }

    renderer.domElement.addEventListener('pointermove', getPointerMove);
    renderer.domElement.addEventListener('pointerdown', getPointerDown);
    renderer.domElement.addEventListener('pointerup', releasePointer);
    renderer.domElement.addEventListener('pointercancel', releasePointer);
    renderer.domElement.addEventListener('pointerleave', () => {
        isPointerDown = false;
        dragDistX = 0;
    })


    function animate() {
        requestAnimationFrame(animate);
        if (currentPlanet && !isPointerDown) {
            currentPlanet.rotation.y += 0.001;
        }
        renderer.render(scene, camera);
    }

    createCarousel();
    updateCarousel();
    loadModel(currentPlanetIdx);
    animate();
}