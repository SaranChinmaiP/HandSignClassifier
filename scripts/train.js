
const LiveFeed = document.getElementsByClassName("input_LiveFeed")[0];
const canvasOut1 = document.getElementsByClassName("webCamContainer")[0];
const canvasOut2 = document.getElementsByClassName("cropContainer")[0];
const canvasCtx2 = canvasOut2.getContext("2d");
const canvasCtx1 = canvasOut1.getContext("2d");
const controlsElement3 = document.getElementsByClassName("control3")[0];
const fpsControl = new FPS();

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
    handIsThere = true;
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
  } else {
    handIsThere = false;
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
  maxNumHands: 2,
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


/////////////////////////////////////////////
let videoPlaying = true;
const ClassContainer = document.getElementsByClassName("classesCards");
const STATUS = document.getElementById("status");
const ENABLE_CAM_BUTTON = document.getElementById("Cam");
const RESET_BUTTON = document.getElementById("reset");
const TRAIN_BUTTON = document.getElementById("train");
const MOBILE_NET_INPUT_WIDTH = 224;
const MOBILE_NET_INPUT_HEIGHT = 224;
const STOP_DATA_GATHER = -1;
const CLASS_NAMES = [];
const EPOCHS_VALUE = document.getElementById("epochsValue");
const CONSOLE_LOG = document.getElementById("consoleLog");
const ADD_CLASS = document.getElementById("AddClass");
TRAIN_BUTTON.addEventListener("click", trainModel);
RESET_BUTTON.addEventListener("click", reset);
let epochParamter = EPOCHS_VALUE.value;
let classCounter = 1;
let classNameCounter = "";
EPOCHS_VALUE.addEventListener("keyup", function () {
  epochParamter = EPOCHS_VALUE.value;
});

//Creates New ClassName ClassContainer When + button is Pressed
function createNewClass() {
  const newCard = document.createElement("div");
  newCard.setAttribute("class", "classCard");
  ClassContainer[0].appendChild(newCard);
  // Adding Inner Child Elements to the New Class Card and Appending them .
  addInputBox(newCard);
}
/* Creates the Class Name Input Box and Data Collector Buttoons 
and Appends them to the Parent Card Div */
function addInputBox(newCard) {
  const newClassButton = document.createElement("button");
  newClassButton.setAttribute("class", "dataCollector");
  newClassButton.setAttribute("data-1hot", classCounter++);
  classNameCounter = "Class " + classCounter;
  newClassButton.setAttribute("data-name", classNameCounter);
  newClassButton.innerText = "📷";
  const newClassName = document.createElement("input");
  newClassName.setAttribute("class", "nameCollector");
  newClassName.setAttribute("placeholder", classNameCounter);
  newClassName.value = classNameCounter;
  console.log("New Class Created " + classNameCounter);
  //Appedening the Input Name Box and Data Collector Button to the Document
  newCard.appendChild(newClassName);
  newCard.appendChild(newClassButton);

}
/*Presing the WarmUp Button -runs this function 
Generates the Final Classes List and Activates the Data Collector Buttons
*/
function FeedClassName() {
  CLASS_NAMES.length = 0;
  let dataCollectorButtons = document.querySelectorAll("button.dataCollector");
  let nameCollector = document.querySelectorAll("input.nameCollector");
  for (let i = 0; i < dataCollectorButtons.length; i++) {
    dataCollectorButtons[i].addEventListener("mousedown", gatherDataForClass);
    dataCollectorButtons[i].addEventListener("mouseup", gatherDataForClass);

    // Populate the human readable names for classes.
    console.log(nameCollector[i].value);
    CLASS_NAMES.push(nameCollector[i].value);
  }
  /**
   * Prints the Classes List to the Status Box - asks to Gather Images
   */
  STATUS.innerText = "";
  for (let n = 0; n < CLASS_NAMES.length; n++) {
    STATUS.innerHTML += CLASS_NAMES[n] + " Gather Images Now " + "<br/>";
  }
  modelCompile();
}

let mobilenet = undefined;
let gatherDataState = STOP_DATA_GATHER;
let trainingDataInputs = [];
let trainingDataOutputs = [];
let examplesCount = [];
let predict = false;

/**
 * Loads the MobileNet model and warms it up so ready for use.
 **/
async function loadMobileNetFeatureModel() {
  const URL =
    "https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1";
  mobilenet = await tf.loadGraphModel(URL, { fromTFHub: true });
  STATUS.innerText = "MobileNet v3 loaded successfully!";

  // Warm up the model by passing zeros through it once.
  tf.tidy(function () {
    let answer = mobilenet.predict(
      tf.zeros([1, MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH, 3])
    );
    console.log(answer.shape);
  });
}

loadMobileNetFeatureModel();
model = tf.sequential();
model.add(
  tf.layers.dense({ inputShape: [1024], units: 128, activation: "relu" })
);

function modelCompile() {
  model.add(
    tf.layers.dense({ units: CLASS_NAMES.length, activation: "softmax" })
  );

  model.summary();

  // Compile the model with the defined optimizer and specify a loss function to use.
  model.compile({
    // Adam changes the learning rate over time which is useful.
    optimizer: "adam",
    // Use the correct loss function. If 2 classes of data, must use binaryCrossentropy.
    // Else categoricalCrossentropy is used if more than 2 classes.
    loss:
      CLASS_NAMES.length === 2
        ? "binaryCrossentropy"
        : "categoricalCrossentropy",
    // As this is a classification problem you can record accuracy in the logs too!
    metrics: ["accuracy"],
  });
}

/**
 * Check if getUserMedia is supported for webcam access.
 **/
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Enable the webcam with video constraints applied.
 * This Runs Automatically on Window Load.
 **/


/**
 * Handle Data Gather for button mouseup/mousedown.
 **/





function gatherDataForClass() {
  let classNumber = parseInt(this.getAttribute("data-1hot"));
  gatherDataState =
    gatherDataState === STOP_DATA_GATHER ? classNumber : STOP_DATA_GATHER;
  dataGatherLoop();
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



/**
 * When a button used to gather data is pressed, record feature vectors along with class type to arrays.
 **/
function dataGatherLoop() {
  // Only gather data if webcam is on and a relevent button is pressed.
  if (videoPlaying && gatherDataState !== STOP_DATA_GATHER) {
    // Ensure tensors are cleaned up.
    let imageFeatures = calculateFeaturesOnCurrentFrame();

    trainingDataInputs.push(imageFeatures);
    trainingDataOutputs.push(gatherDataState);

    // Intialize array index element if currently undefined.
    if (examplesCount[gatherDataState] === undefined) {
      examplesCount[gatherDataState] = 0;
    }
    // Increment counts of examples for user interface to show.
    examplesCount[gatherDataState]++;

    STATUS.innerText = "";
    for (let n = 0; n < CLASS_NAMES.length; n++) {
      STATUS.innerHTML +=
        CLASS_NAMES[n] + " data count: " + examplesCount[n] + ". " + "<br/>";
    }

    window.requestAnimationFrame(dataGatherLoop);
  }

  
}

/**
 * Once data collected actually perform the transfer learning.
 **/

async function trainModel() {
  predict = false;
  STATUS.innerHTML += "***TRAINING STARTED***";

  tf.util.shuffleCombo(trainingDataInputs, trainingDataOutputs);

  let outputsAsTensor = tf.tensor1d(trainingDataOutputs, "int32");
  let oneHotOutputs = tf.oneHot(outputsAsTensor, CLASS_NAMES.length);
  let inputsAsTensor = tf.stack(trainingDataInputs);
  let results = await model.fit(inputsAsTensor, oneHotOutputs, {
    shuffle: true,
    batchSize: 16,
    //epoch parameter can be varied in the page through input box.
    epochs: epochParamter,
    callbacks: { onEpochEnd: logProgress },
  });

  outputsAsTensor.dispose();
  oneHotOutputs.dispose();
  inputsAsTensor.dispose();
  predict = true;
  if (predict == true) {
    CONSOLE_LOG.innerHTML = `Accuracy : ${AccuracyFactor} %  Loss : ${LossFactor} % </br> `;
    CONSOLE_LOG.innerHTML += `Training Completed for : ${epochParamter} Epochs. </br>  Try Predict Now ! `;
  }
}

/**
 * Logs the  training progress.
 **/
let AccuracyFactor = 0;
let LossFactor = 0;
function logProgress(epoch, logs) {
  AccuracyFactor = Math.floor(logs.acc * 100);
  LossFactor = Math.floor(logs.loss * 100);
  CONSOLE_LOG.innerHTML = " ";
  console.log(epoch, logs);
  CONSOLE_LOG.innerHTML = `Training data for epoch ${epoch + 1}  </br> `;
  CONSOLE_LOG.innerHTML += `Accuracy : ${AccuracyFactor} %  Loss : ${LossFactor} %`;
}

/**
 *  Make live predictions from webcam once trained.
 * By Presing Predict Button on the Page.
 **/
function predictLoop() {
  if (predict) {
    tf.tidy(function () {
      let imageFeatures = calculateFeaturesOnCurrentFrame();
      let prediction = model.predict(imageFeatures.expandDims()).squeeze();
      let highestIndex = prediction.argMax().arraySync();
      let predictionArray = prediction.arraySync();
      STATUS.innerText =
        CLASS_NAMES[highestIndex] +
        " : " +
        Math.floor(predictionArray[highestIndex] * 100) +
        "% Confidence";
    });

    window.requestAnimationFrame(predictLoop);
  }
}



/**
 * Purge data and start over. Note this does not dispose of the loaded
 * MobileNet model and MLP head tensors as you will need to reuse
 * them to train a new model.
 **/
function reset() {
  predict = false;
  examplesCount.splice(0);
  for (let i = 0; i < trainingDataInputs.length; i++) {
    trainingDataInputs[i].dispose();
  }
  trainingDataInputs.splice(0);
  trainingDataOutputs.splice(0);
  STATUS.innerText = "No Data collected";

  console.log("Tensors in memory: " + tf.memory().numTensors);
}

/**
 * Downloads the Trained Model to the local Storages Download Folder
 * Two Files are Downloads , json and weights.bin files
 */
async function modelDownload() {
  await model.save("downloads://my-model");
}
// Starts the web-Camera  as soons as the Page opens.

function myFunction() {
  const x = document.getElementById("myTopnav");
  if (x.className === "topnav") {
    x.className += " responsive";
  } else {
    x.className = "topnav";
  }
}