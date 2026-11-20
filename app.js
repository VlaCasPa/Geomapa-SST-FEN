// ============================================================================
// GEOMAPA SST FEN PERÚ — VISOR GEOESPACIAL, ESTRÉS TÉRMICO Y PROTOCOLO MTPE
// Desarrollado por: Vladimir Casas Palomino
// Base Normativa: Protocolo SST ante el Fenómeno El Niño (R.M. N.° 341-2026-TR)
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- 1. CONFIGURACIÓN FIREBASE Y ADMINISTRADOR ---
const firebaseConfig = {
    apiKey: "AIzaSyA1Gq5BMmSG2DTtd9TlitOaXwJUC8wA5VI",
    authDomain: "geomapa-sst-fen-peru.firebaseapp.com",
    projectId: "geomapa-sst-fen-peru",
    storageBucket: "geomapa-sst-fen-peru.firebasestorage.app",
    messagingSenderId: "433835187529",
    appId: "1:433835187529:web:206cd767424786f1f78e98",
    measurementId: "G-NYXBLLZNH1"
};

// COLOCA AQUÍ TU CORREO EXACTAMENTE COMO APARECE EN TU CUENTA DE GOOGLE
const ADMIN_EMAILS = [
    "vlacaspa@gmail.com",
    "tu_correo_admin@gmail.com"
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;

function esAdministrador(user) {
    if (!user || !user.email) return false;
    return ADMIN_EMAILS.map(e => e.toLowerCase().trim()).includes(user.email.toLowerCase().trim());
}

// --- 2. AUTENTICACIÓN Y GOBERNANZA ---
window.loginConGoogle = async function() {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Error de inicio de sesión con Google:", error);
        alert("No se pudo completar el inicio de sesión con Google. Verifique las ventanas emergentes.");
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
    setTimeout(() => map.invalidateSize(), 200);

    if (currentUser) {
        try {
            await setDoc(doc(db, "usuarios", currentUser.uid), {
                email: currentUser.email,
                nombre: currentUser.displayName || "Especialista SST",
                disclaimerAceptado: true,
                fechaAceptacion: serverTimestamp()
            }, { merge: true });
        } catch (e) {}
    }
};

onAuthStateChanged(auth, async (user) => {
    const loginModal = document.getElementById('login-modal');
    const disclaimerModal = document.getElementById('disclaimer-modal');
    const userBadge = document.getElementById('userEmailBadge');
    const btnAdminInbox = document.getElementById('btnAdminInbox');

    if (user) {
        currentUser = user;
        if (loginModal) loginModal.style.display = 'none';
        if (userBadge) userBadge.textContent = `🟢 ${user.displayName || user.email}`;
        if (btnAdminInbox) btnAdminInbox.style.display = esAdministrador(user) ? 'block' : 'none';

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
            setTimeout(() => map.invalidateSize(), 200);
        }
    } else {
        currentUser = null;
        if (loginModal) loginModal.style.display = 'flex';
        if (disclaimerModal) disclaimerModal.style.display = 'none';
        if (btnAdminInbox) btnAdminInbox.style.display = 'none';
    }
});

// --- 3. INICIALIZACIÓN DEL MAPA DE GOOGLE MAPS EN ESCALA DE GRISES (BLINDADO) ---
const map = L.map('map', { zoomControl: false }).setView([-12.0464, -77.0428], 11);
L.control.zoom({ position: 'topleft' }).addTo(map);

const googleGrisLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    attribution: '&copy; Google Maps | Cartografía: CENEPRED | Protocolo: MTPE R.M. N.° 341-2026-TR',
    maxZoom: 20,
    className: 'mapa-google-gris'
}).addTo(map);

window.addEventListener('load', () => {
    setTimeout(() => map.invalidateSize(), 250);
});
window.addEventListener('resize', () => map.invalidateSize());

// --- 4. NORMALIZACIÓN DE COLORES SST ---
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
    return obtenerNivelEstandar(nivel) === 'MEDIO' ? '#0f172a' : '#ffffff';
}

// --- 5. CAPAS VECTORIALES Y RÁSTER (APAGADAS AL INICIO) ---
const baseUrl = 'datos_vectoriales/';
let geoDistritos = null, geoInundacion = null, geoHuaycos = null;
let layerDistritos = null, layerInundacion = null, layerHuaycos = null, layerRios = null;
let layerPuntosCriticos = L.layerGroup();
let rasterElevationLayer = null;

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
            rasterElevationLayer = L.imageOverlay('datos_raster/elevacion.png', [
                [sw[0] + SHIFT_LAT, sw[1] + SHIFT_LNG],
                [ne[0] + SHIFT_LAT, ne[1] + SHIFT_LNG]
            ], { opacity: 0.72, interactive: false });
        }
    }).catch(() => {});

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

fetch(baseUrl + 'RIOS%20RIMAC%20CHILLON.geojson')
    .then(res => res.json())
    .then(data => {
        layerRios = L.geoJSON(data, { style: { color: '#0284c7', weight: 3, opacity: 0.85 } });
    });

// --- 6. PUNTOS CRÍTICOS VIALES (SINCRONIZADOS EN VIVO CON GOOGLE SHEETS CSV) ---
const CSV_PUNTOS_CRITICOS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTiXs-tBRjj8n3K-FU17shsgTPd3_q7y6Xw2HE5prHH17hxxiWQS3Tj5yzBJmujmg/pub?output=csv';

let puntosCriticosActivos = [
    { name: "Paso a Desnivel Javier Prado - Vía Expresa", dir: "Av. Javier Prado Este con Vía Expresa Paseo de la República", dist: "San Isidro / La Victoria", inun: "Muy Alto", huay: "Bajo", lat: -12.0883, lon: -77.0275 },
    { name: "Bypass 28 de Julio - Arequipa", dir: "Av. 28 de Julio con Av. Arequipa", dist: "Lima (Cercado)", inun: "Muy Alto", huay: "Bajo", lat: -12.0642, lon: -77.0366 },
    { name: "Intercambio Ramiro Prialé - Huachipa", dir: "Autopista Ramiro Prialé con Av. Las Torres", dist: "Ate / Lurigancho-Chosica", inun: "Muy Alto", huay: "Alto", lat: -12.0320, lon: -76.9266 }
];

function parsearCoordDecimal(val) {
    if (val === undefined || val === null) return NaN;
    return parseFloat(String(val).trim().replace(',', '.'));
}

