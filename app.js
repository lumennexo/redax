/* ============================================================
 * REDAX · PWA — frente estático que consume la API de Apps Script
 * ============================================================ */

// URL /exec del motor (Apps Script). Si algún día cambias de implementación, actualiza esto.
var API_URL = 'https://script.google.com/macros/s/AKfycbzIplreJsM6ZFwrWKXqVjl49PpEMKwYRuwLW4Cp_55zvtYBpSK4-sGmtNZB6tQ0sCSh/exec';

var TOKEN = '', TIPOS = [], FIRMANTES = [], ULTIMO = null, PERS = null;

/* --- Puente a la API. POST text/plain para evitar el preflight CORS. --- */
function api(action, params) {
  var body = Object.assign({ action: action, token: TOKEN }, params || {});
  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow'
  }).then(function (res) { return res.json(); })
    .then(function (json) {
      if (!json || json.ok !== true) throw new Error((json && json.error) || 'Error de la API.');
      return json.data;
    });
}

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function $(id) { return document.getElementById(id); }
function vista(sel) {
  ['login', 'captura', 'resultado'].forEach(function (v) { $(v).style.display = (v === sel) ? 'block' : 'none'; });
  $('btnSalir').style.display = (sel === 'login') ? 'none' : 'block';
}

/* ------------------------------- Sesión / llave ------------------------------- */
function bootstrap() {
  TOKEN = '';
  try { TOKEN = localStorage.getItem('redax_token') || ''; } catch (e) {}
  if (!TOKEN) { vista('login'); return; }
  init();
}
function entrar() {
  var m = $('msgLogin');
  var t = String($('tokenInput').value || '').trim();
  if (!t) { m.className = 'msg err'; m.textContent = 'Escribe tu llave.'; return; }
  var btn = $('btnEntrar'); btn.disabled = true; m.className = 'msg work'; m.textContent = 'Verificando…';
  TOKEN = t;
  api('contexto').then(function (ctx) {
    try { localStorage.setItem('redax_token', TOKEN); } catch (e) {}
    btn.disabled = false; m.className = 'msg'; m.textContent = '';
    pintarContexto(ctx);
    vista('captura');
  }).catch(function (e) {
    TOKEN = ''; btn.disabled = false; m.className = 'msg err'; m.textContent = 'No pude entrar: ' + e.message;
  });
}
function salir() {
  try { localStorage.removeItem('redax_token'); } catch (e) {}
  TOKEN = ''; $('tokenInput').value = ''; location.reload();
}

/* ------------------------------- Contexto ------------------------------- */
function init() {
  api('contexto').then(function (ctx) {
    pintarContexto(ctx);
    vista('captura');
  }).catch(function (e) {
    // Llave inválida o motor en pausa → de vuelta al login con el aviso.
    var m = $('msgLogin'); m.className = 'msg err'; m.textContent = 'No cargó: ' + e.message + ' Verifica tu llave.';
    vista('login');
  });
}
function pintarContexto(ctx) {
  TIPOS = ctx.tipos || []; FIRMANTES = ctx.firmantes || [];
  var st = $('tipo');
  st.innerHTML = '<option value="">Elige…</option>' + TIPOS.map(function (t) { return '<option value="' + esc(t.tipo) + '">' + esc(t.tipo) + '</option>'; }).join('');
  var sn = $('nivel');
  sn.innerHTML = '<option value="">Elige…</option>' + (ctx.niveles || []).map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('');
  filtrarFirmantes();
}
function tipoCambio() {
  var tv = $('tipo').value;
  var t = TIPOS.filter(function (x) { return x.tipo === tv; })[0];
  if (t) { $('membrete').value = (t.membrete === 'sep' ? 'sep' : 'colegio'); }
}
function filtrarFirmantes() {
  var n = norm($('nivel').value);
  var lista = FIRMANTES;
  if (n) { var m = FIRMANTES.filter(function (f) { var fn = norm(f.nivel); return fn === '' || fn === 'todos' || fn === n; }); if (m.length) lista = m; }
  var s = $('firmante');
  s.innerHTML = lista.length ? lista.map(function (f) { return '<option value="' + FIRMANTES.indexOf(f) + '">' + esc(f.nombre) + ' — ' + esc(f.cargo) + (f.nivel ? (' (' + esc(f.nivel) + ')') : '') + '</option>'; }).join('')
    : '<option value="">(configura la hoja FIRMANTES)</option>';
}

