//REQUIRES DSP.JS

function p5StftClip(clip){
  var config = {
    nfft: 512,
    hopLength: 160,//16000 / 100 , 1/t
    winLength: 640,//16000 / 40 , 1/t
    rate: 16000,//downsampled
    step: 1600, /*for rolling, 1/10 of rate*/
    timeShape: 27,
    threshold: 0.0005
  };
  var signal = clip.getPeaks(config.rate * clip.buffer.duration);
  y = signal; /// REMOVABLE

  //CLEAN UP AUDIO
  var signalPos;
  var mask = [];
  for (signalPos = config.step/2; signalPos < signal.length - config.step/2; signalPos++){ /*CENTER IT*/

    var section = signal.slice(signalPos-config.step/2, signalPos+config.step/2);
    var sum = 0;
    for (k in section){
      sum += Math.abs(section[k]);
    }
    var average = sum / section.length;
    if (average > 0.0005){
      mask.push(true);
    }
    else{
      mask.push(false);
    }
  }
  var clean = [];
  for (a = 0; a < signal.length; a++){
    if (a < config.step/2 || a > signal.length - config.step/2){
      clean.push(signal[a]);
    }
    else{
      if (mask[a - config.step/2]){
        clean.push(signal[a]);
      }
      else {
        clean.push(0);
      }
    }
  }
  console.log("clean");
  console.log(clean);
  console.log(clean.length);

  z = clean;

  //STFT

  var arr_stft = [];
  var max = -Infinity;
  var min = Infinity;
  for(n = 0; n < clean.length-config.winLength; n+= config.hopLength){
    var rfft = new RFFT(config.nfft, config.rate);//For dsp not to return NaN, nfft must be < hopLenght
    var sample = clean.slice(n, n+config.winLength);
    rfft.forward(sample);
    var spectrum = rfft.spectrum;//Float 64 array

    //convert to regular array
    var arrSpect = [];
    for (l in spectrum){
      arrSpect.push(spectrum[l]);
    }

    //for normalize
    var temp;
    if ((temp = Math.max.apply(null, arrSpect)) > max){
      console.log(max = temp);
    }
    if ((temp = Math.min.apply(null, arrSpect)) < min){
      console.log(min = temp);
    }

    arr_stft.push(arrSpect);
  }
  //NORMALIZING
  for (t in arr_stft){
    for (f in arr_stft[t]){
      arr_stft[t][f] = (arr_stft[t][f] - min) / (max - min);
    }
  }

  console.log(arr_stft);

  //Finalizing
  return arr_stft.slice( arr_stft.length - config.timeShape, arr_stft.length );
}


function stft(ogSignal){//ASSUMING RATE = 16000
  var config = {
    nfft: 512,
    hopLength: 160,//16000 / 100 , 1/t
    winLength: 640,//16000 / 40 , 1/t
    rate: 16000,//downsampled
    step: 1600, /*for rolling, 1/10 of rate*/
    timeShape: 27,
    threshold: 0.0005
  };
  var signal = ogSignal;
  y = signal; /// REMOVABLE

  //CLEAN UP AUDIO
  var signalPos;
  var mask = [];
  for (signalPos = config.step/2; signalPos < signal.length - config.step/2; signalPos++){ /*CENTER IT*/

    var section = signal.slice(signalPos-config.step/2, signalPos+config.step/2);
    var sum = 0;
    for (k in section){
      sum += Math.abs(section[k]);
    }
    var average = sum / section.length;
    if (average > 0.0005){
      mask.push(true);
    }
    else{
      mask.push(false);
    }
  }
  var clean = [];
  for (a = 0; a < signal.length; a++){
    if (a < config.step/2 || a > signal.length - config.step/2){
      clean.push(signal[a]);
    }
    else{
      if (mask[a - config.step/2]){
        clean.push(signal[a]);
      }
      else {
        clean.push(0);
      }
    }
  }

  z = clean;

  //STFT

  var arr_stft = [];
  var max = -Infinity;
  var min = Infinity;
  for(n = 0; n < clean.length-config.winLength; n+= config.hopLength){
    var rfft = new RFFT(config.nfft, config.rate);//For dsp not to return NaN, nfft must be < hopLenght
    var sample = clean.slice(n, n+config.winLength);
    rfft.forward(sample);
    var spectrum = rfft.spectrum;//Float 64 array

    //convert to regular array
    var arrSpect = [];
    for (l in spectrum){
      arrSpect.push(spectrum[l]);
    }

    //for normalize
    var temp;
    if ((temp = Math.max.apply(null, arrSpect)) > max){
      max = temp;
    }
    if ((temp = Math.min.apply(null, arrSpect)) < min){
      min = temp;
    }

    arr_stft.push(arrSpect);
  }
  //NORMALIZING
  for (t in arr_stft){
    for (f in arr_stft[t]){
      arr_stft[t][f] = (arr_stft[t][f] - min) / (max - min);
    }
  }

  //console.log(arr_stft);

  //Finalizing
  return arr_stft.slice( 0, config.timeShape );
}
function cleanSignal(ogSignal, rate){
  var config = {
    nfft: 512,
    hopLength: 160,//16000 / 100 , 1/t
    winLength: 640,//16000 / 40 , 1/t
    rate: rate,//downsampled
    step: rate * 0.5, /*for rolling, 1/10 of rate*/
    timeShape: 27,
    threshold: 0.0005
  };
  signal = ogSignal;
  var signalPos;
  var mask = [];
  for (signalPos = config.step/2; signalPos < signal.length - config.step/2; signalPos++){ /*CENTER IT*/

    var section = signal.slice(signalPos-config.step/2, signalPos+config.step/2);
    var sum = 0;
    for (k in section){
      sum += Math.abs(section[k]);
    }
    var average = sum / section.length;
    if (average > 0.0005){
      mask.push(true);
    }
    else{
      mask.push(false);
    }
  }
  var clean = [];
  for (a = 0; a < signal.length; a++){
    if (a < config.step/2 || a > signal.length - config.step/2){
      clean.push(ogSignal[a]);
    }
    else{
      if (mask[a - config.step/2]){
        clean.push(ogSignal[a]);
      }
      else {
        clean.push(0);
      }
    }
  }
  return clean;
}