function renderizarPuntosCriticos(filtrados = puntosCriticosActivos) {
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
                    <strong style="color:${getColorPeligro(pt.inun)}">${(pt.inun || 'N/D').toUpperCase()}</strong>
                </div>
            `;
            card.addEventListener('click', () => {
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
                if (window.innerWidth <= 1024) cambiarVistaMovil('mapa');
            });
            listContainer.appendChild(card);
        }
    });
}

function sincronizarPuntosCriticosCSV() {
    if (typeof Papa === 'undefined') {
        setTimeout(sincronizarPuntosCriticosCSV, 150);
        return;
    }
    Papa.parse(CSV_PUNTOS_CRITICOS_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const remotos = [];
            results.data.forEach(row => {
                const keys = Object.keys(row);
                const nameKey = keys.find(k => {
                    const nk = normalizarTexto(k);
                    return nk.includes('PASO A DESNIVEL') || nk.includes('INTERCAMBIO') || nk.includes('NOMBRE') || nk.includes('PUNTO') || nk.includes('SECTOR');
                }) || keys[1] || keys[0];
                const dirKey = keys.find(k => {
                    const nk = normalizarTexto(k);
                    return nk.includes('DIRECCION') || nk.includes('INTERSECCION') || nk.includes('UBICACION') || nk.includes('REFERENCIA');
                }) || keys[2];
                const distKey = keys.find(k => normalizarTexto(k).includes('DISTRITO')) || keys[3];
                const inunKey = keys.find(k => normalizarTexto(k).includes('INUNDACION')) || keys[4];
                const huayKey = keys.find(k => {
                    const nk = normalizarTexto(k);
                    return nk.includes('HUAYCO') || nk.includes('MASA') || nk.includes('MOV');
                }) || keys[5];
                const latKey = keys.find(k => normalizarTexto(k).includes('LAT')) || keys[6];
                const lonKey = keys.find(k => normalizarTexto(k).includes('LON')) || keys[7];

                const lat = parsearCoordDecimal(row[latKey]);
                const lon = parsearCoordDecimal(row[lonKey]);
                const nombre = String(row[nameKey] || '').trim();

                if (!nombre || isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;

                remotos.push({
                    name: nombre,
                    dir: String(row[dirKey] || 'Referencia vial Lima/Callao').trim(),
                    dist: String(row[distKey] || 'Lima / Callao').trim(),
                    inun: String(row[inunKey] || 'Alto').trim(),
                    huay: String(row[huayKey] || 'Bajo').trim(),
                    lat,
                    lon
                });
            });

            if (remotos.length > 0) {
                puntosCriticosActivos = remotos;
                filtrarPuntosCriticos();
            }
        },
        error: function(err) {
            console.warn("Usando respaldo local de Puntos Críticos:", err);
            renderizarPuntosCriticos();
        }
    });
}
renderizarPuntosCriticos();
sincronizarPuntosCriticosCSV();

function filtrarPuntosCriticos() {
    const txt = normalizarTexto(document.getElementById('filterPcText')?.value || '');
    const risk = normalizarTexto(document.getElementById('filterPcRisk')?.value || '');
    const filtrados = puntosCriticosActivos.filter(pt => {
        const matchTxt = !txt || normalizarTexto(pt.name).includes(txt) || normalizarTexto(pt.dist).includes(txt) || normalizarTexto(pt.dir).includes(txt);
        const matchRisk = !risk || obtenerNivelEstandar(pt.inun) === risk || obtenerNivelEstandar(pt.huay) === risk;
        return matchTxt && matchRisk;
    });
    renderizarPuntosCriticos(filtrados);
}
document.getElementById('filterPcText')?.addEventListener('input', filtrarPuntosCriticos);
document.getElementById('filterPcRisk')?.addEventListener('change', filtrarPuntosCriticos);

// --- 7. INTERSECCIÓN ESPACIAL ---
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

// --- 8. DIAGNÓSTICO TERRITORIAL CENEPRED ---
let ultimoDiagnostico = null;
let faseActual = 'antes';
let puntoSeleccionadoActual = { lat: -12.0464, lng: -77.0428, distrito: "Lima Metropolitana" };

function generarRecomendacionesProtocolo(nivelInun, nivelHuay) {
    const esCritico = (nivelInun === 'MUY ALTO' || nivelInun === 'ALTO' || nivelHuay === 'MUY ALTO' || nivelHuay === 'ALTO');
    return {
        antes: [
            "Actualizar matriz IPERC incorporando escenarios de lluvias intensas y aniegos en este sector (Ley N.° 29783, Art. 57).",
            "Inspeccionar y limpiar canaletas, sumideros, techos y drenajes perimetrales antes de precipitaciones.",
            esCritico
                ? "ALERTA SECTORIAL: Implementar barreras contra inundaciones, verificar motobombas operativas y señalizar rutas de evacuación."
                : "Verificar disponibilidad de kit de emergencia, impermeables, calzado antideslizante y bloqueador FPS 50+."
        ],
        durante: [
            esCritico
                ? "EJERCER PARALIZACIÓN INMEDIATA ante peligro inminente por aniego severo, tormenta eléctrica o flujo de detritos (Ley N.° 29783, Art. 63)."
                : "Monitorear avisos de SENAMHI y restringir trabajos en excavaciones, taludes o redes eléctricas expuestas.",
            "Cortar suministro eléctrico en tableros o áreas vulnerables a filtración de agua.",
            "Activar brigadas de emergencia y evacuar hacia zonas seguras previamente definidas."
        ],
        despues: [
            "Ejecutar Inspección Técnica de Seguridad post-emergencia antes del reingreso del personal (Numeral 11 - Retorno Seguro).",
            "Desenergizar y verificar ausencia de cables expuestos, socavaciones o inestabilidad de estructuras.",
            "Eliminar aguas estancadas para prevenir vectores y evaluar teletrabajo si las vías están afectadas."
        ]
    };
}

window.cambiarFaseTab = function(fase, btnEl) {
    faseActual = fase;
    document.querySelectorAll('.phase-tab').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    const container = document.getElementById('protocolContent');
    if (container && ultimoDiagnostico) {
        const items = ultimoDiagnostico.recomendaciones[faseActual] || [];
        container.innerHTML = `<ul>${items.map(txt => `<li>${txt}</li>`).join('')}</ul>`;
    }
};

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
    puntoSeleccionadoActual = { lat, lng, distrito: distritoDetectado };

    const rawInun = opciones.inundacionOverride || buscarAtributoEnCapa(geoInundacion, lng, lat, ['niv_sinu', 'NIVEL']) || 'Bajo / Sin polígono crítico';
    const rawHuay = opciones.huaycosOverride || buscarAtributoEnCapa(geoHuaycos, lng, lat, ['npel_mm', 'NIVEL']) || 'Bajo / Sin polígono crítico';

    const nivelInun = obtenerNivelEstandar(rawInun);
    const nivelHuay = obtenerNivelEstandar(rawHuay);

    const panel = document.getElementById('diagnosticPanel');
    if (panel) panel.style.display = 'flex';

    document.getElementById('diagDistritoTitle').textContent = opciones.titulo || `Distrito: ${distritoDetectado}`;
    document.getElementById('diagCoordsText').textContent = `WGS84: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
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

    ultimoDiagnostico = {
        fecha: new Date().toLocaleString('es-PE'),
        distrito: distritoDetectado,
        lat, lng,
        direccion: opciones.direccion || '',
        nivelInun: valInun.textContent,
        nivelHuay: valHuay.textContent,
        recomendaciones: generarRecomendacionesProtocolo(nivelInun, nivelHuay)
    };
    window.cambiarFaseTab(faseActual, document.querySelector('.phase-tab.active'));

    cargarClimaPuntoActual(true);

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
        `DIAGNÓSTICO TERRITORIAL SST — FENÓMENO EL NIÑO (R.M. N.° 341-2026-TR)`,
        `Fecha/Hora: ${ultimoDiagnostico.fecha}`,
        `Ubicación: ${ultimoDiagnostico.distrito} (${ultimoDiagnostico.lat.toFixed(5)}, ${ultimoDiagnostico.lng.toFixed(5)})`,
        `Susceptibilidad Inundación (CENEPRED): ${ultimoDiagnostico.nivelInun}`,
        `Susceptibilidad Mov. en Masa (CENEPRED): ${ultimoDiagnostico.nivelHuay}`,
        `Control Prioritario: ${ultimoDiagnostico.recomendaciones.antes[0]}`
    ].join('\n');

    navigator.clipboard.writeText(texto).then(() => {
        const btn = document.getElementById('btnCopyReport');
        const orig = btn.textContent;
        btn.textContent = "✅ ¡Copiado!";
        setTimeout(() => { btn.textContent = orig; }, 2200);
    });
};

// ============================================================================
// 9. CALCULADORA OFICIAL DE ESTRÉS TÉRMICO POR CALOR (NUMERAL 9.1)
// ============================================================================
let modoTermicoActual = 'hi';
let ultimoReporteTermico = '';

