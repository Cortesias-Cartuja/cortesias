const firebaseConfig = {
  apiKey: "AIzaSyAeejUNvRX3KvmHMgKUff5vTS44-_UGCSg",
  authDomain: "cortesias-4235e.firebaseapp.com",
  databaseURL: "https://cortesias-4235e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cortesias-4235e",
  storageBucket: "cortesias-4235e.firebasestorage.app",
  messagingSenderId: "45340224860",
  appId: "1:45340224860:web:69c15fc56fc5a04ab76599"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let listaCochesGlobal = {};

// Sincronizar coches
db.ref('coches').on('value', (snap) => {
    const coches = snap.val();
    listaCochesGlobal = coches;
    const sSal = document.getElementById('p-veh-select');
    const sEnt = document.getElementById('d-veh-select');
    
    sSal.innerHTML = '<option value="">Seleccionar vehículo...</option>';
    sEnt.innerHTML = '<option value="">Seleccionar vehículo...</option>';
    
    for (let id in coches) {
        let c = coches[id];
        let opt = `<option value="${id}">${c.matricula} - ${c.modelo}</option>`;
        if (c.estado === 'Disponible') sSal.innerHTML += opt;
        if (c.estado === 'Prestado') sEnt.innerHTML += opt;
    }
});

function showTab(tabId) {
    document.getElementById('btn-container-salida').style.display = tabId === 'tab-salida' ? 'block' : 'none';
    document.getElementById('tab-entrada-actions').style.display = tabId === 'tab-entrada' ? 'block' : 'none';
    document.getElementById('btn-sal').className = tabId === 'tab-salida' ? 'btn-tab active' : 'btn-tab';
    document.getElementById('btn-ent').className = tabId === 'tab-entrada' ? 'btn-tab active' : 'btn-tab';
}

function autoRellenarCoche() {
    const id = document.getElementById('p-veh-select').value;
    if (id) {
        const c = listaCochesGlobal[id];
        document.getElementById('p-mod').value = c.modelo;
        document.getElementById('p-kms').value = c.kms;
        document.getElementById('p-comb').value = c.combustible || "";
        document.getElementById('p-mat-print').value = c.matricula;
        document.getElementById('p-f-salida').value = new Date().toLocaleDateString();
    }
}

// BUSCAR VEHÍCULO PRESTADO
async function verEstadoSalida() {
    const idCoche = document.getElementById('d-veh-select').value;
    if (!idCoche) return;

    const matricula = listaCochesGlobal[idCoche].matricula;
    
    // Buscar contrato activo para esa matrícula
    const snap = await db.ref('contratos')
        .orderByChild('matricula')
        .equalTo(matricula)
        .limitToLast(1)
        .once('value');

    if (snap.exists()) {
        const d = Object.values(snap.val())[0];
        // Rellenar datos históricos en la columna izquierda
        document.getElementById('p-nom').value = d.nombre || "";
        document.getElementById('p-dni').value = d.dni || "";
        document.getElementById('p-tel').value = d.tel || "";
        document.getElementById('p-cp').value = d.cp || "";
        document.getElementById('p-mat-print').value = d.matricula;
        document.getElementById('p-mod').value = d.modelo;
        document.getElementById('p-kms').value = d.kms;
        document.getElementById('p-comb').value = d.combustible || "";
        document.getElementById('p-f-salida').value = d.fechaSalida.split(',')[0];
        
        // Preparar fecha de hoy para la recogida
        document.getElementById('d-f-entrada').value = new Date().toLocaleDateString();
    }
}

async function finalizarSalida() {
    const idCoche = document.getElementById('p-veh-select').value;
    if (!idCoche) return alert("Selecciona un coche");

    const contrato = {
        matricula: listaCochesGlobal[idCoche].matricula,
        modelo: document.getElementById('p-mod').value,
        nombre: document.getElementById('p-nom').value,
        dni: document.getElementById('p-dni').value,
        tel: document.getElementById('p-tel').value,
        cp: document.getElementById('p-cp').value,
        kms: document.getElementById('p-kms').value,
        combustible: document.getElementById('p-comb').value,
        fechaSalida: new Date().toLocaleString(),
        estado: "Activo"
    };

    await db.ref('contratos').push(contrato);
    await db.ref('coches/' + idCoche).update({ estado: 'Prestado' });
    
    window.print();
    location.reload();
}

async function finalizarEntrada() {
    const idCoche = document.getElementById('d-veh-select').value;
    if (!idCoche) return alert("Selecciona vehículo");

    const matricula = listaCochesGlobal[idCoche].matricula;
    const snap = await db.ref('contratos').orderByChild('matricula').equalTo(matricula).limitToLast(1).once('value');

    if (snap.exists()) {
        const key = Object.keys(snap.val())[0];
        await db.ref('contratos/' + key).update({ estado: "Cerrado", fechaEntrada: new Date().toLocaleString() });
        await db.ref('coches/' + idCoche).update({ 
            estado: 'Disponible', 
            kms: document.getElementById('d-kms').value,
            combustible: document.getElementById('d-comb').value 
        });
        
        window.print();
        location.reload();
    }
}
