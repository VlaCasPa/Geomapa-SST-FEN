// ============================================================================
// GEOMAPA SST FEN PERÚ — LÓGICA PRINCIPAL (FASE 1: LIMA Y CALLAO)
// Base Normativa: Protocolo SST ante el Fenómeno El Niño (R.M. N.° 341-2026-TR)
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- 1. CONFIGURACIÓN FIREBASE (PROYECTO: geomapa-sst-fen-peru) ---
const firebaseConfig = {
    apiKey: "AIzaSyA1Gq5BMmSG2DTtd9TlitOaXwJUC8wA5VI",
    authDomain: "geomapa-sst-fen-peru.firebaseapp.com",
    projectId: "geomapa-sst-fen-peru",
    storageBucket: "geomapa-sst-fen-peru.firebasestorage.app",
    messagingSenderId: "433835187529",
    appId: "1:433835187529:web:206cd767424786f1f78e98",
    measurementId: "G-NYXBLLZNH1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;

// --- 2. AUTENTICACIÓN Y GOBERNANZA (GOOGLE SIGN-IN + DISCLAIMER) ---
window.loginConGoogle = async function() {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Error de inicio de sesión con Google:", error);
        alert("No se pudo completar el inicio de sesión con Google. Verifique que las ventanas emergentes estén habilitadas.");
    }
};

window.cerrarSesion = async function() {
    await signOut(auth);
};

window.toggleBotonDisclaimer = function() {
    const chk = document.getElementById('chk-acepto-terminos');
    const btn = document.getElementById('btn-aceptar-disclaimer');
    if (chk && btn) btn.disabled = !chk.checked;
};

window.aceptarDisclaimer = async function() {
    const disclaimerModal = document.getElementById('disclaimer-modal');
    if (disclaimerModal) disclaimerModal.style.display = 'none';
    sessionStorage.setItem('geomapa_disclaimer_ok', 'true');

    if (currentUser) {
        try {
            await setDoc(doc(db, "usuarios", currentUser.uid), {
                email: currentUser.email,
                nombre: currentUser.displayName || "Especialista SST",
                disclaimerAceptado: true,
                fechaAceptacion: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.warn("No se pudo registrar consentimiento en Firestore:", e);
        }
    }
};

onAuthStateChanged(auth, async (user) => {
    const loginModal = document.getElementById('login-modal');
    const disclaimerModal = document.getElementById('disclaimer-modal');
    const userBadge = document.getElementById('userEmailBadge');

    if (user) {
        currentUser = user;
        if (loginModal) loginModal.style.display = 'none';
        if (userBadge) userBadge.textContent = `🟢 ${user.displayName || user.email}`;

        let aceptado = sessionStorage.getItem('geomapa_disclaimer_ok') === 'true';
        if (!aceptado) {
            try {
                const snap = await getDoc(doc(db, "usuarios", user.uid));
                if (snap.exists() && snap.data().disclaimerAceptado === true) {
                    aceptado = true;
                    sessionStorage.setItem('geomapa_disclaimer_ok', 'true');
                }
            } catch (e) {}
        }

        if (!aceptado && disclaimerModal) {
            disclaimerModal.style.display = 'flex';
        } else if (disclaimerModal) {
            disclaimerModal.style.display = 'none';
        }
    } else {
        currentUser = null;
        if (loginModal) loginModal.style.display = 'flex';
        if (disclaimerModal) disclaimerModal.style.display = 'none';
    }
});

// --- 3. INICIALIZACIÓN DEL MAPA EN ESCALA DE GRISES (LIMPIO AL INICIO) ---
const map = L.map('map', { zoomControl: false }).setView([-12.0464, -77.0428], 11);
L.control.zoom({ position: 'bottomleft' }).addTo(map);

const googleGrisLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m@129&x={x}&y={y}&z={z}', {
    attribution: '&copy; Google Maps | Cartografía: CENEPRED | Protocolo: MTPE R.M. N.° 341-2026-TR',
    maxZoom: 20,
    className: 'mapa-google-gris'
}).addTo(map);

// --- 4. NORMALIZACIÓN DE NIVELES CENEPRED / SST ---
function normalizarTexto(str) {
    if (!str) return '';
    return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim().toUpperCase();
}

