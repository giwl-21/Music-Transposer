var predictor, mic, listener, recorder, soundFile, model, type, mode, fftHistory, inputCount, scoreDimensions, outputHistory, framerate, nowfft, fr, audioCtx, analyser, source;

function preload() {
  async function load() {
    await tf.loadLayersModel('https://prsef-demo--mufasa-corp.repl.co/application/test.json').then((moose) => {
      console.log("Loaded Model");
      moose.summary();
      predictor = moose;

      document.getElementById("upload").disabled = false;
      document.getElementById("realTime").disabled = false;
    });
  }
  load();
  mic = new p5.AudioIn();
  recorder = new p5.SoundRecorder();
  soundFile = new p5.SoundFile();
}

function setup() {
  //const model = await tf.loadModel('https://foo.bar/tfjs_artifacts/model.json');
  //microphone
  var cnv = createCanvas(screen.width, 600);
  cnv.parent("scriptContainer");
  background(100);
  recorder.setInput(mic);
  inputCount = 6;

  scoreDimensions = {
    width: screen.width * 9 / 12, /*on the right*/
    height: canvas.height,
    yPosition: canvas.height / 2,  /*center of the staff */
    xPosition: 0,//distance from the rightmost spot, should only be altered at the END
    sizeConstant: 5,
    noteSpace: 10,//px distance between notes
  };

  fr = 60;
  frameRate(fr);
  outputHistory = [];
  fftHistory = [];
  nowfft = [];
  mode = "begin";
  type = "";


  document.getElementById("upload").disabled = true;
  document.getElementById("realTime").disabled = true;
  document.getElementById("resume").disabled = true;
  document.getElementById("pause").disabled = true;
  document.getElementById("stop").disabled = true;
  document.getElementById("dlAll").disabled = true;
  document.getElementById("dlAudioAll").disabled = true;
  //  document.getElementById("dlSection").disabled = true;
  // document.getElementById("dlAudioSection").disabled = true;
  document.getElementById("reset").disabled = true;
}

function draw() {
  if (mode == "begin") {
    background(0, 0, 0);
  }
  else if (mode == "stopped") {
    background(255, 255, 0);
  }
  else if (mode == "on") {
    if (type == "live") {
      micLevel = mic.getLevel();
      background(255, 200, 200);
    }
    else if (type = "upload") {

      background(200, 255, 255);
    }
    //EXECUTING STFT ON THE AUDIO, NORMALIZING, ADDING TO now fft
    var signal = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(signal);
    var input = [stft(signal)];
    tf.tidy(() => {
      var tense = tf.tensor3d(input).expandDims(3);
      console.log(tense.toString());

      //INPUT IS PROCESSED INTO CONVO NEURAL NETWORK
      guess(tense);
    });

    displayAmp(scoreDimensions);
    displayMusic(scoreDimensions, outputHistory);
  }
  else if (mode == "paused") {
    if (type == "live") {
      background(255, 0, 255);
    }
    else if (type == "upload") {
      background(0, 255, 0);
    }
  }
}

function displayAmp(scoreObject) {
  size = map(mic.getLevel(), 0, 1, 0, 500);
  ellipse((canvas.width - scoreObject.width) / 2, canvas.height / 2, size, size);
}

function displayMusic(scoreObject, outputHist) {
  scoreObj = scoreObject;
  history = outputHist;
  //Rectangle
  noStroke();
  fill(255, 240, 240);
  rect(canvas.width - scoreObject.width, scoreObject.yPosition - (96 / 2 * scoreObject.sizeConstant), scoreObject.width, 96 * scoreObject.sizeConstant);
  //starts note display at index outputHist.length - (scoreObject X / scoreObject noteSpace), ends at (startIndex - (scoreObject width / size constatnt))
  var startIndex = outputHist.length - scoreObject.xPosition / scoreObject.noteSpace;
  var endIndex = startIndex - scoreObject.width / scoreObject.noteSpace;
  if (endIndex < 0) {
    endIndex = 0;
  }
  for (z = startIndex - 1; z >= endIndex; z--) {
    var noteValues = [];
    var tempIndex = 0;
    while (tempIndex != -1) {
      tempIndex = outputHist[z].indexOf(1, tempIndex + 1);
      noteValues.push(tempIndex);
    }
    noteValues.pop();

    var xNote = canvas.width - (startIndex - z) * scoreObject.noteSpace;

    for (t = 0; t < noteValues.length; t++) {
      drawPitch(xNote, noteValues[t], scoreObject);
    }
  }

}

