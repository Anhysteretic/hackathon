import "./style.css";
import * as THREE from "three";
// Import the necessary loaders and controls
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js"; // <-- ADD THIS LINE
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"; // <-- ADD THIS LINE
import { positionWorld } from "three/tsl";

// --- DOM Elements ---
const homepageView = document.getElementById("homepage-view");
const modalView = document.getElementById("threejs-modal");
const openModalBtn = document.getElementById("open-modal-btn");
const closeModalBtn = document.getElementById("close-modal-btn");

const imagePopupOverlay = document.getElementById("image-popup-overlay");
const popupImage = document.getElementById("popup-image");
const popupDiscardBtn = document.getElementById("popup-discard-btn");
const popupCreateBtn = document.getElementById("popup-create-btn");

let currentImageUrl = null;

let renderer, scene, camera, controls, animationId;

let objectAddCounter = 0;
let negative = false;

// --- Popup Helper Functions ---
function showImagePopup(imageUrl) {
  currentImageUrl = imageUrl;
  popupImage.src = imageUrl;
  imagePopupOverlay.classList.add("visible");
}

function hideImagePopup() {
  imagePopupOverlay.classList.remove("visible");
  currentImageUrl = null;
  popupImage.src = "";
}

// --- View Switching Logic (remains the same) ---
openModalBtn.addEventListener("click", () => {
  homepageView.style.opacity = "0";
  homepageView.style.pointerEvents = "none";
  modalView.style.opacity = "1";
  modalView.style.pointerEvents = "auto";
  if (!renderer) {
    initThreeJS();
  }
  animate();
});

closeModalBtn.addEventListener("click", () => {
  modalView.style.opacity = "0";
  modalView.style.pointerEvents = "none";
  homepageView.style.opacity = "1";
  homepageView.style.pointerEvents = "auto";
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});

// --- Three.js Initialization (Updated) ---
function initThreeJS() {
  scene = new THREE.Scene();
  // Directly set the scene's background color
  scene.background = new THREE.Color(0xffffff);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000000
  );
  camera.position.z = 1500;
  camera.position.y = 1250;

  // We no longer need alpha: true since the background is set on the scene
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.id = "three-canvas";
  modalView.appendChild(renderer.domElement);

  // --- Controls Setup ---
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableRotate = true;
  controls.enablePan = false;
  controls.enableZoom = true;

  // --- Lighting (Updated for brightness) ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // Increased intensity
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  // --- Model Loading ---
  const mtlLoader = new MTLLoader();
  const objLoader = new OBJLoader();

  mtlLoader.load(
    "/table/table.mtl",
    (materials) => {
      materials.preload();
      objLoader.setMaterials(materials);
      objLoader.load(
        "/table/table.obj",
        (object) => {
          new THREE.Box3()
            .setFromObject(object)
            .getCenter(object.position)
            .multiplyScalar(-1);
          scene.add(object);
        },
        (xhr) => console.log((xhr.loaded / xhr.total) * 100 + "% loaded"),
        (error) =>
          console.error("An error happened while loading the obj model:", error)
      );
    },
    (xhr) => console.log((xhr.loaded / xhr.total) * 100 + "% loaded"),
    (error) =>
      console.error("An error happened while loading the mtl file:", error)
  );

  window.addEventListener("resize", onWindowResize, false);
}

