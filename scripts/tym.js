
const hexArray = [   "ff3300",  "FFFF00",  "e600e6",  "e68a00",  "0066ff",  "1a53ff",  "AFEEEE",  "B0C4DE",  "FFDEAD",  "DCDCDC",
  "BA55D3",  "20B2AA",  "DDA0DD",  "ffff1a",  "00BFFF",  "7FFF00",  "ff1a66","FFE4B5", ];

/////////////////////////////////////////////
const LiveFeed = document.getElementById("input_LiveFeed");
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
let epochParamter = EPOCHS_VALUE.value;
let classCounter = 1;
let classNameCounter = "";
let videoPlaying = false;

TRAIN_BUTTON.addEventListener("click", trainModel);
RESET_BUTTON.addEventListener("click", reset);
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
  createBars();
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
function enableCam() {
  if (hasGetUserMedia()) {
    // getUsermedia parameters.
    const constraints = {
    
      video: { width: 350, height: 350  },
          
    };

    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
      LiveFeed.srcObject = stream;
      LiveFeed.addEventListener("loadeddata", function () {
        videoPlaying = true;
      });
    });
  } else {
    console.warn("getUserMedia() is not supported by your browser");
  }
}
function playCam(){
LiveFeed.play();
videoPlaying = true;

}

function pauseCam(){
LiveFeed.pause();
videoPlaying = false;

}
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
    let videoFrameAsTensor = tf.browser.fromPixels(LiveFeed);
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
        updateProgressBar( predictionArray );

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

let rate = 40 ,i = 0 ,createBarFlag = true ;
const box = document.querySelector(".Box");



/* Updates the Confidence rate in the Bar Graphs Output*/
function updateProgressBar(predictionArray) {
  for(i = 0 ; i < CLASS_NAMES.length ; i++){
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
    for (let i = 0; i < CLASS_NAMES.length; i++) {
      box.innerHTML += `<span>${CLASS_NAMES[i]} : </span><div class="progress">   
     <div style = "background: #${hexArray[i]}"class="progress__fill"></div>
    <span class="progress__text">0%</span>
  </div>`;
    }
    createBarFlag = false

  } else {
    console.log("Already Created");
  }
}


window.onload = enableCam();