function obtenerNivelEstandar(str) {
    const n = normalizarTexto(str);
    if (n.includes('MUY ALTO')) return 'MUY ALTO';
    if (n === 'ALTO' || (n.includes('ALTO') && !n.includes('MUY'))) return 'ALTO';
    if (n.includes('MEDIO')) return 'MEDIO';
    if (n.includes('BAJO')) return 'BAJO';
    return 'NO DETERMINADO';
}

function getColorPeligro(nivel) {
    const est = obtenerNivelEstandar(nivel);
    if (est === 'MUY ALTO') return '#dc2626';
    if (est === 'ALTO') return '#ea580c';
    if (est === 'MEDIO') return '#eab308';
    if (est === 'BAJO') return '#16a34a';
    return '#64748b';
}

function getTextColor(nivel) {
    const est = obtenerNivelEstandar(nivel);
    if (est === 'MEDIO') return '#0f172a';
    return '#ffffff';
}

// --- 5. DATOS VECTORIALES Y RÁSTER DE LIMA Y CALLAO (CARGA EN MEMORIA, APAGADOS AL INICIO) ---
const baseUrl = 'datos_vectoriales/';
let geoDistritos = null, geoInundacion = null, geoHuaycos = null;
let layerDistritos = null, layerInundacion = null, layerHuaycos = null, layerRios = null;
let layerPuntosCriticos = L.layerGroup(); // Sin .addTo(map) inicial
let rasterElevationLayer = null;
let rawOriginBounds = null;

// Ajuste fino heredado para el Modelo Digital de Elevación (MDE)
const SHIFT_LAT = 0.0020;
const SHIFT_LNG = 0.0032;

function utm18SToLatLng(easting, northing) {
    const a = 6378137.0, f = 1 / 298.257223563, k0 = 0.9996;
    const e = Math.sqrt(2 * f - f * f), e1sq = e * e / (1 - e * e);
    const x = easting - 500000.0, y = northing - 10000000.0;
    const M = y / k0;
    const mu = M / (a * (1 - e * e / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256));
    const e1 = (1 - Math.sqrt(1 - e * e)) / (1 + Math.sqrt(1 - e * e));
    const fp = mu + (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu) +
               (21 * Math.pow(e1, 2) / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu) +
               (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu) + (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);
    const sinFp = Math.sin(fp), cosFp = Math.cos(fp), tanFp = Math.tan(fp);
    const C1 = e1sq * cosFp * cosFp, T1 = tanFp * tanFp;
    const R1 = a * (1 - e * e) / Math.pow(1 - e * e * sinFp * sinFp, 1.5);
    const N1 = a / Math.sqrt(1 - e * e * sinFp * sinFp);
    const D = x / (N1 * k0);
    const lat = (fp - (N1 * tanFp / R1) * ((D * D / 2) - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e1sq) * Math.pow(D, 4) / 24)) * (180 / Math.PI);
    const lng = -75.0 + ((D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e1sq + 24 * T1 * T1) * Math.pow(D, 5) / 120) / cosFp) * (180 / Math.PI);
    return [lat, lng];
}

// Carga Ráster MDE (elevacion.png + elevacion.pgw)
fetch('datos_raster/elevacion.pgw')
    .then(res => res.ok ? res.text() : Promise.reject())
    .then(text => {
        const lines = text.trim().split(/\r?\n/).map(Number);
        if (lines.length >= 6 && !isNaN(lines[0])) {
            const minX = lines[4] - (lines[0] / 2);
            const maxY = lines[5] - (lines[3] / 2);
            const maxX = minX + (702 * lines[0]);
            const minY = maxY + (1160 * lines[3]);
            const sw = utm18SToLatLng(minX, minY);
            const ne = utm18SToLatLng(maxX, maxY);
            rawOriginBounds = [
                [sw[0] + SHIFT_LAT, sw[1] + SHIFT_LNG],
                [ne[0] + SHIFT_LAT, ne[1] + SHIFT_LNG]
            ];
            rasterElevationLayer = L.imageOverlay('datos_raster/elevacion.png', rawOriginBounds, { opacity: 0.72, interactive: false });
        }
    }).catch(() => {});

