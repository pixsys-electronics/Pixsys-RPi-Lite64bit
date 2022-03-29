var m_chart;
const AUTOREFRESH_DELAY = 100;
var m_autoRefreshTimer = null;
var m_wasAutoRefreshEnabled = null;

const PROGRESS_OFFSET = 13;

const CHART_FEEDBACK_DATA_SYM_NAME = "tracePIDFeedback";
const CHART_SETPOINT_DATA_SYM_NAME = "tracePIDSetpoint";
const PID_TEST_IPA = 1012;
const INP_AUTOMATIC_SYM_NAME = "inpAutomatic";

// classe per punto grafico
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

// valori dei simboli e delle variabili che vengono ciclicamente letti
var m_PIDParStatusValues = [
    {symName: "pidOutOverflow", value: null, isSymbol: true},
    {symName: "pidOutOK", value: null, isSymbol: true},
    {symName: "pidThreshold", ipa: 1008, value: null, isSymbol: false},
    {symName: "pidKI", ipa: 1002, value: null, isSymbol: false},
    {symName: "pidKP", ipa: 1000, value: null, isSymbol: false},
    {symName: "pidOutputVal", value: null, isSymbol: true},
    {symName: "pidFeedback", ipa: 1013, value: null, isSymbol: false},
    {symName: "pidSetpoint", ipa: 1010, value: null, isSymbol: false}
];

// evento scatenato al caricamento della pagina
document.addEventListener('DOMContentLoaded', function()
{
    initPage();
    initGraph();
}, false);

function initPage() {
	// toggle switch per abilitare/disabilitare la lettura del PID
    let enablePIDChk = getElement("pidChk");
	enablePIDChk.checked = false;
    enablePIDChk.addEventListener('change', function() {
        this.checked ? AutoRefreshStart(AUTOREFRESH_DELAY) : AutoRefreshStop();
    });

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
                AutoRefreshStart(AUTOREFRESH_DELAY);
            }
        });
    }
}

function initGraph() {
    let ctx = getElement('myChart').getContext('2d');


    // opzioni tooltip
    var tooltips = {
        custom: function (tooltip) {
            if (!tooltip) return;
            // disable displaying the color box;
            tooltip.displayColors = false;
        },
        callbacks: {
            // use label callback to return the desired label
            label: function (tooltipItem, data) {
                return tooltipItem.xLabel + ": " + tooltipItem.yLabel;
            },
            // remove title
            title: function (tooltipItem, data) {
                return;
            }
        }
    }

    // configurazione grafico
    var chartConfig = {
        type: 'line',
        options: {
            scales: {
                xAxes: [{
                    type: 'linear',
                    display: true,
                    ticks: {
                        suggestedMin: 0,
                        suggestedMax: 150,
                        max: 150
                    }
                }],
                yAxes: [{
                    type: 'linear',
                    display: true
                }]
            },
            tooltips: tooltips,
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    fontSize: 15,
                    fontFamily: "Arial, Helvetica, sans-serif"
				},
            }
        }
    }

    m_chart = new Chart(ctx, chartConfig);
}


const GRAPH_TYPE = {
    FEEDBACK: 1,
    SETPOINT: 2
}
function drawGraph(data, type) {
    var newDataset = {};
    newDataset.data = [];

    if (type == GRAPH_TYPE.SETPOINT) {
        newDataset.backgroundColor = "rgba(101, 215, 0, 0.2)";
        newDataset.label = "PID setpoint";
    }
    else if (type == GRAPH_TYPE.FEEDBACK) {
        newDataset.backgroundColor = "rgba(35, 138, 197, 0.3)";
        newDataset.label = "PID feedback";
    }

    for (let i = 0; i < data.length; i++)
    {
        const element = data[i];
        newDataset.data.push(new Point(i, element))
    }

    m_chart.data.datasets.push(newDataset);
    m_chart.update();
}

