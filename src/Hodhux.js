//==================================================================================================
// Constants
//==================================================================================================
var temperature = 298.15;       //Temperature at 25°C (in K)
var rConst = 8.3144598;         //Universal gaz constant (in J.K-1.mol-1)
var fConst = 96485.33289;       //Faraday constant (in C.mol-1) (the charge of 1 mole of electrons)
var kCharge = 1;                //Charge of one K+ ion
var naCharge = 1;               //Charge of one Na+ ion

var capacitance = 1;            //Capacitance of the membrane (in µFarad/cm²)
var gNaMax = 120;               //Maximum conductance for Na+ ions (in mSiemens/cm²)
var gKMax = 36;                 //Maximum conductance for K+ ions (in mSiemens/cm²)
var gLeak = 0.3;                //Fixed conductance for the leak current (in mSiemens/cm²)
var vLeak = 10.613;             //Adjusted "leak voltage"

var dt = 0.001;                 //Smallest time interval (in ms)
var epsilon = 1e-9;             //Just a simple espilon to avoid divisions by 0
var maxNbOfPoints = 1920;       //Max number of points the chart will contain


//==================================================================================================
// Fields
//==================================================================================================
var icpExpLen;                  //Length of the current clamp experiment (in ms)
var vcpExpLen;                  //Length of the voltage clamp experiment (in ms)

var icpStimLen;                 //Length of the stimulation in the current clamp experiment (in ms)
var vcpStimLen;                 //Length of the stimulation in the voltage clamp experiment (in ms)
var icpCur;                     //Injected current during the current clamp experiment (in mA/cm²)
var vcpVlt;                     //Injected voltage during the voltage clamp experimens (in mV)

var naIn;                       //Concentration of Na+ ions inside the cell (in mM)
var naOut;                      //Concentration of Na+ ions outside the cell (in mM)
var kIn;                        //Concentration of K+ ions inside the cell (in mM)
var kOut;                       //Concentration of K+ ions inside the cell (in mM)
var eNa;                        //Equilibrium potential of Na+
var eK;                         //Equilibrium potential of K+

var showIcpENa, showIcpEK, showIcpIStim, showIcpEm, showIcpgNa, showIcpgK;
var showVcpINa, showVcpIK, showVcpIm, showVcpEStim, showVcpgNa, showVcpgK;
var useTtx;                     //whether or not we block Na+ channels
var useTea;                     //whether or not we block K+ channels

var icpIds = [
    "icpExpLenFld", "icpStimLenFld", "icpCurFld", "showIcpENaFld", "showIcpEKFld",
    "showIcpIStimFld", "showIcpEmFld", "showIcpgNaFld", "showIcpgKFld"
];
var vcpIds = [
    "vcpExpLenFld", "vcpStimLenFld", "vcpVltFld", "useTtxFld", "useTeaFld", "showVcpINaFld",
    "showVcpIKFld", "showVcpImFld", "showVcpEStimFld", "showVcpgNaFld", "showVcpgKFld"
];


//==================================================================================================
// Invariant Zoom
//==================================================================================================
var minIcpX, maxIcpX, minIcpY, maxIcpY, minVcpX, maxVcpX, minVcpY, maxVcpY;
function Reset() { 
    var expIsIcp = document.getElementById("exp").value == "icp";
    if (expIsIcp) { minIcpX = maxIcpX = minIcpY = maxIcpY = null; }
    else { minVcpX = maxVcpX = minVcpY = maxVcpY = null; }
    Main();
}


