var m_elevator;
var m_elevatorContainer;
var m_elevatorHeight;
var m_elevatorContainerHeight;
// corsa dell'ascensore
var m_elevatorStroke;
// il delta dei valori del PLC va da 0 a 1000
const ELEVATOR_TOTAL_DISTANCE = 1000;
// offset per fare in modo che rimanga nel container quando scrolla
const ELEVATOR_OFFSET = 32;

const AUTOREFRESH_DELAY = 100;
var m_autoRefreshTimer = null;
var m_wasAutoRefreshEnabled = null;

// serve per settare il colore del bottone mentre l'ascensore si muove
var m_LastPressedButton;
var m_elevatorIsMoving = false;
var m_elevatorWasMoving = false;

const ELEV_ACTUAL_POS_SYM_NAME = "elevActualPosition";
const ELEV_TARGET_POS_IPA = 2007;
const ELEV_IS_STANDING_SYM_NAME = "elevStanding";

// valori dei simboli che vengono ciclicamente letti
var m_ElevatorParStatusValues = [
    {symName: ELEV_ACTUAL_POS_SYM_NAME, value: ELEVATOR_TOTAL_DISTANCE, isSymbol: true},
    {symName: ELEV_IS_STANDING_SYM_NAME, value: null, isSymbol: true},
    {symName: "elevActualSpeed", ipa: 2004, value: null, isSymbol: false},
    {symName: "elevAcceleration", ipa: 2000, value: null, isSymbol: false},
    {symName: "elevDeceleration", ipa: 2002, value: null, isSymbol: false}
];

document.addEventListener('DOMContentLoaded', function() {
    initPage();
}, false);

function initPage() {
	// toggle switch per abilitare/disabilitare la lettura dell'ascensore
    let enableElevatorChk = getElement("elevatorChk");
	enableElevatorChk.checked = false;
    enableElevatorChk.addEventListener('change', function() {
        // quando faccio partire l'autorefresh sposto anche l'ascensore in cima
        this.checked ? AutoRefreshStart(AUTOREFRESH_DELAY, true) : AutoRefreshStop();
    });

    m_elevatorContainer = getElement("elevatorContainer");
    m_elevator = getElement("elevator");

    let floorButtons = document.querySelectorAll('[data-hmi-position]');
    for (let button of floorButtons) {
        button.addEventListener("click", () => {
            let heightValue = button.dataset.hmiPosition;
            writeParameter(ELEV_TARGET_POS_IPA, heightValue);
            m_LastPressedButton = button;
        });
    }

    // gestione scrittura dei simboli
    let editItems = document.querySelectorAll('[data-editable]');
    for (let item of editItems) {
        // scrittura alla pressione dell'invio
        item.addEventListener("keyup", (event) => {
            if (event.keyCode === 13) {
                writeParameter(item.dataset.symbolName, item.value);
                item.blur();
            }
        });

        item.addEventListener("focus", () => {
            if (m_autoRefreshTimer !== null) {
                m_wasAutoRefreshEnabled = true;
                AutoRefreshStop();
            }
            else
                m_wasAutoRefreshEnabled = false;
        });

        item.addEventListener("blur", () => {
            if (m_wasAutoRefreshEnabled === true && m_autoRefreshTimer === null) {
                // quando cambio un valore non sposto l'ascensore in cima
                AutoRefreshStart(AUTOREFRESH_DELAY, false);
            }
        });
    }
}

function moveElevator(PLCHeight) {
    // faccio la differenza tra la distanza totale e il valore dell'altezza letto per ottenere la posizione reciproca dell'ascensore.
    // questo perche' valore = 0 deve corrispondere al massimo del margine del div, mentre = 1000 deve corrispondere a margine 0 (altrimenti sarebbe il contrario).
    // quindi se leggo 0 voglio l'ascensore a terra, se leggo 1000 lo voglio in cima.
    let elevatorPosition = ((ELEVATOR_TOTAL_DISTANCE - PLCHeight) * m_elevatorStroke) / ELEVATOR_TOTAL_DISTANCE;

    setElevatorPosition(elevatorPosition);
}

function activateButton() {
    if (m_LastPressedButton && m_elevatorIsMoving) {
        m_LastPressedButton.classList.add("animating");
        // flaggo lo stato "was" per capire quando l'ascensore e' partito (leggi commento sotto)
        m_elevatorWasMoving = true;
    }
    else {
        // se non controllassi il flag "was", resetterei il m_LastPressedButton subito dopo aver premuto il bottone ma l'ascensore e' ancora partito
        // (a causa del delay tra la pressione del bottone e quando leggo la status elevStanding che e' passata da true a false)
        if (m_elevatorWasMoving) {
            // devo resettare il bottone per non farlo illuminare quando l'ascensore viene triggerato da altre pagine concorrenti che scrivono l'elevTargetPosition
            m_LastPressedButton = null;
            m_elevatorWasMoving = false;
        }

        let btnsActive = document.getElementsByClassName("elevator-button animating");

        // deseleziona tutti i bottoni quando ne sono stati premuti piu' per volta (non tiene conto dei piani raggiunti)
        for (let btnAct of btnsActive)
            btnAct.classList.remove("animating");
    }
}

