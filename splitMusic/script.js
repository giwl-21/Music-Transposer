var mySound, recorder1, recorder2, amplitude, peaks, increment, tempos, intervals, temp, clipCount, fft, ends, bufferSize, targetSize, config;
var started = 0;
var amplitudeHistory = [];
var clipsArray = [];
var blobArray = [];
var fftArray = [];
var stftArray = [];
var inputArray = [];
var recorderArray = [];
var timePeaks = [];
function preload() {
  mySound = loadSound("Lullaby.mp3");//copies an audio file
  targetSize = 144;// TARGET NUMBER OF SOUND FILES
}

function setup() {
  mySound.setVolume(1.0);
  temp = new p5.SoundFile();
  amplitude = new p5.Amplitude();
  recorder1 = new p5.SoundRecorder();
  recorder1.setInput();
  recorder2 = new p5.SoundRecorder();
  recorder2.setInput();
  clipCount = 0;
  ends = 0;
  increment = .05; //fraction of a second per data point

  for (t = 0; t < mySound.duration(); t += increment) {
    mySound.addCue(t, cueAmplitude);
  }
  mySound.onended(ending);
}

function begin() {
  if (started < 1) {
    mySound.play();
    console.log("begun");
  }
  started = 1;
}
function cueAmplitude() {// documetns the amplitude of the canvas at the given moment
  amplitudeHistory.push(amplitude.getLevel());
}

function ending() {
  if (ends == 0) {
    cueEnd();
  }
  else if (ends == 1) {
    setTimeout(endRecord, 10000);
  }
  ends++;
}

function cueEnd() {//code ran at the end of the song
  peaks = findPeaks(amplitudeHistory);
  for (p in peaks){
    if (amplitudeHistory[peaks[p]] < 0.0005){
      peaks.splice(p, 1);
    }
  }
  console.log(peaks);
  var sectionLengths = 10;//Seconds between each tempo adjustment
  tempos = findTempo(peaks, amplitudeHistory, sectionLengths, increment);
  console.log("tempos: " + tempos);
  initialTime = peaks[0] * increment;
  endTime = peaks[peaks.length - 1] * increment;
  mySound.clearCues();
  var intervalCount = 0;
  intervals = findIntervals(tempos, initialTime, endTime);
  console.log("intervals: " + intervals)
  for (t = initialTime; t < endTime - 2 * intervals[intervalCount]; t += intervals[intervalCount]) {
    pastCount = intervalCount;
    intervalCount = Math.floor(t / 10);
    if (intervalCount != pastCount) {
      t = 10 * intervalCount;
    }
    clipsArray.push(new p5.SoundFile());
    recorderArray.push(new p5.SoundRecorder());
    mySound.addCue(t, startRecord, intervalCount);
    console.log(t);
  }
  document.getElementById("output").innerHTML += "Tempo: " + tempos + "<br/>Interval: " + intervals + "<br/>Initial Time: " + initialTime;
  setTimeout(playSong, 20000);
}

function playSong() {
  console.log("play")
  mySound.play();
}

function startRecord(section) {
  recorderArray[clipCount].record(clipsArray[clipCount], intervals[section]);
  clipCount++;
  console.log("recorder " + clipCount);
}

function endRecord() {
  document.getElementById("output").innerHTML += "<br/> END RECORD<br/>";
  setTimeout(cueEnd2, 10000);

}


