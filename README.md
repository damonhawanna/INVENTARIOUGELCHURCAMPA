# INVENTARIOUGELCHURCAMPA

Consulta web del inventario patrimonial de las instituciones educativas de la UGEL Churcampa.

Funciona **100 % offline** (los datos están embebidos en `data.js`, publicados con GitHub Pages) y es **instalable** (PWA) en Android y Windows.

## Instalación (PWA)

La web es una *Progressive Web App*: puede instalarse en el dispositivo para usarse como una aplicación nativa, sin conexión.

- **Android (Chrome):** abre la web → menú ⋮ → **Instalar aplicación** (o "Añadir a pantalla de inicio").
- **Windows (Edge/Chrome):** abre la web → icono de **Instalar** en la barra de direcciones (o menú ⋮ → Aplicaciones → Instalar esta web como una app).
- Tras instalarla, funciona aunque estés sin conexión.

## Funcionalidades

- Buscador de instituciones educativas (por nombre, código o ubicación).
- Lista de instituciones coincidentes con la búsqueda.
- Inventario completo de la institución seleccionada.
- Filtros por bien, estado (Bueno/Regular/Nuevo), condición y tipo.
- Exportación a Excel (.xlsx) con los filtros aplicados.
- Funciona sin conexión a internet una vez cargada.

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Interfaz principal |
| `styles.css` | Estilos |
| `app.js` | Lógica del cliente |
| `data.js` | Datos del inventario (48 995 registros, 267 instituciones) |
| `manifest.webmanifest` | Manifiesto PWA (nombre, tema, íconos) |
| `sw.js` | Service worker (instalación y uso offline) |
| `icon-192.png` / `icon-512.png` | Íconos de la app |
| `logo.png` | Logo de la UGEL Churcampa |
| `generar_datos.py` | Script para regenerar `data.js` desde el `.xls` |

## Regenerar datos desde el Excel

```bash
python generar_datos.py "ruta/al/Inventario SIGA 2026.xls"
```

Genera `data.js` con todos los registros de las hojas: SEDE, CETPRO, PRONOEI, CEBE, CEBA, INICIAL, PRIMARIA, SECUNDARIA.