// --- Animation Loop ---
function animate() {
  animationId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// --- Resize Handler ---
function onWindowResize() {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}


popupDiscardBtn.addEventListener('click', hideImagePopup);

// --- NEW VERSION WITH LOADING STATE ---
popupCreateBtn.addEventListener('click', async () => { // <-- Make the function async
  if (!currentImageUrl) return;

  // 1. --- SHOW LOADING STATE ---
  // Disable both buttons so the user can't click again
  popupCreateBtn.disabled = true;
  popupDiscardBtn.disabled = true;
  // Change the button text to give feedback
  popupCreateBtn.textContent = "Creating... (can take a minute)";

  try {
    // 2. --- DO THE WAITING ---
    // Your browser will pause on this line until the server responds.
    // This could take a long time, but the UI is now showing a loading state.
    const modelUrl = await generateReplicate3dModel(currentImageUrl);

    // 3. --- HANDLE THE RESULT ---
    // If the await succeeds, load the model
    createThreeObject(modelUrl);

    // createThreeObject("https://replicate.delivery/yhqm/OMz0CdI9DKbOF1WPIUm8PwrMkcDLc591xg5YPX8x8n5RwTOF/output.glb")
    
    // We hide the popup on success
    hideImagePopup();

  } catch (error) {
    console.error("Failed to create and load 3D object:", error);
    alert(`Could not create the 3D model: ${error.message}`);
    // If it fails, we still want to hide the popup
    hideImagePopup();
  } finally {
    // 4. --- CLEAN UP THE UI ---
    // This 'finally' block runs whether it succeeded or failed,
    // ensuring your UI never gets stuck in a loading state.
    popupCreateBtn.disabled = false;
    popupDiscardBtn.disabled = false;
    popupCreateBtn.textContent = "Create 3D Model";
  }
});

// --- DOM ELEMENT SELECTION ---
const promptInput = document.getElementById("prompt-input");

// --- CORE API LOGIC ---

/**
 * Calls the AI API via your Vite proxy and returns a promise that resolves with the final image URL.
 * THIS VERSION CONTAINS THE FIX FOR THE POLLING CORS ERROR.
 */
async function getFluxKontextProImageLink(prompt) {
    try {
        // Step 1: Call the LOCAL proxy path. Vite will forward it.
        const initialResponse = await fetch('/api/v1/flux-kontext-pro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        if (!initialResponse.ok) {
            const errorBody = await initialResponse.text();
            throw new Error(`Proxy request failed: ${initialResponse.statusText}. Body: ${errorBody}`);
        }

        const initialData = await initialResponse.json();
        const { id: requestId, polling_url: pollingUrl } = initialData;

        // --- THE CRITICAL FIX IS HERE ---
        // This robustly handles any regional subdomain (like api.us.bfl.ai)
        const urlObject = new URL(pollingUrl);
        const pollPath = `/api${urlObject.pathname}`;

        // Step 2: Poll for the result using the corrected path
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay
            const resultResponse = await fetch(`${pollPath}?id=${requestId}`);

            if (!resultResponse.ok) {
                console.warn(`Polling request failed with status: ${resultResponse.status}`);
                continue; // Try again on the next loop
            }

            const resultData = await resultResponse.json();

            if (resultData.status === 'Ready') {
                console.log(`Image ready: ${resultData.result.sample}`);
                return resultData.result.sample; // Success! Return the final URL.
            }
            if (resultData.status === 'Error' || resultData.status === 'Failed') {
                throw new Error(`Image generation failed: ${resultData.status}`);
            }
            console.log(`Status: ${resultData.status}, polling again...`);
        }
    } catch (error) {
        console.error('An error occurred in getFluxKontextProImageLink:', error);
        throw error; // Pass the error up to be handled by the event listener
    }
}

// --- THREE.JS INTEGRATION ---

// src/main.js

/**
 * A resilient function to generate a 3D model using the Replicate API.
 * CORRECTED TO USE THE VITE PROXY FOR POLLING.
 *
 * @param {string} imageUrl The URL of the input image.
 * @returns {Promise<string>} A promise that resolves with the URL of the generated model file.
 * @throws {Error} Throws an error only if the prediction job status becomes 'failed' or 'canceled'.
 */
