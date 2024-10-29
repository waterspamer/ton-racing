
var currentSpeed = 0.0;

var currentGear = 0;

var currentRpm = 800;

var gasPressed = false;



function start(){

}

function shiftUp(){
    if (gasPressed) return;

    currentGear++;
}

