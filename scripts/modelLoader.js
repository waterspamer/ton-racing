// modelLoader.js

var floorCar;
var garageFloor;
var body; // Глобальная переменная для автомобиля
var front;
var back;
var garage;
var road;
var canRenderBody = false; // Флаг для контроля рендеринга

var backWheelPivot;
var frontWheelPivot;

var carDefaultPaintMaterial;
var wheelMaterial;
var carGlassMaterial;

var carBodyTexture;


const buildingData = [
  {
    model: 'assets/env/build.fbx',
    albedo: 'assets/env/build_albedo.jpg',
    roughnessMap: 'assets/env/build_roughness.jpg',
    normalMap: 'assets/env/build_normal.jpg'
  },
  {
    model: 'assets/env/build2.fbx',
    albedo: 'assets/env/build2_albedo.jpg',
    roughnessMap: 'assets/env/build2_roughness.jpg',
    normalMap: 'assets/env/build2_normal.jpg'
  },
  // Добавьте больше объектов по необходимости
];



async function loadBuildingModels(loader, textureLoader, buildingData) {
  const loadedBuildings = [];

  for (const building of buildingData) {
    try {
      const loadedBuilding = await new Promise((resolve, reject) => {
        loader.load(
          building.model,
          resolve,
          undefined,
          reject
        );
      });

      // Загрузка текстур
      const albedo = await new Promise((resolve, reject) => {
        textureLoader.load(building.albedo, resolve, undefined, reject);
      });

      /* const roughnessMap = await new Promise((resolve, reject) => {
        textureLoader.load(building.roughnessMap, resolve, undefined, reject);
      });

      const normalMap = await new Promise((resolve, reject) => {
        textureLoader.load(building.normalMap, resolve, undefined, reject);
      }); */

      // Создание материала
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, // Цвет по умолчанию, можно изменить
        map: albedo,
        /* roughnessMap: roughnessMap,
        normalMap: normalMap, */
        roughness: 0.5, // Можно настроить
        metalness: 0.5, // Можно настроить
        reflectivity: 0.5, // Можно настроить
      });

      // Применение материала ко всем мешам в загруженной модели
      loadedBuilding.traverse(function (child) {
        if (child.isMesh) {
          child.material = material;
        }
      });

      // Добавление загруженной модели в массив
      loadedBuildings.push(loadedBuilding);
    } catch (error) {
      console.error(`Ошибка загрузки здания: ${building.model}`, error);
    }
  }

  return loadedBuildings;
}




