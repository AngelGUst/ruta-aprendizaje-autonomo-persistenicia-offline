function renderizarLista(registros) {
  const contenedor = document.getElementById('lista-registros');
  if (!contenedor) return;

  if (!registros || registros.length === 0) {
    contenedor.innerHTML = '<p>No hay registros en IndexedDB.</p>';
    return;
  }

  const filas = registros.map(function (registro) {
    return (
      '<tr>' +
        '<td>' + registro.id + '</td>' +
        '<td>' + registro.cliente + '</td>' +
        '<td>' + registro.monto + '</td>' +
        '<td>' + new Date(registro.fecha).toLocaleString() + '</td>' +
      '</tr>'
    );
  }).join('');

  contenedor.innerHTML =
    '<table border="1" cellpadding="6">' +
      '<thead>' +
        '<tr>' +
          '<th>ID</th>' +
          '<th>Cliente</th>' +
          '<th>Monto</th>' +
          '<th>Fecha</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' + filas + '</tbody>' +
    '</table>';
}

function mostrarError(error) {
  console.error('Error en IndexedDB:', error);
  alert('Ocurrió un error. Revisa la consola y DevTools > Application > IndexedDB.');
}

document.addEventListener('DOMContentLoaded', function () {
  const btnGuardar = document.getElementById('btn-guardar');
  const btnLeer = document.getElementById('btn-leer');
  const btnBorrarUltimo = document.getElementById('btn-borrar');
  const btnVaciar = document.getElementById('btn-vaciar');

  if (btnGuardar) {
    btnGuardar.addEventListener('click', function () {
      const nuevoRegistro = {
        cliente: 'Cliente de prueba ' + Date.now(),
        monto: Math.floor(Math.random() * 1000) + 1,
        fecha: Date.now(),
        estado: 'pendiente'
      };

      guardarRegistro(nuevoRegistro)
        .then(function (idGenerado) {
          console.log('Registro guardado con ID:', idGenerado);
          return obtenerTodosLosRegistros();
        })
        .then(function (lista) {
          console.table(lista);
          renderizarLista(lista);
        })
        .catch(mostrarError);
    });
  }

  // -------------------------------------------------------
  // Leer todos los registros
  // -------------------------------------------------------
  if (btnLeer) {
    btnLeer.addEventListener('click', function () {
      obtenerTodosLosRegistros()
        .then(function (lista) {
          console.table(lista);
          renderizarLista(lista);
        })
        .catch(mostrarError);
    });
  }

  if (btnBorrarUltimo) {
    btnBorrarUltimo.addEventListener('click', function () {
      obtenerTodosLosRegistros()
        .then(function (lista) {
          if (!lista || lista.length === 0) {
            alert('No hay registros para borrar.');
            return null;
          }

          const ultimo = lista[lista.length - 1];
          return eliminarRegistro(ultimo.id).then(function () {
            console.log('Registro eliminado con ID:', ultimo.id);
            return obtenerTodosLosRegistros();
          });
        })
        .then(function (listaActualizada) {
          if (listaActualizada) {
            console.table(listaActualizada);
            renderizarLista(listaActualizada);
          }
        })
        .catch(mostrarError);
    });
  }

  if (btnVaciar) {
    btnVaciar.addEventListener('click', function () {
      obtenerTodosLosRegistros()
        .then(function (lista) {
          if (!lista || lista.length === 0) {
            alert('La cola ya está vacía.');
            return null;
          }

          const promesasDeBorrado = lista.map(function (registro) {
            return eliminarRegistro(registro.id);
          });

          return Promise.all(promesasDeBorrado);
        })
        .then(function (resultado) {
          if (resultado) {
            console.log('Registros eliminados:', resultado.length);
            return obtenerTodosLosRegistros();
          }
          return null;
        })
        .then(function (listaActualizada) {
          if (listaActualizada) {
            console.table(listaActualizada);
            renderizarLista(listaActualizada);
          }
        })
        .catch(mostrarError);
    });
  }

  obtenerTodosLosRegistros()
    .then(renderizarLista)
    .catch(mostrarError);
});