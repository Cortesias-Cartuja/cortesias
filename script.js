// Asegúrate de que este archivo se llame script.js
function showTab(tab) {
    const isSalida = tab === 'salida';
    // Botones
    document.getElementById('btn-sal').classList.toggle('active', isSalida);
    document.getElementById('btn-ent').classList.toggle('active', !isSalida);
    // Selectores de coche
    document.getElementById('p-veh-select').style.display = isSalida ? 'block' : 'none';
    document.getElementById('d-veh-select').style.display = isSalida ? 'none' : 'block';
    // Botones de acción
    document.getElementById('btn-finalizar-salida').style.display = isSalida ? 'block' : 'none';
    document.getElementById('btn-finalizar-entrada').style.display = isSalida ? 'none' : 'block';
    
    if(!isSalida) {
        document.getElementById('d-f-entrada').value = new Date().toLocaleString();
        cargarCochesPrestados();
    }
}

function cargarCochesPrestados() {
    db.ref('coches').once('value', snap => {
        const sel = document.getElementById('d-veh-select');
        sel.innerHTML = '<option value="">¿Qué coche vuelve?</option>';
        snap.forEach(c => {
            if(c.val().estado === 'Prestado') {
                sel.innerHTML += `<option value="${c.key}">${c.val().matricula}</option>`;
            }
        });
    });
}

function verEstadoSalida() {
    const idCoche = document.getElementById('d-veh-select').value;
    if(!idCoche) return;
    
    // Buscar el contrato activo para ese coche
    db.ref('contratos').orderByChild('matricula').once('value', snap => {
        snap.forEach(child => {
            const d = child.val();
            // Si es el coche y no tiene fecha de entrada, es el contrato actual
            if(d.matricula && !d.fechaEntrada) { 
                document.getElementById('p-nom').value = d.nombre || "";
                document.getElementById('p-dni').value = d.dni || "";
                document.getElementById('p-mod').value = d.modelo || "";
                document.getElementById('p-kms').value = d.kms || "";
                // Guardamos el ID del contrato en un atributo temporal
                document.getElementById('btn-finalizar-entrada').dataset.contratoId = child.key;
            }
        });
    });
}

function finalizarEntrada() {
    const idCoche = document.getElementById('d-veh-select').value;
    const idContrato = document.getElementById('btn-finalizar-entrada').dataset.contratoId;
    const kmsE = Number(document.getElementById('d-kms').value);

    if(!kmsE) return alert("Introduce los KMs de entrada");

    const updates = {
        fechaEntrada: document.getElementById('d-f-entrada').value,
        kmsEntrada: kmsE,
        observacionesEntrada: document.getElementById('d-danos').value
    };

    db.ref('contratos/' + idContrato).update(updates).then(() => {
        db.ref('coches/' + idCoche).update({ estado: 'Disponible', kms: kmsE });
        alert("Entrada registrada con éxito");
        location.reload();
    });
}

// ... Mantén tus funciones de finalizarSalida, autoRellenarCoche y cargarAsesores ...