function setElevatorPosition(elevatorPosition) {
    m_elevator.style.marginTop = elevatorPosition + "px";
}

function setElevatorContainerHeight() {
    m_elevatorContainerHeight = m_elevatorContainer.offsetHeight;
    m_elevatorHeight = m_elevator.offsetHeight;
    m_elevatorStroke = m_elevatorContainerHeight - m_elevatorHeight - ELEVATOR_OFFSET;
}

/**
 * Scrive un singolo parametro
 * @param {*} ipa 
 * @param {*} value
 */
function writeParameter(ipa, value)
{
    let dataToWrite = {};
    dataToWrite[ipa] = value;

    writeParameters(dataToWrite);
}

/**
 * Scrive una mappa di parametri [ipa, valore]
 * @param {object} dataToWrite 
 */
function writeParameters(dataToWrite)
{
    if (!dataToWrite || Object.keys(dataToWrite).length == 0)
        return;

    const ASYNC = false;
    let res = LLWebServer.SetParValues(dataToWrite, ASYNC);
    if (!res)
        alert("Error writing parameters");
}

function readParsAndStatus() {
    const ASYNC = true;

    let symbolsToRead = [];
    let parsToRead = [];

    m_ElevatorParStatusValues.forEach(element => {
        if (element.isSymbol)
            symbolsToRead.push(element.symName);
        else
            parsToRead.push(element.ipa);
    });

    LLWebServer.GetSymValues(symbolsToRead, ASYNC, data => {
        for (let i = 0; i < data.length; i++) {
            const readValue = data[i];
            const readSymbol = symbolsToRead[i];

            let currItem = m_ElevatorParStatusValues.find(obj => {
                if (obj.symName == readSymbol)
                    return obj;
            });

            currItem.value = readValue;

            updateValue(readSymbol, readValue)
        }
    });

    LLWebServer.GetParValues(parsToRead, ASYNC, data => {
        for (let i = 0; i < data.length; i++) {
            const readValue = data[i];
            const ipa = parsToRead[i];

            let currItem = m_ElevatorParStatusValues.find(obj => {
                if (obj.ipa == ipa)
                    return obj;
            });

            currItem.value = readValue;

            updateValue(ipa, readValue);
        }
    });

    // updateValues();
}

/**
 * Aggiorna il valore nella pagina attraverso il data-attribute associato al controllo HTML
 * @param {*} symName 
 * @param {*} value 
 */
function updateValue(symName, value) {
    let item = document.querySelector("[data-symbol-name='" + symName + "']");

    // lo eseguo prima di verificare che esista l'item perche' questo symName non ha rappresentazione nell'HTML
    if (symName == ELEV_IS_STANDING_SYM_NAME)
        m_elevatorIsMoving = !LLWebServer.ParseBoolean(value);

    if (!item)
        return;

    if (symName == ELEV_ACTUAL_POS_SYM_NAME) {
        moveElevator(value);
        item.value = value;
        activateButton();
    }
    else
        item.value = fixNumber(value, 3);
}

/**
 * Aggiorna i valori della pagina attraverso il data-attribute associato ai controlli HTML
 * 
 * Inutilizzata perche', per questioni di ottimizzazione estrema, aggiornando un valore per volta subito dopo la lettura (con la funz. updateValue),
 * risparmio un for che cicla su tutti i data-attribute + la ricerca del valore del simbolo/variabile associato al data-attribute nell'array
 */
/*
function updateValues() {

    let dataItem = document.querySelectorAll('[data-symbol-name]');
    for (let item of dataItem) {
        let symName = item.dataset.symbolName;
        let value = m_ElevatorParStatusValues.find(obj => {
            if (obj.symName == symName)
                return obj.value;
        });

        if (symName == ELEV_IS_STANDING_SYM_NAME)
            m_elevatorIsMoving = !LLWebServer.ParseBoolean(value);

        if (!item)
            return;

        if (symName != ELEV_ACTUAL_POS_SYM_NAME)
            item.value = fixNumber(value, 3);
        else {
            moveElevator(value);
            item.value = value;
        }
    }
}
*/

/**
 * 
 * @param {*} periodMs 
 * @param {*} moveUpElevator indica se spostare l'ascensore in cima
 */
function AutoRefreshStart(periodMs, moveUpElevator)
{
    if (m_autoRefreshTimer === null) {
        if (moveUpElevator) {
            setElevatorPosition(0);
        }

        setElevatorContainerHeight();
        m_autoRefreshTimer = UpdateData(periodMs);
    }
}

function AutoRefreshStop()
{
	if (m_autoRefreshTimer !== null)
	{
		clearInterval(m_autoRefreshTimer);
		m_autoRefreshTimer = null;
	}
}

function UpdateData(periodMs)
{
    return setInterval(readParsAndStatus, periodMs);
}