console.log('Test Script Runnning ');

/**
 * MediaPipe Hand Tracking Module
 * Camera Control and Canvas Control

 */
const LiveFeed = document.getElementsByClassName("input_LiveFeed")[0];
const canvasOut1 = document.getElementsByClassName("webCamContainer")[0];
const canvasOut2 = document.getElementsByClassName("cropContainer")[0];
const canvasCtx2 = canvasOut2.getContext("2d");
const canvasCtx1 = canvasOut1.getContext("2d");
const box = document.querySelector(".Box");
const controlsElement3 = document.getElementsByClassName("control3")[0];
const fpsControl = new FPS();
const speechButton = document.getElementById('speechButton') ;
const hexArray = [  "FFE4B5",  "ff3300",  "FFFF00",  "e600e6",  "e68a00",  "0066ff",  "1a53ff",  "AFEEEE",  "B0C4DE",  "FFDEAD",  "DCDCDC",
  "BA55D3",  "20B2AA",  "DDA0DD",  "ffff1a",  "00BFFF",  "7FFF00",  "ff1a66",];
const className = ['Stay Strong' , 'Stop', 'I Love You '] ;
speechButton.addEventListener('mousedown',outputReadOut);

function onResultsHands(results) {
  {
    canvasCtx2.drawImage(canvasOut1, 300, 100, 300, 300, 0, 0, 300, 300);
  }
  document.body.classList.add("loaded");
  fpsControl.tick();

  canvasCtx1.save();
  canvasCtx1.clearRect(0, 0, canvasOut1.width, canvasOut1.height);
  canvasCtx1.drawImage(results.image, 0, 0, canvasOut1.width, canvasOut1.height);
  {
    canvasCtx1.beginPath();
    canvasCtx1.rect(300,100, 300, 300);
    canvasCtx1.lineWidth = 0.5;
    canvasCtx1.strokeStyle = "purple";
    canvasCtx1.stroke();
  }
  if (results.multiHandLandmarks && results.multiHandedness) {
    predictLoop();
    for (let index = 0; index < results.multiHandLandmarks.length; index++) {
      const classification = results.multiHandedness[index];
      const isRightHand = classification.label === "Right";
      const landmarks = results.multiHandLandmarks[index];
      drawConnectors(canvasCtx1, landmarks, HAND_CONNECTIONS, {
        color: isRightHand ? "#FFFFFF" : "#FFFFFF",
        lineWidth: 2,
      }),
        drawLandmarks(canvasCtx1, landmarks, {
          color: isRightHand ? "#FF0000" : "#FF0000",
          fillColor: isRightHand ? "#FF0000" : "#FF0000",
          radius: (x) => {
            return lerp(x.from.z, 0.5, 0.1, 10, 1);
          },
        });
    }
  } 
  canvasCtx1.restore();
}

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.1/${file}`;
  },
});
hands.onResults(onResultsHands);

const camera = new Camera(LiveFeed, {
  onFrame: async () => {
    await hands.send({ image: LiveFeed });
  },
  width: 640,
  height: 480,
});
camera.start();

new ControlPanel(controlsElement3, {
  selfieMode: true,
  maxNumHands: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
})
  .add([
    new StaticText({ title: "MediaPipe Hands" }),
    fpsControl,
    new Toggle({ title: "Selfie Mode", field: "selfieMode" }),
    new Slider({
      title: "Max Number of Hands",
      field: "maxNumHands",
      range: [1, 4],
      step: 1,
    }),
    new Slider({
      title: "Min Detection Confidence",
      field: "minDetectionConfidence",
      range: [0, 1],
      step: 0.01,
    }),
    new Slider({
      title: "Min Tracking Confidence",
      field: "minTrackingConfidence",
      range: [0, 1],
      step: 0.01,
    }),
  ])
  .on((options) => {
    LiveFeed.classList.toggle("selfie", options.selfieMode);
    hands.setOptions(options);
  });

/**
 * Loading the Model from Loacl file System 
 * Predicting the OutPut
 * 
 */


const STATUS = document.getElementById("status");
const MOBILE_NET_INPUT_WIDTH = 224;
const MOBILE_NET_INPUT_HEIGHT = 224;
const speech = new SpeechSynthesisUtterance();
speech.text = 'Load the Models and start Predictions' ;
let model = undefined, mobilenet = undefined;
let predict = false , modelLoaded = false, mobilenetLoaded = false
let maxPredictions = className.length ;
let imageFeatures = undefined , prediction = undefined , highestIndex  = undefined , predictionArray = undefined ;
let roundedPercentage = 40 ;
let rate = 40 ,i = 0 ,createBarFlag = true ;



async function loadMobileNetFeatureModel() {
    console.log('Info :  Loading MobileNet FeatureModel V3  ');
    window.alert("MobileNet-V3 is Loading , Check Status box ");

    const URL =
      "https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1";
    mobilenet = await tf.loadGraphModel(URL, { fromTFHub: true });
    STATUS.innerText = "MobileNet v3 loaded successfully!";
    mobilenetLoaded = true
  
    // Warm up the model by passing zeros through it once.
    tf.tidy(function () {
      let answer = mobilenet.predict(
        tf.zeros([1, MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH, 3])
      );
      console.log(answer.shape);
    });

  }

 
async function loadModel(){
    console.log("Info : Loading Model - JSON and Weights") ;
     model = await tf.loadLayersModel(
        'https://saranchinmaip.github.io/HandSignClassifier/myModel/my-model.json');
   model.summary();
   modelLoaded = true ;
   createBars() ;
   window.alert("Model Loaded SucessFully , 3️⃣Start-Model Now");


}
function Check(){
  if(modelLoaded && mobilenetLoaded){
predict = true ;
console.log("Info : Predict Cycle Started") ;

  }else{
    window.alert('Info :Please Load the Models') ;
  }
}
function outputReadOut(){
  speechSynthesis.speak(speech);
}
function predictLoop() {
  
    if (predict) {
      tf.tidy
      (function () {
        imageFeatures = calculateFeaturesOnCurrentFrame();
        prediction = model.predict(imageFeatures.expandDims()).squeeze();
        highestIndex    = prediction.argMax().arraySync();
        predictionArray = prediction.arraySync();
        roundedPercentage =  Math.floor(predictionArray[highestIndex] * 100)  ;
        STATUS.innerText    = className[highestIndex] +  " : " +   roundedPercentage +     "% Confidence";
        speech.text = highestIndex;

        updateProgressBar(    predictionArray       );
        

      });
  
      // window.requestAnimationFrame(predictLoop);
    }
    
    
  }
  function calculateFeaturesOnCurrentFrame() {
    return tf.tidy(function () {
      // Grab pixels from current VIDEO frame.
      let videoFrameAsTensor = tf.browser.fromPixels(canvasOut2);
      // Resize video frame tensor to be 224 x 224 pixels which is needed by MobileNet for input.
      let resizedTensorFrame = tf.image.resizeBilinear(
        videoFrameAsTensor,
        [MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH],
        true
      );
      let normalizedTensorFrame = resizedTensorFrame.div(255);
      return mobilenet.predict(normalizedTensorFrame.expandDims()).squeeze();
    });
  }
    

  
// Suppose there are two HTML file input (`<input type="file" ...>`)
// elements.
const uploadJSONInput = document.getElementById('upload-json');
const uploadWeightsInput = document.getElementById('upload-weights');
async function UploadModel(){
   
     model =  await tf.loadLayersModel(tf.io.browserFiles( [uploadJSONInput.files[0], uploadWeightsInput.files[0]]));
     modelLoaded = true ;
     window.alert("Model Loaded SucessFully , 3️⃣ Start-Model now");

}

/* Updates the Confidence rate in the Bar Graphs Output*/
function updateProgressBar(predictionArray) {
  for(i = 0 ; i < maxPredictions ; i++){
    rate =  Math.floor(predictionArray[i] * 100)  ;
    box.getElementsByClassName("progress")[i].querySelector(".progress__fill").style.width = `${rate}%`;
    box.getElementsByClassName("progress")[i].querySelector(   ".progress__text" ).textContent = `${i} : ${rate}%`;
  }
  /*  */
  
}
/* Creates Bars when Start Model i.e, init() is Pressed */
function createBars() {
  if (createBarFlag) {
    console.log(" Created Confidence Bar graphs  ");
    for (let i = 0; i < maxPredictions; i++) {
      box.innerHTML += `<span>${className[i]} : </span><div class="progress">   
     <div style = "background: #${hexArray[i]}"class="progress__fill"></div>
    <span class="progress__text">0%</span>
  </div>`;
    }
    createBarFlag = false

  } else {
    console.log("Already Created");
  }
}
