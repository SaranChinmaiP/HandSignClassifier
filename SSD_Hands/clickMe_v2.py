import numpy as np
import math
import time
import pyttsx3
import cv2
from cvzone.HandTrackingModule import HandDetector
from cvzone.ClassificationModule import Classifier
#bg-1 (740 , 200 ) , bg-2((750, 135)) bg-3 ((750, 135))
Model_Path = "D:\SSD_Hands\Resources\Model12\keras_model.h5"
label_Path = "D:\SSD_Hands\Resources\Model12\labels.txt"
Bg_Path = 'D:/SSD_Hands/Resources/bg3.png'
print(Model_Path,label_Path , Bg_Path)

cap = cv2.VideoCapture(0)
detector = HandDetector(maxHands=1)
classifier = Classifier(Model_Path, label_Path)
engine = pyttsx3.init()

offset = 20
imgSize = 300
labels = [ 'Stay Strong','Stop','See You','I Disagree','Good Job',' Good Luck',' Hello', 'I Love You', 
          'Up', 'Peace', 'Smile', 'Well Done']
className = labels[0]

while True:
    imgBackground = cv2.imread(Bg_Path)
    success, img = cap.read()
    img = cv2.flip(img, 1)
    imgOutput = img.copy()
    hands, img = detector.findHands(img)
    
    if hands:
        hand = hands[0]
        x, y, w, h = hand['bbox']

        imgWhite = np.ones((imgSize, imgSize, 3), np.uint8) * 255
        imgCrop = img[y - offset:y + h + offset, x - offset:x + w + offset]

        imgCropShape = imgCrop.shape
        if(len(imgCrop) == 0):
            print('Error : Flaw Detected')
            continue     

        aspectRatio = h / w

        if aspectRatio > 1:
            k = imgSize / h
            wCal = math.ceil(k * w)
            imgResize = cv2.resize(imgCrop, (wCal, imgSize))
            imgResizeShape = imgResize.shape
            wGap = math.ceil((imgSize - wCal) / 2)
            imgWhite[:, wGap:wCal + wGap] = imgResize
            prediction, index = classifier.getPrediction(imgWhite, draw=False)

        else:
            k = imgSize / w
            hCal = math.ceil(k * h)
            imgResize = cv2.resize(imgCrop, (imgSize, hCal))
            imgResizeShape = imgResize.shape
            hGap = math.ceil((imgSize - hCal) / 2)
            imgWhite[hGap:hCal + hGap, :] = imgResize

            prediction, index = classifier.getPrediction(imgWhite, draw=False)
        className = labels[index]
        cv2.putText(imgOutput, className , (x, y -26), cv2.FONT_HERSHEY_COMPLEX, 1, (128, 0, 128), 2)
        cv2.putText(imgBackground, className, (750, 135), cv2.FONT_HERSHEY_SIMPLEX,1, (51, 133, 255), 1, cv2.LINE_AA)

        cv2.rectangle(imgOutput, (x-offset, y-offset),
                      (x + w+offset, y + h+offset), (255, 0, 255), 3)
        imgBackground[275:275 + 300, 730:730 +300 ] = imgWhite             
         
    imgBackground[162:162 + 480, 55:55 + 640] = imgOutput
    cv2.imshow("Hand Sign Classification Project", imgBackground)

    key = cv2.waitKey(1)
    if key == ord('s'):
            engine.say(className)
            engine.runAndWait()
    if key == ord("q"):
        break
              
cv2.destroyAllWindows()
cap.release()