/* ------------------------------- Tabla (hoja) ------------------------------- */
function tablaHTML(txt, titulo) {
  var t = String(txt || '').replace(/\r/g, '').replace(/ /g, ' ').replace(/[ \t]+$/gm, '').trim();
  if (!t) return '';
  var filas = t.split('\n').filter(function (l) { return l.replace(/[|\t ]/g, '') !== ''; });
  if (!filas.length) return '';
  function celdas(l) { return (l.indexOf('\t') !== -1 ? l.split('\t') : l.split('|')).map(function (c) { return c.trim(); }); }
  var rows = filas.map(celdas);
  var maxc = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
  var cap = titulo ? ('<div class="tabla-tit">' + esc(titulo) + '</div>') : '';
  if (maxc <= 1) {
    var lis = rows.map(function (r) { return '<li>' + esc(r[0] || '') + '</li>'; }).join('');
    return cap + '<ul class="lista">' + lis + '</ul>';
  }
  var head = rows[0];
  var th = '<tr>' + head.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr>';
  var tr = rows.slice(1).map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('');
  return cap + '<table class="tabla"><thead>' + th + '</thead><tbody>' + tr + '</tbody></table>';
}

/* ------------------------------- Generar ------------------------------- */
function generar(btn) {
  var m = $('msg');
  var f = FIRMANTES[Number($('firmante').value)] || {};
  var datos = {
    tipo: $('tipo').value, nivel: $('nivel').value,
    destinatario: $('destinatario').value, titulo: $('titulo').value, subtipo: $('subtipo').value,
    puntos: $('puntos').value, borrador: $('borrador').value, instrucciones: $('instr').value,
    membrete: $('membrete').value, tabla: $('tabla').value, tabla_titulo: $('tablaTit').value,
    firmante: f.nombre || '', firmante_cargo: f.cargo || '',
    usar_ia: $('usarIA').checked, gen_wa: $('genWa').checked, gen_mail: $('genMail').checked
  };
  if (!datos.tipo) { m.className = 'msg err'; m.textContent = 'Elige el tipo de documento.'; return; }
  if (!datos.nivel) { m.className = 'msg err'; m.textContent = 'Elige el nivel.'; return; }
  if (!datos.titulo.trim()) { m.className = 'msg err'; m.textContent = 'Escribe el título/asunto.'; return; }
  if (!datos.puntos.trim() && !datos.borrador.trim()) { m.className = 'msg err'; m.textContent = 'Escribe los puntos clave o un borrador.'; return; }
  btn.disabled = true; btn.textContent = datos.usar_ia ? 'Redactando con IA…' : 'Generando…';
  m.className = 'msg work'; m.textContent = datos.usar_ia ? 'La IA está redactando… (unos segundos)' : 'Generando…';
  api('generar', { datos: datos }).then(function (r) {
    ULTIMO = r;
    $('hoja').innerHTML = render(r);
    $('folioLbl').textContent = r.folio;
    pintarExtra(r);
    pintarEnvio(r);
    btn.disabled = false; btn.textContent = 'Generar documento'; m.className = 'msg'; m.textContent = '';
    vista('resultado');
    window.scrollTo(0, 0);
  }).catch(function (e) {
    btn.disabled = false; btn.textContent = 'Generar documento'; m.className = 'msg err'; m.textContent = e.message;
  });
}
function render(r) {
  var e = r.escuela, f = r.firmante || {};
  var logo = e.logo ? '<img class="logo" src="' + esc(e.logo) + '" alt="">' : '';
  var slogan = e.slogan ? '<div class="slogan">' + esc(e.slogan) + '</div>' : '';
  var meta = []; if (e.cct) meta.push('CCT: ' + esc(e.cct)); if (e.incorporacion) meta.push(esc(e.incorporacion));
  var metaH = meta.length ? '<div class="meta">' + meta.join(' &nbsp;·&nbsp; ') + '</div>' : '';
  var top = e.img_encabezado ? '<img class="mem-top" src="' + esc(e.img_encabezado) + '" alt="">'
    : ('<div class="membrete">' + logo + '<div class="esc">' + esc(e.nombre) + '</div>' + slogan + metaH + '</div>');
  var pie = e.img_pie ? '<img class="mem-pie" src="' + esc(e.img_pie) + '" alt="">' : '';
  var parr = String(r.contenido || '').replace(/\r/g, '').split(/\n+/).map(function (b) { return b.trim(); }).filter(function (b) { return b; }).map(function (b) { return '<p>' + esc(b) + '</p>'; }).join('');
  var dest = r.destinatario ? '<div class="destinatario">' + esc(r.destinatario) + '</div>' : '';
  return top +
    '<div class="lugarfecha">' + esc(e.ciudad ? e.ciudad + ', a ' : '') + esc(r.fechaLarga) + '</div>' +
    '<div class="titulo">' + esc(r.titulo) + '</div>' +
    dest + '<div class="cuerpo">' + parr + '</div>' +
    tablaHTML(r.tabla, r.tabla_titulo) +
    '<div class="atte">A T E N T A M E N T E</div>' +
    '<div class="firma"><div class="linea"></div><div class="nom">' + (f.nombre ? esc(f.nombre) : '&nbsp;') + '</div><div class="car">' + esc(f.cargo || 'Dirección') + '</div></div>' +
    '<div class="foliox">' + (r.tipo ? esc(r.tipo) + ' · ' : '') + 'Folio: ' + esc(r.folio) + ' · Elaboró: ' + esc(r.generado_por || '—') + '</div>' +
    pie;
}
function pintarExtra(r) {
  var h = '';
  if (r.texto_whatsapp) { h += '<h3>Texto para WhatsApp</h3><div class="caja">' + esc(r.texto_whatsapp) + '</div>'; }
  if (r.asunto_correo || r.cuerpo_correo) { h += '<h3>Correo sugerido</h3><div class="caja"><b>Asunto:</b> ' + esc(r.asunto_correo || '—') + '\n\n' + esc(r.cuerpo_correo || '') + '</div>'; }
  $('extra').innerHTML = h;
}

