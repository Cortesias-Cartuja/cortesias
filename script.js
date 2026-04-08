// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAeejUNvRX3KvmHMgKUff5vTS44-_UGCSg",
  authDomain: "cortesias-4235e.firebaseapp.com",
  databaseURL: "https://cortesias-4235e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cortesias-4235e",
  storageBucket: "cortesias-4235e.firebasestorage.app",
  messagingSenderId: "45340224860",
  appId: "1:45340224860:web:69c15fc56fc5a04ab76599"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let todosLosCoches = {};

// Carga inicial
window.onload = () => {
    escucharCoches();
};

// Escucha cambios en tiempo real en la base de datos
function escucharCoches() {
    db.ref('coches').on('value', (snapshot) => {
        todosLosCoches = snapshot.val() || {};
        actualizarSelects();
    });
}

function actualizarSelects() {
    let htmlSalida = '<option value="">-- Seleccionar Disponible --</option>';
    let htmlEntrada = '<option value="">-- Seleccionar Prestado --</option>';
    
    Object.keys(todosLosCoches).forEach(id => {
        const c = todosLosCoches[id];
        if (c.estado === "Disponible") {
            htmlSalida += `<option value="${id}">${c.matricula}</option>`;
        } else {
            htmlEntrada += `<option value="${id}">${c.matricula} (En uso)</option>`;
        }
    });
    
    document.getElementById('p-veh-select').innerHTML = htmlSalida;
    document.getElementById('d-veh-select').innerHTML = htmlEntrada;
}

function showTab(id) {
    document.getElementById('tab-salida').style.display = id === 'tab-salida' ? 'block' : 'none';
    document.getElementById('tab-entrada').style.display = id === 'tab-entrada' ? 'block' : 'none';
    document.getElementById('btn-sal').classList.toggle('active', id === 'tab-salida');
    document.getElementById('btn-ent').classList.toggle('active', id === 'tab-entrada');
}

function autoRellenarCoche() {
    const id = document.getElementById('p-veh-select').value;
    if (!id) return;
    const coche = todosLosCoches[id];
    document.getElementById('p-mod').value = coche.modelo;
    document.getElementById('p-kms').value = coche.kms;
    document.getElementById('p-comb').value = coche.combustible;
}

async function finalizarSalida() {
    const id = document.getElementById('p-veh-select').value;
    if (!id) return alert("Selecciona un vehículo.");

    const btn = document.getElementById('btn-salida');
    btn.disabled = true;
    btn.innerText = "Guardando...";

    const d = {
        matricula: todosLosCoches[id].matricula,
        modelo: document.getElementById('p-mod').value,
        kms: document.getElementById('p-kms').value,
        combustible: document.getElementById('p-comb').value,
        matCliente: document.getElementById('p-mat-c').value,
        or: document.getElementById('p-or').value,
        motivo: document.getElementById('p-motivo').value,
        tarifa: document.getElementById('p-tarifa').value,
        nombre: document.getElementById('p-nom').value,
        dni: document.getElementById('p-dni').value,
        tel: document.getElementById('p-tel').value,
        cp: document.getElementById('p-cp').value,
        fNac: document.getElementById('p-fnac').value,
        fCarnet: document.getElementById('p-fcarnet').value,
        fCaducidad: document.getElementById('p-fcad').value,
        fAprox: document.getElementById('p-faprox').value,
        obs: document.getElementById('p-obs').value,
        fechaSalida: new Date().toLocaleString()
    };

    try {
        // 1. Guardar el contrato en un historial
        await db.ref('contratos').push(d);
        // 2. Cambiar estado del coche
        await db.ref('coches/' + id).update({ 
            estado: "Prestado",
            kms: d.kms,
            combustible: d.combustible
        });

        alert("¡Registro guardado!");
        // Aquí podrías llamar a una función de impresión si quieres generar el PDF
        window.print(); 
        location.reload();
    } catch (e) {
        alert("Error: " + e.message);
        btn.disabled = false;
    }
}

async function finalizarEntrada() {
    const id = document.getElementById('d-veh-select').value;
    if (!id) return alert("Selecciona coche");

    const kmsEnt = document.getElementById('d-kms').value;
    if (!kmsEnt) return alert("Introduce los KMS de entrada");

    await db.ref('coches/' + id).update({
        estado: "Disponible",
        kms: kmsEnt,
        combustible: document.getElementById('d-comb').value
    });

    alert("Vehículo liberado correctamente.");
    location.reload();
}
