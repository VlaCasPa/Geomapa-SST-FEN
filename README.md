# 🗺️ Geomapa SST FEN Perú
**Plataforma WebGIS de Referencia y Gestión Preventiva de Seguridad y Salud en el Trabajo ante el Fenómeno El Niño**

[![WebGIS](https://img.shields.io/badge/Plataforma-Web%20%26%20Móvil-0f172a)](#)
[![Normativa](https://img.shields.io/badge/Base%20Legal-R.M.%20N.°%20341--2026--TR-b91c1c)](#)
[![Cartografía](https://img.shields.io/badge/Cartografía-CENEPRED%20%7C%20SINAGERD-ea580c)](#)
[![Autor](https://img.shields.io/badge/Desarrollado%20por-Vladimir%20Casas%20Palomino-1e293b)](#)

---

### 🎯 Descripción General
**Geomapa SST FEN Perú** es una plataforma interactiva WebGIS (adaptable a computadora y celular) diseñada para especialistas en Seguridad y Salud en el Trabajo (SST), miembros de CSST, prevencionistas y gestores operativos[cite: 32].

Traduce el **Protocolo de Seguridad y Salud en el Trabajo ante el Fenómeno El Niño (R.M. N.° 341-2026-TR)** del MTPE en una herramienta operativa de campo[cite: 32], integrando cartografía oficial de **CENEPRED**, puntos críticos actualizados en vivo, cálculo dual de **estrés térmico por calor (Numeral 9.1)** y tableros normativos interactivos[cite: 32].

---

### ✨ Módulos y Funcionalidades Principales

* 📍 **Visor Geoespacial (Lima Metropolitana y Callao):** Mapa base neutro en escala de grises con límites distritales, escenarios de inundación y movimientos en masa (CENEPRED), cuencas de los ríos Rímac y Chillón, relieve MDE y puntos críticos viales sincronizados en vivo. Permite ubicar centros de trabajo por dirección, GPS o clic directo.
* 🌡️ **Calculadora Oficial de Estrés Térmico (Numeral 9.1):**
  * **Opción 1 — TGBH Efectivo (R.M. N.° 375-2008-TR):** Evaluación ocupacional con TBH, TG, TBS, ajuste por vestimenta/EPP (Tabla 2), tipo de trabajo y aclimatación (Tabla 3)[cite: 32, 34].
  * **Opción 2 — Índice de Calor (NWS / NOAA):** Ecuación de regresión oficial de Rothfusz con sincronización climática por coordenadas, ajuste por sol directo (+8,3 °C) y clasificación automática según la Tabla 4[cite: 32].
* 📋 **Dashboard de Lineamientos Técnicos (Numeral 9 y 11):** Buscador rápido de los 13 riesgos del Protocolo estructurado en *Peligro, Controles Críticos, EPP y Criterios de Retorno Seguro*[cite: 32, 35].
* 📑 **Dashboard Matriz Operativa Mínima (Anexo 1):** Tabla interactiva filtrable con los 39 registros oficiales por fase (*Antes, Durante y Después*) y exportación directa a Excel (`.xls`)[cite: 34].
* 🔐 **Acceso Seguro y Buzón Privado:** Autenticación con Google (Firebase Auth), aceptación trazable de alcance referencial y canal de comentarios directos al administrador[cite: 32].

---

### ⚖️ Base Normativa y Fuentes Oficiales
* **R.M. N.° 341-2026-TR:** Protocolo de Seguridad y Salud en el Trabajo ante el Fenómeno El Niño (MTPE)[cite: 32, 37].
* **Ley N.° 29783 y D.S. N.° 005-2012-TR:** Ley de Seguridad y Salud en el Trabajo y su Reglamento[cite: 33, 34].
* **R.M. N.° 375-2008-TR:** Norma Básica de Ergonomía y Procedimiento de Evaluación de Riesgo Disergonómico[cite: 35].
* **CENEPRED / SIGRID:** Escenarios de riesgo por lluvias intensas, inundaciones y movimientos en masa[cite: 34].

---

### ⚠️ Aviso Legal (Disclaimer)
Esta plataforma tiene fines exclusivamente **técnicos, educativos y referenciales**. La información cartográfica y los cálculos preliminares **no sustituyen** la Identificación de Peligros, Evaluación de Riesgos y Determinación de Controles (IPERC) específica ni las evaluaciones técnicas ocupacionales que cada empleador debe ejecutar en su centro de trabajo.

---

### 👨‍💻 Ficha Técnica y Autoría
* **Geomapa desarrollado por:** **Vladimir Casas Palomino**
* **Tecnologías y Procesamiento GIS:** Civil3D • QGIS • Leaflet • Firebase • JavaScript Modular
* **Actualización del Sistema:** Noviembre 2026