/* ------------------------------- Envío ------------------------------- */
function pintarEnvio(r) {
  $('publico').value = 'padres';
  publicoCambio();
  $('alcance').value = 'grupo';
  alcanceCambio();
  var m = $('msgEnvio'); m.className = 'msg'; m.textContent = '';
  var s = $('grupoDestino'); s.innerHTML = '<option value="">Cargando…</option>';
  api('grupos', { nivel: r.nivel }).then(function (gs) {
    s.innerHTML = gs.length ? gs.map(function (g) { return '<option value="' + esc(g.id) + '">' + esc(g.etiqueta) + '</option>'; }).join('') : '<option value="">(sin grupos en ORBI)</option>';
  }).catch(function (e) { s.innerHTML = '<option value="">(no cargó)</option>'; m.className = 'msg err'; m.textContent = 'ORBI: ' + e.message; });
}
function alcanceCambio() {
  $('grupoWrap').style.display = ($('alcance').value === 'grupo') ? 'block' : 'none';
}
function publicoCambio() {
  var p = $('publico').value;
  $('zonaPadres').style.display = (p === 'padres') ? 'block' : 'none';
  $('zonaPersonal').style.display = (p === 'personal') ? 'block' : 'none';
  var m = $('msgEnvio'); m.className = 'msg'; m.textContent = '';
  if (p === 'personal' && !PERS) cargarOpcionesPersonal();
}
function chkList(id, items) {
  var box = $(id);
  box.innerHTML = (items && items.length) ? items.map(function (v) { return '<label class="chk"><input type="checkbox" value="' + esc(v) + '"> ' + esc(v) + '</label>'; }).join('') : '<span class="hint">(sin datos en DOCENTES)</span>';
}
function cargarOpcionesPersonal() {
  $('nivPersonal').innerHTML = '<span class="hint">Cargando…</span>';
  $('puestoPersonal').innerHTML = '<span class="hint">Cargando…</span>';
  api('personalOpciones').then(function (o) {
    PERS = o || { niveles: [], puestos: [] };
    chkList('nivPersonal', PERS.niveles);
    chkList('puestoPersonal', PERS.puestos);
  }).catch(function (e) {
    $('nivPersonal').innerHTML = '<span class="hint">ORBI: ' + esc(e.message) + '</span>';
    $('puestoPersonal').innerHTML = '';
  });
}
function marcados(id) {
  var out = [], box = $(id); if (!box) return out;
  var ins = box.getElementsByTagName('input');
  for (var i = 0; i < ins.length; i++) { if (ins[i].type === 'checkbox' && ins[i].checked) out.push(ins[i].value); }
  return out;
}
function enviarDoc(btn) {
  if ($('publico').value === 'personal') { enviarPersonal(btn); return; }
  var m = $('msgEnvio');
  var alcance = $('alcance').value;
  var grupo = (alcance === 'grupo') ? $('grupoDestino').value : '';
  if (alcance === 'grupo' && !grupo) { m.className = 'msg err'; m.textContent = 'Elige el grupo.'; return; }
  btn.disabled = true; m.className = 'msg work'; m.textContent = 'Contando destinatarios…';
  api('contarPadres', { alcance: alcance, nivel: ULTIMO.nivel, idgrupo: grupo }).then(function (n) {
    btn.disabled = false;
    if (!n) { m.className = 'msg err'; m.textContent = 'No hay correos para ese alcance en ORBI.'; return; }
    if (!confirm('Se enviará el documento a ' + n + ' papá(s). ¿Confirmas el envío?')) { m.className = 'msg'; m.textContent = ''; return; }
    btn.disabled = true; m.className = 'msg work'; m.textContent = 'Enviando en tandas… no cierres la ventana.';
    api('enviarPadres', { folio: ULTIMO.folio, alcance: alcance, nivel: ULTIMO.nivel, idgrupo: grupo }).then(function (r) {
      btn.disabled = false; m.className = 'msg ok';
      m.textContent = 'Enviados: ' + r.enviados + ' de ' + r.total + '.' + (r.pendientes ? (' Quedan ' + r.pendientes + ' para mañana por el límite diario (se reanudan solos si instalaste la reanudación).') : ' ¡Listo!');
    }).catch(function (e) { btn.disabled = false; m.className = 'msg err'; m.textContent = e.message; });
  }).catch(function (e) { btn.disabled = false; m.className = 'msg err'; m.textContent = e.message; });
}
function enviarPersonal(btn) {
  var m = $('msgEnvio');
  var niveles = marcados('nivPersonal'), puestos = marcados('puestoPersonal');
  btn.disabled = true; m.className = 'msg work'; m.textContent = 'Contando destinatarios…';
  api('contarPersonal', { niveles: niveles, puestos: puestos }).then(function (n) {
    btn.disabled = false;
    if (!n) { m.className = 'msg err'; m.textContent = 'No hay correos de personal para ese filtro en ORBI.'; return; }
    var quien = (niveles.length || puestos.length) ? '' : 'todo el ';
    if (!confirm('Se enviará el documento a ' + n + ' persona(s) del ' + quien + 'personal. ¿Confirmas el envío?')) { m.className = 'msg'; m.textContent = ''; return; }
    btn.disabled = true; m.className = 'msg work'; m.textContent = 'Enviando en tandas… no cierres la ventana.';
    api('enviarPersonal', { folio: ULTIMO.folio, niveles: niveles, puestos: puestos }).then(function (r) {
      btn.disabled = false; m.className = 'msg ok';
      m.textContent = 'Enviados: ' + r.enviados + ' de ' + r.total + '.' + (r.pendientes ? (' Quedan ' + r.pendientes + ' para mañana por el límite diario.') : ' ¡Listo!');
    }).catch(function (e) { btn.disabled = false; m.className = 'msg err'; m.textContent = e.message; });
  }).catch(function (e) { btn.disabled = false; m.className = 'msg err'; m.textContent = e.message; });
}
function enviarCorreo(btn) {
  if (!ULTIMO) return;
  var m = $('msg2');
  var correos = prompt('Correos destino (separa con comas). Se envían con copia oculta (BCC).', '');
  if (correos === null) return;
  if (!String(correos).trim()) { m.className = 'msg err'; m.textContent = 'No escribiste correos.'; return; }
  btn.disabled = true; m.className = 'msg work'; m.textContent = 'Enviando…';
  api('enviarCorreo', { folio: ULTIMO.folio, correos: correos }).then(function (r) {
    btn.disabled = false; m.className = 'msg ok'; m.textContent = 'Enviado a ' + r.enviados + ' destinatario(s).';
  }).catch(function (e) { btn.disabled = false; m.className = 'msg err'; m.textContent = e.message; });
}
function otro() {
  vista('captura');
  var b = $('btnGen'); b.disabled = false; b.textContent = 'Generar documento';
  $('msg').className = 'msg';
  ['puntos', 'borrador', 'instr', 'titulo', 'subtipo', 'destinatario', 'tabla', 'tablaTit'].forEach(function (id) { $(id).value = ''; });
}

/* ------------------------------- Arranque + PWA ------------------------------- */
$('tokenInput') && $('tokenInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') entrar(); });
bootstrap();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}
