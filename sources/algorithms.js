function maxesIndexes(array) { //returns an array of peaks from the given array
  var arr = array.map(Math.abs);
  var output = [];
  for (i = 1; i < arr.length - 2; i++) {
    if (arr[i] > arr[i - 1] && arr[i] > arr[i + 1]) {
      output.push(i);
    }
  }
  return output;
}

function maxesCoords(array) { // (X) SORTED COORDINATE ARRAYS ONLY
  var output = [];
  var arr = array.map(function(value){
    return {x: value.x , y: Math.abs(value.y)};
  });
  for (i = 1; i < arr.length - 2; i++) {
    if (arr[i].y > arr[i - 1].y && arr[i].y > arr[i + 1].y) {
      output.push(array[i]);
    }
  }
  return output;
}

function findBeatLengths(signal, signalRate, area) { //Takes peaks twice, then takes a rolling average of the peaks.  Returns an array of average distance in seconds
  //Find maxes of the maxes
  var iMaxes1 = maxesIndexes(signal); //indexes of the maxes
  var coords1 = []; //values at the maxes
  for (i in iMaxes1) {
    coords1.push({
      x: iMaxes1[i],
      y: signal[iMaxes1[i]]
    });
  }

  var sixteenthsPerMinute = coords1.map(function(value) {
    return Math.floor(60 / value.x * 16);
  });
  var modeSixteenths = mode(sixteenthsPerMinute);
  var newCoords = coords1;
  while (modeSixteenths[modeSixteenths.length - 1] > 16 * 60) {
    newCoords = maxesCoords(newCoords);
    sixteenthsPerMinute = newCoords.map(function(value) {
      return 60 / value.x * 16;
    });
    modeSixteenths = mode(sixteenthsPerMinute);
  }

  //Find a rolling average of the x distance
  var distances = [];
  for (i = 0; i < newCoords.length - 1; i++) {
    distances.push(newCoords[i + 1].x - newCoords[i].x);
  }
  var averages = [];
  for (i = 0; i < distances.length - area; i++) {
    /*index is on the left side*/
    sum = 0;
    for (n = i; n < i + area; n++) {
      sum += distances[n];
    }
    averages.push(sum / area);
  }
  output = [];
  for (n in averages) {
    output.push(averages[n] / signalRate);
  }

  return output;
}

function targetedBeatLengths(signal, signalRate, targetAmount) { //Takes peaks twice, then takes a rolling average of the peaks.  Returns an array of average distance in seconds
  //Find maxes of the maxes
  var iMaxes1 = maxesIndexes(signal); //indexes of the maxes
  var coords = []; //values at the maxes
  for (i in iMaxes1) {
    coords.push({
      x: iMaxes1[i],
      y: signal[iMaxes1[i]]
    });
  }

  var errMargin = 0.1;
  var amount = Infinity;
  while (amount > targetAmount) {
    coords = maxesCoords(coords);

    var meanDist = meanDistCoords(coords); //AVERAGE OF DISTNACES IN SAMPLE UNITS
    //SPLITTING IN HALF AND COMPARING
    var lowerHalf = [];
    var upperHalf = [];
    for (n = 1; n < coords.length; n++) {
      var distance = coords[n].x - coords[n - 1].x;
      if (distance > meanDist) {
        upperHalf.push(coords[n]);
      } else {
        lowerHalf.push(coords[n]);
      }
    }
    var factor = 1;
    if (meanDistCoords(upperHalf) > (2 - errMargin) * meanDistCoords(lowerHalf)) {
      factor = 2;
    }
    amount = factor * upperHalf.length + lowerHalf.length;
  }
  var firstBeat = coords[0].x / signalRate;
  var distances = [];
  for (i = 0; i < coords.length - 1; i++) {
    distances.push(coords[i + 1].x - coords[i].x);
  }
  var meanDist = mean(distances);
  for (n in distances) {
    if (distances[n] < meanDist) {
      lowerHalf.push(distances[n]);
    }
  }
  lowerMean = mean(lowerHalf);
  var factor = 1;
  finalDistances = [];
  for (n in distances){
    if (distances[n] > (2 - errMargin) * lowerHalf){
      finalDistances.push(distances[n]/2);
      finalDistances.push(distances[n]/2);
    }
    else{
      finalDistances.push(distances[n]);
    }
  }
  //Finds the highest numbers and cuts them in half till its equal
  while (distances.length < targetAmount){
    var max = -Infinity;
    var indexMax;
    for (i in distances){
      if (distances[i] > max){
        max = distances[i];
        indexMax = i;
      }
    }
    distances.splice(indexMax, 1, max/2, max/2);
  }


  //Find a rolling average of the x distance

  var averages = [];
  area = 5;
  for (i = 0; i < distances.length - area; i++) {
    /*index is on the left side*/
    sum = 0;
    for (n = i; n < i + area; n++) {
      sum += distances[n];
    }
    if (area == 0){
      averages.push(sum);
    }
    else{
      averages.push(sum / area);
    }
    if (i < distances.length && (i >= distances.length - area -1 && area > 0)){
      area--;
    }
  }
  window.alert(averages.length);
  var out = [];
  for (n in averages) {
    out.push(averages[n] / signalRate);
  }

  return out;
}

function downloadString(string, filename, typeObject) {
  var blob = new Blob(string, typeObject);
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

function mode(numbers) {
  // as result can be bimodal or multi-modal,
  // the returned result is provided as an array
  // mode of [3, 5, 4, 4, 1, 1, 2, 3] = [1, 3, 4]
  var modes = [],
    count = [],
    i, number, maxIndex = 0;

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

function meanDistCoords(coords) {
  var total = 0,
    i;
  for (i = 1; i < coords.length; i += 1) {
    total += coords[i].x - coords[i - 1].x;
  }
  return total / coords.length;
}
function mean(numbers) {
    var total = 0, i;
    for (i = 0; i < numbers.length; i += 1) {
        total += numbers[i];
    }
    return total / numbers.length;
}
