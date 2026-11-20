# Face-API.js Model Weights

This directory should contain the face-api.js model weights required for liveness detection.

## Required Models

The following model files are required:

- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_landmark_68_model-shard2`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`
- `face_recognition_model-shard3`
- `face_recognition_model-shard4`

## How to Download

### Option 1: Download from GitHub Releases

Visit the face-api.js GitHub releases page:
https://github.com/justadudewhohacks/face-api.js/releases

Download the models zip file and extract the following files to this directory:
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_landmark_68_model-shard2`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`
- `face_recognition_model-shard3`
- `face_recognition_model-shard4`

### Option 2: Use npm package with models

Alternatively, you can use the `face-api.js` npm package which includes the models:

```bash
npm install face-api.js
```

Then copy the models from `node_modules/face-api.js/weights` to this directory.

## Model Size

The total size of these models is approximately 10-15 MB.

## Note

Without these model files, the liveness detection component will fail to load and display an error message.