function cueEnd2() {//FFT OCCURS HERE
  bufferSize = 2;
  for (bufferSize; bufferSize < clipsArray[0].buffer.length && bufferSize < Math.pow(2, 14); bufferSize *= 2) { }

  document.getElementById("output").innerHTML += "works";
  for (i = 0; i < clipsArray.length; i++) {
    stftArray.push(p5StftClip(clipsArray[i]));
  }
  console.log(stftArray);


  //DOWNLOAD ARRAY

  var blob = new Blob([JSON.stringify(stftArray)], {type:"application/json"});
  var filename = "stft-input.json"
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

function createInputArr(numberOfPoints) {//Dependancies: full fftArray
  var superArr = [];
  for (c = 0; c < fftArray.length; c++) {
    var sortedFFT = [];
    var highPeaks = [];
    var fftPeakIndexes = [];
    fftPeakIndexes = findPeaks(fftArray[c]);
    for (k = 0; k < fftPeakIndexes.length; k++) {//getting freqs at peak values
      sortedFFT.push(fftArray[c][fftPeakIndexes[k]]);
    }
    sortedFFT.sort(function (a, b) { return b - a });
    arrayCopy(sortedFFT, highPeaks, numberOfPoints);
    var singleOutput = [];//Number of Amplitudes and Frequencies
    for (n = 0; n < highPeaks.length; n++) {
      var index = fftArray[c].indexOf(highPeaks[n]);//PROBLEM CANT FIND
      var freq = binsToFreq(index, bufferSize, mySound.sampleRate());
      var tuple = [highPeaks[n], freq];//Amplitude, Frequency
      singleOutput.push(tuple);
    }
    superArr.push(singleOutput);
  }
  return superArr;
}

function fftClip(clip, bufferSize) {//returns a real FFT spectrum
  var rfft = new RFFT(bufferSize, mySound.sampleRate());
  var signal;
  signal = clip.getPeaks(bufferSize);
  console.log(signal);
  rfft.forward(signal);
  return rfft.spectrum;
}
function findPeaks(arr) {//returns an array of peaks from the given array
  var amps = arr;
  var output = [];
  for (i = 1; i < amps.length - 2; i++) {
    if (amps[i] > amps[i - 1] && amps[i] > amps[i + 1]) {
      output.push(i);
    }
  }
  return output;
}
function findTempo(peaksArray, ampsArray, space, inc) {//Takes an array of amplitudes, and the space in seconds between each tempo shift, and the increment of seconds between each amplitude value. Finds the tempo in bpm, ensuring its below 180.
  var arr = peaksArray;
  var bpmArr = [];
  var indexDivision = Math.floor(space / inc);
  for (k = 0; k < ampsArray.length - indexDivision; k += indexDivision) {
    var commonInterval, bpm, multiple, firstIndex;
    var distances = [];

    firstIndex = arr.indexOf(k);
    for (n = k; firstIndex < 0 && n < (k + 1) * indexDivision; n++) {
      firstIndex = arr.indexOf(n);
    }
    for (i = firstIndex; arr[i] < (k + 1) * indexDivision - 2; i++) {
      distances.push(arr[i + 1] - arr[i]);
    }
    console.log(distances);
    commonInterval = Math.floor(mode(distances)[0]);
    bpm = 60.00 / (commonInterval * inc);
    if ((multiple = 1 + bpm / 180) > 2) {
      bpm = bpm / Math.floor(multiple);
    }
    else if ((multiple = 1 + 30 / bpm) > 2) {
      bpm = bpm * Math.floor(multiple);
    }
    bpmArr.push(bpm);
  }
  return bpmArr;
}

function findIntervals(tempos, startTime, endTime) {
  var intervals = [];
  for (k = 0; k < tempos.length; k++) {
    intervals.push(60 / tempos[k]);
  }
  //ALGORITHM TO MAKE FINAL ARRAY SIZE = targetSize
  var currentSize = 0;
  var step = .01;///to increment or decrement the size of each interval
  while (currentSize != targetSize) {
    if (Math.abs(currentSize - targetSize) < 3 && step > .00000000000000000000000000000001){
      step *= .99
    }
    var direction = (targetSize - currentSize) / Math.abs(targetSize - currentSize);
    intervals = intervals.map(function (value) {
      return value * (1 - direction * step)
    });
    currentSize = 0;
    var intervalCount = 0;
    for (t = startTime; t < endTime - 2*intervals[intervalCount]; t += intervals[intervalCount]) {
      pastCount = intervalCount;
      intervalCount = Math.floor(t / 10);
      if (intervalCount != pastCount) {
        t = 10 * intervalCount;
      }
      currentSize++;
    }
  }
  return intervals;
}

function findInterval(peaksArray) {// Finds the "average" length of notes in seconds
  var arr = peaksArray;
  var distances = [];
  var commonInterval, bpm, multiple;

  for (i = 0; i < arr.length - 1; i++) {
    distances.push(arr[i + 1] - arr[i]);
  }
  commonInterval = mode(distances)[0];
  commonInterval = commonInterval * increment;
  return commonInterval;
}

function calcBeat(soundfile, rate){
  //Downsampling to rate
  signal = soundfile.getPeaks(rate * soundfile.buffer.duration);
  

}

function mode(numbers) {
  // as result can be bimodal or multi-modal,
  // the returned result is provided as an array
  // mode of [3, 5, 4, 4, 1, 1, 2, 3] = [1, 3, 4]
  var modes = [], count = [], i, number, maxIndex = 0;

  for (i = 0; i < numbers.length; i += 1) {
    number = numbers[i];
    count[number] = (count[number] || 0) + 1;
    if (count[number] > maxIndex) {
      maxIndex = count[number];
    }
  }

  for (i in count)
    if (count.hasOwnProperty(i)) {
      if (count[i] === maxIndex) {
        modes.push(Number(i));
      }
    }
  return modes;
}
function binsToFreq(bin, samples, rate) {
  var frequency = (bin / samples) * rate;
  return frequency;
}

function freqToBins(freq, samples, rate) {
  var bin = (freq / rate) * samples;
  return Math.floor(bin);
}

function testClips() {
  var n = 1;
  for (i = 0; i < clipsArray.length - 2; i++) {
    clipsArray[i].onended(fn => {
      clipsArray[n].play();
      n++;
      console.log(n);

    });
  }
  clipsArray[0].play();
}

