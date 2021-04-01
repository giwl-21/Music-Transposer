
var notesArray = [];
var csvArray = [];
var newMeasure = 0;
var currentMeasure = 0;
var currentStep;
var currentOctave = 0;
var currentAlter = 0;
var currentDuration = 0;
var currentNoteSoundType; // pitch, rest
var currentNoteType;//backup, note, forward
var currentChord;
var divisions = 0;
decipher("BEETHOVEN-OdeToJoy.xml");
function decipher(fileName) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      myFunction(this);
    }
  };
  xhttp.open("GET", fileName, true);
  xhttp.send();
}

function myFunction(xml) {
  var xmlDoc = xml.responseXML;
  var start = xmlDoc.getElementsByTagName("measure");

  // window.alert(start[0].childNodes[0].nodeValue);
  read(start[0]);
  document.getElementById("output").innerHTML += notesArray.length + "  " + divisions;
  for (i = 0; i < notesArray.length; i++) {
    document.getElementById("output").innerHTML += "<br/>" + i + ": " + notesArray[i].getValues();
  }

  console.log(csvArray);
  neuralNote();
  document.getElementById("output").innerHTML += "CSV ARRAY: <br/>" + csvArray;
  console.log(csvArray);
  //exportToCsv("lullaby.csv", csvArray);
  outputArr = csvArray.slice(0, csvArray.length);
  outputArr.shift();
  for(p in outputArr){
    outputArr[p].shift();
  }
  var blob = new Blob([JSON.stringify(outputArr)], {type:"application/json"});
  var filename = "output.json"
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    var link = document.createElement("a");
    if (link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}


function Note(p, d, m) {// pitches, duration, measure; creates a note object
  this.pitch = p;// midi value minus 12
  this.duration = d;
  this.measure = m;
  this.getValues = function () {
    return "<br/>pitch: " + this.pitch + "<br/>duration: " + this.duration + "<br/>measure: " + this.measure;
  };
}

function neuralNote() {//input Note object only
  var time = 0;
  var totalLength = 0;
  var netLength = 0;
  for (i = 0; i < notesArray.length; i++) {
    netLength += Math.floor(notesArray[i].duration);
    if(netLength >= totalLength){
      totalLength = netLength;
    }
  }
  for (i = 0; i < totalLength; i++) {
    var emptyRow = [];
    emptyRow.length = 96;
    emptyRow.fill(0);
    csvArray.push(emptyRow);
  }
  for (i = 0; i < notesArray.length; i++) {
    //console.log(time);
    var index = notesArray[i].pitch;
    if (index > -1) {
      for (n = 0; (n < notesArray[i].duration) && (time + n < totalLength); n++){
        csvArray[time + n][index] = 1;
      }
    }
    time += Math.floor(notesArray[i].duration);
  }
  console.log(csvArray);
  console.log(csvArray.length);
  for (i = 0; i < csvArray.length; i++) {
    var fileName = "clip" + i + ".wav";
    csvArray[i].unshift(fileName);
  }
  console.log(csvArray);
  descriptionRow = [];
  descriptionRow.push("File Name");
  for (i = 0; i < 96; i++) {
    descriptionRow.push(convertToLetter(i));
  }
  csvArray.unshift(descriptionRow);
}

function read(parent) { //recurses throughu the entire document and fills songArray,
  var a;
  //operates on the array
  // console.log(parent.nodeName);
  if (parent.nodeName == "measure") {
    document.getElementById("output").innerHTML += "<br/>Measure: " + parent.getAttribute("number");
    currentMeasure = newMeasure;
    newMeasure = parent.getAttribute("number");
    console.log("measure: " + parent.getAttribute("number"));
  }
  else if (parent.nodeName == "duration") {
    currentDuration = parent.childNodes[0].nodeValue;
  }
  else if (parent.nodeName == "step") {
    currentStep = parent.childNodes[0].nodeValue;
  }
  else if (parent.nodeName == "divisions") {
    divisions = parent.childNodes[0].nodeValue;
  }
  else if (parent.nodeName == "alter") {
    currentAlter = parent.childNodes[0].nodeValue;
  }
  else if (parent.nodeName == "octave") {
    currentOctave = parent.childNodes[0].nodeValue;
  }
  else if (parent.nodeName == "rest") {
    currentNoteSoundType = "rest";
  }
  else if (parent.nodeName == "chord") {
    notesArray.push(new Note(-1, -currentDuration, currentMeasure));//may be wrong if the chord consists of many different lengths
  }
  else if (parent.nodeName == "pitch") {
    currentNoteSoundType = "pitch";
    currentAlter = 0;
  }
  else if ((parent.nodeName == "note" || parent.nodeName == "part") || (parent.nodeName == "backup" || parent.nodeName == "forward")) {//operates during each note
    if (currentNoteType == "note") {

      if (currentNoteSoundType == "pitch") {
        notesArray.push(new Note(convertToPitch(currentStep, currentOctave, currentAlter), currentDuration, currentMeasure));
        console.log("note create: " + currentMeasure + " " + currentStep + " " + currentOctave + " " + currentAlter + " " + currentDuration);
      }
      else if (currentNoteSoundType == "rest") {
        notesArray.push(new Note(-1, currentDuration, currentMeasure));

        console.log("rest create: " + currentMeasure + " " + currentStep + " " + currentOctave + " " + currentAlter + " " + currentDuration);
      }
      else {
        console.log("note fail: " + currentMeasure + " " + currentStep + " " + currentOctave + " " + currentAlter + " " + currentDuration);
      }
    }
    else if (currentNoteType == "backup") {
      notesArray.push(new Note(-1, -currentDuration, currentMeasure));


      console.log("backup: " + currentMeasure + " " + currentStep + " " + currentOctave + " " + currentAlter + " " + currentDuration);

    }
    else if (currentNoteType == "forward") {
      notesArray.push(new Note(-1, currentDuration, currentMeasure));
      console.log("forward: " + currentMeasure + " " + currentStep + " " + currentOctave + " " + currentAlter + " " + currentDuration);
    }
    currentMeasure = newMeasure;
    currentNoteType = parent.nodeName;
  }
  //big loop
  if (get_parentNode(parent)) {
    if (a = get_firstChild(parent)) {
      read(a);
    }
    else if (a = get_nextSibling(parent)) {
      read(a);
    }
    else if (a = get_parentNode(parent)) {
      while (!get_nextSibling(a) && get_parentNode(a)) {
        a = get_parentNode(a);
      }
      if (get_nextSibling(a)) {
        a = get_nextSibling(a);
      }
      read(a);
    }
  }
  else {
    document.getElementById("output").innerHTML += "<br/>FINISH";
  }
}

function get_firstChild(n) {
  try {
    var y = n.firstChild;
    while (y.nodeType != 1) {
      y = y.nextSibling;
    }
    return y;
  }
  catch{

    //window.alert("firstchild fail" + n.nodeName + ": " + n.childNodes[0].nodeValue);
    return null;
  }
}
function get_nextSibling(n) {
  try {
    var y = n.nextSibling;
    //check if the node is an element node
    while (y.nodeType != 1) {
      y = y.nextSibling;
    }
    return y;
  }
  catch{
    //window.alert("next sibling fail" + n.nodeName + ": " + n.childNodes[0].nodeValue);
    return null;
  }
}
function get_parentNode(n) {
  try {
    var y = n.parentNode;
    //check if the node is an element node
    while (y.nodeType != 1) {
      y = y.nextSibling;
    }
    return y;
  }
  catch{
    //window.alert("next sibling fail" + n.nodeName + ": " + n.childNodes[0].nodeValue);
    return null;
  }
}


function convertToPitch(step, octave, alter) {//step is a string with letter note, octave and alter are integers
  var alpha = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"];
  var output = Math.floor(alpha.indexOf(step)) + Math.floor(octave * 12) + Math.floor(alter);
  return output;//C0 = 0, if you add 12 it would equal midi values
}

function convertToLetter(pitch) {//ex: C#/Db4
  var alpha = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"];
  var p = pitch;
  var octaves = Math.floor(p / 12);
  var letter = alpha[pitch % 12];
  return letter + octaves;//C0 = 0, if you add 12 it would equal midi values
}

function exportToCsv(filename, rows) {
  var processRow = function (row) {
    var finalVal = '';
    for (var j = 0; j < row.length; j++) {
      var innerValue = row[j] === null ? '' : row[j].toString();
      if (row[j] instanceof Date) {
        innerValue = row[j].toLocaleString();
      };
      var result = innerValue.replace(/"/g, '""');
      if (result.search(/("|,|\n)/g) >= 0)
        result = '"' + result + '"';
      if (j > 0)
        finalVal += ',';
      finalVal += result;
    }
    return finalVal + '\n';
  };

  var csvFile = '';
  for (var i = 0; i < rows.length; i++) {
    csvFile += processRow(rows[i]);
  }

  var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    var link = document.createElement("a");
    if (link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
