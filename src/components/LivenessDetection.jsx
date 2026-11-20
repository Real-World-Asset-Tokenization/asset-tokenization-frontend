import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';

const LivenessDetection = ({ onCapture, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [challengePhase, setChallengePhase] = useState('idle'); // idle, prompt, detecting, done
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [progress, setProgress] = useState(0);
  const [debug, setDebug] = useState({
    faceFound: false,
    confidence: 0,
    message: 'Initializing...'
  });

  // Challenge configuration
  const challenges = [
    { type: 'smile', prompt: 'Smile', icon: '😄' },
    { type: 'blink', prompt: 'Blink', icon: '👁️' },
    { type: 'nod', prompt: 'Nod', icon: '↕️' },
  ];

  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [capturedFrame, setCapturedFrame] = useState(null);

  useEffect(() => {
    loadModelsAndStart();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const loadModelsAndStart = async () => {
    try {
      setLoading(true);
      setDebug({ ...debug, message: 'Loading face detection models...' });

      const MODEL_URL = '/models';
      
      // Load models with proper error handling
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      ]).catch(err => {
        console.error('Model loading error:', err);
        throw new Error('Failed to load face detection models. Please check your connection.');
      });

      setModelsLoaded(true);
      setDebug({ ...debug, message: 'Models loaded. Starting camera...' });

      await startCamera();
    } catch (err) {
      console.error('Initialization error:', err);
      setError(err.message);
      setDebug({ ...debug, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setVideoReady(true);
          setDebug({ ...debug, message: 'Camera ready! Click Start to begin.' });
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied. Please allow camera access and try again.');
      setDebug({ ...debug, message: 'Camera access denied' });
    }
  };

  const startChallenge = () => {
    // Select random challenges
    const shuffled = [...challenges].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 2); // 2 challenges for faster testing
    setCompletedChallenges([]);
    setProgress(0);
    setChallengePhase('prompt');
    setCurrentChallenge(selected[0]);
    setDebug({ ...debug, message: `Challenge 1: ${selected[0].prompt}` });

    // Start detection after showing prompt for 2 seconds
    setTimeout(() => {
      setChallengePhase('detecting');
      startDetection(selected);
    }, 2000);
  };

  const startDetection = (challengeList) => {
    let currentIdx = 0;
    let detectionResults = {};

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || currentIdx >= challengeList.length) {
        if (currentIdx >= challengeList.length) {
          // All challenges passed
          clearInterval(intervalRef.current);
          setChallengePhase('done');
          captureFinalFrame();
        }
        return;
      }

      const challenge = challengeList[currentIdx];
      
      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.4
          }))
          .withFaceLandmarks();

        if (detection && detection.detection.score > 0.5) {
          setDebug({
            faceFound: true,
            confidence: Math.round(detection.detection.score * 100),
            message: `Face found (${Math.round(detection.detection.score * 100)}%)`
          });

          const landmarks = detection.landmarks;
          let passed = false;

          switch (challenge.type) {
            case 'smile':
              passed = detectSmile(landmarks);
              break;
            case 'blink':
              passed = detectBlink(landmarks);
              break;
            case 'nod':
              passed = detectNod(landmarks);
              break;
          }

          if (passed) {
            // Move to next challenge
            currentIdx++;
            setCompletedChallenges(prev => [...prev, challenge.type]);
            setProgress((currentIdx / challengeList.length) * 100);
            
            if (currentIdx < challengeList.length) {
              setChallengePhase('prompt');
              setCurrentChallenge(challengeList[currentIdx]);
              setDebug({ ...debug, message: `Challenge ${currentIdx + 1}: ${challengeList[currentIdx].prompt}` });
              
              // Next detection after 2 seconds
              setTimeout(() => {
                setChallengePhase('detecting');
              }, 2000);
            } else {
              clearInterval(intervalRef.current);
              setChallengePhase('done');
              captureFinalFrame();
            }
          }
        } else {
          setDebug({
            faceFound: false,
            confidence: detection ? Math.round(detection.detection.score * 100) : 0,
            message: detection ? 'Face confidence too low' : 'No face detected'
          });
        }
      } catch (err) {
        console.error('Detection error:', err);
        setDebug({ ...debug, message: 'Detection error' });
      }
    }, 200); // Check every 200ms
  };

  const detectSmile = (landmarks) => {
    const mouth = landmarks.getMouth();
    // Get mouth landmarks
    const mouthWidth = Math.abs(mouth[6].x - mouth[0].x); // mouth corners
    const mouthHeight = Math.abs(mouth[14].y - mouth[2].y); // upper and lower lip
    
    // Smile = wider mouth relative to height
    return mouthWidth > 60 && mouthWidth / mouthHeight > 2.5;
  };

  const detectBlink = (landmarks) => {
    // Simplified blink detection using eye landmarks
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    // Calculate eye aspect ratio
    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2;
    
    // Eyes closed when EAR < 0.25
    return avgEAR < 0.25;
  };

  const calculateEAR = (eye) => {
    const A = Math.sqrt(Math.pow(eye[1].x - eye[5].x, 2) + Math.pow(eye[1].y - eye[5].y, 2));
    const B = Math.sqrt(Math.pow(eye[2].x - eye[4].x, 2) + Math.pow(eye[2].y - eye[4].y, 2));
    const C = Math.sqrt(Math.pow(eye[0].x - eye[3].x, 2) + Math.pow(eye[0].y - eye[3].y, 2));
    return (A + B) / (2 * C);
  };

  const detectNod = (landmarks) => {
    // Simplified nod detection
    // Look at nose position relative to eyes
    const nose = landmarks.getNose()[3];
    const leftEye = landmarks.getLeftEye()[0];
    const rightEye = landmarks.getRightEye()[3];
    
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;
    const noseY = nose.y;
    
    // Nod down = nose below eye center
    return noseY > eyeCenterY + 10;
  };

  const captureFinalFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], 'liveness-capture.jpg', { type: 'image/jpeg' });
        onCapture(file, {
          passed: true,
          challenges: completedChallenges,
          score: 100
        });
      }, 'image/jpeg', 0.95);
    }
  };

  const resetAndRetry = () => {
    setChallengePhase('idle');
    setCompletedChallenges([]);
    setProgress(0);
    setCurrentChallenge(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-zinc-300">{debug.message}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-xl">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6 bg-zinc-900 rounded-xl max-w-md">
      <h3 className="text-xl font-semibold text-white mb-4">Liveness Detection</h3>
      
      {/* Progress bar */}
      <div className="w-full bg-zinc-700 rounded-full h-2 mb-4">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Video feed */}
      <div className="relative mb-4">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-80 h-60 object-cover rounded-lg bg-black"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Debug overlay */}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded">
          <div>Face: {debug.faceFound ? '✓' : '✗'}</div>
          <div>Confidence: {debug.confidence}%</div>
        </div>
      </div>

      {/* Challenge display */}
      {challengePhase !== 'idle' && currentChallenge && (
        <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-4 mb-4 w-80 text-center">
          <div className="text-4xl mb-2">{currentChallenge.icon}</div>
          <p className="text-blue-300 font-medium text-lg">{currentChallenge.prompt}</p>
          <p className="text-blue-400 text-sm mt-1">{debug.message}</p>
        </div>
      )}

      {/* Challenge progress dots */}
      {challengePhase !== 'idle' && (
        <div className="flex gap-2 mb-4">
          {[0, 1].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full ${
                i < completedChallenges.length ? 'bg-green-500' :
                i === completedChallenges.length ? 'bg-blue-500 animate-pulse' :
                'bg-zinc-600'
              }`}
            />
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {challengePhase === 'idle' && (
          <button
            onClick={startChallenge}
            disabled={!videoReady || !modelsLoaded}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Verification
          </button>
        )}
        
        {challengePhase === 'done' && (
          <>
            <button
              onClick={() => {
                // Simulate upload
                onCapture(new File(['test'], 'test.jpg', { type: 'image/jpeg' }), {
                  passed: true,
                  challenges: completedChallenges,
                  score: 100
                });
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Complete
            </button>
            <button
              onClick={resetAndRetry}
              className="px-6 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
            >
              Retry
            </button>
          </>
        )}
        
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
        >
          Cancel
        </button>
      </div>

      {!videoReady && !loading && (
        <p className="text-yellow-400 text-sm mt-4">Please wait for camera to initialize...</p>
      )}
    </div>
  );
};

export default LivenessDetection;
