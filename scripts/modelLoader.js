// modelLoader.js

var floorCar;
var body; // Глобальная переменная для автомобиля
var front;
var back;
var garage;
var road;
var canRenderBody = false; // Флаг для контроля рендеринга

var carDefaultPaintMaterial;


function loadRace(scene){
  const loader = new THREE.FBXLoader();
  const textureLoader = new THREE.TextureLoader();
  
  const buildTexture = textureLoader.load('assets/env/build_albedo.jpg');

  const roadTexture = textureLoader.load('assets/env/road_albedo.jpg');
  const roadRoughness = textureLoader.load('assets/env/road_roughness.jpg');
  const roadNormal = textureLoader.load('assets/env/road_normal.jpg');

  let roadMaterial = new THREE.MeshPhysicalMaterial({
    //metalnessMap: garageMetallic,
    metalness: 0.0,
    roughness: 1.0,
    roughnessMap: roadRoughness,
    map: roadTexture,
    reflectivity: 0.8,
    //envMap: envMap,
    //envMapIntensity: 1.00,
  });

  let buildMaterial = new THREE.MeshPhysicalMaterial({
    //metalnessMap: garageMetallic,
    metalness: 0.0,
    roughness: 1.0,
    roughnessMap: roadRoughness,
    map: buildTexture,
    reflectivity: 0.8,
    //envMap: envMap,
    //envMapIntensity: 1.00,
  });

  

  //document.getElementById("loading-label").innerText = "loading: garage";
  loader.load('assets/env/road.fbx', function (loadedRoad) {
    road = loadedRoad;
    road.scale.set(0.01, 0.01, 0.01);
    road.position.set(0, -0.05, 0);

    road.traverse(function (child) {
      if (child.isMesh) {
        child.material = roadMaterial;
      }
    });

    var building;
    loader.load('assets/env/build.fbx', function (loadedB) {
      building = loadedB;
      building.scale.set(1, 1, 1);
      building.position.set(0, -0.05, 0);

      building.traverse(function (child) {
        if (child.isMesh) {
          child.material = buildMaterial;

          for (let i = 0; i < 20; i++){
            var clonedRoad = road.clone();
            clonedRoad.position.z += i*15;
            clonedRoad.add(building.clone());
            scene.add(clonedRoad);
          }
        }
      });
      //scene.add(garage);
    });


    
    
  });
}

function loadGarage(scene) {
  const loader = new THREE.FBXLoader();
  const textureLoader = new THREE.TextureLoader();
  document.getElementById("loading-bar").style.width = '25%';
  document.getElementById("loading-label").innerText = "loading: textures";
  
  // Загружаем текстуры
  const envMap = textureLoader.load('assets/env/bgcolor.png');
  envMap.mapping = THREE.EquirectangularReflectionMapping;
  envMap.encoding = THREE.sRGBEncoding;
  envMap.center.set(0.5, 0.5);
  envMap.rotation = 100;
  envMap.flipY = false;
  envMap.flipX = false;
  const garageTexture = textureLoader.load('assets/env/bakedGarage.jpg');
  const garageRoughness = textureLoader.load('assets/env/bakedGarageRough.jpg');
  const garageMetallic = textureLoader.load('assets/env/bakedGarageMetal.jpg');

  let garageMaterial = new THREE.MeshPhysicalMaterial({
    metalnessMap: garageMetallic,
    metalness: 1.0,
    roughness: 1.0,
    roughnessMap: garageRoughness,
    map: garageTexture,
    reflectivity: 0.8,
    envMap: envMap,
    envMapIntensity: 1.00,
  });

  document.getElementById("loading-label").innerText = "loading: garage";
  loader.load('assets/env/garage.fbx', function (loadedGarage) {
    garage = loadedGarage;
    garage.scale.set(0.01, 0.01, 0.01);
    garage.position.set(0, -0.05, 0);

    garage.traverse(function (child) {
      if (child.isMesh) {
        child.material = garageMaterial;
      }
    });
    scene.add(garage);
  });
}

