# 🗺️ Geomapa SST FEN Perú
**Plataforma WebGIS de Referencia y Gestión Preventiva de Seguridad y Salud en el Trabajo ante el Fenómeno El Niño**

[![WebGIS](https://img.shields.io/badge/Plataforma-Web%20%26%20Móvil-0f172a)](#)
[![Normativa](https://img.shields.io/badge/Base%20Legal-R.M.%20N.°%20341--2026--TR-b91c1c)](#)
[![Cartografía](https://img.shields.io/badge/Cartografía-CENEPRED%20%7C%20SIGRID%2022169-ea580c)](#)
[![Autor](https://img.shields.io/badge/Desarrollado%20por-Vladimir%20Casas%20Palomino-1e293b)](#)

---

### 🎯 Descripción General
**Geomapa SST FEN Perú** es una plataforma interactiva WebGIS (adaptable a computadora y celular) diseñada para especialistas en Seguridad y Salud en el Trabajo (SST), miembros de CSST, prevencionistas y gestores operativos.

El sistema centraliza la arquitectura de datos geoespaciales, los mapas base ráster, el análisis topográfico y el **Protocolo de Seguridad y Salud en el Trabajo ante el Fenómeno El Niño (R.M. N.° 341-2026-TR)** del MTPE en una herramienta operativa de campo, orientada a evaluar la exposición física y la zonificación de peligros frente a precipitaciones intensas asociadas al Fenómeno El Niño (FEN) sobre frentes de obra, centros de trabajo e infraestructuras críticas.

---

### ⚖️ Sustento Normativo y Fuentes Oficiales
La información espacial, vectorial y matricial procesada en este geomapa proviene de bases de datos oficiales del Estado Peruano, garantizando trazabilidad técnica para la toma de decisiones:

* **Resolución Ministerial N.° 341-2026-TR (MTPE):** Protocolo de Seguridad y Salud en el Trabajo ante el Fenómeno El Niño.
* **Ley N.° 29783 y D.S. N.° 005-2012-TR:** Ley de Seguridad y Salud en el Trabajo y su Reglamento.
* **Resolución Ministerial N.° 375-2008-TR:** Norma Básica de Ergonomía y Procedimiento de Evaluación de Riesgo Disergonómico.
* **Entidad Generadora Cartográfica:** Centro Nacional de Estimación, Prevención y Reducción del Riesgo de Desastres (**CENEPRED**) / Sistema de Información para la Gestión del Riesgo de Desastres (**SIGRID**).
* **Documento Técnico de Referencia:** *Estudio de escenarios de riesgo por inundaciones y movimientos en masa ante lluvias intensas asociadas al Fenómeno El Niño* (Actualizado en base al **Informe Técnico N.° 69-2026/SENAMHI-DMA-SPC**).
* **Repositorio Oficial SIGRID:** Consultar **Repositorio SIGRID N.° 22169**.

---

### 🛰️ Procesamiento GIS e Ingeniería de Datos Espaciales
El desarrollo cartográfico e integración de capas se estructuró bajo rigurosos estándares geoespaciales en **Civil3D**, **QGIS** y código modular (**JavaScript / Leaflet**):

* **Análisis Topográfico de Elevación (MDE):** Incorporación de modelos digitales de elevación georreferenciados para identificar microcuencas, pendientes críticas y cotas expuestas en los tramos de baja altitud (Callao) y estribaciones andinas (Lima Este).
* **Zonificación de Peligros (CENEPRED):** Procesamiento vectorial de polígonos bajo clasificaciones estandarizadas de susceptibilidad y riesgo (**Niveles: Muy Alto, Alto, Medio y Bajo**) tanto para eventos de inundación como para movimientos en masa.
* **Referencia Espacial y Estructuras Críticas:** Integración dinámica de coordenadas (**WGS84 EPSG:4326**) y cruce espacial en tiempo real entre polígonos de susceptibilidad, cuencas hidrográficas y tablas operativas de prevención.
* **Capa de Puntos Críticos (Pasos a Desnivel FEN):** Mapeo georreferenciado e interoperable en tiempo real de los pasos a desnivel e intercambios viales en riesgo por inundación y huaycos en Lima Metropolitana y Callao.

---

### 🚨 Alertamiento y Escenarios de Riesgo FEN
El sistema se enfoca en la identificación y alertamiento preventivo de las zonas de exposición territorial en Lima Metropolitana y Callao:

* **Escenario 1 — Inundación (Muy Alto / Alto - Tramo Callao y Lima Centro):** Alerta por saturación de sistemas de drenaje urbano, aniegos en zonas de baja cota topográfica e incremento del caudal y desborde potencial de los ríos **Rímac** y **Chillón** sobre frentes de excavación, pasos a desnivel y accesos subterráneos.
* **Escenario 2 — Movimientos en Masa / Huaycos (Muy Alto / Alto - Tramo Lima Este / Ate):** Alerta por activación de quebradas secas en las estribaciones andinas, caída de detritos y flujos de escorrentía superficial que comprometen portales de obra, taludes y áreas de acopio logístico.

---

### ✨ Módulos y Funcionalidades Principales

* 📍 **Visor Geoespacial (Lima Metropolitana y Callao):** Mapa base neutro en escala de grises con límites distritales, escenarios de inundación y movimientos en masa (CENEPRED), cuencas de los ríos Rímac y Chillón, relieve MDE y puntos críticos viales sincronizados en vivo. Permite ubicar centros de trabajo por dirección, GPS o clic directo.
* 🌡️ **Calculadora Oficial de Estrés Térmico (Numeral 9.1):**
  * **Opción 1 — TGBH Efectivo (R.M. N.° 375-2008-TR):** Evaluación ocupacional con TBH, TG, TBS, ajuste por vestimenta/EPP (Tabla 2), tipo de trabajo y aclimatación (Tabla 3).
  * **Opción 2 — Índice de Calor (NWS / NOAA):** Ecuación de regresión oficial de Rothfusz con sincronización climática por coordenadas, ajuste por sol directo (+8,3 °C) y clasificación automática según la Tabla 4.
* 📋 **Dashboard de Lineamientos Técnicos (Numeral 9 y 11):** Buscador rápido de los 13 riesgos del Protocolo estructurado en *Peligro, Controles Críticos, EPP y Criterios de Retorno Seguro*.
* 📑 **Dashboard Matriz Operativa Mínima (Anexo 1):** Tabla interactiva filtrable con los 39 registros oficiales por fase (*Antes, Durante y Después*) y exportación directa a Excel (`.xls`).
* 📊 **Métricas de Impacto, Acceso Seguro y Buzón Privado:** Autenticación con Google (Firebase Auth), contador de visitas y especialistas SST en tiempo real, aceptación trazable de alcance referencial y canal de comentarios directos al administrador.

---

### ⚠️ Aviso Legal (Disclaimer)
Esta plataforma tiene fines exclusivamente **técnicos, educativos y referenciales**. La información cartográfica y los cálculos preliminares **no sustituyen** la Identificación de Peligros, Evaluación de Riesgos y Determinación de Controles (IPERC) específica ni las evaluaciones técnicas ocupacionales que cada empleador debe ejecutar en su centro de trabajo conforme a la Ley N.° 29783.

---

### 👨‍💻 Ficha Técnica y Autoría
* **Geomapa desarrollado por:** **Vladimir Casas Palomino**
* **Tecnologías y Procesamiento GIS:** Civil3D • QGIS • Leaflet • Firebase • JavaScript Modular
* **Actualización del Sistema:** Noviembre 2026
