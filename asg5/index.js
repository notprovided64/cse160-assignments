import * as THREE from "three";
import { TGALoader } from 'three/addons/loaders/TGALoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

let scene, camera, controls, renderer;

let loadManager, textureLoader, gltfLoader, tgaLoader, exrLoader, objLoader;
let textures, models;

let currentGuess = -1;

let cubes = [];

const numTigers = Math.floor(Math.random() * 51);

function addHtmlActions() {
}

function setupRendering(canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
}

function setupCamera() {
  const fov = 75;
  const aspect = 2;
  const near = 0.1;
  const far = 5000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 2;
}

function addLights(scene) {
  // first basic directional light
  {
    const color = 0xffffff;
    const intensity = 3;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    scene.add(light);
  }

  //ambient
  {
    const light = new THREE.AmbientLight( 0x878686) ; // soft white light
    scene.add( light );
  }

  //spotlight
  {
    const greenLight = new THREE.SpotLight(0x00ff00, 3);
    greenLight.position.set(0, 50, -25);
    greenLight.angle = Math.PI / 8;
    greenLight.penumbra = 0.5;
    greenLight.decay = 0;
    greenLight.distance = 10000;

    const target = new THREE.Object3D();
    target.position.set(0, 0, -25);
    scene.add(target);

    greenLight.target = target;

    scene.add(greenLight);
  }
  {
    const redLight = new THREE.SpotLight(0xff0000, 3);
    redLight.position.set(0, 10, 20);
    redLight.angle = Math.PI / 8;
    redLight.penumbra = 0.5;
    redLight.decay = 0;
    redLight.distance = 10000;

    const target = new THREE.Object3D();
    target.position.set(-20, 10, 20);
    scene.add(target);

    redLight.target = target;

    scene.add(redLight);
  }
}

function main() {
  const canvas = document.querySelector("#c");
  setupRendering(canvas);
  setupCamera();

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
  
  controls = new OrbitControls(camera, canvas);

  loadManager = new THREE.LoadingManager();
  loadManager.onStart = function (url, itemsLoaded, itemsTotal) {
    console.log(`load: ${url}`);
  };

  loadManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    console.log(`load asset: ${url} (${itemsLoaded}/${itemsTotal})`);
  };

  loadManager.onLoad = function () {
    console.log('done waoding');
    initScene();
  };

  loadManager.onError = function (url) {
    console.error(`loading error for ${url}`);
  };

  textureLoader = new THREE.TextureLoader(loadManager);

  tgaLoader = new TGALoader(loadManager);
  exrLoader = new EXRLoader(loadManager);
  gltfLoader = new GLTFLoader(loadManager);

  loadTextures();
  loadModels();
}

// for the scope of this program textures is gonna include materials 
function loadTextures() {
  textures = {};
  //material 1
  textures.pillars_diff = textureLoader.load("resources/textures/mats/floor_tiles_06_1k.blend/textures/floor_tiles_06_diff_1k.jpg", () => {
   textures.pillars_diff.wrapS = THREE.RepeatWrapping;
   textures.pillars_diff.wrapT = THREE.RepeatWrapping;

   textures.pillars_diff.repeat.set(2, 10);
  });

  textures.bricks_diff = textureLoader.load("resources/textures/mats/square_brick_paving_1k.blend/textures/square_brick_paving_diff_1k.jpg", () => {
   textures.bricks_diff.wrapS = THREE.RepeatWrapping;
   textures.bricks_diff.wrapT = THREE.RepeatWrapping;

   textures.bricks_diff.repeat.set(0.2, 0.2);
  });
  //const roughnessMap = textureLoader.load('resources/mats/floor_tiles_06_1k.blend/textures/floor_tiles_06_rough_1k.jpg');
  //const normalMap = exrLoader.load('resources/mats/floor_tiles_06_1k.blend/textures/floor_tiles_06_nor_gl_1k.exr');
  //const displacementMap = textureLoader.load('resources/mats/floor_tiles_06_1k.blend/textures/floor_tiles_06_disp_1k.png');

  const grass_side = textureLoader.load('resources/textures/dirt/grass_block_snow.png');
  grass_side.magFilter = THREE.NearestFilter;
  const grass_top = textureLoader.load('resources/textures/dirt/snow.png');
  grass_top.magFilter = THREE.NearestFilter;
  const grass_bottom = textureLoader.load('resources/textures/dirt/dirt.png');
  grass_bottom.magFilter = THREE.NearestFilter;

  textures.cube_materials = [
    new THREE.MeshStandardMaterial({ map: grass_side }),
    new THREE.MeshStandardMaterial({ map: grass_side }),
    new THREE.MeshStandardMaterial({ map: grass_top }),
    new THREE.MeshStandardMaterial({ map: grass_bottom }),
    new THREE.MeshStandardMaterial({ map: grass_side }),
    new THREE.MeshStandardMaterial({ map: grass_side }),
  ];

  textures.floor_tiles_diff = textureLoader.load("resources/textures/mats/wood_floor_1k.blend/textures/wood_floor_diff_1k.jpg", () => {
   textures.floor_tiles_diff.wrapS = THREE.RepeatWrapping;
   textures.floor_tiles_diff.wrapT = THREE.RepeatWrapping;

   textures.floor_tiles_diff.repeat.set(10, 10);
  });

  textures.skybox_materials = [
    new THREE.MeshBasicMaterial({ map: tgaLoader.load("resources/textures/skybox/stormydays_rt.tga"), side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ map: tgaLoader.load("resources/textures/skybox/stormydays_lf.tga"), side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ map: tgaLoader.load("resources/textures/skybox/stormydays_up.tga"), side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ map: tgaLoader.load("resources/textures/skybox/stormydays_dn.tga"), side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ map: tgaLoader.load("resources/textures/skybox/stormydays_ft.tga"), side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ map: tgaLoader.load("resources/textures/skybox/stormydays_bk.tga"), side: THREE.DoubleSide }),
  ]

  textures.great_plane = textureLoader.load("resources/textures/floor.jpg", () => {
    textures.great_plane.wrapS = THREE.RepeatWrapping;
    textures.great_plane.wrapT = THREE.RepeatWrapping;

    textures.great_plane.repeat.set(10000, 10000);
  });
}