async function loadRace(scene){
  // Инициализация загрузчиков
  const loader = new THREE.FBXLoader();
  const textureLoader = new THREE.TextureLoader();

  // Загрузка текстур дороги
  const roadTexture = textureLoader.load('assets/env/road_albedo.jpg');
  roadTexture.wrapS = THREE.RepeatWrapping;
  roadTexture.wrapT = THREE.RepeatWrapping;
  roadTexture.repeat.set(1, 1);

  const roadRoughness = textureLoader.load('assets/env/road_roughness.jpg');
  const roadNormal = textureLoader.load('assets/env/road_normal.jpg');

  // Создание материала для дороги
  let roadMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x333333,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.00,
    metalness: 0.0,
    roughness: 1.0,
    roughnessMap: roadRoughness,
    normalMap: roadNormal,
    map: roadTexture,
    reflectivity: 0.5,
  });

  // Настройка шейдера для дороги
  roadMaterial.onBeforeCompile = (shader) => {
    // Добавляем uniforms
    shader.uniforms.reflectionTexture = { value: reflectionRenderTarget.texture };
    shader.uniforms.screenResolution = { value: new THREE.Vector2(window.innerWidth, window.innerHeight) };
    /* shader.uniforms.roughnessMap = { value: roadMaterial.roughnessMap }; */

    // Вставляем объявления uniforms в начало фрагментного шейдера
    shader.fragmentShader = `
      uniform sampler2D reflectionTexture;
      uniform vec2 screenResolution;
      /* uniform sampler2D roughnessMap; */
    ` + shader.fragmentShader;

    // Модификация фрагментного шейдера
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <output_fragment>',
      `
      #include <output_fragment>
      
      // Получаем экранные координаты фрагмента
      vec2 screenUV = gl_FragCoord.xy / screenResolution;
      
      // Получаем цвет отражения из reflectionTexture
      vec4 reflectionColor = texture2D(reflectionTexture, screenUV);
      
      // Получаем значение roughness для текущего фрагмента
      float roughness = texture2D(roughnessMap, vUv).r;
      
      // Вычисляем smoothness как инверсию roughness
      float smoothness = 1.0 - roughness;
      
      // Вычисляем коэффициент отражения на основе smoothness
      float reflectivityFactor = smoothness * 0.15; // Коэффициент 0.4 регулирует общую интенсивность
      
      // Наложение отражения на основной цвет материала с учетом reflectivityFactor
      gl_FragColor.rgb = mix(gl_FragColor.rgb, reflectionColor.rgb, reflectivityFactor);
      `
    );

    // Сохраняем изменённый шейдер для последующего использования (если необходимо)
    roadMaterial.userData.shader = shader;

    // Обновление разрешения экрана при изменении размера окна
    window.addEventListener('resize', () => {
      shader.uniforms.screenResolution.value.set(window.innerWidth, window.innerHeight);
    });
  };

  // Загрузка моделей зданий
  const loadedBuildings = await loadBuildingModels(loader, textureLoader, buildingData);

  // Загрузка модели дороги
  loader.load('assets/env/road.fbx', function (loadedRoad) {
    road = loadedRoad;
    road.scale.set(0.01, 0.01, 0.01);
    road.position.set(0, -0.1, 0);

    road.traverse(function (child) {
      if (child.isMesh) {
        child.material = roadMaterial;
      }
    });

    // Расстановка дорог и зданий
    for (let i = 0; i < 20; i++) { // Количество сегментов дороги
      // Клонирование дороги
      const clonedRoad = road.clone();
      clonedRoad.position.z += i * 20; // Расстояние между сегментами

      // Выбор случайного здания
      if (loadedBuildings.length > 0) {
        const randomIndex = Math.floor(Math.random() * loadedBuildings.length);
        const randomBuilding = loadedBuildings[randomIndex].clone(); // Клонирование выбранного здания

        // Применение случайных преобразований для разнообразия
        randomBuilding.scale.setScalar(1 + Math.random() * 0.5); // Масштабирование от 1 до 1.5
        //randomBuilding.rotation.y = Math.random() * Math.PI * 2; // Случайный поворот по оси Y

        // Позиционирование зданий относительно дороги
        const building1 = randomBuilding.clone();
        const building2 = randomBuilding.clone();

        building1.position.set(90, 16, 0); // Позиция первого здания
        building2.position.set(-90, 16, 0); // Позиция второго здания
        building2.scale.set(-1, 1, 1); // Отражение второго здания по оси X для разнообразия

        // Добавление зданий к клонированной дороге
        clonedRoad.add(building1);
        clonedRoad.add(building2);
      }

      // Добавление клонированной дороги с зданиями в сцену
      scene.add(clonedRoad);
    }

  }, undefined, function (error) {
    console.error('Ошибка загрузки дороги:', error);
  });
}











 /*  let buildMaterial = new THREE.MeshPhysicalMaterial({
    //metalnessMap: garageMetallic,
    metalness: 0.0,
    roughness: 0.3,
    roughnessMap: roadRoughness,
    map: buildTexture,
    reflectivity: 0.8,
    //envMap: envMap,
    //envMapIntensity: 1.00,
  });

  

  //document.getElementById("loading-label").innerText = "loading: garage";
  loader.load('assets/env/road.fbx', function (loadedRoad) {
    road = loadedRoad;
    //road.receiveShadows = true;
    road.scale.set(0.01, 0.01, 0.01);
    road.position.set(0, -0.1, 0);

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
            clonedRoad.position.z += i*20;
            var b1 = building.clone();
            var b2 = b1.clone();
            b1.position.set(90, 16, 0);
            b2.position.set(-90, 16, 0);
            b2.scale.set(-1, 1, 1);
            clonedRoad.add(b1);
            clonedRoad.add(b2);
            scene.add(clonedRoad);
          }
        }
      });
      //scene.add(garage);
    });
 */

    
    


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
  const garageFloorTexture = textureLoader.load('assets/env/wood_basecolor.jpg');
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

  const garageFloorMaterial = new THREE.MeshPhysicalMaterial({
    map: garageFloorTexture,
    metalness: 0.0,
    roughness: 0.2, // Изначальное значение roughness
    reflectivity: 0.9,
    roughnessMap: garageFloorTexture, // Добавляем roughnessMap
    transparent: true, // Включаем прозрачность для корректного наложения отражений
});