window.cambiarModoTermico = function(modo, btnEl) {
    modoTermicoActual = modo;
    document.querySelectorAll('.t-mode-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    document.getElementById('formIndiceCalor').style.display = (modo === 'hi') ? 'block' : 'none';
    document.getElementById('formTGBH').style.display = (modo === 'tgbh') ? 'block' : 'none';
    if (modo === 'hi') calcularIndiceCalor();
    else calcularTGBH();
};

window.cargarClimaPuntoActual = async function(silencioso = false) {
    const noteEl = document.getElementById('weatherSourceNote');
    const { lat, lng, distrito } = puntoSeleccionadoActual;
    if (noteEl) noteEl.textContent = `Consultando condiciones meteorológicas en ${distrito}...`;

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m&timezone=America%2FLima`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.current) {
            const tempC = data.current.temperature_2m;
            const rh = data.current.relative_humidity_2m;
            document.getElementById('hiTempC').value = tempC.toFixed(1);
            document.getElementById('hiHumidity').value = Math.round(rh);
            if (noteEl) {
                noteEl.innerHTML = `✅ Clima ref. en <strong>${distrito}</strong>: <strong>${tempC.toFixed(1)} °C</strong> | <strong>${Math.round(rh)}% HR</strong> (Contrastable con SENAMHI).`;
            }
            if (modoTermicoActual === 'hi') calcularIndiceCalor();
        }
    } catch (e) {
        if (!silencioso && noteEl) noteEl.textContent = "⚠️ Ingrese los valores de SENAMHI manualmente.";
    }
};

function calcularRothfuszCelsius(tempC, rh) {
    const T = (tempC * 9 / 5) + 32;
    const R = rh;
    let HI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (R * 0.094));
    if ((HI + T) / 2 >= 80.0) {
        HI = -42.379 + 2.04901523 * T + 10.14333127 * R
             - 0.22475541 * T * R - 0.00683783 * T * T
             - 0.05481717 * R * R + 0.00122874 * T * T * R
             + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
        if (R < 13 && T >= 80 && T <= 112) {
            HI -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95.0)) / 17);
        } else if (R > 85 && T >= 80 && T <= 87) {
            HI += ((R - 85) / 10) * ((87 - T) / 5);
        }
    }
    return (HI - 32) * 5 / 9;
}

function interpretarTabla4IndiceCalor(hiEfectivo) {
    if (hiEfectivo >= 51.7) {
        return {
            nivel: "RIESGO MUY ALTO", color: "#dc2626", textColor: "#ffffff",
            salud: "Condiciones de calor extremo, con riesgo muy elevado de enfermedad grave por calor.",
            controles: [
                "Evitar la exposición no controlada; suspender o reprogramar las tareas que no puedan ejecutarse con controles eficaces.",
                "Aplicar paralización preventiva por peligro inminente (Ley N.° 29783, Art. 63) si no hay controles eficaces.",
                "Considerar los límites correspondientes al tipo de trabajo y la aclimatación (Tabla 3)."
            ]
        };
    } else if (hiEfectivo >= 39.4) {
        return {
            nivel: "RIESGO ALTO", color: "#ea580c", textColor: "#ffffff",
            salud: "Aumenta considerablemente la posibilidad de calambres y agotamiento por calor; puede presentarse golpe de calor.",
            controles: [
                "Aplicar controles intensificados, reducir la duración de la exposición y la carga física.",
                "Establecer ciclos obligatorios de trabajo/descanso en áreas frescas e hidratación permanente.",
                "Considerar los límites correspondientes al tipo de trabajo y la aclimatación (Tabla 3)."
            ]
        };
    } else if (hiEfectivo >= 32.2) {
        return {
            nivel: "RIESGO MEDIO", color: "#eab308", textColor: "#0f172a",
            salud: "Posibles calambres, agotamiento por calor y golpe de calor, especialmente con esfuerzo físico o exposición prolongada.",
            controles: [
                "Incrementar las pausas en lugares frescos, reducir el esfuerzo físico y reforzar la supervisión.",
                "Garantizar puntos de hidratación con agua fresca y protección solar.",
                "Considerar los límites correspondientes al tipo de trabajo y la aclimatación (Tabla 3)."
            ]
        };
    } else if (hiEfectivo >= 26.7) {
        return {
            nivel: "RIESGO BAJO", color: "#16a34a", textColor: "#ffffff",
            salud: "Puede aparecer fatiga con exposición prolongada o esfuerzo físico.",
            controles: [
                "Mantener agua potable, sombra, vigilancia de síntomas y pausas apropiadas.",
                "Considerar la carga física y la aclimatación."
            ]
        };
    } else {
        return {
            nivel: "CONFORT / SIN ALERTA", color: "#0284c7", textColor: "#ffffff",
            salud: "Condición térmica por debajo del umbral de precaución (26,7 °C).",
            controles: ["Mantener hidratación regular y medidas estándar de protección solar en exteriores."]
        };
    }
}

window.calcularIndiceCalor = function() {
    const tempC = parseFloat(document.getElementById('hiTempC').value);
    const rh = parseFloat(document.getElementById('hiHumidity').value);
    const solDirecto = document.getElementById('hiDirectSun').checked;
    if (isNaN(tempC) || isNaN(rh)) return;

    const hiSombra = calcularRothfuszCelsius(tempC, rh);
    const hiEfectivo = hiSombra + (solDirecto ? 8.3 : 0.0);
    const evalT4 = interpretarTabla4IndiceCalor(hiEfectivo);

    const banner = document.getElementById('thermalBanner');
    banner.style.backgroundColor = evalT4.color;
    banner.style.color = evalT4.textColor;

    document.getElementById('thermalMethodLabel').textContent = "ÍNDICE DE CALOR EFECTIVO (TABLA 4)";
    document.getElementById('thermalMainValue').textContent = `${hiEfectivo.toFixed(1)} °C`;
    document.getElementById('thermalSubValue').textContent = solDirecto
        ? `Sombra: ${hiSombra.toFixed(1)} °C + 8.3 °C (sol directo)`
        : `Condición bajo sombra (sin ajuste solar)`;
    document.getElementById('thermalRiskBadge').textContent = evalT4.nivel;
    document.getElementById('tgbhActionBox').style.display = 'none';
    document.getElementById('thermalHealthText').textContent = evalT4.salud;
    document.getElementById('thermalControlsList').innerHTML = evalT4.controles.map(c => `<li>${c}</li>`).join('');

    ultimoReporteTermico = [
        `EVALUACIÓN DE ESTRÉS TÉRMICO — PROTOCOLO MTPE (R.M. N.° 341-2026-TR - NUMERAL 9.1)`,
        `Fecha/Hora: ${new Date().toLocaleString('es-PE')}`,
        `Sector: ${puntoSeleccionadoActual.distrito} (${puntoSeleccionadoActual.lat.toFixed(4)}, ${puntoSeleccionadoActual.lng.toFixed(4)})`,
        `Método: Opción 2 - Índice de Calor (NWS/NOAA)`,
        `Datos: Temp=${tempC.toFixed(1)}°C | HR=${rh}% | Sol directo=${solDirecto ? 'Sí (+8.3°C)' : 'No'}`,
        `Resultado: Índice de Calor Efectivo = ${hiEfectivo.toFixed(1)} °C (${evalT4.nivel})`,
        `Medidas: ${evalT4.controles.join(' | ')}`
    ].join('\n');
};

const limitesTabla3 = {
    ligero:    { no: 28, si: 30, nombre: "Ligero",     decision: "Al alcanzar el valor aplicable, evaluar y reforzar los controles; no asumir que la tarea es segura solo por ser ligera." },
    moderado:  { no: 25, si: 28, nombre: "Moderado",   decision: "Reducir la exposición térmica, organizar pausas y reevaluar la tarea." },
    pesado:    { no: 23, si: 26, nombre: "Pesado",     decision: "Priorizar reducción del esfuerzo, pausas más frecuentes y trabajo en horas menos calurosas; reevaluar antes de continuar." },
    muypesado: { no: 21, si: 25, nombre: "Muy pesado", decision: "Aplicar controles reforzados desde valores relativamente bajos; considerar la suspensión o reprogramación si no se puede reducir suficientemente la exposición." }
};

window.calcularTGBH = function() {
    const cond = document.getElementById('tgbhCondicion').value;
    const tbh = parseFloat(document.getElementById('valTBH').value) || 0;
    const tg = parseFloat(document.getElementById('valTG').value) || 0;
    const tbs = parseFloat(document.getElementById('valTBS').value) || 0;
    const cav = parseFloat(document.getElementById('tgbhRopa').value) || 0;
    const cargaKey = document.getElementById('tgbhCarga').value;
    const aclim = document.getElementById('tgbhAclimatacion').value;

    document.getElementById('fieldTBS').style.opacity = (cond === 'sol') ? '1' : '0.45';

    const tgbhBase = (cond === 'sol') ? (0.7 * tbh + 0.2 * tg + 0.1 * tbs) : (0.7 * tbh + 0.3 * tg);
    const tgbhEfectivo = tgbhBase + cav;
    const infoCarga = limitesTabla3[cargaKey];
    const valorAccion = (aclim === 'si') ? infoCarga.si : infoCarga.no;
    const superaLimite = tgbhEfectivo >= valorAccion;

    let nivelColor = "#16a34a", textColor = "#ffffff";
    if (tgbhEfectivo > 28) nivelColor = "#dc2626";
    else if (tgbhEfectivo >= 25) nivelColor = "#ea580c";
    else if (tgbhEfectivo >= 21) { nivelColor = "#eab308"; textColor = "#0f172a"; }

    const banner = document.getElementById('thermalBanner');
    banner.style.backgroundColor = nivelColor;
    banner.style.color = textColor;

    document.getElementById('thermalMethodLabel').textContent = "TGBH EFECTIVO (R.M. N.° 375-2008-TR)";
    document.getElementById('thermalMainValue').textContent = `${tgbhEfectivo.toFixed(1)} °C`;
    document.getElementById('thermalSubValue').textContent = `TGBH base: ${tgbhBase.toFixed(1)} °C + Ropa/EPP: +${cav} °C`;
    document.getElementById('thermalRiskBadge').textContent = superaLimite ? "⚠️ SUPERA VALOR ACCIÓN" : "✅ DENTRO DE LÍMITE";

    const actionBox = document.getElementById('tgbhActionBox');
    actionBox.style.display = 'block';
    actionBox.style.backgroundColor = superaLimite ? '#fef2f2' : '#f0fdf4';
    actionBox.style.color = superaLimite ? '#991b1b' : '#166534';
    actionBox.innerHTML = `<strong>Tabla 3 (${infoCarga.nombre} / ${aclim === 'si' ? 'Aclimatado' : 'No aclimatado'}):</strong> Valor de acción = <strong>${valorAccion} °C</strong>. ${superaLimite ? 'Se alcanzó o superó el límite de acción.' : 'Por debajo del valor de acción aplicable.'}`;

    document.getElementById('thermalHealthText').textContent = superaLimite
        ? "Sobrecarga térmica ocupacional detectada según carga metabólica y vestimenta. Riesgo de fatiga térmica, calambres, agotamiento o golpe de calor."
        : "Carga térmica ambiental controlada para el nivel de esfuerzo y aclimatación seleccionados, sujeto a vigilancia preventiva.";

    const controles = [
        `Decisión Preventiva (Tabla 3): ${infoCarga.decision}`,
        "Suministrar hidratación fresca permanente y habilitar estaciones de sombra ventiladas.",
        "Implementar programa de aclimatación gradual y vigilancia de síntomas de alerta temprana."
    ];
    document.getElementById('thermalControlsList').innerHTML = controles.map(c => `<li>${c}</li>`).join('');

    ultimoReporteTermico = [
        `EVALUACIÓN TGBH EFECTIVO — R.M. N.° 375-2008-TR / PROTOCOLO FEN (R.M. N.° 341-2026-TR)`,
        `Fecha/Hora: ${new Date().toLocaleString('es-PE')}`,
        `Sector: ${puntoSeleccionadoActual.distrito}`,
        `TGBH Base=${tgbhBase.toFixed(1)}°C | Ajuste Ropa=+${cav}°C | TGBH Efectivo=${tgbhEfectivo.toFixed(1)}°C`,
        `Tabla 3: Trabajo ${infoCarga.nombre} (${aclim === 'si' ? 'Aclimatado' : 'No aclimatado'}) -> Límite: ${valorAccion}°C (${superaLimite ? 'SUPERA' : 'CUMPLE'})`,
        `Decisión: ${infoCarga.decision}`
    ].join('\n');
};

window.copiarReporteTermico = function() {
    if (!ultimoReporteTermico) return;
    navigator.clipboard.writeText(ultimoReporteTermico).then(() => {
        const btn = document.getElementById('btnCopyThermal');
        const orig = btn.textContent;
        btn.textContent = "✅ ¡Evaluación Térmica Copiada!";
        setTimeout(() => { btn.textContent = orig; }, 2200);
    });
};

calcularIndiceCalor();

// ============================================================================
// 10. DASHBOARD LINEAMIENTOS TÉCNICOS POR RIESGO (NUMERAL 9 + NUMERAL 11)
// ============================================================================
const LINEAMIENTOS_NUMERAL9 = [
    { num: "9.1", riesgo: "Estrés térmico por calor", peligro: "Exposición a altas temperaturas, humedad, carga metabólica y ropa/EPP restrictiva.", controles: "Evaluación TGBH/Índice de calor, sombra, agua potable fresca, plan de aclimatación y ciclos trabajo-descanso.", epp: "Ropa ligera transpirable y EPP compatible con el calor previsto.", retorno: "Evaluación ambiental y controles restablecidos; tareas, pausas, hidratación y sombra ajustadas a condiciones reales." },
    { num: "9.2", riesgo: "Radiación UV solar", peligro: "Exposición solar ocupacional en exteriores (criterio preventivo UVI >= 3).", controles: "Programación fuera de horas pico, zonas de sombra, rotación de personal e hidratación.", epp: "Ropa manga larga, sombrero ala ancha o casco con cortaviento/nuca, lentes con filtro UV y bloqueador solar amplio espectro.", retorno: "Controles solares verificados antes de reanudar labores exteriores; ropa, lentes y protector solar disponibles." },
    { num: "9.3", riesgo: "Sustancias químicas", peligro: "Derrames por desplazamiento de envases, contacto, inhalación o incendio.", controles: "Contención secundaria, sujeción de envases, inventario, Fichas de Datos de Seguridad (FDS) y respuesta especializada.", epp: "Guantes, ropa y botas resistentes a químicos; protección ocular/facial y respiratoria según evaluación.", retorno: "Derrames controlados, sustancias identificadas, áreas ventiladas y residuos gestionados por personal entrenado." },
    { num: "9.4", riesgo: "Agentes biológicos", peligro: "Microorganismos (virus, bacterias, hongos) en agua contaminada, lodos, mohos, residuos orgánicos y vectores.", controles: "Plan de higiene, control de vectores/plagas, vacunación según evaluación sanitaria, secado y limpieza segura.", epp: "Guantes, ropa de protección, botas impermeables, protección ocular/facial y respirador según agente.", retorno: "Limpieza, secado/desinfección y gestión de residuos completadas; vigilancia de la salud implementada." },
    { num: "9.5", riesgo: "Aguas residuales y lodos", peligro: "Contacto dérmico, ocular o respiratorio por reboses o inundaciones de aguas servidas.", controles: "Barreras en puntos de ingreso, aislamiento, extracción mecánica, separación de áreas limpias/sucias y desinfección.", epp: "Guantes impermeables, botas caña alta antideslizantes, ropa impermeable, protección ocular/facial y respiratoria.", retorno: "Limpieza, secado, desinfección y gestión de residuos verificadas antes de controlar el reingreso." },
    { num: "9.6", riesgo: "Riesgo eléctrico en inundaciones", peligro: "Electrocución, arco eléctrico o incendio por instalaciones energizadas en contacto con agua.", controles: "Aislar circuitos críticos, bloqueo y etiquetado (LOTO), elevar equipos, prohibir ingreso a zonas inundadas energizadas.", epp: "Casco dieléctrico, guantes aislantes, calzado eléctrico, protección facial y ropa contra arco según tensión.", retorno: "Instalaciones afectadas aisladas, inspeccionadas, probadas y autorizadas para energización por personal eléctrico competente." },
    { num: "9.7", riesgo: "Ahogamiento y atrapamiento en agua", peligro: "Caídas a canales, quebradas, zonas bajas, socavaciones o corrientes en movimiento.", controles: "Mapeo de zonas inundables, barreras físicas, rutas alternativas, evacuación y rescate especializado (no cruzar corrientes).", epp: "Chaleco salvavidas adecuado, ropa de alta visibilidad, casco y botas antideslizantes.", retorno: "Zonas inundadas, corrientes, pozas y áreas socavadas delimitadas; rutas seguras verificadas." },
    { num: "9.8", riesgo: "Estructuras inestables", peligro: "Colapso parcial o total de techos, muros, pisos, taludes o excavaciones por saturación.", controles: "Inspección preventiva, drenajes, restricción de cargas, zonas de exclusión, evaluación estructural y apuntalamiento.", epp: "Casco, botas con puntera y suela antideslizante, guantes, gafas, respirador contra polvo y arnés anticaídas si aplica.", retorno: "Estabilidad verificada por responsable técnico competente y áreas inseguras delimitadas antes del ingreso." },
    { num: "9.9", riesgo: "Maquinaria y tránsito", peligro: "Atropello, vuelco, atrapamiento o falla por terreno saturado, barro y visibilidad reducida.", controles: "Inspección preuso y de rutas, segregación peatón-vehículo, señalero, control de velocidad y suspensión de tránsito no esencial.", epp: "Chaleco de alta visibilidad, casco, calzado de seguridad antideslizante y protección auditiva/ocular.", retorno: "Equipos inspeccionados (preuso) y vías aptas liberadas formalmente antes de reiniciar circulación." },
    { num: "9.10", riesgo: "Residuos punzocortantes", peligro: "Objetos cortantes/punzantes ocultos bajo agua o lodo con riesgo de herida e infección.", controles: "No manipular con manos, usar herramientas de recolección, contenedores rígidos y disposición diferenciada.", epp: "Guantes resistentes a perforación, botas con plantilla antiperforación y suela antideslizante, gafas y ropa de protección.", retorno: "Residuos identificados y retirados con herramientas/contenedores apropiados; área inspeccionada antes de liberar." },
    { num: "9.11", riesgo: "Fatiga física y mental", peligro: "Jornadas prolongadas, sobrecarga de emergencia, trabajo nocturno y alteración del descanso.", controles: "Planificar turnos y dotación, limitar jornadas, pausas programadas, rotación de tareas y vigilancia de signos de fatiga.", epp: "No aplica EPP específico (controles estrictamente organizacionales y de gestión de turnos).", retorno: "Personal con descanso y recuperación suficientes; turnos y carga revisados antes del reinicio." },
    { num: "9.12", riesgo: "Factores de riesgo psicosociales", peligro: "Incertidumbre, presión temporal, estrés agudo, conflictos o exposición a eventos traumáticos.", controles: "Claridad de roles, comunicación continua, liderazgo participativo, primeros auxilios psicológicos y derivación confidencial.", epp: "No aplica EPP específico (controles organizacionales y de soporte emocional/salud mental).", retorno: "Roles y comunicación restablecidos; canales de apoyo y derivación disponibles respetando confidencialidad." },
    { num: "9.13", riesgo: "Riesgos ergonómicos por carga física", peligro: "Sobreesfuerzo y trastornos musculoesqueléticos (TME) durante limpieza, remoción y recuperación.", controles: "Priorizar ayudas mecánicas, reducir pesos y distancias, evitar superficies inestables, alternar tareas y pausas.", epp: "Guantes de protección y calzado antideslizante con puntera reforzada (no sustituyen los controles ergonómicos).", retorno: "Tareas de limpieza/remoción reevaluadas en IPERC/ATS; ayudas mecánicas, herramientas y pausas adecuadas." }
];

window.abrirDashboardLineamientos = function() {
    document.getElementById('lineamientosModal').style.display = 'flex';
    renderizarDashboardLineamientos();
};

window.renderizarDashboardLineamientos = function() {
    const q = normalizarTexto(document.getElementById('searchLineamientos')?.value || '');
    const grid = document.getElementById('lineamientosGrid');
    const counter = document.getElementById('countLineamientos');
    if (!grid) return;

    const filtrados = LINEAMIENTOS_NUMERAL9.filter(item =>
        !q || normalizarTexto(`${item.num} ${item.riesgo} ${item.peligro} ${item.controles} ${item.epp} ${item.retorno}`).includes(q)
    );

    if (counter) counter.textContent = `${filtrados.length} de 13 riesgos`;
    grid.innerHTML = filtrados.map(item => `
        <div class="lin-card">
            <div class="lin-card-head">
                <h4>${item.riesgo}</h4>
                <span class="lin-num">Num. ${item.num}</span>
            </div>
            <div class="lin-block"><strong>⚠️ Peligro / Exposición</strong>${item.peligro}</div>
            <div class="lin-block"><strong>🛡️ Controles Críticos</strong>${item.controles}</div>
            <div class="lin-block"><strong>🦺 EPP Requerido</strong>${item.epp}</div>
            <div class="lin-retorno"><strong>✅ Retorno Seguro (Num. 11):</strong> ${item.retorno}</div>
        </div>
    `).join('');
};

// ============================================================================
// 11. DASHBOARD ANEXO 1 — MATRIZ OPERATIVA MÍNIMA (39 REGISTROS OFICIALES)
// ============================================================================
const ANEXO1_DATA = [
    ["Antes","Calor","Estrés térmico por calor (temperatura/humedad/carga metabólica/ropa-EPP).","Evaluación TGBH/WBGT e índice de calor; sombra; agua; plan de aclimatación; trabajo-descanso.","Servicio de SST / Responsable de la tarea-Operaciones","Alerta de calor o aumento de carga térmica.","Ropa ligera, transpirable y adecuada a la tarea; EPP compatible con el calor previsto.","Estrés térmico por calor, signos/síntomas y primeros auxilios.","Registro de evaluación térmica; IPERC actualizado; registro de entrega de equipos; capacitación."],
    ["Durante","Calor","Golpe de calor, síncope, deshidratación.","Reducir exposición, pausas, hidratación, sombra, alerta entre compañeros y atención inmediata ante síntomas.","Responsable de la tarea-Operaciones / Servicio de SST","Síntomas, TGBH elevado o carga física alta.","Ropa transpirable y EPP que no incremente innecesariamente la carga térmica.","Primeros auxilios por calor.","Registro de pausas e hidratación; disponibilidad de sombra/agua; vigilancia de síntomas e incidentes."],
    ["Después","Calor","Fatiga térmica acumulada al retornar.","Reevaluar condiciones y aclimatación; ajustar jornada y carga.","Servicio de SST / Responsable de la tarea-Operaciones","Reinicio tras suspensión o cambio en condiciones atmosféricas.","Mantener ropa y EPP adecuados a las condiciones térmicas y riesgos de la tarea.","Reaclimatación y autocuidado.","IPERC/ATS reevaluado antes del reinicio; registro de reprogramación y retorno progresivo."],
    ["Antes","Radiación UV solar","Exposición solar ocupacional.","Programar tareas; sombra; ropa de trabajo; protección ocular y solar.","Servicio de SST / Responsable de la tarea-Operaciones","Trabajo exterior e Índice Ultravioleta (UVI) >= 3.","Ropa manga larga, sombrero ala ancha o casco con protección de nuca y lentes con filtro UV.","Riesgos de la radiación UV solar.","Lista de verificación de puestos exteriores; consulta Índice UV y programación; entrega EPP."],
    ["Durante","Radiación UV solar","Quemadura, daño ocular y exposición acumulada.","Rotación/sombra; pausas; ropa de trabajo; protección ocular y solar; hidratación.","Responsable de la tarea-Operaciones / Servicio de SST","Trabajo exterior prolongado.","Ropa que cubra la piel, protección de nuca, lentes filtro UV y protector solar amplio espectro.","Riesgos de la radiación UV solar.","Registro de inspección en jornada sobre sombra/ropa/lentes; pausas y rotación."],
    ["Después","Radiación UV solar","Reexposición durante recuperación exterior.","Reprogramar tareas y mantener controles solares.","Responsable de la tarea-Operaciones / Servicio de SST","Retorno de actividades exteriores.","Mantener ropa protectora, lentes filtro UV y protector solar mientras persista exposición.","Riesgos de la radiación UV solar.","Lista de verificación de control UV antes de reanudar labores exteriores; comunicación retorno seguro."],
    ["Antes","Químicos","Derrame por desplazamiento de envases.","Almacenar sobre sistemas de contención; asegurar envases; inventario y FDS.","Responsable de almacén / Operaciones / Servicio de SST","Alerta de inundación/lluvia intensa.","Guantes y ropa resistentes a químicos, gafas de seguridad y calzado compatible.","Derrames y FDS.","Inventario y lista de verificación de contención secundaria; FDS accesibles; inspecciones."],
    ["Durante","Químicos","Contacto, inhalación o incendio.","Aislar, ventilar, eliminar fuentes de ignición y activar respuesta especializada.","Personal entrenado en químicos / Servicio de SST","Derrame, olor, envase dañado o sustancia desconocida.","Guantes, ropa y botas resistentes a químicos; protección ocular/facial y respiratoria.","Derrames, sustancias peligrosas.","Reporte de derrame, aislamiento y control de acceso; autorización de personal interviniente."],
    ["Después","Químicos","Exposición durante limpieza.","Identificar sustancia; usar FDS; recojo y segregación de residuos por personal entrenado.","Personal entrenado en químicos / Servicio de SST","Envases o residuos tras inundación.","EPP compatible con contaminantes presentes; protección respiratoria cuando corresponda.","Gestión de residuos químicos.","Registro de limpieza y segregación; constancia de disposición por operador autorizado; liberación."],
    ["Antes","Biológico","Exposición a mohos, vectores y agua contaminada.","Plan de higiene; vacunación según evaluación sanitaria; control de plagas; kits de limpieza.","Servicio de SST","Temporada FEN / áreas húmedas.","Guantes, ropa de protección, calzado impermeable y protección ocular.","Higiene y agentes biológicos.","Plan de higiene y control de vectores; lista de verificación de kits; registro de vacunación."],
    ["Durante","Biológico","Infección por contacto o inhalación.","Higiene de manos; cubrir heridas; minimizar aerosolización; control de vectores.","Responsable de la tarea-Operaciones / Servicio de SST","Agua, lodo, residuos orgánicos o moho.","Guantes, ropa de protección, botas impermeables, protección ocular/facial y respirador según agente.","Riesgos biológicos y primeros auxilios.","Registro de inspección, limpieza del área e incidentes/accidentes."],
    ["Después","Biológico","Exposición a moho y residuos contaminados.","Secado, retiro de materiales no recuperables y limpieza segura; vigilancia de síntomas.","Servicio de SST","Humedad persistente o crecimiento de moho.","Guantes, ropa de protección, botas impermeables, protección ocular/facial y respiratoria.","Limpieza de moho.","Lista de verificación de secado, retiro de materiales y control de moho; vigilancia médica."],
    ["Antes","Aguas residuales","Contacto con aguas contaminadas.","Identificar puntos de ingreso; proteger saneamiento; preparar barreras y kits de respuesta.","Responsable de la tarea-Operaciones / Servicio de SST","Pronóstico de inundación o riesgo de rebose.","Guantes impermeables, botas impermeables antideslizantes, ropa de protección y gafas.","Higiene, contaminación y uso de EPP.","Lista de verificación de puntos de ingreso, barreras y kits; mantenimiento preventivo."],
    ["Durante","Aguas residuales","Exposición dérmica, ocular o respiratoria.","Evitar contacto; aislar; extracción mecánica; higiene; separar áreas limpias/sucias.","Responsable de la tarea-Operaciones / Servicio de SST","Agua servida, lodo contaminado o rebose.","Guantes impermeables, botas caña alta antideslizantes, ropa impermeable, protección ocular/facial y respiratoria.","Manejo de aguas residuales y descontaminación.","Registro de activación del procedimiento, aislamiento, extracción y disposición de residuos."],
    ["Después","Aguas residuales","Exposición durante remoción y desinfección.","Ventilar, limpiar, secar y desinfectar; gestionar residuos; controlar reingreso.","Servicio de SST / Responsable de la tarea-Operaciones","Área aparentemente seca pero contaminada.","Guantes impermeables, botas antideslizantes, ropa de protección, ocular/facial y respiratoria.","Procedimiento de limpieza y desinfección.","Lista de verificación de limpieza, secado, desinfección y gestión de residuos."],
    ["Antes","Eléctrico","Contacto con instalaciones eléctricas afectadas por agua.","Aislar circuitos críticos; inspeccionar tableros; elevar equipos; señalizar zonas de inundación.","Mantenimiento / Personal eléctrico competente / Servicio de SST","Aviso FEN o riesgo de inundación en instalaciones.","Casco dieléctrico, guantes aislantes y calzado de protección eléctrica.","Aislamiento eléctrico; LOTO; emergencias.","Lista de verificación de instalaciones eléctricas; registro de inspección y aislamiento de circuitos."],
    ["Durante","Eléctrico","Electrocución, arco eléctrico o incendio por instalaciones energizadas en agua.","Evacuar/aislar; prohibir ingreso; desconexión por personal competente; no intervenir instalaciones inundadas.","Mantenimiento / Personal eléctrico competente / Servicio de SST","Agua en contacto con instalación eléctrica o cable caído.","EPP dieléctrico específico para tensión/tarea, protección facial y ropa contra arco.","Riesgo eléctrico y respuesta a emergencias.","Registro de aislamiento, señalización de perímetro, coordinación con empresa eléctrica y control de acceso."],
    ["Después","Eléctrico","Reenergización insegura de equipos mojados.","Inspección, pruebas y autorización antes de energizar; reemplazo de componentes dañados.","Mantenimiento / Personal eléctrico competente + Servicio de SST","Final de inundación y antes de energización.","EPP eléctrico adecuado previa desenergización y verificación de ausencia de tensión.","Inspección y pruebas eléctricas.","Informe de inspección y pruebas eléctricas; constancia de liberación y autorización de reenergización."],
    ["Antes","Ahogamiento","Caídas a canales, quebradas, zonas bajas o corrientes.","Mapear zonas peligrosas; barreras; rutas alternativas; señalización; plan de evacuación.","Responsable de la tarea-Operaciones / Servicio de SST","Alerta meteorológica o zona inundable.","Chaleco salvavidas, ropa alta visibilidad, casco y botas antideslizantes.","Evacuación y rescate.","Mapa de zonas inundables y rutas seguras; lista de verificación de barreras; simulacros."],
    ["Durante","Ahogamiento","Arrastre, atrapamiento o inmersión.","Evacuación; no ingreso a corriente; rescate especializado; observador y comunicación.","Brigadas de emergencias","Agua en movimiento, corriente, socavación o baja visibilidad.","Chaleco salvavidas, alta visibilidad, casco y calzado antideslizante (rescate acuático especializado).","Rescate acuático y primeros auxilios.","Registro de evacuación, recuento de trabajadores, control de acceso y coordinación emergencias."],
    ["Después","Ahogamiento","Caídas durante limpieza y remoción.","Drenar de forma segura; retirar obstáculos; señalizar pozas; inspección del terreno.","Responsable de la tarea-Operaciones / Servicio de SST","Ingreso posterior al evento.","Chaleco salvavidas si persiste riesgo, casco y botas impermeables antideslizantes.","Limpieza segura y prevención de caídas.","Lista de verificación del terreno, drenaje, obstáculos, pozas y liberación del área."],
    ["Antes","Estructuras inestables","Colapso parcial de techos, muros, pisos o taludes.","Inspección preventiva; mantenimiento; drenaje; restricción de cargas; rutas alternativas.","Responsable técnico competente / Servicio de SST","Daño previo, alerta de lluvias o saturación.","Casco de seguridad, botas con puntera/antideslizante y chaleco alta visibilidad.","Reconocimiento de daños y evacuación.","Informe de inspección preventiva de techos, muros, taludes y drenajes; registro de mantenimiento."],
    ["Durante","Estructuras inestables","Atrapamiento o golpes por colapso.","Evacuar y establecer zona de exclusión; no ingresar sin evaluación competente.","Brigadas de emergencias / Responsable técnico competente","Fisuras, deformaciones, desplazamientos, ruidos o colapso.","Casco, calzado seguridad, guantes, gafas, respirador polvo y protección anticaídas.","Rescate estructural y comunicación.","Registro de evacuación, zona de exclusión, control de acceso y evaluación competente."],
    ["Después","Estructuras inestables","Colapso durante limpieza o remoción.","Evaluación estructural; apuntalamiento; secuencia segura de remoción.","Responsable técnico competente / Servicio de SST","Antes de reiniciar limpieza o desmontaje.","Casco, botas de seguridad, guantes, gafas y protección respiratoria.","Trabajo seguro en estructuras dañadas.","Informe de estabilidad estructural, apuntalamiento, ATS de remoción y acta de liberación."],
    ["Antes","Maquinaria/tránsito","Atropello, vuelco, atrapamiento.","Inspección de rutas; segregación; mantenimiento; señalero; control de velocidad.","Mantenimiento / Operaciones / Servicio de SST","Lluvias, barro, visibilidad reducida.","Chaleco alta visibilidad, casco y calzado de seguridad antideslizante.","Conducción segura en condiciones adversas.","Check-list preuso de vehículos/equipos, inspección de rutas, segregación y mantenimiento."],
    ["Durante","Maquinaria/tránsito","Accidente por terreno saturado.","Suspender circulación no esencial; delimitar; utilizar equipos adecuados; señalización.","Mantenimiento / Operaciones / Servicio de SST","Inundación, barro o pérdida de estabilidad.","Chaleco alta visibilidad, casco, calzado de seguridad y protección auditiva/ocular.","Tránsito interno y respuesta.","Registro de cierre de ruta, señalización y verificación del terreno antes de permitir tránsito."],
    ["Después","Maquinaria/tránsito","Falla de equipo o vía dañada.","Inspección preuso; reparación; liberación de vías.","Mantenimiento / Operaciones / Servicio de SST","Antes de reiniciar circulación.","Chaleco alta visibilidad, casco, calzado de seguridad y guantes.","Inspección preuso.","Check-list preuso, registro de reparación y liberación formal de rutas/equipos."],
    ["Antes","Residuos Punzocortantes","Objetos ocultos por agua o lodo.","Asegurar contenedores; plan de limpieza; herramientas de recolección.","Responsable de la tarea-Operaciones / Servicio de SST","Riesgo de residuos desplazados.","Guantes resistentes a perforación, botas con plantilla antiperforación y gafas.","Manejo seguro de residuos.","Lista de verificación de contenedores, herramientas de recolección y planificación de retiro."],
    ["Durante","Residuos Punzocortantes","Punción, corte e infección.","No manipular con manos; herramientas y contenedores rígidos; atención inmediata a exposición.","Responsable de la tarea-Operaciones / Servicio de SST","Hallazgo de residuos punzocortantes.","Guantes antiperforación, botas impermeables antiperforación, gafas, ropa protección y facial si salpicaduras.","Bioseguridad y primeros auxilios.","Registro de hallazgo y retiro seguro con contenedor rígido; registro de incidentes."],
    ["Después","Residuos Punzocortantes","Lesiones durante remoción final.","Inspección visual y remoción mecánica; disposición diferenciada.","Responsable de la tarea-Operaciones / Servicio de SST","Antes de liberar el área.","Guantes antiperforación, botas impermeables antideslizantes, gafas y protección facial.","Manejo de residuos punzocortantes.","Acta de limpieza final, inspección visual, liberación y segregación diferenciada."],
    ["Antes","Fatiga física y mental","Fatiga por jornadas, esfuerzo, pausas insuficientes y alteración del descanso.","Planificar turnos, dotación, pausas y recuperación; limitar jornadas prolongadas; vigilar signos.","Operaciones / Recursos Humanos / Servicio de SST","Activación FEN y aumento de carga.","No aplica EPP específico.","Gestión de fatiga, descanso y recuperación.","Programación de turnos, dotación y pausas; registro de control de jornadas prolongadas."],
    ["Durante","Fatiga física y mental","Errores, agotamiento y disminución de atención por sobrecarga.","Limitar jornadas; establecer pausas; rotar tareas; supervisar; priorizar tareas críticas.","Operaciones / Recursos Humanos / Servicio de SST","Turnos prolongados, sobrecarga o trabajo nocturno.","No aplica EPP específico.","Gestión de fatiga y respuesta a emergencias.","Registro de turnos, pausas, rotación de tareas e incidentes/accidentes."],
    ["Después","Fatiga física y mental","Fatiga acumulada durante recuperación.","Descanso; retorno progresivo; reevaluación de carga y seguimiento.","Operaciones / Recursos Humanos / Servicio de SST","Reinicio tras emergencia significativa.","No aplica EPP específico.","Autocuidado, descanso y retorno seguro.","Programación de retorno progresivo, descansos, vigilancia médica y comunicación."],
    ["Antes","Factores de riesgo psicosocial","Incertidumbre, presión temporal y falta de claridad de roles.","Definir roles; comunicación clara; liderazgo; dotación y canales de reporte; apoyo.","Operaciones / Recursos Humanos / Servicio de SST","Activación FEN y cambio organizacional.","No aplica EPP específico.","Comunicación y gestión de riesgos psicosociales.","Comunicación de funciones, canales de reporte y criterios de priorización."],
    ["Durante","Factores de riesgo psicosocial","Estrés, conflictos o afectación emocional durante respuesta.","Comunicación continua; apoyo del liderazgo; participación; primeros auxilios psicológicos y derivación.","Operaciones / Recursos Humanos / Servicio de SST","Exposición a evento traumático, presión o sobrecarga.","No aplica EPP específico.","Riesgos psicosociales y primeros auxilios psicológicos.","Registro de activación de canales de apoyo, incidencias y vigilancia médica."],
    ["Después","Factores de riesgo psicosocial","Estrés post evento y afectación emocional.","Seguimiento; retorno progresivo; apoyo y derivación según necesidad; lecciones aprendidas.","Operaciones / Recursos Humanos / Servicio de SST","Reinicio tras emergencia significativa.","No aplica EPP específico.","Salud mental y retorno seguro.","Registro de seguimiento, apoyo/derivación confidencial y comunicación retorno seguro."],
    ["Antes","Riesgos ergonómicos por carga física","Sobreesfuerzo y TME durante preparación/remoción.","Planificar ayudas mecánicas; organizar cargas; seleccionar herramientas; prever pausas y alternancia.","Servicio de SST / Responsable de la tarea-Operaciones","Preparación de tareas de limpieza/recuperación.","Guantes de protección y calzado antideslizante con puntera (no sustituye controles ergonómicos).","Manipulación de cargas y organización del trabajo.","IPERC/ATS con cargas, herramientas y ayudas mecánicas; lista de verificación."],
    ["Durante","Riesgos ergonómicos por carga física","Lesiones por levantamiento, empuje/tracción, posturas forzadas y repetición.","Usar ayudas mecánicas; reducir pesos y distancias; evitar superficies inestables; alternar tareas; pausas.","Servicio de SST / Responsable de la tarea-Operaciones","Carga física elevada o tarea prolongada.","Guantes de protección y calzado antideslizante con puntera (priorizar ayudas mecánicas).","Técnicas de trabajo y uso de ayudas mecánicas.","ATS/lista de verificación en tarea sobre ayudas mecánicas, pesos, superficies y pausas."],
    ["Después","Riesgos ergonómicos por carga física","TME o sobreesfuerzo durante remoción y reorganización.","Reevaluar carga; ajustar herramientas, secuencia y dotación; priorizar ayudas mecánicas; retorno progresivo.","Servicio de SST / Responsable de la tarea-Operaciones","Inicio/reinicio de limpieza y recuperación.","Guantes de protección y calzado antideslizante con puntera reforzada.","Ergonomía de recuperación y reevaluación.","IPERC/ATS actualizado para remoción/reorganización; acta de liberación y reinicio progresivo."]
];

function poblarFiltroPeligrosAnexo1() {
    const sel = document.getElementById('filterAnexoPeligro');
    if (!sel || sel.options.length > 1) return;
    const unicos = [...new Set(ANEXO1_DATA.map(r => r[1]))];
    unicos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        sel.appendChild(opt);
    });
}

window.abrirDashboardAnexo1 = function() {
    poblarFiltroPeligrosAnexo1();
    document.getElementById('anexo1Modal').style.display = 'flex';
    renderizarAnexo1();
};

window.renderizarAnexo1 = function() {
    const pel = document.getElementById('filterAnexoPeligro')?.value || '';
    const fase = document.getElementById('filterAnexoFase')?.value || '';
    const q = normalizarTexto(document.getElementById('searchAnexo1')?.value || '');
    const tbody = document.getElementById('anexo1TableBody');
    const counter = document.getElementById('countAnexo1');
    if (!tbody) return;

    const filtrados = ANEXO1_DATA.filter(r => {
        const matchPel = !pel || r[1] === pel;
        const matchFase = !fase || r[0] === fase;
        const matchQ = !q || normalizarTexto(r.join(' ')).includes(q);
        return matchPel && matchFase && matchQ;
    });

    if (counter) counter.textContent = `${filtrados.length} registros`;

    tbody.innerHTML = filtrados.map(r => {
        const faseClass = r[0] === 'Antes' ? 'fase-antes' : (r[0] === 'Durante' ? 'fase-durante' : 'fase-despues');
        return `
            <tr>
                <td><span class="fase-badge ${faseClass}">${r[0]}</span></td>
                <td><strong>${r[1]}</strong></td>
                <td>${r[2]}</td>
                <td>${r[3]}</td>
                <td>${r[4]}</td>
                <td>${r[5]}</td>
                <td>${r[6]}</td>
                <td>${r[7]}</td>
                <td>${r[8]}</td>
            </tr>
        `;
    }).join('');
};

window.exportarAnexo1Excel = function() {
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr><th>Fase</th><th>Peligro</th><th>Riesgo</th><th>Controles</th><th>Responsable</th><th>Criterio de Activación</th><th>EPP</th><th>Capacitación</th><th>Evidencia de Verificación</th></tr></thead><tbody>`;
    ANEXO1_DATA.forEach(r => {
        html += `<tr>${r.map(col => `<td>${col}</td>`).join('')}</tr>`;
    });
    html += `</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Anexo1_Matriz_Operativa_SST_FEN_RM341_2026_TR.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ============================================================================
// 12. COMENTARIOS DIRECTOS AL ADMINISTRADOR Y BUZÓN PRIVADO (FIRESTORE)
// ============================================================================
window.abrirModalComentario = function() {
    document.getElementById('commentText').value = '';
    document.getElementById('commentStatusMsg').textContent = '';
    document.getElementById('comentarioModal').style.display = 'flex';
};

window.enviarComentarioAdmin = async function() {
    const cat = document.getElementById('commentCategory').value;
    const msg = document.getElementById('commentText').value.trim();
    const status = document.getElementById('commentStatusMsg');
    const btn = document.getElementById('btnEnviarComentario');

    if (!msg) {
        status.style.color = '#b91c1c';
        status.textContent = 'Por favor escribe tu comentario antes de enviar.';
        return;
    }

    btn.disabled = true;
    status.style.color = '#0f172a';
    status.textContent = 'Enviando mensaje privado...';

    try {
        await addDoc(collection(db, "comentarios_admin"), {
            categoria: cat,
            mensaje: msg,
            usuarioEmail: currentUser ? currentUser.email : 'Anónimo',
            usuarioNombre: currentUser ? (currentUser.displayName || 'Usuario') : 'Anónimo',
            distritoConsultado: puntoSeleccionadoActual.distrito,
            fecha: serverTimestamp()
        });
        status.style.color = '#15803d';
        status.textContent = '✅ Comentario enviado correctamente al administrador.';
        setTimeout(() => {
            cerrarModal('comentarioModal');
            btn.disabled = false;
        }, 1400);
    } catch (e) {
        console.error("Error al guardar comentario:", e);
        status.style.color = '#b91c1c';
        status.textContent = '⚠️ No se pudo enviar. Verifica las reglas de Firestore para comentarios_admin.';
        btn.disabled = false;
    }
};

window.abrirBuzonAdmin = async function() {
    if (!esAdministrador(currentUser)) {
        alert("Acceso restringido únicamente al administrador.");
        return;
    }
    const modal = document.getElementById('adminInboxModal');
    const list = document.getElementById('adminInboxList');
    modal.style.display = 'flex';
    list.innerHTML = 'Cargando mensajes privados...';

    try {
        const q = query(collection(db, "comentarios_admin"), orderBy("fecha", "desc"));
        const snap = await getDocs(q);
        if (snap.empty) {
            list.innerHTML = '<p style="color:#64748b; text-align:center; padding:20px;">Aún no hay comentarios registrados.</p>';
            return;
        }
        let html = '';
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const fechaStr = d.fecha && d.fecha.toDate ? d.fecha.toDate().toLocaleString('es-PE') : 'Reciente';
            html += `
                <div class="inbox-item">
                    <div class="inbox-meta">
                        <span><strong>${d.usuarioNombre || 'Usuario'}</strong> (${d.usuarioEmail || 'N/D'})</span>
                        <span class="inbox-cat">${d.categoria || 'General'}</span>
                        <span>${fechaStr}</span>
                    </div>
                    <div class="inbox-msg">${d.mensaje || ''}</div>
                </div>
            `;
        });
        list.innerHTML = html;
    } catch (e) {
        console.error("Error leyendo buzón admin:", e);
        list.innerHTML = '<p style="color:#b91c1c;">Error al leer los comentarios. Asegúrate de haber publicado la regla de Firestore para tu correo de administrador.</p>';
    }
};

// ============================================================================
// 13. UTILIDADES DE MODALES, MAPA, CAPAS Y MÓVIL
// ============================================================================
window.abrirModalTablasTermicas = function() {
    document.getElementById('tablasTermicasModal').style.display = 'flex';
};

window.cerrarModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
};

map.on('click', (e) => evaluarPuntoEnMapa(e.latlng.lat, e.latlng.lng));

document.getElementById('btnDropPin')?.addEventListener('click', () => {
    const c = map.getCenter();
    evaluarPuntoEnMapa(c.lat, c.lng);
});

document.getElementById('btnMyLocation')?.addEventListener('click', () => {
    if (!navigator.geolocation) return alert("Su navegador no soporta geolocalización GPS.");
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            map.setView([pos.coords.latitude, pos.coords.longitude], 15);
            evaluarPuntoEnMapa(pos.coords.latitude, pos.coords.longitude);
        },
        () => alert("No se pudo obtener su ubicación GPS. Verifique los permisos.")
    );
});

async function buscarDireccion() {
    const queryTxt = document.getElementById('addressInput')?.value.trim();
    if (!queryTxt) return;
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryTxt + ', Lima, Peru')}&limit=1`;
        const res = await fetch(url);
        const results = await res.json();
        if (results && results.length > 0) {
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);
            map.setView([lat, lon], 15);
            evaluarPuntoEnMapa(lat, lon, { direccion: results[0].display_name });
        } else {
            alert("No se encontró la dirección en Lima/Callao.");
        }
    } catch (e) {
        alert("Error al consultar el buscador.");
    }
}
document.getElementById('btnSearchAddress')?.addEventListener('click', buscarDireccion);
document.getElementById('addressInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarDireccion(); });

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

window.cambiarVistaMovil = function(vista, btnEl) {
    document.querySelectorAll('.mob-tab-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) {
        btnEl.classList.add('active');
    } else {
        const idx = vista === 'mapa' ? 0 : (vista === 'capas' ? 1 : 2);
        document.querySelectorAll('.mob-tab-btn')[idx]?.classList.add('active');
    }

    const colLeft = document.getElementById('colLeft');
    const colCenter = document.getElementById('colCenter');
    const colRight = document.getElementById('colRight');

    colLeft.classList.remove('mob-visible');
    colRight.classList.remove('mob-visible');
    colCenter.classList.remove('mob-hidden');

    if (vista === 'capas') {
        colLeft.classList.add('mob-visible');
        colCenter.classList.add('mob-hidden');
    } else if (vista === 'termico') {
        colRight.classList.add('mob-visible');
        colCenter.classList.add('mob-hidden');
    } else {
        setTimeout(() => map.invalidateSize(), 150);
    }
};