// Carga de Polígonos Distritales (en memoria; se dibuja al marcar checkbox)
fetch(baseUrl + 'DISTRITOS%20DE%20LIMA%20Y%20CALLAO.geojson')
    .then(res => res.json())
    .then(data => {
        geoDistritos = data;
        layerDistritos = L.geoJSON(data, {
            style: { fillColor: 'transparent', color: '#475569', weight: 1.5, opacity: 0.85, dashArray: '3,3' },
            onEachFeature: (feature, layer) => {
                const dist = feature.properties.NOMBDIST || feature.properties.distrito || 'Distrito';
                layer.bindTooltip(`Distrito: <b>${dist}</b>`, { sticky: true });
                layer.on('click', (e) => evaluarPuntoEnMapa(e.latlng.lat, e.latlng.lng));
            }
        });
    });

// Carga de Escenario Inundación CENEPRED (en memoria; se dibuja al marcar checkbox)
fetch(baseUrl + 'PELIGRO%20INUNDACION%20LIMA%20Y%20CALLAO.geojson')
    .then(res => res.json())
    .then(data => {
        geoInundacion = data;
        layerInundacion = L.geoJSON(data, {
            style: (feature) => ({
                fillColor: getColorPeligro(feature.properties.niv_sinu),
                weight: 0.8,
                color: '#ffffff',
                fillOpacity: 0.48
            }),
            onEachFeature: (feature, layer) => {
                layer.on('click', (e) => evaluarPuntoEnMapa(e.latlng.lat, e.latlng.lng));
            }
        });
    });

// Carga de Escenario Movimientos en Masa CENEPRED (en memoria; se dibuja al marcar checkbox)
fetch(baseUrl + 'PELIGRO%20MOVIMIENTOS%20EN%20MASAS%20LIMA%20Y%20CALLAO.geojson')
    .then(res => res.json())
    .then(data => {
        geoHuaycos = data;
        layerHuaycos = L.geoJSON(data, {
            style: (feature) => ({
                fillColor: getColorPeligro(feature.properties.npel_mm),
                weight: 0.8,
                color: '#ffffff',
                fillOpacity: 0.50
            }),
            onEachFeature: (feature, layer) => {
                layer.on('click', (e) => evaluarPuntoEnMapa(e.latlng.lat, e.latlng.lng));
            }
        });
    });

// Carga de Ríos Rímac y Chillón (en memoria; se dibuja al marcar checkbox)
fetch(baseUrl + 'RIOS%20RIMAC%20CHILLON.geojson')
    .then(res => res.json())
    .then(data => {
        layerRios = L.geoJSON(data, {
            style: { color: '#0284c7', weight: 3, opacity: 0.85 }
        });
    });