garageFloorMaterial.onBeforeCompile = (shader) => {
    // Добавляем uniforms для отражения и разрешения экрана
    shader.uniforms.reflectionTexture = { value: reflectionRenderTarget.texture };
    shader.uniforms.screenResolution = { value: new THREE.Vector2(window.innerWidth, window.innerHeight) };

    // Вставляем объявления uniforms в начало фрагментного шейдера
    shader.fragmentShader = `
        uniform sampler2D reflectionTexture;
        uniform vec2 screenResolution;
    ` + shader.fragmentShader;

    // Модифицируем фрагментный шейдер для наложения отражения с учетом roughness и эффекта Френеля
    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <output_fragment>',
        `
        #include <output_fragment>

        // Вычисляем UV координаты экрана
        vec2 screenUV = gl_FragCoord.xy / screenResolution;

        // Получаем цвет отражения из reflectionTexture
        vec4 reflectionColor = texture2D(reflectionTexture, screenUV);

        // Получаем значение roughness из roughnessMap
        float sampledRoughness = texture2D(roughnessMap, vUv).r;

        // Вычисляем направление взгляда и нормали
        vec3 viewDir = normalize(vViewPosition);
        vec3 normalDir = normalize(vNormal);

        // Вычисляем фактор Френеля
        float fresnelFactor = pow(1.0 - max(dot(viewDir, normalDir), 0.0), 3.0);

        // Вычисляем коэффициент отражения с учетом roughness и Френеля
        float reflectivityFactor = fresnelFactor * (1.0 - sampledRoughness) * 0.4;

        // Наложение отражения на основной цвет материала
        gl_FragColor.rgb = mix(gl_FragColor.rgb, reflectionColor.rgb, reflectivityFactor);

        // Опционально: корректировка альфа-канала
        // gl_FragColor.a = mix(gl_FragColor.a, reflectionColor.a, reflectivityFactor);
        `
    );

    // Сохраняем изменённый шейдер для последующего использования (если необходимо)
    garageFloorMaterial.userData.shader = shader;
};

  
  
  

    // Обновление разрешения экрана при изменении размеров окна
    window.addEventListener('resize', () => {
      const newResolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
      garageFloorMaterial.userData.shader.uniforms.screenResolution.value.copy(newResolution);
    });
  
  

  document.getElementById("loading-label").innerText = "loading: garage";
  loader.load('assets/env/garage.fbx', function (loadedGarage) {
    garage = loadedGarage;
    garage.scale.set(0.01, 0.01, 0.01);
    garage.position.set(0, -0.05, 0);

    loader.load('assets/env/carFloor.fbx', function (loadedFloorNorm) {
      garageFloor = loadedFloorNorm;
      garageFloor.scale.set(1, 1, 1);
      garageFloor.position.set(0, -0.05, 0);
  
      garageFloor.traverse(function (child) {
        if (child.isMesh) {
          child.material = garageFloorMaterial;
        }
      });
      garage.add(garageFloor);
    });

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

   carBodyTexture = textureLoader.load('assets/cars/bmw/bmw_body_texture.jpg');
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

  const carSaloonTexture = textureLoader.load('assets/cars/bmw/bmw_saloon.jpg');
  carWheelTexture.wrapS = THREE.RepeatWrapping;
  carWheelTexture.wrapT = THREE.RepeatWrapping;
  carWheelTexture.repeat.set(1, 1);

  // Создаем материалы

  

  carGlassMaterial = new THREE.MeshPhysicalMaterial({
    transparent: true,
    side:2,
    opacity: 0.5,
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
    side:2,
    color: 0xffffff, // Пример красного цвета. Замените на желаемый цвет.
    metalness: 0.5, // Низкая металлическость для крашеного металла.
    roughness: 0.9, // Низкая шероховатость для гладкой поверхности.
    envMap: cubeRenderTarget.texture, // Убедитесь, что окружение качественное.
    reflectivity: 0.8, // Высокая, но не максимальная отражаемость.
    envMapIntensity: 3.5, // Интенсивность отражений.
    clearcoat: 0.5, // Добавление слоя блеска.
    clearcoatRoughness: 0.03, // Гладкий слой блеска.
    onBeforeCompile: (shader) => {
      shader.uniforms.fresnelColor = {
        value: new THREE.Color(0xffffff),
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
        gl_FragColor.rgb += pow(fresnel, 3.0) * fresnelColor * 0.5;
        `
      );
    },
  });
  




  let carFloorMaterial = new THREE.MeshPhysicalMaterial({
    
    color: 0xffffff,
    metalness: 0.0,
    roughness: 1.0,
    map: carFloorTexture,
    transparent: true, // Включаем прозрачность
    onBeforeCompile: (shader) => {
      // Модифицируем фрагментный шейдер для управления альфа-каналом
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <output_fragment>',
        `
        #include <output_fragment>
        
        // Получаем цвет из текстуры
        vec4 mapColor = texture2D(map, vUv);
        
        // Вычисляем яркость (градации серого) текстуры
        //float brightness = dot(mapColor.rgb, vec3(0.299, 0.587, 0.114));
        //float brightness = mapColor.r;
        // Инвертируем яркость: белое -> прозрачное, черное -> непрозрачное
        //float alpha = min((1.0 - brightness) * 20.0, 10.0);
        float brightness = max(pow(1.0 - mapColor.r, 3.0) - 0.17, 0.0);
        gl_FragColor.a = brightness;
        gl_FragColor.rgb = vec3(0.0,0.0,0.0);
        // Применяем вычисленный альфа-канал
        //gl_FragColor.a *= alpha;
        `
      );
    },
  });
  
  



  let carUnderMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    metalness: 0.0,
    roughness: 0.6,
    reflectivity: 0.1,
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
        gl_FragColor.rgb += pow(fresnel, 1.0) * fresnelColor * 0.2;
        `
      );
    },
  });

  let carOpticsMaterial = new THREE.MeshPhysicalMaterial({
    transparent:true,
    opacity:0.7,
    //alphaMap:carOpticsTexture,
    color: 0xffffff,
    emissive: 0xffffff,
    metalness: 1.0,
    roughness: 0.0,
    emissiveMap: carOpticsTexture,
    emissiveIntensity: 1.9,
    //alphaMap:carOpticsTexture,
    map: carOpticsTexture,
    envMap: envMap,
    reflectivity: 0.8,
    envMapIntensity: 3.0,
  });

  let grillMaterial = new THREE.MeshPhysicalMaterial({
    //transparent:true,
    //opacity:9,
    //alphaMap:carOpticsTexture,
    color: 0xffffff,
    emissive: 0x111111,
    metalness: 1.0,
    roughness: 0.8,
    //emissiveMap: carOpticsTexture,
    //emissiveIntensity: 10.9,
    map: carOpticsTexture,
    envMap: envMap,
    reflectivity: 0.8,
    envMapIntensity: 1.00,
  });

  let carOpticsUnderMaterial = new THREE.MeshPhysicalMaterial({
    //transparent:true,
    //opacity:.8,
    //alphaMap:carOpticsTexture,
    color: 0xaaaaaa,
    //emissive: 0xffffff,
    metalness: 1.0,
    roughness: 0.1,
    //emissiveMap: carOpticsTexture,
    //emissiveIntensity: 0.01,
    //map: carOpticsTexture,
    envMap: envMap,
    reflectivity: 0.8,
    envMapIntensity: 10.00,
    onBeforeCompile: (shader) => {
      shader.uniforms.fresnelColor = {
        value: new THREE.Color(0xffffff),
      };

      shader.fragmentShader =
        'uniform vec3 fresnelColor;\n' + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <output_fragment>',
        `
        #include <output_fragment>
        vec3 normalDirection = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        float fresnel = abs(dot(normalDirection, vec3(0.0,0.0,1.0)));
        fresnel = pow(1.0 - fresnel, 6.0);
        gl_FragColor.rgb = fresnel * fresnelColor * 2.2;
        `
      );
    },
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

  wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.3,
    roughness: 0.2,
    reflectivity: 0.3,
    map: carWheelTexture,
    //envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.00,
    onBeforeCompile: (shader) => {
      shader.uniforms.fresnelColor = {
        value: new THREE.Color(0xffffff),
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
        //gl_FragColor.rgb += pow(fresnel, 1.0) * fresnelColor * 1.0;
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

  const saloonMaterial = new THREE.MeshStandardMaterial({
    color: 0x777777,
    side: THREE.DoubleSide,
    map: carSaloonTexture,
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

    loader.load('assets/cars/bmw/bmw_saloon.fbx', function (saloon) {
      saloon.scale.set(1, 1, 1);

      saloon.traverse(function (child) {
        if (child.isMesh) {
          child.material = saloonMaterial;
        }
      });

      loadedBody.add(saloon);
    });

    // Создаём pivots для колес
    frontWheelPivot = new THREE.Object3D();
    backWheelPivot = new THREE.Object3D();

    // Позиционируем pivots
    frontWheelPivot.position.set(0, 25, 147); // Передние колеса
    backWheelPivot.position.set(0, 25, -130); // Задние колеса

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

    loader.load('assets/cars/bmw/bmw_optics_under.fbx', function (glass) {
      glass.scale.set(1, 1, 1);

      glass.traverse(function (child) {
        if (child.isMesh) {
          child.material = carOpticsUnderMaterial;
        }
      });

      loadedBody.add(glass);
    });

    loader.load('assets/cars/bmw/bmw_front.fbx', function (loadedFront) {
      front = loadedFront;
      front.scale.set(1, 1, 1);

      front.traverse(function (child) {
        if (child.isMesh) {
          child.material = carDefaultPaintMaterial;
        }
      });

      loadedBody.add(front);
    });

    loader.load('assets/cars/bmw/bmw_grill.fbx', function (loadedFront) {
      front = loadedFront;
      front.scale.set(1, 1, 1);

      front.traverse(function (child) {
        if (child.isMesh) {
          child.material = grillMaterial;
        }
      });

      loadedBody.add(front);
    });

    loader.load('assets/cars/bmw/bmw_back.fbx', function (loadedBack) {
      back = loadedBack;
      back.scale.set(1, 1, 1);

      back.traverse(function (child) {
        if (child.isMesh) {
          child.material = carDefaultPaintMaterial;
        }
      });

      loadedBody.add(back);
    });

    // Загружаем пол под автомобиль
    loader.load('assets/env/carFloor.fbx', function (loadedFloor) {
      floorCar = loadedFloor;
      floorCar.scale.set(1, 1, 1);

      floorCar.traverse(function (child) {
        if (child.isMesh) {
          child.material = carFloorMaterial;
        }
      });

      loadedBody.add(floorCar);
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
        frontLeftWheel.position.set(83, 0, 0);
        frontLeftWheel.scale.set(-1, 1, 1); // Отражаем по оси X для левой стороны

        // Переднее правое колесо
        const frontRightWheel = wheelAssembly.clone();
        frontRightWheel.position.set(-83, 0, 0);

        frontWheelPivot.add(frontLeftWheel);
        frontWheelPivot.add(frontRightWheel);

        // Заднее левое колесо
        const backLeftWheel = wheelAssembly.clone();
        backLeftWheel.position.set(83, 0, 0);
        backLeftWheel.scale.set(-1, 1, 1); // Отражаем по оси X для левой стороны

        // Заднее правое колесо
        const backRightWheel = wheelAssembly.clone();
        backRightWheel.position.set(-83, 0, 0);

        backWheelPivot.add(backLeftWheel);
        backWheelPivot.add(backRightWheel);
        backRightWheel.scale.set(1,1,1);

        // Добавляем автомобиль в сцену
        scene.add(loadedBody);
        cubeCamera.position.copy(loadedBody.position); // Убедитесь, что loadedBody присвоен body

        // Присваиваем body глобальной переменной
        body = loadedBody;

        // Устанавливаем флаг, что тело готово к рендерингу
        canRenderBody = true;
        body.castShadow = true;
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