//==================================================================================================
// Main function
//==================================================================================================
function Main(e) {
    // we make sure the fields are properly displayed
    var expIsIcp = document.getElementById("exp").value == "icp";
    var icpDisplay = expIsIcp ? "block" : "none", vcpDisplay = expIsIcp ? "none" : "block";
    for (var i = 0; i < icpIds.length; i++)
        document.getElementById(icpIds[i]).style.display = icpDisplay;
    for (var i = 0; i < vcpIds.length; i++)
        document.getElementById(vcpIds[i]).style.display = vcpDisplay;
    
    if (e != null && e.hasAttribute("type")) {
        if (e.type == "button") { e.value = (e.value == "YES") ? "NO" : "YES"; }
        if (e.type == "number") {//we restrict the field values if necessary
            var val = parseFloat(e.value);
            if (val > parseFloat(e.max)) { e.value = e.max; } 
            if (val < parseFloat(e.min)) { e.value = e.min; }
        }
    }
    
    // we extract the fields values
    icpExpLen = parseFloat(document.getElementById("icpExpLen").value);
    vcpExpLen = parseFloat(document.getElementById("vcpExpLen").value);
    icpStimLen = parseFloat(document.getElementById("icpStimLen").value);
    vcpStimLen = parseFloat(document.getElementById("vcpStimLen").value);
    icpCur = parseFloat(document.getElementById("icpCur").value);
    vcpVlt = parseFloat(document.getElementById("vcpVlt").value);
    
    naIn = parseFloat(document.getElementById("naIn").value);
    naOut = parseFloat(document.getElementById("naOut").value);
    kIn = parseFloat(document.getElementById("kIn").value);
    kOut = parseFloat(document.getElementById("kOut").value);
    
    showIcpENa = (document.getElementById("showIcpENa").value == "YES");
    showIcpEK = (document.getElementById("showIcpEK").value == "YES");
    showIcpIStim = (document.getElementById("showIcpIStim").value == "YES");
    showIcpEm = (document.getElementById("showIcpEm").value == "YES");
    showIcpgNa = (document.getElementById("showIcpgNa").value == "YES");
    showIcpgK = (document.getElementById("showIcpgK").value == "YES");
   
    showVcpINa = (document.getElementById("showVcpINa").value == "YES");
    showVcpIK = (document.getElementById("showVcpIK").value == "YES");
    showVcpIm = (document.getElementById("showVcpIm").value == "YES");
    showVcpEStim = (document.getElementById("showVcpEStim").value == "YES");
    showVcpgNa = (document.getElementById("showVcpgNa").value == "YES");
    showVcpgK = (document.getElementById("showVcpgK").value == "YES");
        
    useTtx = (document.getElementById("useTtx").value == "YES");
    useTea = (document.getElementById("useTea").value == "YES");
    
    // we perform preliminary calculations
    var tmp = (rConst * temperature) / fConst;
    eNa = (tmp / naCharge) * Math.log(naOut / (naIn + epsilon)) * 1e3;   //Nernst equation
    eK = (tmp / kCharge) * Math.log(kOut / (kIn + epsilon)) * 1e3;       //Nernst equation
    
    // we launch the calculation
    if (expIsIcp) { PlotCurrentClamp(); }    
    else { PlotVoltageClamp(); }
}


//==================================================================================================
// HH functions
//==================================================================================================
function PlotCurrentClamp() {        
    var aM = AlphaM(0), bM = BetaM(0), m = aM / (aM + bM);
    var aH = AlphaH(0), bH = BetaH(0), h = aH / (aH + bH);
    var aN = AlphaN(0), bN = BetaN(0), n = aN / (aN + bN);
    
    var gNa = gNaMax * m * m * m * h, gK = gKMax * n * n * n * n;    
    var emRest = (gNa * eNa + gK * eK + gLeak * vLeak) / (gNa + gK);
    var eLeak = vLeak + emRest;
    var em = emRest;//starting point
            
    var timeToPush = Math.ceil(icpExpLen / maxNbOfPoints / dt), Data = [];
    
    for (var t = 0, p = 0; t < icpExpLen; t += dt) {
        aM = AlphaM(em - emRest); bM = BetaM(em - emRest); m += dt * (aM - m * (aM + bM));
        aH = AlphaH(em - emRest); bH = BetaH(em - emRest); h += dt * (aH - h * (aH + bH));
        aN = AlphaN(em - emRest); bN = BetaN(em - emRest); n += dt * (aN - n * (aN + bN));
        
        gNa = gNaMax * m * m * m * h;
        var iNa = gNa * (em - eNa);
        gK = gKMax * n * n * n * n;
        var iK = gK * (em - eK);
        var iLeak = gLeak * (em - eLeak);
        
        var iInj = (t >= 1 && t < 1 + icpStimLen) ? icpCur : 0;
        
        em += (dt / capacitance) * (iInj - iNa - iK - iLeak);
        if (p++ == timeToPush) { Data.push([t.toFixed(3), eNa, eK, iInj, em, gNa, gK]); p=0; }
    }
    
    curMinIcpX = (minIcpX == null) ? 0 : minIcpX;
    curMaxIcpX = (maxIcpX == null) ? icpExpLen : maxIcpX;
    
    g = new Dygraph( document.getElementById("pan3"), Data, {
            title: "CURRENT CLAMP",
            visibility: [showIcpENa, showIcpEK, showIcpIStim, showIcpEm, showIcpgNa, showIcpgK],
            labels: ["Time (ms)", "ENa (mV)", "EK (mV)", "IStim (µA/cm²)", "Em (mV)",
                "gNa (mS/cm²)", "gK (mS/cm²)"],
            colors: ["#ffca00", "#753a48", "#007034", "#1352a2", "#dc2742", "#5c8a8d"], 
            isZoomedIgnoreProgrammaticZoom: false,
            labelsSeparateLines: true,
            strokeWidth: 3,
            axes: {
                x: { valueFormatter: function(x) { return x + " ms"; } },
                y: { valueFormatter: function(y) { return y.toFixed(1); } }
            },
            dateWindow: [curMinIcpX, curMaxIcpX],
            valueRange: [minIcpY, maxIcpY],
            zoomCallback : function(minX, maxX, minMaxY) { 
                minIcpX = minX;
                maxIcpX = maxX;
                minIcpY = minMaxY[0][0];
                maxIcpY = minMaxY[0][1];
            }
        }
    );
}