// --- 6. DATASET DE 23 PUNTOS CRÍTICOS VIALES (LIMA Y CALLAO) ---
const puntosCriticosDataset = [
    { name: "Paso a Desnivel Javier Prado - Vía Expresa", dir: "Av. Javier Prado Este con Vía Expresa Paseo de la República", dist: "San Isidro / La Victoria", inun: "Muy Alto", huay: "Bajo", lat: -12.0883, lon: -77.0275 },
    { name: "Paso a Desnivel Javier Prado - Gálvez Barrenechea", dir: "Av. Javier Prado Este con Av. José Gálvez Barrenechea", dist: "San Borja / San Isidro", inun: "Muy Alto", huay: "Bajo", lat: -12.0903, lon: -77.0142 },
    { name: "Intercambio Panamericana Norte - San Juan de Dios", dir: "Autopista Panamericana Norte con Av. San Juan de Dios", dist: "Puente Piedra", inun: "Muy Alto", huay: "Bajo", lat: -11.8596, lon: -77.0754 },
    { name: "Intercambio Separadora Industrial - Velasco Alvarado", dir: "Av. Separadora Industrial con Av. Juan Velasco Alvarado", dist: "Villa El Salvador", inun: "Alto", huay: "Bajo", lat: -12.2036, lon: -76.9388 },
    { name: "Intercambio Panamericana Norte - Universitaria", dir: "Av. Universitaria con Autopista Panamericana Norte", dist: "Los Olivos / SMP", inun: "Muy Alto", huay: "Bajo", lat: -11.9664, lon: -77.0706 },
    { name: "Intercambio Universitaria - Línea Amarilla (Río Rímac)", dir: "Av. Universitaria con Vía Expresa Línea Amarilla", dist: "Lima / SMP", inun: "Muy Alto", huay: "Bajo", lat: -12.0461, lon: -77.0735 },
    { name: "Bajada Malecón de la Marina (Acceso Costa Verde)", dir: "Av. Del Ejército / Bajada Malecón de la Marina", dist: "Miraflores", inun: "Alto", huay: "Medio", lat: -12.1221, lon: -77.0383 },
    { name: "Bypass 28 de Julio - Arequipa", dir: "Av. 28 de Julio con Av. Arequipa y Garcilaso", dist: "Lima (Cercado)", inun: "Muy Alto", huay: "Bajo", lat: -12.0642, lon: -77.0366 },
    { name: "Bypass 28 de Julio - Vía Expresa", dir: "Av. 28 de Julio con Paseo de la República", dist: "Lima / La Victoria", inun: "Muy Alto", huay: "Bajo", lat: -12.0649, lon: -77.0328 },
    { name: "Bypass Alfonso Ugarte - Argentina", dir: "Plaza Ramón Castilla (Av. Alfonso Ugarte / Argentina)", dist: "Lima (Cercado)", inun: "Muy Alto", huay: "Bajo", lat: -12.0436, lon: -77.0425 },
    { name: "Paso a Desnivel Angamos Este - San Luis", dir: "Av. Angamos Este con Av. San Luis", dist: "San Borja", inun: "Alto", huay: "Bajo", lat: -12.1107, lon: -77.0006 },
    { name: "Intercambio Benavides - Panamericana Sur", dir: "Av. Alfredo Benavides con Panamericana Sur", dist: "Santiago de Surco", inun: "Muy Alto", huay: "Bajo", lat: -12.1292, lon: -76.9806 },
    { name: "Bypass Brasil - La Marina", dir: "Av. Brasil con Av. La Marina y Javier Prado Oeste", dist: "Magdalena / Jesús María", inun: "Muy Alto", huay: "Bajo", lat: -12.0837, lon: -77.0682 },
    { name: "Intercambio Mateo Pumacahua - Panamericana Sur", dir: "Av. Mateo Pumacahua con Panamericana Sur", dist: "Chorrillos / VES", inun: "Muy Alto", huay: "Bajo", lat: -12.1889, lon: -76.9667 },
    { name: "Bypass Javier Prado - Arequipa", dir: "Av. Javier Prado Oeste con Av. Arequipa", dist: "San Isidro", inun: "Muy Alto", huay: "Bajo", lat: -12.0911, lon: -77.0319 },
    { name: "Bypass México - Vía Expresa", dir: "Av. México con Vía Expresa Paseo de la República", dist: "La Victoria", inun: "Muy Alto", huay: "Bajo", lat: -12.0747, lon: -77.0289 },
    { name: "Bypass Tingo María - Venezuela", dir: "Av. Tingo María con Av. Venezuela", dist: "Breña / Lima", inun: "Muy Alto", huay: "Bajo", lat: -12.0601, lon: -77.0603 },
    { name: "Bypass Néstor Gambetta - Acceso Aeropuerto", dir: "Av. Néstor Gambetta con cruce ramal Aeropuerto", dist: "Callao", inun: "Muy Alto", huay: "Bajo", lat: -12.0135, lon: -77.1189 },
    { name: "Paso a Desnivel Óvalo Pachacútec", dir: "Óvalo Pachacútec con Av. 26 de Noviembre", dist: "Villa María del Triunfo", inun: "Muy Alto", huay: "Medio", lat: -12.1648, lon: -76.9298 },
    { name: "Intercambio Vía de Evitamiento - Prol. Tacna", dir: "Vía de Evitamiento con Puente Santa Rosa", dist: "Rímac / Lima", inun: "Muy Alto", huay: "Bajo", lat: -12.0378, lon: -77.0317 },
    { name: "Intercambio Nuevo Aeropuerto - Morales Duárez", dir: "Av. Elmer Faucett con Av. Morales Duárez", dist: "Callao / Carmen de la Legua", inun: "Muy Alto", huay: "Bajo", lat: -12.0304, lon: -77.1065 },
    { name: "Intercambio Ramiro Prialé - Huachipa", dir: "Autopista Ramiro Prialé con Av. Las Torres", dist: "Ate / Lurigancho-Chosica", inun: "Muy Alto", huay: "Alto", lat: -12.0320, lon: -76.9266 },
    { name: "Paso a Desnivel Prol. Javier Prado - Carretera Central", dir: "Av. Prolongación Javier Prado con Av. Nicolás Ayllón", dist: "Ate", inun: "Muy Alto", huay: "Muy Alto", lat: -12.0463, lon: -76.9382 }
];

