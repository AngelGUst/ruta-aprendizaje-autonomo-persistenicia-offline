function actualizarIndicadorRed() {
  const badge = document.getElementById('badge-red');
  if (!badge) return;
  if (navigator.onLine) {
    badge.textContent = 'En Línea';
    badge.className = 'badge online';
  } else {
    badge.textContent = 'Sin Conexión';
    badge.className = 'badge offline';
  }
}

function procesarEnvioReporte(datosFormulario) {
  const endpoint = 'https://jsonplaceholder.typicode.com/posts';

  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datosFormulario)
  })
    .then(function (respuesta) {
      if (!respuesta.ok) throw new Error('Error HTTP del servidor');
      return respuesta.json();
    })
    .then(function () {
      // Envío en vivo OK → bitácora local 'sincronizado'
      return guardarRegistro({
        titulo: datosFormulario.titulo,
        descripcion: datosFormulario.descripcion,
        estado: 'sincronizado',
        fechaCreacion: Date.now()
      });
    })
    .catch(function () {
      // Falla de red → encolar como 'pendiente'
      console.warn('[Outbox] Sin conexión. Encolando transacción localmente...');
      return guardarRegistro({
        titulo: datosFormulario.titulo,
        descripcion: datosFormulario.descripcion,
        estado: 'pendiente',
        fechaCreacion: Date.now()
      });
    })
    .then(function () {
      return renderizarColaOutbox();
    });
}

function sincronizarPendientes() {
  console.log('[Outbox] Conexión detectada. Buscando registros pendientes...');

  return obtenerTodosLosRegistros()
    .then(function (registros) {
      const pendientes = registros.filter(function (item) {
        return item.estado === 'pendiente';
      });

      if (pendientes.length === 0) {
        console.log('[Outbox] No hay transacciones pendientes por sincronizar.');
        return;
      }

      // Convertir cada pendiente en una promesa de envío + actualización
      const promesasDeEnvio = pendientes.map(function (item) {
        return fetch('https://jsonplaceholder.typicode.com/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: item.titulo, body: item.descripcion })
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Falla al reintentar envío');
            return actualizarEstadoRegistro(item.id, 'sincronizado');
          });
      });

      return Promise.all(promesasDeEnvio);
    })
    .then(function () {
      return renderizarColaOutbox();
    })
    .catch(function (error) {
      console.error('[Outbox] Error durante la sincronización masiva:', error);
    });
}

function renderizarColaOutbox() {
  return obtenerTodosLosRegistros()
    .then(function (registros) {
      const lista = document.getElementById('lista-outbox');
      if (!lista) return;
      lista.innerHTML = '';

      if (registros.length === 0) {
        const vacio = document.createElement('li');
        vacio.className = 'vacio';
        vacio.textContent = 'No hay transacciones en la bandeja.';
        lista.appendChild(vacio);
        return;
      }

      registros.forEach(function (item) {
        const li = document.createElement('li');
        li.className = item.estado;

        const titulo = document.createElement('strong');
        titulo.textContent = item.titulo || '(Sin título)';

        const estado = document.createElement('span');
        estado.className = 'estado ' + item.estado;
        estado.textContent = item.estado;

        const hora = document.createElement('small');
        const fecha = item.fechaCreacion ? new Date(item.fechaCreacion) : new Date();
        hora.textContent = fecha.toLocaleString();

        li.appendChild(titulo);
        li.appendChild(estado);
        li.appendChild(hora);
        lista.appendChild(li);
      });
    })
    .catch(function (err) {
      console.error('[Outbox] Error al renderizar cola:', err);
    });
}

function conectarFormulario() {
  const form = document.getElementById('form-incidencia');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const titulo = document.getElementById('titulo').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    if (!titulo || !descripcion) return;

    procesarEnvioReporte({ titulo: titulo, descripcion: descripcion })
      .then(function () { form.reset(); })
      .catch(function (err) { console.error('[Outbox] Error al procesar envío:', err); });
  });
}

function conectarBotonPurgar() {
  const btn = document.getElementById('btn-purgar');
  if (!btn) return;

  btn.addEventListener('click', function () {
    obtenerTodosLosRegistros()
      .then(function (registros) {
        const sincronizados = registros.filter(function (item) {
          return item.estado === 'sincronizado';
        });
        if (sincronizados.length === 0) {
          console.log('[Outbox] No hay registros sincronizados para purgar.');
          return;
        }
        const promesasDeBorrado = sincronizados.map(function (item) {
          return eliminarRegistro(item.id);
        });
        return Promise.all(promesasDeBorrado);
      })
      .then(function () { return renderizarColaOutbox(); })
      .catch(function (err) { console.error('[Outbox] Error al purgar:', err); });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  actualizarIndicadorRed();
  conectarFormulario();
  conectarBotonPurgar();
  renderizarColaOutbox();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(function (reg) { console.log('[SW] Registrado. Scope:', reg.scope); })
      .catch(function (err) { console.error('[SW] Error:', err); });
  }
});

window.addEventListener('online', function () {
  actualizarIndicadorRed();
  sincronizarPendientes();
});

window.addEventListener('offline', function () {
  actualizarIndicadorRed();
});