function PlotVoltageClamp() {        
    var aM = AlphaM(0), bM = BetaM(0), m = aM / (aM + bM);
    var aH = AlphaH(0), bH = BetaH(0), h = aH / (aH + bH);
    var aN = AlphaN(0), bN = BetaN(0), n = aN / (aN + bN);
    
    var gNa = gNaMax * m * m * m * h, gK = gKMax * n * n * n * n;    
    var emRest = (gNa * eNa + gK * eK + gLeak * vLeak) / (gNa + gK);
    var eLeak = vLeak + emRest;
    var em = emRest;//starting point
    var iC = 0, iTot = 0;
                
    var timeToPush = Math.ceil(vcpExpLen / maxNbOfPoints / dt), Data = [];
    
    for (var t = 0, p = 0; t < vcpExpLen; t += dt) {        
        aM = AlphaM(em - emRest); bM = BetaM(em - emRest); m += dt * (aM - m * (aM + bM));
        aH = AlphaH(em - emRest); bH = BetaH(em - emRest); h += dt * (aH - h * (aH + bH));
        aN = AlphaN(em - emRest); bN = BetaN(em - emRest); n += dt * (aN - n * (aN + bN));
        
        gNa = useTtx ? 0 : gNaMax * m * m * m * h;
        var iNa = gNa * (em - eNa);
        gK = useTea ? 0 : gKMax * n * n * n * n;
        var iK = gK * (em - eK);
        var iLeak = gLeak * (em - eLeak);        
        var eE = (t >= 1 && t < 1 + vcpStimLen) ? vcpVlt : emRest;
        
        var peakWidth = 0.01, peakHeight = 200;
        iC += (dt/peakWidth) * (peakHeight * (eE - em) - iC);        
        em += (dt/peakWidth) * (eE - em);
        iTot = iC + iNa + iK + iLeak;
        
        if (p++ == timeToPush) { Data.push([t.toFixed(3), iNa, iK, iTot, em, gNa, gK]); p=0; }
    }
    
    if (minVcpX == null) { minVcpX = 0; }
    if (maxVcpX == null) { maxVcpX = vcpExpLen; }
    
    g = new Dygraph( document.getElementById("pan3"), Data, {
            title: "VOLTAGE CLAMP",
            visibility: [showVcpINa, showVcpIK, showVcpIm, showVcpEStim, showVcpgNa, showVcpgK],
            labels: ["Time (ms)", "INa (µA/cm²)", "IK (µA/cm²)", "Im (µA/cm²)", "EStim (mV)",
                "gNa (mS/cm²)", "gK (mS/cm²)"],
            colors: ["#ffca00", "#753a48", "#007034", "#1352a2", "#dc2742", "#5c8a8d"], 
            labelsSeparateLines: true,
            strokeWidth: 3,
            axes: {
                x: { valueFormatter: function(x) { return x + " ms"; } },
                y: { valueFormatter: function(y) { return y.toFixed(1); } }
            },
            dateWindow: [minVcpX, maxVcpX],
            valueRange: [minVcpY, maxVcpY],
            zoomCallback : function(minX, maxX, minMaxY) { 
                minVcpX = minX;
                maxVcpX = maxX;
                minVcpY = minMaxY[0][0];
                maxVcpY = minMaxY[0][1];
            }
        }
    );
}


function AlphaN(v) {
    if (v === 10) { v += epsilon; }
    return (10 - v) / (100 * (Math.exp((10 - v) / 10) - 1));
}
function AlphaM(v) {
    if (v === 25) { v += epsilon; }
    return (25 - v) / (10 * (Math.exp((25 - v) / 10) - 1));
}
function AlphaH(v) { return 0.07 * Math.exp(-v / 20); }
function BetaN(v) { return 0.125 * Math.exp(-v / 80); }
function BetaM(v) { return 4 * Math.exp(-v / 18) }
function BetaH(v) { return 1 / (Math.exp((30 - v) / 10) + 1); }
