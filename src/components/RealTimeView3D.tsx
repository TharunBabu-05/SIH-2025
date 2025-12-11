import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useNavigate } from 'react-router-dom';
import { Home, Menu, X } from 'lucide-react';
import '../styles/RealTimeView3D.css';

interface PoleStatus {
  poleNumber: number;
  hasFault: boolean;
  phaseR: { status: string; relay: boolean };
  phaseY: { status: string; relay: boolean };
  phaseB: { status: string; relay: boolean };
}

const RealTimeView3D = () => {
  const navigate = useNavigate();
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const poleIndicatorsRef = useRef<THREE.Mesh[]>([]);
  const wireGroupsRef = useRef<THREE.Group[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [showMenu, setShowMenu] = useState(false);
  const [poleStatuses, setPoleStatuses] = useState<PoleStatus[]>([
    { poleNumber: 1, hasFault: false, phaseR: { status: 'NORMAL', relay: false }, phaseY: { status: 'NORMAL', relay: false }, phaseB: { status: 'NORMAL', relay: false } },
    { poleNumber: 2, hasFault: false, phaseR: { status: 'NORMAL', relay: false }, phaseY: { status: 'NORMAL', relay: false }, phaseB: { status: 'NORMAL', relay: false } },
    { poleNumber: 3, hasFault: false, phaseR: { status: 'NORMAL', relay: false }, phaseY: { status: 'NORMAL', relay: false }, phaseB: { status: 'NORMAL', relay: false } },
    { poleNumber: 4, hasFault: false, phaseR: { status: 'NORMAL', relay: false }, phaseY: { status: 'NORMAL', relay: false }, phaseB: { status: 'NORMAL', relay: false } },
    { poleNumber: 5, hasFault: false, phaseR: { status: 'NORMAL', relay: false }, phaseY: { status: 'NORMAL', relay: false }, phaseB: { status: 'NORMAL', relay: false } },
  ]);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.Fog(0x87ceeb, 50, 200);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 5, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 30;
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI / 2.1;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 50, 30);
    sunLight.castShadow = true;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x90ee90,
      roughness: 0.8 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Road
    const roadGeometry = new THREE.PlaneGeometry(8, 200);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      roughness: 0.9 
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    scene.add(road);

    // Road markings
    for (let i = -90; i < 90; i += 10) {
      const markingGeometry = new THREE.PlaneGeometry(0.3, 3);
      const markingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.3
      });
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.rotation.x = -Math.PI / 2;
      marking.position.set(0, 0.02, i);
      scene.add(marking);
    }

    // Create 5 poles with indicators
    const poleSpacing = 25;
    const startZ = -50;
    
    for (let i = 0; i < 5; i++) {
      const poleGroup = createElectricPole(i + 1, -5, 0, startZ + i * poleSpacing);
      scene.add(poleGroup);
    }

    // Create wires connecting poles
    createWiresBetweenPoles(scene);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      
      // Animate indicator lights
      poleIndicatorsRef.current.forEach((indicator, index) => {
        if (poleStatuses[index]?.hasFault) {
          // Blinking effect for fault
          const time = Date.now() * 0.003;
          indicator.material.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.3;
        }
      });
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // WebSocket connection to ESP32
  useEffect(() => {
    const deviceIP = localStorage.getItem('device_ip') || '10.189.10.133';
    const wsUrl = `ws://${deviceIP}:81`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('3D View: Connected to ESP32');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Skip fault log messages
        if (data.type === 'fault_log') return;
        
        // Update pole statuses based on ESP32 data
        const newStatuses = poleStatuses.map(status => ({
          ...status,
          hasFault: false,
          phaseR: { status: 'NORMAL', relay: false },
          phaseY: { status: 'NORMAL', relay: false },
          phaseB: { status: 'NORMAL', relay: false }
        }));
        
        // Check Phase R fault and pole number
        if (data.pole_R && (data.status_R === 'CUT' || data.relay_R === true)) {
          const poleIndex = data.pole_R - 1;
          if (poleIndex >= 0 && poleIndex < 5) {
            newStatuses[poleIndex].hasFault = true;
            newStatuses[poleIndex].phaseR = { status: data.status_R, relay: data.relay_R };
          }
        }
        
        // Check Phase Y fault and pole number
        if (data.pole_Y && (data.status_Y === 'CUT' || data.relay_Y === true)) {
          const poleIndex = data.pole_Y - 1;
          if (poleIndex >= 0 && poleIndex < 5) {
            newStatuses[poleIndex].hasFault = true;
            newStatuses[poleIndex].phaseY = { status: data.status_Y, relay: data.relay_Y };
          }
        }
        
        // Check Phase B fault and pole number
        if (data.pole_B && (data.status_B === 'CUT' || data.relay_B === true)) {
          const poleIndex = data.pole_B - 1;
          if (poleIndex >= 0 && poleIndex < 5) {
            newStatuses[poleIndex].hasFault = true;
            newStatuses[poleIndex].phaseB = { status: data.status_B, relay: data.relay_B };
          }
        }
        
        setPoleStatuses(newStatuses);
        updatePoleIndicators(newStatuses);
      } catch (error) {
        console.error('Error parsing ESP32 data:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('3D View WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('3D View: Disconnected from ESP32');
    };

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const createElectricPole = (poleNumber: number, x: number, y: number, z: number) => {
    const poleGroup = new THREE.Group();
    poleGroup.position.set(x, y, z);

    // Wooden pole
    const poleGeometry = new THREE.CylinderGeometry(0.3, 0.4, 15, 16);
    const poleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513,
      roughness: 0.9,
      metalness: 0.1
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.castShadow = true;
    pole.receiveShadow = true;
    poleGroup.add(pole);

    // Cross arm
    const armGeometry = new THREE.BoxGeometry(4, 0.2, 0.3);
    const armMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x654321,
      roughness: 0.8
    });
    const crossArm = new THREE.Mesh(armGeometry, armMaterial);
    crossArm.position.y = 6;
    crossArm.castShadow = true;
    poleGroup.add(crossArm);

    // Wire insulators (3 for phases + 1 for neutral)
    const insulatorPositions = [-1.5, -0.5, 0.5, 1.5];
    insulatorPositions.forEach((xPos) => {
      const insulatorGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8);
      const insulatorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        roughness: 0.3,
        metalness: 0.5
      });
      const insulator = new THREE.Mesh(insulatorGeometry, insulatorMaterial);
      insulator.position.set(xPos, 6.5, 0);
      poleGroup.add(insulator);
    });

    // Status indicator light on top
    const indicatorGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const indicatorMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.2
    });
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicator.position.y = 8;
    poleGroup.add(indicator);
    
    // Add point light for indicator
    const indicatorLight = new THREE.PointLight(0x00ff00, 1, 10);
    indicatorLight.position.y = 8;
    poleGroup.add(indicatorLight);
    
    poleIndicatorsRef.current.push(indicator);

    // Pole number label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 256;
    context.fillStyle = '#ffffff';
    context.font = 'bold 100px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`${poleNumber}`, 128, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.SpriteMaterial({ map: texture });
    const label = new THREE.Sprite(labelMaterial);
    label.position.y = -6;
    label.scale.set(2, 2, 1);
    poleGroup.add(label);

    return poleGroup;
  };

  const createWiresBetweenPoles = (scene: THREE.Scene) => {
    const poleSpacing = 25;
    const startZ = -50;
    const poleHeight = 6.5;
    const wireOffsets = [-1.5, -0.5, 0.5, 1.5]; // R, Y, B, Neutral
    const wireColors = [0xff0000, 0xffff00, 0x0000ff, 0x888888]; // Red, Yellow, Blue, Gray

    for (let i = 0; i < 4; i++) {
      for (let p = 0; p < 4; p++) {
        const startX = -5;
        const endX = -5;
        const startZ_pos = startZ + p * poleSpacing;
        const endZ_pos = startZ + (p + 1) * poleSpacing;
        
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(startX + wireOffsets[i], poleHeight, startZ_pos),
          new THREE.Vector3((startX + endX) / 2 + wireOffsets[i], poleHeight - 1.5, (startZ_pos + endZ_pos) / 2),
          new THREE.Vector3(endX + wireOffsets[i], poleHeight, endZ_pos)
        ]);

        const points = curve.getPoints(50);
        const wireGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const wireMaterial = new THREE.LineBasicMaterial({ 
          color: wireColors[i],
          linewidth: 2
        });
        
        const wire = new THREE.Line(wireGeometry, wireMaterial);
        scene.add(wire);
      }
    }
  };

  const updatePoleIndicators = (statuses: PoleStatus[]) => {
    poleIndicatorsRef.current.forEach((indicator, index) => {
      if (!sceneRef.current) return;
      
      const status = statuses[index];
      if (status.hasFault) {
        indicator.material.color.setHex(0xff0000);
        indicator.material.emissive.setHex(0xff0000);
        
        // Update point light
        const poleGroup = indicator.parent;
        if (poleGroup) {
          const light = poleGroup.children.find(child => child instanceof THREE.PointLight) as THREE.PointLight;
          if (light) {
            light.color.setHex(0xff0000);
            light.intensity = 2;
          }
        }
      } else {
        indicator.material.color.setHex(0x00ff00);
        indicator.material.emissive.setHex(0x00ff00);
        indicator.material.emissiveIntensity = 0.8;
        
        // Update point light
        const poleGroup = indicator.parent;
        if (poleGroup) {
          const light = poleGroup.children.find(child => child instanceof THREE.PointLight) as THREE.PointLight;
          if (light) {
            light.color.setHex(0x00ff00);
            light.intensity = 1;
          }
        }
      }
    });
  };

  return (
    <div className="realtime-view-3d">
      <div ref={mountRef} className="canvas-container" />
      
      {/* Top Navigation Bar */}
      <div className="view-3d-navbar">
        <button className="menu-btn" onClick={() => setShowMenu(!showMenu)}>
          {showMenu ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="view-3d-title">Real-Time View 3D - Electric Pole Network</h1>
        <button className="home-btn" onClick={() => navigate('/')}>
          <Home size={24} />
          Dashboard
        </button>
      </div>

      {/* Side Menu */}
      {showMenu && (
        <>
          <div className="menu-overlay" onClick={() => setShowMenu(false)} />
          <div className="side-menu">
            <h2>Pole Status</h2>
            <div className="pole-status-list">
              {poleStatuses.map((status, index) => (
                <div key={index} className={`pole-status-item ${status.hasFault ? 'fault' : 'normal'}`}>
                  <div className="pole-number">Pole {status.poleNumber}</div>
                  <div className={`status-indicator ${status.hasFault ? 'fault' : 'normal'}`}>
                    {status.hasFault ? '🔴 FAULT' : '🟢 NORMAL'}
                  </div>
                  <div className="phase-details">
                    <div className={`phase-item ${status.phaseR.relay ? 'cut' : ''}`}>
                      R: {status.phaseR.status}
                    </div>
                    <div className={`phase-item ${status.phaseY.relay ? 'cut' : ''}`}>
                      Y: {status.phaseY.status}
                    </div>
                    <div className={`phase-item ${status.phaseB.relay ? 'cut' : ''}`}>
                      B: {status.phaseB.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="legend">
              <h3>Legend</h3>
              <div className="legend-item">
                <div className="wire-color" style={{ backgroundColor: '#ff0000' }}></div>
                <span>R Phase (Red)</span>
              </div>
              <div className="legend-item">
                <div className="wire-color" style={{ backgroundColor: '#ffff00' }}></div>
                <span>Y Phase (Yellow)</span>
              </div>
              <div className="legend-item">
                <div className="wire-color" style={{ backgroundColor: '#0000ff' }}></div>
                <span>B Phase (Blue)</span>
              </div>
              <div className="legend-item">
                <div className="wire-color" style={{ backgroundColor: '#888888' }}></div>
                <span>Neutral (Gray)</span>
              </div>
            </div>
            
            <div className="controls-info">
              <h3>Controls</h3>
              <p>🖱️ Left Click + Drag: Rotate</p>
              <p>🖱️ Right Click + Drag: Pan</p>
              <p>🖱️ Scroll: Zoom In/Out</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RealTimeView3D;