function loadCarModel(scene, onLoaded) {
  const loader = new THREE.FBXLoader();
  const textureLoader = new THREE.TextureLoader();
  document.getElementById("loading-bar").style.width = '25%';
  document.getElementById("loading-label").innerText = "loading: textures";
  
  // Загружаем текстуры
  const envMap = textureLoader.load('assets/env/bgcolor.png');
  envMap.mapping = THREE.EquirectangularReflectionMapping;
  envMap.encoding = THREE.sRGBEncoding;
  envMap.center.set(0.5, 0.5);
  envMap.rotation = 100;
  envMap.flipY = false;
  envMap.flipX = false;

  const carBodyTexture = textureLoader.load('assets/cars/bmw/bmw_body_texture.jpg');
  carBodyTexture.wrapS = THREE.RepeatWrapping;
  carBodyTexture.wrapT = THREE.RepeatWrapping;
  carBodyTexture.repeat.set(1, 1);

  const carFloorTexture = textureLoader.load('assets/env/CarFloor.jpg');
  carFloorTexture.wrapS = THREE.RepeatWrapping;
  carFloorTexture.wrapT = THREE.RepeatWrapping;
  carFloorTexture.repeat.set(1, 1);

  const carOpticsTexture = textureLoader.load('assets/cars/bmw/lglass_baseColor.png');
  carOpticsTexture.wrapS = THREE.RepeatWrapping;
  carOpticsTexture.wrapT = THREE.RepeatWrapping;
  carOpticsTexture.repeat.set(1, 1);

  const carTireTexture = textureLoader.load('assets/cars/bmw/tire_baseColor.png');
  carTireTexture.wrapS = THREE.RepeatWrapping;
  carTireTexture.wrapT = THREE.RepeatWrapping;
  carTireTexture.repeat.set(1, 1);

  const carWheelTexture = textureLoader.load('assets/cars/bmw/bmw_wheel.jpg');
  carWheelTexture.wrapS = THREE.RepeatWrapping;
  carWheelTexture.wrapT = THREE.RepeatWrapping;
  carWheelTexture.repeat.set(1, 1);

  // Создаем материалы

  let carFloorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.2,
    map: carFloorTexture,
    reflectivity: 0.8,
    envMap: cubeRenderTarget.texture, // cubeRenderTarget должен быть глобальным
    envMapIntensity: 1.00,
  });

  let carGlassMaterial = new THREE.MeshPhysicalMaterial({
    transparent: true,
    opacity: 0.95,
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.0,
    envMap: cubeRenderTarget.texture,
    reflectivity: 0.8,
    envMapIntensity: 1.00,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    reflectivity: 1.0,
  });

  carDefaultPaintMaterial = new THREE.MeshPhysicalMaterial({
    map: carBodyTexture,
    color: 0xffffff, // Пример красного цвета. Замените на желаемый цвет.
    metalness: 1.0, // Низкая металлическость для крашеного металла.
    roughness: 0.9, // Низкая шероховатость для гладкой поверхности.
    envMap: cubeRenderTarget.texture, // Убедитесь, что окружение качественное.
    reflectivity: 0.8, // Высокая, но не максимальная отражаемость.
    envMapIntensity: 10.5, // Интенсивность отражений.
    clearcoat: 0.9, // Добавление слоя блеска.
    clearcoatRoughness: 0.03, // Гладкий слой блеска.
  });
  
  let carUnderMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    metalness: 0.0,
    roughness: 0.2,
    reflectivity: 0.3,
    envMapIntensity: 1.00,
    onBeforeCompile: (shader) => {
      shader.uniforms.fresnelColor = {
        value: new THREE.Color(0xffffee),
      };

      shader.fragmentShader =
        'uniform vec3 fresnelColor;\n' + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <output_fragment>',
        `
        #include <output_fragment>
        vec3 normalDirection = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        float fresnel = abs(dot(normalDirection, viewDirection));
        fresnel = pow(1.0 - fresnel, 3.0);
        gl_FragColor.rgb += pow(fresnel, 1.0) * fresnelColor * 1.0;
        `
      );
    },
  });

  let carOpticsMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    metalness: 0.0,
    roughness: 1.0,
    emissiveMap: carOpticsTexture,
    emissiveIntensity: 0.2,
    map: carOpticsTexture,
    envMap: envMap,
    reflectivity: 0.8,
    envMapIntensity: 1.00,
  });

  let carBodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.1,
    side: THREE.DoubleSide,
    map: carBodyTexture,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.50,
    clearcoat: 1.0,
    clearcoatRoughness: 0.9,
    reflectivity: 0.8,
    onBeforeCompile: (shader) => {
      shader.uniforms.fresnelColor = {
        value: new THREE.Color(0xffffee),
      };

      shader.fragmentShader =
        'uniform vec3 fresnelColor;\n' + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <output_fragment>',
        `
        #include <output_fragment>
        vec3 normalDirection = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        float fresnel = abs(dot(normalDirection, viewDirection));
        fresnel = pow(1.0 - fresnel, 4.0);
        gl_FragColor.rgb += pow(fresnel, 3.0) * fresnelColor * 1.0;
        `
      );
    },
  });

  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.2,
    roughness: 0.8,
    reflectivity: 0.3,
    map: carWheelTexture,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.00,
    onBeforeCompile: (shader) => {
      shader.uniforms.fresnelColor = {
        value: new THREE.Color(0xaaffee),
      };

      shader.fragmentShader =
        'uniform vec3 fresnelColor;\n' + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <output_fragment>',
        `
        #include <output_fragment>
        vec3 normalDirection = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        float fresnel = abs(dot(normalDirection, viewDirection));
        fresnel = pow(1.0 - fresnel, 3.0);
        //gl_FragColor.rgb -= pow(fresnel, 3.0) * fresnelColor * 1.0;
        `
      );
    },
  });

  const tireMaterial = new THREE.MeshStandardMaterial({
    color: 0x777777,
    side: THREE.DoubleSide,
    map: carTireTexture,
    metalness: 0.0,
    roughness: 0.9,
  });

  document.getElementById("loading-bar").style.width = '60%';
  document.getElementById("loading-label").innerText = "loading: car model";

  // Загружаем кузов автомобиля
  loader.load('assets/cars/bmw/bmw_body.fbx', function (loadedBody) {
    loadedBody.scale.set(0.01, 0.01, 0.01);
    loadedBody.position.set(0, 0, 0);

    loadedBody.traverse(function (child) {
      if (child.isMesh) {
        child.material = carDefaultPaintMaterial;
      }
    });

    // Загрузка подкапотной части
    loader.load('assets/cars/bmw/bmw_under.fbx', function (under) {
      under.scale.set(1, 1, 1);

      under.traverse(function (child) {
        if (child.isMesh) {
          child.material = carUnderMaterial;
        }
      });

      loadedBody.add(under);
    });

    // Создаём pivots для колес
    const frontWheelPivot = new THREE.Object3D();
    const backWheelPivot = new THREE.Object3D();

    // Позиционируем pivots
    frontWheelPivot.position.set(0, 0, 0); // Передние колеса
    backWheelPivot.position.set(0, 0, -275); // Задние колеса

    loadedBody.add(frontWheelPivot);
    loadedBody.add(backWheelPivot);

    // Загружаем стекла автомобиля
    loader.load('assets/cars/bmw/bmw_glass.fbx', function (glass) {
      glass.scale.set(1, 1, 1);

      glass.traverse(function (child) {
        if (child.isMesh) {
          child.material = carGlassMaterial;
        }
      });

      loadedBody.add(glass);
    });

    loader.load('assets/cars/bmw/bmw_front.fbx', function (loadedFront) {
      front = loadedFront;
      front.scale.set(0, 1, 0);

      front.traverse(function (child) {
        if (child.isMesh) {
          child.material = carDefaultPaintMaterial;
        }
      });

      loadedBody.add(front);
    });

    loader.load('assets/cars/bmw/bmw_back.fbx', function (loadedBack) {
      back = loadedBack;
      back.scale.set(0, 1, 0);

      back.traverse(function (child) {
        if (child.isMesh) {
          child.material = carDefaultPaintMaterial;
        }
      });

      loadedBody.add(back);
    });

    // Загружаем пол под автомобиль
    loader.load('assets/env/carFloor.fbx', function (floor) {
      floor.scale.set(1, 1, 1);

      floor.traverse(function (child) {
        if (child.isMesh) {
          child.material = carFloorMaterial;
        }
      });

      loadedBody.add(floor);
    });

    // Загружаем оптику автомобиля
    loader.load('assets/cars/bmw/bmw_optics.fbx', function (optics) {
      optics.scale.set(1, 1, 1);

      optics.traverse(function (child) {
        if (child.isMesh) {
          child.material = carOpticsMaterial;
        }
      });

      loadedBody.add(optics);
    });

    // Загружаем шину
    loader.load('assets/cars/bmw/bmw_tire.fbx', function (tire) {
      tire.scale.set(1, 1, 1);

      // Применяем материал к шине
      tire.traverse(function (child) {
        if (child.isMesh) {
          child.material = tireMaterial;
        }
      });

      // Загружаем колесо
      loader.load('assets/cars/bmw/bmw_wheel.fbx', function (wheel) {
        wheel.scale.set(1, 1, 1);

        // Применяем материал к колесу
        wheel.traverse(function (child) {
          if (child.isMesh) {
            child.material = wheelMaterial;
          }
        });

        // Создаём сборку колеса и шины
        const wheelAssembly = new THREE.Group();
        wheelAssembly.add(wheel);
        wheelAssembly.add(tire.clone());

        // Клонируем сборки колес для каждой позиции

        // Переднее левое колесо
        const frontLeftWheel = wheelAssembly.clone();
        frontLeftWheel.position.set(0, 0, 0);
        frontLeftWheel.scale.set(-1, 1, 1); // Отражаем по оси X для левой стороны

        // Переднее правое колесо
        const frontRightWheel = wheelAssembly.clone();
        frontRightWheel.position.set(0, 0, 0);

        frontWheelPivot.add(frontLeftWheel);
        frontWheelPivot.add(frontRightWheel);

        // Заднее левое колесо
        const backLeftWheel = wheelAssembly.clone();
        backLeftWheel.position.set(0, 0, 0);
        backLeftWheel.scale.set(-1, 1, 1); // Отражаем по оси X для левой стороны

        // Заднее правое колесо
        const backRightWheel = wheelAssembly.clone();
        backRightWheel.position.set(0, 0, 0);

        backWheelPivot.add(backLeftWheel);
        backWheelPivot.add(backRightWheel);

        // Добавляем автомобиль в сцену
        scene.add(loadedBody);
        cubeCamera.position.copy(loadedBody.position); // Убедитесь, что loadedBody присвоен body

        // Присваиваем body глобальной переменной
        body = loadedBody;

        // Устанавливаем флаг, что тело готово к рендерингу
        canRenderBody = true;

        // Вызываем коллбек после полной загрузки автомобиля
        if (onLoaded) onLoaded(body);
      });
    });
  });
  document.getElementById("loading-bar").style.width = '100%';
  setTimeout(()=>{
    document.getElementById('loading-container').style.display = 'none';
    document.getElementById('garage-menu').style.display = '';
  }, 1000);
}