async function guess(tensor){
 // try {
    var tenseOut = predictor.predict(tensor, {verbose: true});
    var output = tenseOut.arraySync()[0];
    for (w in output) {
      output[w] = Math.round(output[w]);
    }
    outputHistory.push(output);
    console.log(output);
    //RETURNS array = [resultArray]
//  }
//  catch {
 //   console.log("predictor failed");
 // }
  //OUTPUT IS PROCESSED AND DISPLAYED
}
//########################################################################################
////BUTTONS FUNCTIONS ##############################################################################
//########################################################################################
function realTime() {
  if (mic.enabled) {
    console.log("mic enabled");
  }
  else {
    console.log("mic not enabled");
  }
  recorder.record(soundFile);
  mode = "on";
  type = "live";

  audioCtx = new window.AudioContext({ sampleRate: 16000 });
  analyser = audioCtx.createAnalyser();
  analyser.minDecibels = -90;
  analyser.maxDecibels = -10;
  analyser.fftSize = 2 ** 13;
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (micStream) {
    source = audioCtx.createMediaStreamSource(micStream);
    source.connect(analyser);
    console.log("analyser established");
  });
  document.getElementById("pause").disabled = false;
  document.getElementById("stop").disabled = false;
  document.getElementById("upload").disabled = true;
  document.getElementById("realTime").disabled = true;
  console.log("realtime btn clicked");
}
function uploadBtn() {
  var x = document.createElement("INPUT");
  x.setAttribute("type", "file");
  x.setAttribute("id", "inputThing");
  x.setAttribute("accept", "audio/*");
  x.setAttribute("oninput", "soundFile = loadSound(document.getElementById('inputThing').value, upload());");
  document.getElementById("input").appendChild(x);

}
function upload() {
 // document.getElementById("inputThing").disabled = true;
  mode = "on";
  type = "upload";
 // soundFile.play();
  audioCtx = new window.AudioContext({ sampleRate: 16000 });
  analyser = audioCtx.createAnalyser();
  analyser.minDecibels = -90;
  analyser.maxDecibels = -10;
  analyser.fftSize = 2 ** 13;
  var stream = document.getElementById("aud");
  source = audioCtx.createMediaElementSource(stream);
  analyser.connect(audioCtx.destination);
  source.connect(analyser);
  console.log("analyser established");
  stream.play();
  document.getElementById("pause").disabled = false;
  document.getElementById("stop").disabled = false;
  document.getElementById("upload").disabled = true;
  document.getElementById("realTime").disabled = true;
  console.log("upload btn clicked");
}
function pause() {
  recorder.stop();
  mode = "paused";
  document.getElementById("pause").disabled = true;
  document.getElementById("resume").disabled = false;
  document.getElementById("stop").disabled = false;
  console.log("pause btn clicked");
}
function stop() {
  mode = "stopped";
  try {
    recorder.stop();
  }
  catch{ }
  mic.stop();
  document.getElementById("pause").disabled = true;
  document.getElementById("resume").disabled = true;
  document.getElementById("stop").disabled = true;
  document.getElementById("reset").disabled = false;
  document.getElementById("dlAll").disabled = false;
  document.getElementById("dlAudioAll").disabled = false;
  //  document.getElementById("dlSection").disabled = false;
  // document.getElementById("dlAudioSection").disabled = false;
  console.log("stop btn clicked");
}
function resume() {
  if (type == "live") {
    recorder.record(soundFile);
  }
  mode = "on";
  document.getElementById("resume").disabled = true;
  document.getElementById("pause").disabled = false;
  document.getElementById("stop").disabled = false;
  document.getElementById("upload").disabled = true;
  document.getElementById("realTime").disabled = true;
  console.log("resume btn clicked");
}
function reset() {
  preload();
  setup();
  console.log("reset btn clicked");
}
function dlSheetMusic() {
  console.log("dlsheetmusic btn clicked");
  var midiFile = outputToMidi(outputHistory, fr, soundFile.getPeaks(16000 * soundFile.duration), soundFile.sampleRate());
  console.log(midiFile);
  downloadString(midiFile, "transposed.mid", { type: "audio/midi" });

}
function dlSheetMusicSect() {
  console.log("dlSheetMusicSect btn clicked");
}
function dlAudio() {
  console.log("dlAudio btn clicked");
}
function dlAudioSect() {
  console.log("dlAudioSect btn clicked");
}
//#############################################################
// END BUTTON FUNCTIONS #########################################
//############################################################
function findPeaks(arr) {//returns an array of peaks from the given array
  var inputArr = arr;
  var outputArr = [];
  for (i = 1; i < inputArr.length - 2; i++) {
    if (inputArr[i] > inputArr[i - 1] && inputArr[i] > inputArr[i + 1]) {
      outputArr.push(i);
    }
  }
  return outputArr;
}
function binsToFreq(bin, samples, rate) {
  var frequency = (bin / samples) * rate;
  return frequency;
}
function drawNote(x, value, scoreObject) {//Draws a note on a hypothetical staff centered at scoreObject.yPosition; x is the x position, value is the index of arrNotes from 0 to 96, center position is the y position of middle C
  stroke(0);
  fill(0);
  //We're pretending that the notes go from 0-14 each octave even though they go from 0-12 because on the staff, there are 14 spaces per octave.  We are skipping every time that a black key is not between a piano, which are from E-F and B-C
  var halfStepOffset = 2 * value / 12; /* two skips every 12 note octave, compensates for b-c*/
  if (value % 12 > 4) {//E-F
    halfStepOffset++;
  }
  var basePos = -4 * 14;// 14 spaces to fit 12 notes that skip two positions, assuming C4 = middle c
  var pos = (halfStepOffset + value + basePos);
  var staffPos = Math.floor(pos / 2);
  var y = scoreObject.yPosition - staffPos * scoreObject.sizeConstant;
  ellipse(x, y, scoreObject.sizeConstant + 1, scoreObject.sizeConstant);// Assuming C0 = 0
  if (pos % 2 == 1) {//means its sharp
    text(x - scoreObject.sizeConstant, y, "\u1d131");
  }
}
function drawPitch(x, value, scoreObject) {
  stroke(0);
  fill(0);
  var base = -4 * 12;
  var relativePos = base + value;
  var y = scoreObject.yPosition - (relativePos * scoreObject.sizeConstant);
  rect(x, y, scoreObject.noteSpace, scoreObject.sizeConstant);
}

console.log("functions processed");
