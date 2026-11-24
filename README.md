# 🗺️ Geomapa SST FEN Perú (v1.0)
**Plataforma Modular WebGIS para Gestión Preventiva de Seguridad y Salud en el Trabajo ante el Fenómeno El Niño**

[![Versión](https://img.shields.io/badge/Versión-1.0%20Modular-0f172a)](#)
[![Módulo 1](https://img.shields.io/badge/Módulo%201-CENEPRED%20%7C%20SIGRID%2022169-0284c7)](#)
[![Módulo 2](https://img.shields.io/badge/Módulo%202-R.M.%20N.°%20341--2026--TR-b91c1c)](#)
[![Autor](https://img.shields.io/badge/Desarrollado%20por-Vladimir%20Casas%20Palomino-1e293b)](#)

---

### 🎯 Descripción General
**Geomapa SST FEN Perú (v1.0)** es una plataforma WebGIS abierta y multidispositivo (escritorio y celular) diseñada para especialistas en Seguridad y Salud en el Trabajo (SST), miembros de CSST, prevencionistas, residentes e ingenieros de control de proyectos.

Para evitar sobrecarga visual y facilitar la toma de decisiones en obra o en oficina, la interfaz está organizada en **dos módulos operativos independientes y complementarios**, sustentados en principios de **Lean Construction** (gestión visual y estandarización en campo), analítica de datos y trazabilidad normativa.

---

### 🧩 Arquitectura en 2 Módulos (Versión 1.0)

#### 1️⃣ Módulo 1: Escenarios Geoespaciales CENEPRED (Inundaciones y Huaycos)
Centraliza la arquitectura de datos geoespaciales, los mapas base ráster y el análisis topográfico orientados a evaluar la exposición física y la zonificación de peligros frente a las precipitaciones intensas asociadas al Fenómeno El Niño (FEN):
* **Sustento Oficial CENEPRED / SIGRID:** Basado en el *Estudio de escenarios de riesgo por inundaciones y movimientos en masa ante lluvias intensas asociadas al Fenómeno El Niño* (**Repositorio SIGRID N.° 22169**, actualizado con el **Informe Técnico N.° 69-2026/SENAMHI-DMA-SPC**).
* **Procesamiento GIS (Civil3D / QGIS / Leaflet):**
  * **Modelo Digital de Elevación (MDE):** Ráster georreferenciado (`elevacion.png` + `.pgw`) para identificar microcuencas, pendientes críticas y cotas expuestas.
  * **Zonificación de Peligros (WGS84 EPSG:4326):** Polígonos estandarizados en niveles **Muy Alto, Alto, Medio y Bajo** para inundaciones y movimientos en masa, más las cuencas de los ríos **Rímac** y **Chillón**.
  * **Puntos Críticos Viales FEN:** Capa sincronizada en vivo de pasos a desnivel e intercambios viales vulnerables en Lima Metropolitana y Callao.
* **Escenarios de Alertamiento:**
  * **Escenario 1 — Inundación (Callao y Lima Centro):** Saturación de drenaje urbano, aniegos en baja cota topográfica y desborde potencial de los ríos Rímac y Chillón.
  * **Escenario 2 — Movimientos en Masa / Huaycos (Lima Este / Ate):** Activación de quebradas secas en estribaciones andinas, caída de detritos y flujos de escorrentía.

#### 2️⃣ Módulo 2: Protocolo Normativo SST (R.M. N.° 341-2026-TR)
Articula las herramientas técnicas exigidas por el Ministerio de Trabajo y Promoción del Empleo (MTPE) para la prevención, respuesta y recuperación en los centros de trabajo:
* **Calculadora Oficial de Estrés Térmico (Numeral 9.1):**
  * **Opción 1 — TGBH Efectivo (R.M. N.° 375-2008-TR):** Cálculo con TBH, TG, TBS, ajuste por vestimenta/EPP (Tabla 2) y límites de acción según carga física y aclimatación (Tabla 3).
  * **Opción 2 — Índice de Calor (NWS / NOAA):** Ecuación de regresión de Rothfusz con sincronización meteorológica por coordenadas, ajuste por sol directo (+8,3 °C) y clasificación automática (Tabla 4).
* **Dashboard de 13 Lineamientos Técnicos por Riesgo (Numeral 9 y 11):** Buscador rápido de peligros, controles críticos, EPP y criterios de *Retorno Seguro*.
* **Dashboard Matriz Operativa Mínima (Anexo 1):** Tabla filtrable con los 39 registros oficiales por fase (*Antes, Durante y Después*) y exportación directa a Excel (`.xls`).
* **Documentación Oficial y Ficha Técnica Tipo Paper (PDF):** Acceso directo a la R.M. N.° 341-2026-TR, la Guía/Protocolo MTPE y el *Informe Técnico de Sustento* del visor.

---

### 📂 Estructura del Repositorio
* `/datos_vectoriales/`: Capas geográficas oficiales en formato GeoJSON (Límites distritales, Peligro Inundación, Peligro Movimientos en Masa y Ríos Rímac y Chillón).
* `/datos_raster/`: Modelo digital de elevación georreferenciado (`elevacion.png`, `elevacion.pgw`, `elevacion.prj`).
* `/documentación/`: Normativa oficial en PDF (`8777346-rm-n-341-2026-tr.pdf`, `8777346-protocolo-sst-ante-el-fen.pdf`) e `Informe Técnico de Sustento - Geomapa SST FEN Perú.pdf`.
* `index.html`, `style.css`, `app.js`: Arquitectura modular en 2 presentaciones, motor GIS Leaflet, calculadoras térmicas y servicios Firebase (Auth & Firestore).

---

### ⚠️ Aviso Legal (Disclaimer)
Esta plataforma tiene fines exclusivamente **técnicos, educativos y referenciales**. La información cartográfica y los cálculos preliminares **no sustituyen** la Identificación de Peligros, Evaluación de Riesgos y Determinación de Controles (IPERC) específica ni las evaluaciones técnicas ocupacionales que cada empleador debe ejecutar conforme a la **Ley N.° 29783** y su Reglamento (D.S. N.° 005-2012-TR).

---

### 📋 Ficha Técnica y Autoría
* **Desarrollo:** Vladimir Casas Palomino
* **Software GIS y Stack Tecnológico:** Civil3D / QGIS / Leaflet / Firebase / JavaScript Modular
* **Versión y Actualización:** Versión 1.0 • Noviembre 2026