function readChartData() {
    const WAIT_RESPONSE_READY_TIMEOUT = 150;

	// scrivo questi valori per triggerare la generazione del grafico
    writeSymbol(INP_AUTOMATIC_SYM_NAME, false);
    writeParameter(PID_TEST_IPA, true)

    setTimeout(readAndDrawGraph, WAIT_RESPONSE_READY_TIMEOUT);

    function readAndDrawGraph() {
        // svuota i grafici precedenti
        if (m_chart.data.datasets)
            m_chart.data.datasets.splice(0);

        const ASYNC = true;

        let symbolsToRead = [CHART_FEEDBACK_DATA_SYM_NAME];
        LLWebServer.GetSymValues(symbolsToRead, ASYNC, data => {
            drawGraph(data, GRAPH_TYPE.FEEDBACK);
        });

        symbolsToRead = [CHART_SETPOINT_DATA_SYM_NAME];
        chartSetpointData = LLWebServer.GetSymValues(symbolsToRead, ASYNC, data => {
            drawGraph(data, GRAPH_TYPE.SETPOINT);
        });
    }

    // scrivo questo valore per far ripartire il PID aspettando 100 millisecondi per sicurezza
    setTimeout(writeSymbol, 100, INP_AUTOMATIC_SYM_NAME, true);
}

function readParsAndStatus() {
    const ASYNC = true;

    let symbolsToRead = [];
    let parsToRead = [];

    m_PIDParStatusValues.forEach(element => {
        if (element.isSymbol)
            symbolsToRead.push(element.symName);
        else
            parsToRead.push(element.ipa);
    });

    LLWebServer.GetSymValues(symbolsToRead, ASYNC, data => {
        for (let i = 0; i < data.length; i++) {
            const readValue = data[i];
            const readSymbol = symbolsToRead[i];

            let currItem = m_PIDParStatusValues.find(obj => {
                if (obj.symName == readSymbol)
                    return obj;
            });

            currItem.value = readValue;

            updateValue(readSymbol, readValue);
        }
    });

    LLWebServer.GetParValues(parsToRead, ASYNC, data => {
        for (let i = 0; i < data.length; i++) {
            const readValue = data[i];
            const ipa = parsToRead[i];

            let currItem = m_PIDParStatusValues.find(obj => {
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
    // necessario il querySelectorAll per aggiornare assieme input e progress con lo stesso simbolo associato
    let items = document.querySelectorAll("[data-symbol-name='" + symName + "']");
    for (let item of items) {
        if (item.classList.contains("led")) {
            if (LLWebServer.ParseBoolean(value)) {
                item.classList.add("green");
                item.classList.remove("red");
            }
            else {
                item.classList.add("red");
                item.classList.remove("green");
            }
        }
        else {
            if (value) {
                // la progress non accetta come parametro un float
                if(item.tagName.toLowerCase() != "progress")
                    item.value = fixNumber(value, 3);
                else {
                    let sumVal = parseFloat(value) + PROGRESS_OFFSET;
                    item.value = sumVal;
                }
            }
        }
    }
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

        let currItem = m_PIDParStatusValues.find(obj => {
            if (obj.symName == symName)
                return obj;
        });

        let value = currItem.value;
        if (item.classList.contains("led")) {
            if (LLWebServer.ParseBoolean(value)) {
                item.classList.add("green");
                item.classList.remove("red");
            }
            else {
                item.classList.add("red");
                item.classList.remove("green");
            }
        }
        else {
            if (value) {
                // la progress non accetta come parametro un float
                if(item.tagName.toLowerCase() != "progress")
                    item.value = fixNumber(value, 3);
                else {
                    let sumVal = parseFloat(value) + PROGRESS_OFFSET;
                    item.value = sumVal;
                }
            }
        }
    }
}
*/

/**
 * Scrive un singolo parametro
 * @param {*} ipa 
 * @param {*} valueawriteParameter
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

/**
 * Scrive un singolo simbolo
 * @param {*} name 
 * @param {*} value 
 */
function writeSymbol(name, value) {
    let symObj = {};
    symObj[name] = value;
    writeSymbols(symObj);
}

/**
 * Scrive una mappa di simboli [nome, valore]
 * @param {object} dataToWrite 
 */
function writeSymbols(dataToWrite) {
    const ASYNC = false;
    let res = LLWebServer.SetSymValues(dataToWrite, ASYNC);
    if (!res)
        alert("Error writing symbols");
}

function AutoRefreshStart(periodMs)
{
    if (m_autoRefreshTimer === null)
        m_autoRefreshTimer = UpdateData(periodMs);
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