window.onload = function(){
    var start = document.getElementsByClassName("action-button")[1],
        stop = document.getElementById("stop"),
        audioCtx = new (window.AudioContext || window.webkitAudioContext)(),
        xhr = new XMLHttpRequest(),
        pitch = {step: 0, min: 0.8, max: 8.2},
        source, intervalId;
  
    function createPitchStep(n) {
      return function(e) {
        if (e.keyCode == 38) {
          pitch.step = n;
        }
      }
    }
  
    xhr.open("GET", "assets/audio/engine.wav", true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function(e){
      var audioData = this.response;
  
      window.addEventListener("keydown", createPitchStep(0.03))
      window.addEventListener("keyup", createPitchStep(-0.02))
  
      start.addEventListener("click", function(e){
        if (!source) {
          source = audioCtx.createBufferSource();
  
          audioCtx.decodeAudioData(audioData, function(buffer) {
            source.buffer = buffer;
            source.loop = true;
            source.connect(audioCtx.destination);
            source.start();
          });
  
          intervalId = setInterval(function(){
            var currPitch = source.playbackRate.value;
  
            if ((pitch.step < 0 && currPitch > pitch.min) ||
                (pitch.step > 0 && currPitch < pitch.max)) {
              source.playbackRate.value += pitch.step;
            }
          }, 2);
        }
      });
  
      stop.addEventListener("click", function(e){
        if (source) {
          source.stop();
          source = null;
          clearInterval(intervalId);
        }
      });
    };
  
    xhr.send();
  };