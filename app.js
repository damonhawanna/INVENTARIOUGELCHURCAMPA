/* INVENTARIOUGELCHURCAMPA - logica del cliente (100% offline) */
(function () {
  "use strict";

  var DB_NAME = "InventarioUGELDB";
  var DB_VERSION = 1;
  var STORE_NAME = "dataStore";
  var DATA = window.INVENTARIOUGELCHURCAMPA || null;
  var CATALOGO = window.CATALOGO_IIEE || null;

  var institucionSeleccionada = null;
  var inventarioActual = [];
  var registros = [];
  var instituciones = [];

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

  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  }
  function dbGet(key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, "readonly");
        var req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function (e) { reject(e.target.error); };
      });
    });
  }

  var deferredPrompt = null;
  function esAppInstalada() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
           (window.navigator && window.navigator.standalone === true);
  }
  function initInstalacion() {
    if (esAppInstalada()) return;
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
    return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  function fmtMoneda(v) {
    if (!v) return "\u2014";
    var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
    if (isNaN(n)) return v;
    return "S/ " + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  // ------------------------------------------------------------------
  // Capa de instituciones: combina catálogo oficial (p.xlsx) y áreas SIGA
  // ------------------------------------------------------------------

  // área Siga -> lista de códigos cortos contenidos en el nombre del área
  var areaACodigoCorto = function (area) {
    var nums = (area || "").match(/\d{3,}/g);
    return nums || [];
  };

  // Para cada institución del catálogo, encontrar las áreas SIGA que la contienen (por código corto)
  function construirDirectorios() {
    // directorio de instituciones desplegables
    var directorio = [];

    // Sede principal de la UGEL (agrupa todas las oficinas)
    directorio.push({
      origen: "sede",
      nombre: "SEDE / UGEL CHURCAMPA",
      cat: "SEDE / UGEL",
      nivel: "Oficinas de la sede (Direcci\u00f3n, Administraci\u00f3n, etc.)"
    });

    if (CATALOGO && CATALOGO.instituciones) {
      CATALOGO.instituciones.forEach(function (cat) {
        directorio.push({
          origen: "catalogo",
          nombre: cat.nombre,
          cat: cat.nivel || (cat.categoria || ""),
          cod_inst: cat.cod_inst || "",
          cod_mod: cat.cod_mod || "",
          cod_corto: cat.cod_corto || "",
          distrito: cat.distrito || "",
          direccion: cat.direccion || "",
          ubigeo: cat.ubigeo || "",
          lat: cat.lat || "",
          lon: cat.lon || "",
          nivel: cat.nivel || "",
          gestion: cat.gestion || "",
          centrop: cat.c_poblado || "",
          catInfo: cat
        });
      });
    }

    // instituciones derivadas de las áreas SIGA (para las que no están en el catálogo: SEDE, oficinas, etc.)
    instituciones = instituciones || [];
    instituciones.forEach(function (inst) {
      directorio.push({
        origen: "siga",
        nombre: inst.nombre,
        cat: inst.cat || "Instituci\u00f3n educativa"
      });
    });

    return directorio;
  }

  var directorioInstituciones = [];

  function esModularValido(v) {
    return v && /^[0-9]{6,}$/.test(v);
  }

  function buscarInstituciones(texto) {
    var q = normalize(texto).trim();
    if (!q) return [];

    // si es código modular (7 dígitos), buscar por código modular del catálogo
    if (esModularValido(texto.trim())) {
      var porModular = directorioInstituciones.filter(function (d) {
        return d.cod_mod === texto.trim() || (d.cod_inst === texto.trim());
      });
      if (porModular.length) return porModular;
    }

    var terms = q.split(/\s+/).filter(Boolean);
    return directorioInstituciones.filter(function (d) {
      var hay = normalize(
        [d.nombre, d.cod_inst, d.cod_mod, d.distrito, d.nivel, d.direccion].join(" ")
      );
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
      lista.length + (lista.length === 1 ? " instituci\u00f3n encontrada" : " instituciones encontradas");

    lista.forEach(function (inst) {
      var li = document.createElement("li");
      li.className = "inst-item";

      var info = document.createElement("div");
      info.className = "inst-info";

      var name = document.createElement("span");
      name.className = "inst-name";
      name.textContent = inst.nombre;

      var meta = document.createElement("span");
      meta.className = "inst-meta";
      meta.textContent = metaDeInstitucion(inst);

      info.appendChild(name);
      info.appendChild(meta);

      var badge = document.createElement("span");
      badge.className = "inst-badge";
      badge.textContent = inst.cat || "";

      li.appendChild(info);
      li.appendChild(badge);
      li.addEventListener("click", function () { seleccionarInstitucion(inst); });
      el.instList.appendChild(li);
    });
  }

  function metaDeInstitucion(inst) {
    var partes = [];
    if (inst.cod_mod) partes.push("C\u00f3d. Modular: " + inst.cod_mod);
    else if (inst.cod_inst) partes.push("C\u00f3d: " + inst.cod_inst);
    if (inst.distrito) partes.push(inst.distrito);
    if (inst.nivel) partes.push(inst.nivel);
    if (inst.origen === "siga") partes.push("(SIGA)");
    return partes.join(" \u2022 ");
  }

  // Encuentra las áreas SIGA correspondientes a un código corto (o a una institución del catálogo)
  function areasSigaPara(inst) {
    if (inst.origen === "sede") {
      // todas las oficinas de la sede
      var set = {};
      registros.forEach(function (r) {
        if (r.cat === "SEDE / UGEL" && r.area) set[r.area] = true;
      });
      return Object.keys(set);
    }
    if (inst.origen === "siga") {
      return [inst.nombre];
    }
    var codes = [inst.cod_corto, inst.cod_inst, inst.cod_mod].filter(Boolean);
    var res = {};
    registros.forEach(function (r) {
      if (!r.area) return;
      var nums = areaACodigoCorto(r.area);
      var ok = false;
      // coincidir si el número corto del catálogo está en el área, o si el área coincide por nombre
      if (inst.cod_corto && nums.indexOf(inst.cod_corto) !== -1) ok = true;
      if (!ok && inst.nombre) {
        var areaN = normalize(r.area);
        var nombreN = normalize(inst.nombre);
        // extraer palabras significativas (>=4 letras) del nombre del catálogo y ver si están en el área
        var words = nombreN.split(/\s+/).filter(function (w) {
          return w.length >= 4 && !/^\d+$/.test(w);
        });
        if (words.length && words.every(function (w) { return areaN.indexOf(w) !== -1; })) ok = true;
      }
      if (ok) res[r.area] = true;
    });
    return Object.keys(res);
  }

  function seleccionarInstitucion(inst) {
    institucionSeleccionada = inst;

    var areas = areasSigaPara(inst);
    var set = {};
    areas.forEach(function (a) { set[a] = true; });

    inventarioActual = registros.filter(function (r) { return set[r.area]; });

    el.searchStep.hidden = true;
    el.inventoryStep.hidden = false;
    el.instTitle.textContent = inst.nombre;
    el.instCat.textContent = (inst.cat || "") + (inst.nivel ? " \u2022 " + inst.nivel : "");
    renderMetaInstitucion();
    renderStats();
    buildTipoFilter();
    resetFilters();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderMetaInstitucion() {
    var holder = document.getElementById("instMeta");
    if (!holder) return;
    var inst = institucionSeleccionada;
    var filas = [];
    if (inst.cod_mod) filas.push(['C\u00f3digo Modular', inst.cod_mod]);
    if (inst.cod_inst) filas.push(['C\u00f3digo Instituci\u00f3n', inst.cod_inst]);
    if (inst.distrito) filas.push(['Distrito', inst.distrito]);
    if (inst.direccion) filas.push(['Direcci\u00f3n', inst.direccion]);
    if (inst.centrop) filas.push(['Centro Poblado', inst.centrop]);
    if (inst.gestion) filas.push(['Gesti\u00f3n', inst.gestion]);
    if (inst.ubigeo) filas.push(['Ubigeo', inst.ubigeo]);

    if (!filas.length) {
      holder.hidden = true;
      return;
    }
    holder.hidden = false;
    holder.innerHTML = "";
    filas.forEach(function (f) {
      var div = document.createElement("div");
      div.className = "inst-meta-row";
      var k = document.createElement("span");
      k.className = "inst-meta-key";
      k.textContent = f[0];
      var v = document.createElement("span");
      v.className = "inst-meta-val";
      v.textContent = f[1];
      div.appendChild(k);
      div.appendChild(v);
      holder.appendChild(div);
    });
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
      tr.appendChild(td(r.cod || "\u2014", "cod"));
      tr.appendChild(td(r.bien || "\u2014", "bien"));
      tr.appendChild(td(r.tipo || "\u2014", "tipo"));
      tr.appendChild(tdEstado(r.estado, "estado"));
      tr.appendChild(td(r.cond || "\u2014", "cond"));
      tr.appendChild(td((r.marca || "") + (r.modelo && r.modelo !== r.marca ? " / " + r.modelo : ""), "marca"));
      tr.appendChild(td(r.serie || "\u2014", "serie"));
      tr.appendChild(td(r.doc || "\u2014", "doc"));
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
      c.textContent = "\u2014";
    }
    return c;
  }
  function responsable(r) {
    var partes = [r.ap, r.am, r.nom].filter(Boolean);
    return partes.length ? partes.join(" ") : "\u2014";
  }

  // ---------- Export ----------
  function xmlEsc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  function exportarXLSX() {
    var filas = inventarioActual.filter(function (r) { return aplicarFiltroUnico(r); });
    var nombreArchivo = "inventario_" + (institucionSeleccionada.nombre.replace(/[^\w]+/g, "_")) + ".xlsx";
    var columnasDesc = [
      { h: "N\u00b0", v: function (r, i) { return i + 1; } },
      { h: "C\u00f3digo Patrimonial", v: function (r) { return r.cod; } },
      { h: "Denominaci\u00f3n del Bien", v: function (r) { return r.bien; } },
      { h: "Tipo", v: function (r) { return r.tipo; } },
      { h: "N\u00b0 Doc Adquisici\u00f3n", v: function (r) { return r.doc; } },
      { h: "Fecha Adquisici\u00f3n", v: function (r) { return r.fecha; } },
      { h: "Valor Adquisici\u00f3n", v: function (r) { return numOrTexto(r.vadq); } },
      { h: "Valor Neto", v: function (r) { return numOrTexto(r.vneto); } },
      { h: "Estado", v: function (r) { return estadoTexto(r.estado); } },
      { h: "Condici\u00f3n", v: function (r) { return r.cond; } },
      { h: "Marca", v: function (r) { return r.marca; } },
      { h: "Modelo", v: function (r) { return r.modelo; } },
      { h: "Serie", v: function (r) { return r.serie; } },
      { h: "Color", v: function (r) { return r.color; } },
      { h: "Responsable", v: function (r) { return responsable(r); } }
    ];
    var filasExcel = [["UGEL CHURCAMPA - INVENTARIO PATRIMONIAL"]];
    filasExcel.push(["Instituci\u00f3n: " + institucionSeleccionada.nombre, "", "", "Total de bienes: " + filas.length]);
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
  function aplicarFiltroUnico(r) {
    var qBien = normalize(el.filterBien.value).trim();
    if (qBien && normalize(r.bien).indexOf(qBien) === -1) return false;
    if (el.filterEstado.value && (r.estado || "") !== el.filterEstado.value) return false;
    if (el.filterCond.value && (r.cond || "") !== el.filterCond.value) return false;
    if (el.filterTipo.value && (r.tipo || "") !== el.filterTipo.value) return false;
    return true;
  }

  // ---------- ZIP/XLSX ----------
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
  function u32(n) { n >>>= 0; return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255]; }
  function utf8(str) { return new TextEncoder().encode(str); }
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
    entries.forEach(function (e) {
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

  // ---------- Columnas ----------
  var COLUMNAS = [
    { key: "num", label: "N\u00b0" },
    { key: "cod", label: "C\u00f3digo Patrimonial" },
    { key: "bien", label: "Denominaci\u00f3n del Bien" },
    { key: "tipo", label: "Tipo" },
    { key: "estado", label: "Estado" },
    { key: "cond", label: "Condici\u00f3n" },
    { key: "marca", label: "Marca / Modelo" },
    { key: "serie", label: "Serie" },
    { key: "doc", label: "N\u00b0 Doc" },
    { key: "vadq", label: "Valor Adquisici\u00f3n" },
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
    } catch (e) { }
    colsVisibles = COLUMNAS.map(function (c) { return c.key; });
  }
  function guardarColsVisibles() {
    try { localStorage.setItem(COL_STORAGE, JSON.stringify(colsVisibles)); } catch (e) { }
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

  function startApp() {
    el.totalRegs.textContent = registros.length.toLocaleString("es-PE");
    el.loading.hidden = true;

    directorioInstituciones = construirDirectorios();

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

  function init() {
    load();
    el.loading.hidden = false;
    el.loading.textContent = "Cargando datos\u2026";

    dbGet("customData").then(function (custom) {
      if (custom && custom.registros && custom.registros.length) {
        registros = custom.registros;
        instituciones = custom.instituciones || [];
      } else if (DATA) {
        registros = DATA.registros;
        instituciones = DATA.instituciones || [];
      } else {
        el.loading.textContent = "No se pudo cargar data.js";
        return;
      }
      startApp();
    }).catch(function () {
      if (DATA) {
        registros = DATA.registros;
        instituciones = DATA.instituciones || [];
        startApp();
      } else {
        el.loading.textContent = "No se pudo cargar data.js";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