async function generateReplicate3dModel(imageUrl) {
  console.log("Attempting to generate a 3D model from image...");

  let pollUrl;

  // Step 1: Persistently try to initiate the prediction via the proxy
  while (!pollUrl) {
    try {
      const initialResponse = await fetch('/replicate-api/v1/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: "e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c",
          input: {
            images: [imageUrl],
            texture_size: 2048,
            mesh_simplify: 0.9,
            generate_model: true,
            save_gaussian_ply: true,
            ss_sampling_steps: 38,
          }
        }),
      });

      if (initialResponse.ok) {
        const prediction = await initialResponse.json();
        pollUrl = prediction.urls.get; // This will be the full URL e.g., https://api.replicate.com/...
        console.log("Prediction successfully initiated. Full polling URL:", pollUrl);
      } else {
        const errorText = await initialResponse.text();
        console.error(`API request to create prediction failed (${initialResponse.status}): ${errorText}. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error(`Network error while creating prediction: ${error.message}. Retrying...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // --- THE CRITICAL FIX IS HERE ---
  // Transform the absolute polling URL into a relative path that targets the proxy.
  const urlObject = new URL(pollUrl);
  const relativePollPath = `/replicate-api${urlObject.pathname}`;
  console.log("Polling via proxy path:", relativePollPath);

  // Step 2: Persistently poll for the final result using the corrected PROXY PATH
  while (true) {
    try {
      // Use the relative path so the request goes through Vite's proxy
      const pollResponse = await fetch(relativePollPath);

      if (!pollResponse.ok) {
        const errorText = await pollResponse.text();
        console.error(`Failed to poll prediction status (${pollResponse.status}): ${errorText}. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      const pollResult = await pollResponse.json();

      switch (pollResult.status) {
        case 'succeeded':
          console.log('Success! Received final data from Replicate:', pollResult.output);
          return pollResult.output.model_file;
        case 'failed':
        case 'canceled':
          throw new Error(`Replicate job terminated with status '${pollResult.status}'. Error: ${pollResult.error?.detail}`);
        default:
          console.log(`Status is '${pollResult.status}'. Waiting before next check...`);
          break;
      }
    } catch (error) {
      if (error.message.includes("Replicate job terminated")) {
          throw error;
      }
      console.error(`Network error while polling: ${error.message}. Retrying...`);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

function createThreeObject(modelUrl) {
  console.log("Loading .glb model into scene from:", modelUrl);

  const loader = new GLTFLoader(); // <-- Use GLTFLoader

  loader.load(
    modelUrl,
    (gltf) => {
      // .glb files contain a full scene, including materials and meshes.
      // You can directly access the main object via gltf.scene.
      const model = gltf.scene;

      // Unlike PLY, GLB files often have materials already set up.
      // We don't need to create a new material unless we want to override it.

      if (!negative && objectAddCounter == 2){
        negative = true;
        objectAddCounter = 1;
      }

      let SPACING = 0;
      if (negative){
        SPACING = -350;
      } else {
        SPACING = 350;
      }
      const x_pos = (objectAddCounter) * SPACING;

      model.scale.set(300, 300, 300); // Adjust scale as needed
      model.position.y = 450;         // Adjust height to be on the table
      model.position.x = x_pos;

      scene.add(model);
      console.log("Successfully added 3D model to the scene.");

      objectAddCounter++;
    },
    (xhr) => {
      console.log(`3D Model: ${((xhr.loaded / xhr.total) * 100).toFixed(2)}% loaded`);
    },
    (error) => {
      console.error('Error loading GLB model:', error);
    }
  );
}

// --- EVENT LISTENER ---

// This listener handles the user pressing 'Enter'.
// It is now ASYNC to correctly handle waiting for the API response.
promptInput.addEventListener("keydown", async (event) => {
  // Check if the key pressed was 'Enter' and the input isn't empty
  if (event.key === "Enter" && promptInput.value.trim() !== "") {
    event.preventDefault(); // Prevents any default 'Enter' behavior

    const userPrompt = promptInput.value.trim();
    console.log(`User prompted: "${userPrompt}"`);
    promptInput.disabled = true; // Disable input during processing

    try {
        // THIS IS THE FIX: We now 'await' the result here.
        // The 'link' variable will contain the final URL string, not a Promise.
        const link = await getFluxKontextProImageLink(userPrompt);

        // Now that we have the link, we can use it.
        console.log("Successfully received link:", link);

        showImagePopup(link);

    } catch (error) {
        console.error("Failed to get link and create object:", error);
        alert(`An error occurred: ${error.message}`); // Notify the user
    } finally {
        // This block runs whether it succeeded or failed.
        promptInput.value = ""; // Clear the input box for the next prompt
        promptInput.disabled = false; // Re-enable the input
        promptInput.focus(); // Set focus back to the input
    }
  }
});