function renderizarPuntosCriticos(filtrados = puntosCriticosDataset) {
    layerPuntosCriticos.clearLayers();
    const listContainer = document.getElementById('puntosCriticosList');
    const badge = document.getElementById('pcCounterBadge');
    if (listContainer) listContainer.innerHTML = '';
    if (badge) badge.textContent = filtrados.length;

    filtrados.forEach(pt => {
        const iconAlerta = L.divIcon({
            className: 'custom-pc-icon',
            html: `<div class="punto-critico-pin" title="${pt.name}">⚠️</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([pt.lat, pt.lon], { icon: iconAlerta, zIndexOffset: 2500 });
        marker.on('click', () => {
            evaluarPuntoEnMapa(pt.lat, pt.lon, {
                titulo: pt.name,
                direccion: `${pt.dir} (${pt.dist})`,
                inundacionOverride: pt.inun,
                huaycosOverride: pt.huay
            });
        });
        layerPuntosCriticos.addLayer(marker);

        if (listContainer) {
            const card = document.createElement('div');
            card.className = 'pc-item-card';
            card.style.borderLeftColor = getColorPeligro(pt.inun);
            card.innerHTML = `
                <div class="pc-item-title">${pt.name}</div>
                <div class="pc-item-sub">
                    <span>${pt.dist}</span>
                    <strong style="color:${getColorPeligro(pt.inun)}">${pt.inun.toUpperCase()}</strong>
                </div>
            `;
            card.addEventListener('click', () => {
                // Activa automáticamente la capa de puntos críticos si estaba apagada
                const chkPc = document.getElementById('chkPuntosCriticos');
                if (chkPc && !chkPc.checked) {
                    chkPc.checked = true;
                    layerPuntosCriticos.addTo(map);
                }
                map.setView([pt.lat, pt.lon], 15);
                evaluarPuntoEnMapa(pt.lat, pt.lon, {
                    titulo: pt.name,
                    direccion: `${pt.dir} (${pt.dist})`,
                    inundacionOverride: pt.inun,
                    huaycosOverride: pt.huay
                });
                if (window.innerWidth <= 860) {
                    document.getElementById('sideDrawer').classList.remove('drawer-open');
                }
            });
            listContainer.appendChild(card);
        }
    });
}
renderizarPuntosCriticos();

function filtrarPuntosCriticos() {
    const txt = normalizarTexto(document.getElementById('filterPcText')?.value || '');
    const risk = normalizarTexto(document.getElementById('filterPcRisk')?.value || '');
    const filtrados = puntosCriticosDataset.filter(pt => {
        const matchTxt = !txt || normalizarTexto(pt.name).includes(txt) || normalizarTexto(pt.dist).includes(txt) || normalizarTexto(pt.dir).includes(txt);
        const matchRisk = !risk || obtenerNivelEstandar(pt.inun) === risk || obtenerNivelEstandar(pt.huay) === risk;
        return matchTxt && matchRisk;
    });
    renderizarPuntosCriticos(filtrados);
}
document.getElementById('filterPcText')?.addEventListener('input', filtrarPuntosCriticos);
document.getElementById('filterPcRisk')?.addEventListener('change', filtrarPuntosCriticos);

// --- 7. MOTOR DE INTERSECCIÓN ESPACIAL (PUNTO EN POLÍGONO) ---
function puntoEnAnillo(pt, ring) {
    const x = pt[0], y = pt[1];
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function puntoEnGeometria(lng, lat, geometry) {
    if (!geometry) return false;
    if (geometry.type === 'Polygon') {
        if (!puntoEnAnillo([lng, lat], geometry.coordinates[0])) return false;
        for (let i = 1; i < geometry.coordinates.length; i++) {
            if (puntoEnAnillo([lng, lat], geometry.coordinates[i])) return false;
        }
        return true;
    }
    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some(poly => {
            if (!puntoEnAnillo([lng, lat], poly[0])) return false;
            for (let i = 1; i < poly.length; i++) {
                if (puntoEnAnillo([lng, lat], poly[i])) return false;
            }
            return true;
        });
    }
    return false;
}

function buscarAtributoEnCapa(geojson, lng, lat, propNames) {
    if (!geojson || !geojson.features) return null;
    for (const feat of geojson.features) {
        if (puntoEnGeometria(lng, lat, feat.geometry)) {
            for (const p of propNames) {
                if (feat.properties && feat.properties[p]) return feat.properties[p];
            }
        }
    }
    return null;
}

// --- 8. INTERPRETACIÓN TÉCNICA SST (R.M. N.° 341-2026-TR) ---
let ultimoDiagnostico = null;
let faseActual = 'antes';

function generarRecomendacionesProtocolo(nivelInun, nivelHuay) {
    const esCritico = (nivelInun === 'MUY ALTO' || nivelInun === 'ALTO' || nivelHuay === 'MUY ALTO' || nivelHuay === 'ALTO');
    return {
        antes: [
            "Actualizar la matriz IPERC incorporando escenarios de lluvias intensas, aniegos y escorrentía en este sector (Ley N.° 29783, Art. 57).",
            "Inspeccionar y limpiar canaletas, sumideros, techos y drenajes perimetrales antes de precipitaciones.",
            esCritico
                ? "ALERTA SECTORIAL: Implementar barreras contra inundaciones, verificar motobombas operativas y señalizar rutas de evacuación hacia cotas altas."
                : "Verificar disponibilidad de kit de emergencia, impermeables, calzado antideslizante y protección solar FPS 50+ (D.S. N.° 003-2026-SA)."
        ],
        durante: [
            esCritico
                ? "EJERCER PARALIZACIÓN INMEDIATA si existe peligro inminente por aniego severo, tormenta eléctrica o flujo de detritos (Ley N.° 29783, Art. 63)."
                : "Monitorear avisos meteorológicos de SENAMHI y restringir trabajos en excavaciones, taludes o redes eléctricas expuestas a humedad.",
            "Cortar el suministro eléctrico en tableros o áreas vulnerables a filtración de agua.",
            "Activar brigadas de emergencia y evacuar al personal hacia zonas seguras previamente definidas."
        ],
        despues: [
            "Ejecutar Inspección Técnica de Seguridad post-emergencia antes de autorizar el reingreso del personal (Numeral 11 - Retorno Seguro).",
            "Desenergizar y verificar ausencia de cables expuestos, socavaciones o inestabilidad de taludes y estructuras.",
            "Eliminar aguas estancadas para prevenir vectores (dengue/leptospirosis) y evaluar modalidad de teletrabajo si las vías de acceso están dañadas."
        ]
    };
}

window.cambiarFaseTab = function(fase, btnEl) {
    faseActual = fase;
    document.querySelectorAll('.phase-tab').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderizarContenidoFase();
};

function renderizarContenidoFase() {
    const container = document.getElementById('protocolContent');
    if (!container || !ultimoDiagnostico) return;
    const items = ultimoDiagnostico.recomendaciones[faseActual] || [];
    container.innerHTML = `<ul>${items.map(txt => `<li>${txt}</li>`).join('')}</ul>`;
}

// --- 9. CONSULTA INTERACTIVA DE PUNTO (PIN ARRASTRABLE, GPS O CLIC EN MAPA) ---
let activeQueryMarker = null;

async function evaluarPuntoEnMapa(lat, lng, opciones = {}) {
    if (activeQueryMarker) map.removeLayer(activeQueryMarker);

    const pinIcon = L.divIcon({
        className: 'query-pin-icon',
        html: `<div style="background:#0f172a; color:#fff; width:30px; height:30px; border-radius:50%; border:3px solid #b91c1c; display:flex; align-items:center; justify-content:center; font-size:15px; box-shadow:0 4px 12px rgba(0,0,0,0.45);">📍</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    activeQueryMarker = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
    activeQueryMarker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        evaluarPuntoEnMapa(pos.lat, pos.lng);
    });

    const distritoDetectado = buscarAtributoEnCapa(geoDistritos, lng, lat, ['NOMBDIST', 'distrito', 'DISTRITO']) || 'Lima Metropolitana / Callao';
    const rawInun = opciones.inundacionOverride || buscarAtributoEnCapa(geoInundacion, lng, lat, ['niv_sinu', 'NIVEL']) || 'Bajo / Sin polígono crítico';
    const rawHuay = opciones.huaycosOverride || buscarAtributoEnCapa(geoHuaycos, lng, lat, ['npel_mm', 'NIVEL']) || 'Bajo / Sin polígono crítico';

    const nivelInun = obtenerNivelEstandar(rawInun);
    const nivelHuay = obtenerNivelEstandar(rawHuay);

    const panel = document.getElementById('diagnosticPanel');
    if (panel) panel.style.display = 'flex';

    document.getElementById('diagDistritoTitle').textContent = opciones.titulo || `Distrito: ${distritoDetectado}`;
    document.getElementById('diagCoordsText').textContent = `Coordenadas WGS84: ${lat.toFixed(5)}, ${lng.toFixed(5)} (Arrastra el pin para ajustar)`;
    document.getElementById('diagAddressText').textContent = opciones.direccion || 'Obteniendo dirección referencial...';

    const cardInun = document.getElementById('cardInundacion');
    const valInun = document.getElementById('valInundacion');
    cardInun.style.backgroundColor = getColorPeligro(nivelInun);
    cardInun.style.color = getTextColor(nivelInun);
    valInun.textContent = nivelInun === 'NO DETERMINADO' ? rawInun : nivelInun;

    const cardHuay = document.getElementById('cardHuaycos');
    const valHuay = document.getElementById('valHuaycos');
    cardHuay.style.backgroundColor = getColorPeligro(nivelHuay);
    cardHuay.style.color = getTextColor(nivelHuay);
    valHuay.textContent = nivelHuay === 'NO DETERMINADO' ? rawHuay : nivelHuay;

    const recomendaciones = generarRecomendacionesProtocolo(nivelInun, nivelHuay);
    ultimoDiagnostico = {
        fecha: new Date().toLocaleString('es-PE'),
        distrito: distritoDetectado,
        lat,
        lng,
        direccion: opciones.direccion || '',
        nivelInun: valInun.textContent,
        nivelHuay: valHuay.textContent,
        recomendaciones
    };

    renderizarContenidoFase();

    if (!opciones.direccion) {
        try {
            const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
            const data = await resp.json();
            const dir = data.display_name || `Sector ${distritoDetectado}`;
            document.getElementById('diagAddressText').textContent = dir;
            ultimoDiagnostico.direccion = dir;
        } catch (e) {
            document.getElementById('diagAddressText').textContent = `Sector ${distritoDetectado}, Lima/Callao`;
        }
    }

    if (currentUser) {
        try {
            await addDoc(collection(db, "consultas_mapa"), {
                distrito: distritoDetectado,
                nivelInundacion: valInun.textContent,
                nivelMovMasas: valHuay.textContent,
                fecha: serverTimestamp()
            });
        } catch (e) {}
    }
}

window.cerrarDiagnostico = function() {
    document.getElementById('diagnosticPanel').style.display = 'none';
};

window.copiarDiagnosticoSST = function() {
    if (!ultimoDiagnostico) return;
    const texto = [
        `DIAGNÓSTICO REFERENCIAL SST — FENÓMENO EL NIÑO (R.M. N.° 341-2026-TR)`,
        `Fecha/Hora: ${ultimoDiagnostico.fecha}`,
        `Ubicación: ${ultimoDiagnostico.distrito} (${ultimoDiagnostico.lat.toFixed(5)}, ${ultimoDiagnostico.lng.toFixed(5)})`,
        `Dirección Ref.: ${ultimoDiagnostico.direccion}`,
        `Susceptibilidad Inundación (CENEPRED): ${ultimoDiagnostico.nivelInun}`,
        `Susceptibilidad Mov. en Masa (CENEPRED): ${ultimoDiagnostico.nivelHuay}`,
        `Controles Prioritarios (Antes): ${ultimoDiagnostico.recomendaciones.antes[0]}`,
        `Nota: Fuente referencial Geomapa SST FEN Perú. Sujeto a validación IPERC del centro de trabajo.`
    ].join('\n');

    navigator.clipboard.writeText(texto).then(() => {
        const btn = document.getElementById('btnCopyReport');
        const orig = btn.textContent;
        btn.textContent = "✅ ¡Diagnóstico copiado al portapapeles!";
        setTimeout(() => { btn.textContent = orig; }, 2500);
    });
};

// Clic directo en el mapa
map.on('click', (e) => {
    evaluarPuntoEnMapa(e.latlng.lat, e.latlng.lng);
});

// Botón "Picar Punto"
document.getElementById('btnDropPin')?.addEventListener('click', () => {
    const center = map.getCenter();
    evaluarPuntoEnMapa(center.lat, center.lng);
});

// Botón "Mi GPS"
document.getElementById('btnMyLocation')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert("Su navegador no soporta geolocalización GPS.");
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            map.setView([latitude, longitude], 15);
            evaluarPuntoEnMapa(latitude, longitude);
        },
        () => alert("No se pudo obtener su ubicación GPS. Verifique los permisos de ubicación en su dispositivo.")
    );
});

