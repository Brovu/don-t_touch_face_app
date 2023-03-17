import React, {useEffect, useRef, useState} from 'react';
import './App.css';
const soundURL = require('./assets/app.m4a')
const mobilenet = require('@tensorflow-models/mobilenet');
const  knnClassifier = require('@tensorflow-models/knn-classifier');
const {Howl, Howler} = require('howler');
const tf = require('@tensorflow/tfjs')
const {initNotifications, notify} = require('@mycv/f8-notification')


 var sound = new Howl({
  src: [soundURL]
});


const NOT_TOUCH_LABEL = 'not_touch'
const TOUCHED_LABEL = 'touched'
const TRAINING_TIME = 50
const TOUCHED_COFIDENCES = 0.8

function App() {
  const video = useRef();
  const mobilenetModule = useRef()
  const canPlaySound = useRef(true)
  const classifier = useRef()
  const [touched, setTouched] = useState(false)
  
  const init = async () => {
    await setUpCamera()
    
    classifier.current = knnClassifier.create()

    mobilenetModule.current = await mobilenet.load()

    initNotifications({cooldown: 3000})
  }

  const setUpCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia || 
      navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
      
      if(navigator.getUserMedia) {
        navigator.getUserMedia(
          {video: true},
          stream => {
            video.current.srcObject = stream
            video.current.addEventListener('loadeddata', resolve)
          },
          error => reject(error)
          )
        } else {
          reject();
        }
      })
    }

  const train = async label => {
    console.log(`${label}: `)
    for(let i = 0; i<TRAINING_TIME; ++i) {
      console.log(`${parseInt((i+1) / TRAINING_TIME * 100)} %`)

      await training(label)
    }
  }
  
  const training = label => {
    return new Promise( async resolve => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      );                                                
      classifier.current.addExample(embedding, label)
      await sleep(100)
      resolve() 
    })
  }

  const run = async () => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    );   
    const result = await classifier.current.predictClass(embedding)
    
    if(result.label === TOUCHED_LABEL && result.confidences[result.label] > TOUCHED_COFIDENCES) {
      console.log('TOUCHED')
      if(canPlaySound.current === true) {
        canPlaySound.current = false
        sound.play()
      }
      notify('Dừng lại', { body: 'Mày vừa chạm tay vô mặt kìa tl' })
      setTouched(true)
    } else {
      console.log('NOT TOUCH') 
      setTouched(false)
    }

    await sleep(200);
    run();
  }

  const sleep = ms => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  useEffect(() => {
    init();

    sound.on('end', function(){
      canPlaySound.current = true
    })

    return () => {

    }
  }, [])
  return (
    <div className={`App ${touched ? 'touched' : ''}`}>
      <video 
        ref={video}
        className='video'
        autoPlay
      />

      <div className='controll'>
        <button className='btn' onClick={() => {train(NOT_TOUCH_LABEL)}}>Warning</button>
        <button className='btn' onClick={() => {train(TOUCHED_LABEL)}}>Accept</button>
        <button className='btn' onClick={() => run()}>Run</button>
      </div>
    </div>
  );
}

export default App;
