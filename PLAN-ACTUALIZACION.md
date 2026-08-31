# Plan de Actualización por IE (merge + historial + revertir)

> Documento de diseño. Estado: **aprobado para documentar, pendiente de implementación**.

## Objetivo
Permitir que una Institución Educativa (IE) **actualice su propio inventario** sin afectar a las demás,
con **historial de cambios** y posibilidad de **revertir**. Pensado para funcionar **local/offline**
(sin backend), donde un administrador es quien publica los cambios al resto de usuarios.

## Decisiones de diseño (tomadas con el usuario)

| Tema | Decisión |
|---|---|
| Cómo actualiza una IE | La IE sube **solo su parte**; el sistema hace **merge** con lo existente. |
| Donde se guarda | **Local/offline** en IndexedDB (navegador del admin). |
| Alcance | Plan/diseño primero; codificar por etapas cuando se apruebe. |
| Identificar la IE | Por **código modular / catálogo** (`instituciones.js`). |
| Bajas | Un bien que deja de reportarse se **elimina** (baja real) con registro y revert. |
| Publicar | Botón para **exportar `data.js`** y subirlo a GitHub manualmente. |

## Limitación honesta
Sin backend, un usuario **normal no ve** los cambios hasta que el admin los publique a GitHub.
Es inherente a la opción offline. El paso futuro opcional es Firebase/Supabase para propagación automática.

---

## Cómo funciona hoy (contexto)
- El inventario vive en `data.js` (48.995 registros) subido al repo/GitHub Pages. Es de **lectura global**.
- `upload.html` permite importar un Excel completo con contraseña y guardarlo en **IndexedDB**, que
  **reemplaza** todo el inventario en el navegador de quien lo hizo. No sirve para "una IE actualiza lo suyo".

## Flujo propuesto

```
IE "César Vallejo"
   │  1. Abre upload.html e ingresa con su usuario/contraseña (por IE)
   ▼
2. Sube su Excel (solo sus registros, o filtrados por su código modular)
   ▼
3. El sistema identifica los registros de esa IE (emparejando con el catálogo)
   ▼
4. Vista previa: cambios vs. el inventario ACTUAL de esa IE
      - Bienes NUEVOS (altas)
      - Bienes ELIMINADOS (bajas)
      - Bienes MODIFICADOS (ej. cambió serie/responsable)
   ▼
5. Confirmar → merge por clave (código patrimonial) SOLO sobre esa IE
   ▼
6. Se guarda snapshot anterior + resumen en el historial
   ▼
7. Historial disponible: ver versiones y REVERTIR
```

## Modelo de datos (IndexedDB)

Nueva base `InventarioUGELDB` (versión 2+) en el store `dataStore`:

| Clave | Contenido |
|---|---|
| `"vivo"` | Inventario **vigente**: `{ baseOriginal, cambiosPorIE, ... }` |
| `"historial"` | Lista de versiones por IE: `[{ ie, fecha, usuario, tipo, diff, snapshot }]` |
| `"users"` | Credenciales por IE (usuario/contraseña). |
| `"customData"` / `"customDate"` | Se conservan por compatibilidad con la carga actual. |

**Registros**: cada bien lleva su IE (via `area`) y su clave de identificación.

- Clave principal: `cod` (código patrimonial).
- Si no hay `cod`, se usa `area + bien + serie` como clave compuesta.

## El merge (lógica central)

Al subir una actualización de la IE **X**:

1. Tomar el inventario vivo actual **solo** de la IE **X**.
2. Comparar contra lo nuevo subido por clave (código patrimonial):
   - **Alta**: clave nueva → se agrega.
   - **Baja**: clave que ya no está → se elimina (con registro en historial).
   - **Modificación**: clave existente con campos distintos → se actualiza (guardando el anterior).
3. Guardar el **snapshot** del estado de la IE **X** antes del cambio.
4. **No tocar** los registros de las demás IEs.

El inventario vivo siempre = `data.js` base + los cambios acumulados por IE.

## Historial y revertir

- Cada importación registra: fecha, IE/usuario, resumen (n altas, m bajas, k modificadas) y snapshot anterior.
- **Revertir** = restaurar el snapshot anterior de esa IE y dejar constancia en el historial.
- Se pueden listar todas las versiones por IE y saltar entre ellas.

## Aprobación / publicación (admin)

- El admin **aprueba** los cambios y **exporta el `data.js`** actualizado.
- Sube el `data.js` a GitHub Pages → **todos** los usuarios ven el cambio.
- La carga de la IE queda marcada como `pendiente` / `aplicado` según corresponda.

## Seguridad / accesos (mínimo)

- Cada IE tiene **usuario y contraseña** propios (se reutiliza el patrón de `upload.html`).
- El admin tiene una **contraseña maestra** para: ver historial de todas las IEs, revertir y exportar `data.js`.

## Etapas de implementación (cuando se apruebe)

1. **Estructura de datos** — rediseño de IndexedDB (vivo/historial/usuarios) + detección de IE por código modular.
2. **Merge** — altas/bajas/modificadas por código patrimonial, solo sobre la IE.
3. **Vista previa + confirmación** — UI que muestre los cambios antes de aplicar.
4. **Historial + revertir** — listar versiones por IE y revertir.
5. **Exportar `data.js`** — botón para publicar a GitHub.

## Paso futuro (opcional)
Sumar **Firebase/Supabase** para que los cambios se propaguen automáticamente a todos los usuarios
sin depender de la publicación manual a GitHub.