// Buscador de direcciones (Nominatim acotado a Lima/Callao)
async function buscarDireccion() {
    const input = document.getElementById('addressInput');
    const query = input?.value.trim();
    if (!query) return;

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Lima, Peru')}&limit=1`;
        const res = await fetch(url);
        const results = await res.json();
        if (results && results.length > 0) {
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);
            map.setView([lat, lon], 15);
            evaluarPuntoEnMapa(lat, lon, { direccion: results[0].display_name });
        } else {
            alert("No se encontró la dirección en Lima/Callao. Intente con el nombre de la avenida o distrito.");
        }
    } catch (e) {
        alert("Error al consultar el buscador de direcciones.");
    }
}

document.getElementById('btnSearchAddress')?.addEventListener('click', buscarDireccion);
document.getElementById('addressInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarDireccion();
});

// --- 10. CONTROL DE CAPAS Y RESPONSIVE DRAWER ---
function vincularCheckboxCapa(chkId, getLayerFn) {
    document.getElementById(chkId)?.addEventListener('change', (e) => {
        const layer = getLayerFn();
        if (!layer) return;
        if (e.target.checked) layer.addTo(map);
        else map.removeLayer(layer);
    });
}

vincularCheckboxCapa('chkDistritos', () => layerDistritos);
vincularCheckboxCapa('chkInundacion', () => layerInundacion);
vincularCheckboxCapa('chkHuaycos', () => layerHuaycos);
vincularCheckboxCapa('chkRios', () => layerRios);
vincularCheckboxCapa('chkPuntosCriticos', () => layerPuntosCriticos);
vincularCheckboxCapa('chkTopografia', () => rasterElevationLayer);

window.toggleSideDrawer = function() {
    const drawer = document.getElementById('sideDrawer');
    const arrow = document.getElementById('drawerToggleArrow');
    drawer.classList.toggle('drawer-open');
    if (arrow) arrow.textContent = drawer.classList.contains('drawer-open') ? '▼' : '▲';
};

window.toggleLeyenda = function() {
    const body = document.getElementById('legendBody');
    const arrow = document.getElementById('legendArrow');
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'flex' : 'none';
    if (arrow) arrow.textContent = isHidden ? '▼' : '▲';
};

document.getElementById('btnOpenNormativa')?.addEventListener('click', () => {
    document.getElementById('normativaModal').style.display = 'flex';
});