function loadGlbModel(path, name) {
  gltfLoader.load(path, function(gltf) {
    console.log('Model loaded:', gltf);
    models[name] = gltf.scene;
  }, undefined, (error) => {
    console.error('An error occurred loading the model', error);
  });
}

function loadModels() {
  models = {};

  loadGlbModel('resources/models/tiger.glb', "tiger");
}

function initScene() {
  scene = new THREE.Scene();

  addLotsOfTigers();

  // make plane w texture
  {
    const material = new THREE.MeshPhongMaterial({
      map: textures.great_plane,
      side: THREE.DoubleSide,
    });

    // Create geometry and mesh
    const geometry = new THREE.PlaneGeometry(10000, 10000);
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1;
    plane.receiveShadow = true;
    scene.add(plane);
  }

  //boxes
  {

    const boxWidth = 3;
    const boxHeight = 3;
    const boxDepth = 3;
    const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

    const cube = new THREE.Mesh(geometry, textures.cube_materials);
    scene.add(cube);
    cube.position.set(0, 7, -25)
    cubes.push(cube);

    function makeInstance(geometry, color, x) {
      const material = new THREE.MeshPhongMaterial({ color });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);

      cube.position.x = x;
      cube.position.y = 2;
      cube.position.z = 25;

      return cube;
    }

    cubes.push(makeInstance(geometry, 0x44aa88, -2));

    function makeCoolBrickInstance(geometry, z) {
      const material = new THREE.MeshStandardMaterial({ map: textures.bricks_diff });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);

      cube.position.x = -20;
      cube.position.y = 8;
      cube.position.z = z;

      return cube;
    }

    for (let index = -18; index <= 50; index += 4) {
      makeCoolBrickInstance(geometry, index);
    }

  }
  const fancy_material = new THREE.MeshStandardMaterial({
    map: textures.floor_tiles_diff,                 
    //roughnessMap: roughnessMap,   
    //normalMap: normalMap,         
    //displacementMap: displacementMap, 
    //displacementScale: 0.5,       
    //displacementBias: 0           
  });

  const platform = new THREE.Mesh( new THREE.BoxGeometry(50,0.2,50), fancy_material);
  platform.position.set(0, -1, 0);
  scene.add(platform);

  {
    const geometry = new THREE.CylinderGeometry( 1, 1, 50, 32 ); 
    const material = new THREE.MeshPhongMaterial( {map: textures.pillars_diff} ); 

    function addPillar(x,y,z) {
      const cylinder = new THREE.Mesh( geometry, material ); 
      cylinder.position.set(x,20,z);

      scene.add( cylinder );
    }

    addPillar(-20, 0, -20)
    addPillar(-20, 0, -10)
    addPillar(-10, 0, -20)
    addPillar(20, 0, -20)
    addPillar(-20, 0, 20)
    addPillar(20, 0, 20)
  }


  const skybox = new THREE.Mesh(new THREE.BoxGeometry(5000,5000,5000), textures.skybox_materials);
  skybox.position.y = 0;
  skybox.frustumCulled = false;
  scene.add(skybox);

  addLights(scene);

  requestAnimationFrame(render);
}

function addLotsOfTigers() {
  const originalTiger = models.tiger;
  const scale = 0.01;
  const count = numTigers;
  const radius = 50;

  let baseMesh = null;
  originalTiger.traverse((child) => {
    if (child.isMesh && !baseMesh) {
      baseMesh = child;
    }
  });

  if (!baseMesh) {
    console.error("No mesh found in tiger model.");
    return;
  }

  const instancedMesh = new THREE.InstancedMesh(
    baseMesh.geometry,
    baseMesh.material,
    count
  );

  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    dummy.position.set(
      Math.random() * (radius * 2) - radius,
      0,
      Math.random() * (radius * 2) - radius,
    );
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();

    instancedMesh.setMatrixAt(i, dummy.matrix);
  }

  instancedMesh.castShadow = baseMesh.castShadow;
  instancedMesh.receiveShadow = baseMesh.receiveShadow;

  scene.add(instancedMesh);
}

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

function render(time) {
  time *= 0.001; // co0 time to seconds

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  cubes.forEach((cube, ndx) => {
    const speed = 1 + ndx * 0.1;
    const rot = time * speed;
    cube.rotation.x = rot;
    cube.rotation.y = rot;
  });

  renderer.render(scene, camera);

  requestAnimationFrame(render);
}

export function makeGuess() {
  const inputElement = document.getElementById('guessInput');
  const inputValue = inputElement.value;

  if (inputValue == null || inputValue == -1 || inputValue == "") {
    alert("please input a value");
  } else if (inputValue < numTigers) {
    alert("nope, more than that");
  } else if (inputValue > numTigers) {
    alert("nope, less than that");
  } else {
    alert("you got it! nice job. refresh the page to play again");
  }
}

window.makeGuess = makeGuess;

main();
