/* INVENTARIOUGELCHURCAMPA - logica del cliente (100% offline) */
(function () {
  "use strict";

  var DATA = null;
  try {
    var custom = localStorage.getItem("INVENTARIOUGELCHURCAMPA_CUSTOM");
    if (custom) {
      DATA = JSON.parse(custom);
    }
  } catch (e) { /* ignorar */ }
  if (!DATA) DATA = window.INVENTARIOUGELCHURCAMPA || null;
  var registros = DATA ? DATA.registros : [];
  var instituciones = DATA ? DATA.instituciones : [];

  var institucionSeleccionada = null;
  var inventarioActual = [];

  // Elementos
  var el = {};
  var load = function () {
    el.loading = document.getElementById("loading");
    el.searchInput = document.getElementById("searchInput");
    el.searchBtn = document.getElementById("searchBtn");
    el.resultCount = document.getElementById("resultCount");
    el.instList = document.getElementById("instList");
    el.searchEmpty = document.getElementById("searchEmpty");
    el.searchStep = document.getElementById("searchStep");
    el.inventoryStep = document.getElementById("inventoryStep");
    el.backBtn = document.getElementById("backBtn");
    el.instTitle = document.getElementById("instTitle");
    el.instCat = document.getElementById("instCat");
    el.instStats = document.getElementById("instStats");
    el.filterBien = document.getElementById("filterBien");
    el.filterEstado = document.getElementById("filterEstado");
    el.filterCond = document.getElementById("filterCond");
    el.filterTipo = document.getElementById("filterTipo");
    el.shownCount = document.getElementById("shownCount");
    el.invBody = document.getElementById("invBody");
    el.invEmpty = document.getElementById("invEmpty");
    el.exportBtn = document.getElementById("exportBtn");
    el.totalRegs = document.getElementById("totalRegs");
    el.colBtn = document.getElementById("colBtn");
    el.colPanel = document.getElementById("colPanel");
    el.colList = document.getElementById("colList");
    el.invTable = document.getElementById("invTable");
    el.installBtn = document.getElementById("installBtn");
  };

  // ---------- Instalacion PWA ----------
  var deferredPrompt = null;

  function esAppInstalada() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
           (window.navigator && window.navigator.standalone === true);
  }

  function initInstalacion() {
    if (esAppInstalada()) return; // ya instalada, no mostrar el boton
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      if (el.installBtn) el.installBtn.hidden = false;
    });
    window.addEventListener("appinstalled", function () {
      deferredPrompt = null;
      if (el.installBtn) el.installBtn.hidden = true;
    });
    if (el.installBtn) {
      el.installBtn.addEventListener("click", function () {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () {
          deferredPrompt = null;
          el.installBtn.hidden = true;
        });
      });
    }
  }

  var normalize = function (s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  function fmtMoneda(v) {
    if (!v) return "—";
    var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
    if (isNaN(n)) return v;
    return "S/ " + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function buscarInstituciones(texto) {
    var q = normalize(texto).trim();
    if (!q) return [];
    var terms = q.split(/\s+/).filter(Boolean);
    return instituciones.filter(function (inst) {
      var hay = normalize(inst.nombre);
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
  }

  function renderInstituciones(lista) {
    el.instList.replaceChildren();
    if (!lista.length) {
      el.searchEmpty.hidden = false;
      el.instList.hidden = true;
      el.resultCount.hidden = true;
      return;
    }
    el.searchEmpty.hidden = true;
    el.instList.hidden = false;
    el.resultCount.hidden = false;
    el.resultCount.textContent =
      lista.length + (lista.length === 1 ? " institución encontrada" : " instituciones encontradas");

    lista.forEach(function (inst) {
      var li = document.createElement("li");
      var name = document.createElement("span");
      name.className = "inst-name";
      name.textContent = inst.nombre;
      var badge = document.createElement("span");
      badge.className = "inst-badge";
      badge.textContent = inst.cat || "";
      li.appendChild(name);
      li.appendChild(badge);
      li.addEventListener("click", function () { seleccionarInstitucion(inst); });
      el.instList.appendChild(li);
    });
  }

  function seleccionarInstitucion(inst) {
    institucionSeleccionada = inst;
    // filtrar registros de esa institucion
    inventarioActual = registros.filter(function (r) {
      return r.area === inst.nombre;
    });
    el.searchStep.hidden = true;
    el.inventoryStep.hidden = false;
    el.instTitle.textContent = inst.nombre;
    el.instCat.textContent = inst.cat || "Institución educativa";
    renderStats();
    buildTipoFilter();
    resetFilters();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderStats() {
    var total = inventarioActual.length;
    var estB = inventarioActual.filter(function (r) { return r.estado === "B"; }).length;
    var estR = inventarioActual.filter(function (r) { return r.estado === "R"; }).length;
    var estN = inventarioActual.filter(function (r) { return r.estado === "N"; }).length;
    el.instStats.innerHTML =
      stat(total, "Total") +
      stat(estB, "Bueno") +
      stat(estR, "Regular") +
      stat(estN, "Nuevo/N");
  }
  function stat(n, lbl) {
    return '<div class="stat"><div class="num">' + n + '</div><div class="lbl">' + lbl + "</div></div>";
  }

  function buildTipoFilter() {
    var tipos = {};
    inventarioActual.forEach(function (r) { if (r.tipo) tipos[r.tipo] = true; });
    var keys = Object.keys(tipos).sort();
    el.filterTipo.innerHTML = '<option value="">Todos</option>';
    keys.forEach(function (t) {
      var o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      el.filterTipo.appendChild(o);
    });
    if (!keys.length) el.filterTipo.disabled = true;
    else el.filterTipo.disabled = false;
  }

  function resetFilters() {
    el.filterBien.value = "";
    el.filterEstado.value = "";
    el.filterCond.value = "";
    el.filterTipo.value = "";
    aplicarFiltros();
  }

  function aplicarFiltros() {
    var qBien = normalize(el.filterBien.value).trim();
    var qEstado = el.filterEstado.value;
    var qCond = el.filterCond.value;
    var qTipo = el.filterTipo.value;

    var filtrados = inventarioActual.filter(function (r) {
      if (qBien && normalize(r.bien).indexOf(qBien) === -1) return false;
      if (qEstado && (r.estado || "") !== qEstado) return false;
      if (qCond && (r.cond || "") !== qCond) return false;
      if (qTipo && (r.tipo || "") !== qTipo) return false;
      return true;
    });

    renderTabla(filtrados);
  }

  function renderTabla(lista) {
    el.invBody.replaceChildren();
    if (!lista.length) {
      el.invEmpty.hidden = false;
      el.shownCount.textContent = "";
      return;
    }
    el.invEmpty.hidden = true;
    el.shownCount.textContent =
      "Mostrando " + lista.length + (lista.length === 1 ? " bien" : " bienes") +
      " de " + inventarioActual.length + " en total";

    lista.forEach(function (r, i) {
      var tr = document.createElement("tr");
      tr.appendChild(td(String(i + 1), "num"));
      tr.appendChild(td(r.cod || "—", "cod"));
      tr.appendChild(td(r.bien || "—", "bien"));
      tr.appendChild(td(r.tipo || "—", "tipo"));
      tr.appendChild(tdEstado(r.estado, "estado"));
      tr.appendChild(td(r.cond || "—", "cond"));
      tr.appendChild(td((r.marca || "") + (r.modelo && r.modelo !== r.marca ? " / " + r.modelo : ""), "marca"));
      tr.appendChild(td(r.serie || "—", "serie"));
      tr.appendChild(td(r.doc || "—", "doc"));
      tr.appendChild(td(fmtMoneda(r.vadq), "vadq"));
      tr.appendChild(td(fmtMoneda(r.vneto), "vneto"));
      tr.appendChild(td(responsable(r), "resp"));
      el.invBody.appendChild(tr);
    });
    aplicarVisibilidadColumnas();
  }

  function td(texto, col) {
    var c = document.createElement("td");
    c.textContent = texto;
    if (col) c.setAttribute("data-col", col);
    return c;
  }

  function tdEstado(estado, col) {
    var c = document.createElement("td");
    if (col) c.setAttribute("data-col", col);
    var map = { B: "Bueno", R: "Regular", N: "Nuevo/N" };
    if (estado) {
      var b = document.createElement("span");
      b.className = "badge-estado est-" + estado;
      b.textContent = map[estado] || estado;
      c.appendChild(b);
    } else {
      c.textContent = "—";
    }
    return c;
  }

  function responsable(r) {
    var partes = [r.ap, r.am, r.nom].filter(Boolean);
    return partes.length ? partes.join(" ") : "—";
  }

  function xmlEsc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  function exportarXLSX() {
    var filas = inventarioActual.filter(function (r) { return aplicarFiltroUnico(r); });
    var nombreArchivo = "inventario_" + (institucionSeleccionada.nombre.replace(/[^\w]+/g, "_")) + ".xlsx";

    var columnasDesc = [
      { h: "N°", v: function (r, i) { return i + 1; } },
      { h: "Código Patrimonial", v: function (r) { return r.cod; } },
      { h: "Denominación del Bien", v: function (r) { return r.bien; } },
      { h: "Tipo", v: function (r) { return r.tipo; } },
      { h: "N° Doc Adquisición", v: function (r) { return r.doc; } },
      { h: "Fecha Adquisición", v: function (r) { return r.fecha; } },
      { h: "Valor Adquisición", v: function (r) { return numOrTexto(r.vadq); } },
      { h: "Valor Neto", v: function (r) { return numOrTexto(r.vneto); } },
      { h: "Estado", v: function (r) { return estadoTexto(r.estado); } },
      { h: "Condición", v: function (r) { return r.cond; } },
      { h: "Marca", v: function (r) { return r.marca; } },
      { h: "Modelo", v: function (r) { return r.modelo; } },
      { h: "Serie", v: function (r) { return r.serie; } },
      { h: "Color", v: function (r) { return r.color; } },
      { h: "Responsable", v: function (r) { return responsable(r); } }
    ];

    var filasExcel = [["UGEL CHURCAMPA - INVENTARIO PATRIMONIAL"]];
    filasExcel.push(["Institución: " + institucionSeleccionada.nombre, "", "", "Total de bienes: " + filas.length]);
    filasExcel.push([]);
    filasExcel.push(columnasDesc.map(function (c) { return c.h; }));
    filas.forEach(function (r, i) {
      filasExcel.push(columnasDesc.map(function (c) { return c.v(r, i); }));
    });

    var zip = crearXLSX(filasExcel);
    var blob = new Blob([zip], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    el.exportBtn.href = URL.createObjectURL(blob);
    el.exportBtn.download = nombreArchivo;
  }

  function numOrTexto(v) {
    if (!v) return "";
    var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? String(v) : n;
  }
  function estadoTexto(e) {
    var map = { B: "Bueno", R: "Regular", N: "Nuevo/N" };
    return e ? (map[e] || e) : "";
  }

  // ---------- Generador de .xlsx (OOXML) en JS puro ----------
  function crc32(bytes) {
    var table = crc32.table;
    if (!table) {
      table = crc32.table = new Int32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c;
      }
    }
    var crc = -1;
    for (var i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
    return (crc ^ -1) >>> 0;
  }
  function u16(n) { return [n & 255, (n >> 8) & 255]; }
  function u32(n) {
    n >>>= 0;
    return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255];
  }
  function utf8(str) {
    return new TextEncoder().encode(str);
  }
  function dosTime(date) {
    var d = date || new Date();
    return (((d.getFullYear() - 1980) & 0x7F) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  }
  function dosDate() {
    var d = new Date();
    return (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  }
  function crearZip(entries) {
    var chunks = [];
    var central = [];
    var sizeAll = 0;
    var crc16 = null, crc32v = null;

    entries.forEach(function (e, idx) {
      var nameBytes = utf8(e.name);
      var data = e.data;
      var crc = crc32(data);
      var csize = data.length, usize = data.length;

      var lfh = u32(0x04034b50).concat(
        u16(20), u16(0), u16(0), u16(dosTime()), u16(dosDate()),
        u32(crc), u32(csize), u32(usize), u16(nameBytes.length), u16(0)
      );
      chunks.push(new Uint8Array(lfh.concat(Array.from(nameBytes), Array.from(data))));

      var offset = sizeAll;
      sizeAll += lfh.length + nameBytes.length + data.length;

      var cd = u32(0x02014b50).concat(
        u16(20), u16(20), u16(0), u16(0), u16(dosTime()), u16(dosDate()),
        u32(crc), u32(csize), u32(usize), u16(nameBytes.length), u16(0),
        u16(0), u16(0), u16(0), u32(0), u32(offset)
      );
      central.push(new Uint8Array(cd.concat(Array.from(nameBytes))));
    });

    var total = chunks.reduce(function (s, c) { return s + c.length; }, 0);
    var centralBytes = new Uint8Array(central.reduce(function (s, c) { return s + c.length; }, 0));
    var off = 0;
    central.forEach(function (c) { centralBytes.set(c, off); off += c.length; });

    var cdStart = total;
    var eocd = u32(0x06054b50).concat(
      u16(0), u16(0), u16(entries.length), u16(entries.length),
      u32(centralBytes.length), u32(cdStart), u16(0)
    );
    var out = new Uint8Array(total + centralBytes.length + eocd.length);
    off = 0;
    chunks.forEach(function (c) { out.set(c, off); off += c.length; });
    out.set(centralBytes, off);
    out.set(new Uint8Array(eocd), off + centralBytes.length);
    return out;
  }

  function crearXLSX(filas) {
    var nrows = filas.length;
    var ncols = 0;
    filas.forEach(function (f) { if (f.length > ncols) ncols = f.length; });

    function colLetra(i) {
      var s = "";
      i += 1;
      while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
      return s;
    }

    var sheetRows = "";
    filas.forEach(function (row, ri) {
      sheetRows += '<row r="' + (ri + 1) + '">';
      for (var ci = 0; ci < ncols; ci++) {
        var cellRef = colLetra(ci) + (ri + 1);
        var val = row[ci];
        var cell;
        if (typeof val === "number") {
          cell = '<c r="' + cellRef + '"><v>' + val + '</v></c>';
        } else {
          cell = '<c r="' + cellRef + '" t="inlineStr"><is><t xml:space="preserve">' + xmlEsc(val) + '</t></is></c>';
        }
        sheetRows += cell;
      }
      sheetRows += "</row>";
    });

    var sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetData>' + sheetRows + '</sheetData></worksheet>';

    var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '</Types>';

    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>';

    var workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '</Relationships>';

    var workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Inventario" sheetId="1" r:id="rId1"/></sheets></workbook>';

    var contentXml = {
      "[Content_Types].xml": contentTypes,
      "_rels/.rels": rels,
      "xl/_rels/workbook.xml.rels": workbookRels,
      "xl/workbook.xml": workbook,
      "xl/worksheets/sheet1.xml": sheetXml
    };

    var names = ["[Content_Types].xml", "_rels/.rels", "xl/_rels/workbook.xml.rels", "xl/workbook.xml", "xl/worksheets/sheet1.xml"];
    var entries = names.map(function (n) { return { name: n, data: utf8(contentXml[n]) }; });
    return crearZip(entries);
  }

  function aplicarFiltroUnico(r) {
    var qBien = normalize(el.filterBien.value).trim();
    if (qBien && normalize(r.bien).indexOf(qBien) === -1) return false;
    if (el.filterEstado.value && (r.estado || "") !== el.filterEstado.value) return false;
    if (el.filterCond.value && (r.cond || "") !== el.filterCond.value) return false;
    if (el.filterTipo.value && (r.tipo || "") !== el.filterTipo.value) return false;
    return true;
  }

  var COLUMNAS = [
    { key: "num", label: "N°" },
    { key: "cod", label: "Código Patrimonial" },
    { key: "bien", label: "Denominación del Bien" },
    { key: "tipo", label: "Tipo" },
    { key: "estado", label: "Estado" },
    { key: "cond", label: "Condición" },
    { key: "marca", label: "Marca / Modelo" },
    { key: "serie", label: "Serie" },
    { key: "doc", label: "N° Doc" },
    { key: "vadq", label: "Valor Adquisición" },
    { key: "vneto", label: "Valor Neto" },
    { key: "resp", label: "Responsable" }
  ];
  var COL_STORAGE = "inc_cols_visibles";
  var colsVisibles = null;

  function cargarColsVisibles() {
    try {
      var saved = JSON.parse(localStorage.getItem(COL_STORAGE));
      if (saved && Array.isArray(saved) && saved.length) {
        var validas = {};
        COLUMNAS.forEach(function (c) { validas[c.key] = true; });
        colsVisibles = saved.filter(function (k) { return validas[k]; });
        return;
      }
    } catch (e) { /* ignorar */ }
    colsVisibles = COLUMNAS.map(function (c) { return c.key; });
  }

  function guardarColsVisibles() {
    try { localStorage.setItem(COL_STORAGE, JSON.stringify(colsVisibles)); } catch (e) { /* ignorar */ }
  }

  function colVisible(key) { return colsVisibles.indexOf(key) !== -1; }

  function renderColPanel() {
    el.colList.replaceChildren();
    COLUMNAS.forEach(function (c) {
      var label = document.createElement("label");
      label.className = "col-item";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = colVisible(c.key);
      cb.addEventListener("change", function () {
        if (cb.checked) { if (colsVisibles.indexOf(c.key) === -1) colsVisibles.push(c.key); }
        else { colsVisibles = colsVisibles.filter(function (k) { return k !== c.key; }); }
        guardarColsVisibles();
        aplicarVisibilidadColumnas();
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(c.label));
      el.colList.appendChild(label);
    });
  }

  function aplicarVisibilidadColumnas() {
    if (!el.invTable) return;
    var ths = el.invTable.querySelectorAll("thead th[data-col]");
    ths.forEach(function (th) {
      var key = th.getAttribute("data-col");
      var visible = colVisible(key);
      th.style.display = visible ? "" : "none";
      th.classList.toggle("col-hidden", !visible);
      el.invTable.querySelectorAll("tbody td[data-col='" + key + "']").forEach(function (td) {
        td.style.display = visible ? "" : "none";
      });
    });
  }

  function volverInicio() {
    institucionSeleccionada = null;
    inventarioActual = [];
    el.inventoryStep.hidden = true;
    el.searchStep.hidden = false;
    el.searchInput.focus();
  }

  function onSearch() {
    var lista = buscarInstituciones(el.searchInput.value);
    renderInstituciones(lista);
  }

  function init() {
    load();
    if (!DATA) {
      el.loading.hidden = false;
      el.loading.textContent = "No se pudo cargar data.js";
      return;
    }
    el.totalRegs.textContent = registros.length.toLocaleString("es-PE");
    el.loading.hidden = true;

    cargarColsVisibles();
    renderColPanel();
    initInstalacion();
    el.colBtn.addEventListener("click", function () {
      el.colPanel.hidden = !el.colPanel.hidden;
    });

    el.searchBtn.addEventListener("click", onSearch);
    el.searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") onSearch();
    });
    el.backBtn.addEventListener("click", volverInicio);
    el.filterBien.addEventListener("input", aplicarFiltros);
    el.filterEstado.addEventListener("change", aplicarFiltros);
    el.filterCond.addEventListener("change", aplicarFiltros);
    el.filterTipo.addEventListener("change", aplicarFiltros);
    el.exportBtn.addEventListener("click", exportarXLSX);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
