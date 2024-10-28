// modelLoader.js


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
  loader.load('assets/env/garage.fbx', function (garage) {
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

  const carOpticsTexture = textureLoader.load('assets/cars/bmw/lglass_baseColor.png');
  carOpticsTexture.wrapS = THREE.RepeatWrapping;
  carOpticsTexture.wrapT = THREE.RepeatWrapping;
  carOpticsTexture.repeat.set(1, 1);

  const carTireTexture = textureLoader.load('assets/cars/bmw/tire_baseColor.png');
  carOpticsTexture.wrapS = THREE.RepeatWrapping;
  carOpticsTexture.wrapT = THREE.RepeatWrapping;
  carOpticsTexture.repeat.set(1, 1);

  // Создаем материалы
  let carGlassMaterial = new THREE.MeshPhysicalMaterial({
    transparent: true,
    opacity: 0.9,
    color: 0x000000,
    metalness: 0.0,
    roughness: 0.4,
    envMap: envMap,
    reflectivity: 0.8,
    envMapIntensity: 0.00,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    reflectivity: 0.8,
  });

  let carUnderMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    metalness: 0.0,
    roughness: 0.2,
    //envMap: envMap,
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
    emissiveIntensity: 100.0,
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
    envMap: envMap,
    envMapIntensity: 1.50,
    clearcoat: 0.1,
    clearcoatRoughness: 0.9,
    reflectivity: 0.8,
    // Добавляем эффект френеля через модификацию шейдера
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
        gl_FragColor.rgb += pow(fresnel, 2.0) * fresnelColor * 2.0;
        `
      );
    },
  });

  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    side: THREE.DoubleSide,
    metalness: 1.0,
    roughness: 0.2,
    envMap: envMap,
    //envMapIntensity: 10.50,
    clearcoat: 0.1,
    clearcoatRoughness: 0.9,
    reflectivity: 0.8,
    // Добавляем эффект френеля через модификацию шейдера
    onBeforeCompile: (shader) => {
      shader.uniforms.fresnelColor = {
        value: new THREE.Color(0x999999),
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
        fresnel = pow(1.0 - fresnel, 2.0);
        gl_FragColor.rgb *= pow(fresnel, 2.0) * fresnelColor * 2.0;
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
  loader.load('assets/cars/bmw/bmw_body.fbx', function (body) {
    body.scale.set(0.01, 0.01, 0.01);
    body.position.set(0, 0, 0);

    body.traverse(function (child) {
      if (child.isMesh) {
        child.material = carBodyMaterial;
      }
    });

    loader.load('assets/cars/bmw/bmw_under.fbx', function (under) {
      under.scale.set(1, 1, 1);

      under.traverse(function (child) {
        if (child.isMesh) {
          child.material = carUnderMaterial;
        }
      });

      body.add(under);
    });

    // Создаем pivots для колес
    const frontWheelPivot = new THREE.Object3D();
    const backWheelPivot = new THREE.Object3D();

    // Позиционируем pivots
    frontWheelPivot.position.set(0, 0, 0); // Передние колеса
    backWheelPivot.position.set(0, 0, -275); // Задние колеса

    body.add(frontWheelPivot);
    body.add(backWheelPivot);

    // Загружаем стекла автомобиля
    loader.load('assets/cars/bmw/bmw_glass.fbx', function (glass) {
      glass.scale.set(1, 1, 1);

      glass.traverse(function (child) {
        if (child.isMesh) {
          child.material = carGlassMaterial;
        }
      });

      body.add(glass);
    });

    // Загружаем оптику автомобиля
    loader.load('assets/cars/bmw/bmw_optics.fbx', function (optics) {
      optics.scale.set(1, 1, 1);

      optics.traverse(function (child) {
        if (child.isMesh) {
          child.material = carOpticsMaterial;
        }
      });

      body.add(optics);
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

        // Создаем сборку колеса и шины
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
        scene.add(body);

        // Вызываем коллбэк после полной загрузки автомобиля
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
