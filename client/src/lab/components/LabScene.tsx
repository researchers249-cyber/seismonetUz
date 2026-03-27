import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { COMPONENT_LIBRARY } from "./ComponentLibrary";
import { generateFieldLines } from "../simulation/electrostatics";
import { generateMagneticLoops } from "../simulation/magnetism";
import {
  Charge,
  ComponentType,
  Connection,
  LabComponent,
  LabMode,
  TerminalRef,
  Vec3,
} from "../types";

interface LabSceneProps {
  mode: LabMode;
  components: LabComponent[];
  connections: Connection[];
  selectedComponentId: string | null;
  connectMode: boolean;
  currentsByConnection: Record<string, number>;
  charges: Charge[];
  magneticFieldStrength: number;
  coilTurns: number;
  mediaFlowSpeed: number;
  onAddComponent: (type: ComponentType, position: Vec3) => void;
  onSelectComponent: (id: string | null) => void;
  onMoveComponent: (id: string, position: Vec3) => void;
  onConnectTerminals: (from: TerminalRef, to: TerminalRef) => void;
  onMoveCharge: (id: string, position: Vec3) => void;
}

const TERMINAL_OFFSET = 0.6;
// Animation tuning: scale current to particle speed, cap max speed, keep a base flow.
const CURRENT_TO_ANIMATION_MULTIPLIER = 2;
const MAX_FLOW_SPEED = 2;
const MIN_FLOW_SPEED = 0.4;

const getWorldPosition = (mesh: THREE.Object3D) => {
  const position = new THREE.Vector3();
  mesh.getWorldPosition(position);
  return position;
};

export function LabScene({
  mode,
  components,
  connections,
  selectedComponentId,
  connectMode,
  currentsByConnection,
  charges,
  magneticFieldStrength,
  coilTurns,
  mediaFlowSpeed,
  onAddComponent,
  onSelectComponent,
  onMoveComponent,
  onConnectTerminals,
  onMoveCharge,
}: LabSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<OrbitControls>();
  const planeRef = useRef<THREE.Mesh>();

  const componentMeshesRef = useRef(new Map<string, THREE.Mesh>());
  const terminalMeshesRef = useRef(new Map<string, THREE.Mesh[]>());
  const wireMeshesRef = useRef(new Map<string, THREE.Line>());
  const flowMeshesRef = useRef(new Map<string, THREE.Mesh>());
  const chargeMeshesRef = useRef(new Map<string, THREE.Mesh>());
  const fieldLinesRef = useRef<THREE.Group>();
  const magneticFieldRef = useRef<THREE.Group>();
  const mediaParticlesRef = useRef<THREE.Group>();
  const connectionsRef = useRef<Connection[]>(connections);
  const currentsRef = useRef<Record<string, number>>(currentsByConnection);

  const connectStartRef = useRef<TerminalRef | null>(null);
  const dragStateRef = useRef<
    | {
        type: "component" | "charge";
        id: string;
        offset: THREE.Vector3;
      }
    | null
  >(null);

  const sceneGroups = useMemo(
    () => ({
      circuit: new THREE.Group(),
      electro: new THREE.Group(),
      magnet: new THREE.Group(),
      media: new THREE.Group(),
    }),
    []
  );
  const dragPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    []
  );

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  useEffect(() => {
    currentsRef.current = currentsByConnection;
  }, [currentsByConnection]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#05070f");

    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      200
    );
    camera.position.set(6, 6, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.48;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const directional = new THREE.DirectionalLight(0xffffff, 0.6);
    directional.position.set(6, 10, 4);
    scene.add(ambient, directional);

    const grid = new THREE.GridHelper(30, 30, 0x1f2937, 0x111827);
    scene.add(grid);

    const planeGeometry = new THREE.PlaneGeometry(40, 40);
    const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);

    scene.add(sceneGroups.circuit, sceneGroups.electro, sceneGroups.magnet, sceneGroups.media);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    controlsRef.current = controls;
    planeRef.current = plane;

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) {
        return;
      }
      const { clientWidth, clientHeight } = containerRef.current;
      rendererRef.current.setSize(clientWidth, clientHeight);
      cameraRef.current.aspect = clientWidth / clientHeight;
      cameraRef.current.updateProjectionMatrix();
    });
    resizeObserver.observe(containerRef.current);

    let animationFrameId: number;
    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      wireMeshesRef.current.forEach((line, connectionId) => {
        const connection = connectionsRef.current.find(
          (item) => item.id === connectionId
        );
        if (!connection) {
          return;
        }
        const startMesh = terminalMeshesRef.current.get(connection.from.componentId)?.[
          connection.from.terminal
        ];
        const endMesh = terminalMeshesRef.current.get(connection.to.componentId)?.[
          connection.to.terminal
        ];
        if (!startMesh || !endMesh) {
          return;
        }
        const start = getWorldPosition(startMesh);
        const end = getWorldPosition(endMesh);
        const positions = new Float32Array([
          start.x,
          start.y,
          start.z,
          end.x,
          end.y,
          end.z,
        ]);
        line.geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3)
        );
        line.geometry.computeBoundingSphere();

        const flow = flowMeshesRef.current.get(connectionId);
        if (flow) {
          const speed =
            Math.min(
              Math.abs(currentsRef.current[connectionId] ?? 0) *
                CURRENT_TO_ANIMATION_MULTIPLIER,
              MAX_FLOW_SPEED
            ) + MIN_FLOW_SPEED;
          const t = ((time / 1000) * speed) % 1;
          flow.position.lerpVectors(start, end, t);
        }
      });

      const mediaParticles = mediaParticlesRef.current;
      if (mediaParticles) {
        const particleCount = Math.max(mediaParticles.children.length, 1);
        mediaParticles.children.forEach(
          (particle: THREE.Object3D, index: number) => {
            const offset = (index / particleCount) * Math.PI * 2;
            particle.position.x = Math.sin(time / 800 + offset) * 2;
            particle.position.z = Math.cos(time / 800 + offset) * 2;
            particle.position.y = Math.sin(time / 600 + offset) * 0.4 + 0.6;
          }
        );
      }

      renderer.render(scene, camera);
    };

    animate(0);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
      scene.clear();
    };
  }, [sceneGroups]);

  useEffect(() => {
    sceneGroups.circuit.visible = mode === "dc" || mode === "ac" || mode === "safety";
    sceneGroups.electro.visible = mode === "electrostatics";
    sceneGroups.magnet.visible = mode === "magnetism";
    sceneGroups.media.visible = mode === "media";
  }, [mode, sceneGroups]);

  useEffect(() => {
    const group = sceneGroups.circuit;
    components.forEach((component) => {
      let mesh = componentMeshesRef.current.get(component.id);
      if (!mesh) {
        mesh = createComponentMesh(component);
        group.add(mesh);
        componentMeshesRef.current.set(component.id, mesh);
        terminalMeshesRef.current.set(component.id, getTerminalMeshes(mesh));
      }
      mesh.position.set(component.position.x, component.position.y, component.position.z);
      const isSelected = component.id === selectedComponentId;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissive.set(isSelected ? "#38bdf8" : "#000000");
    });

    componentMeshesRef.current.forEach((mesh, id) => {
      if (!components.find((component) => component.id === id)) {
        group.remove(mesh);
        componentMeshesRef.current.delete(id);
        terminalMeshesRef.current.delete(id);
      }
    });
  }, [components, selectedComponentId, sceneGroups]);

  useEffect(() => {
    const group = sceneGroups.circuit;
    connections.forEach((connection) => {
      if (wireMeshesRef.current.has(connection.id)) {
        return;
      }
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
      const geometry = new THREE.BufferGeometry();
      const line = new THREE.Line(geometry, lineMaterial);
      wireMeshesRef.current.set(connection.id, line);
      group.add(line);

      const flowMaterial = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24 });
      const flow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), flowMaterial);
      flowMeshesRef.current.set(connection.id, flow);
      group.add(flow);
    });

    wireMeshesRef.current.forEach((line, id) => {
      if (!connections.find((connection) => connection.id === id)) {
        group.remove(line);
        wireMeshesRef.current.delete(id);
      }
    });

    flowMeshesRef.current.forEach((mesh, id) => {
      if (!connections.find((connection) => connection.id === id)) {
        group.remove(mesh);
        flowMeshesRef.current.delete(id);
      }
    });
  }, [connections, sceneGroups]);

  useEffect(() => {
    const group = sceneGroups.electro;
    if (!fieldLinesRef.current) {
      fieldLinesRef.current = new THREE.Group();
      group.add(fieldLinesRef.current);
    }
    fieldLinesRef.current.clear();

    const lines = generateFieldLines(charges);
    lines.forEach((line) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(line.points.flatMap((point) => [point.x, point.y, point.z]));
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.5 });
      const mesh = new THREE.Line(geometry, material);
      fieldLinesRef.current?.add(mesh);
    });

    charges.forEach((charge) => {
      let mesh = chargeMeshesRef.current.get(charge.id);
      if (!mesh) {
        const geometry = new THREE.SphereGeometry(0.3, 32, 32);
        const material = new THREE.MeshStandardMaterial({
          color: charge.value >= 0 ? 0xef4444 : 0x3b82f6,
          emissive: charge.value >= 0 ? 0x7f1d1d : 0x1e3a8a,
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { chargeId: charge.id };
        group.add(mesh);
        chargeMeshesRef.current.set(charge.id, mesh);
      }
      mesh.position.set(charge.position.x, charge.position.y, charge.position.z);
    });

    chargeMeshesRef.current.forEach((mesh, id) => {
      if (!charges.find((charge) => charge.id === id)) {
        group.remove(mesh);
        chargeMeshesRef.current.delete(id);
      }
    });
  }, [charges, sceneGroups]);

  useEffect(() => {
    const group = sceneGroups.magnet;
    group.clear();
    if (!magneticFieldRef.current) {
      magneticFieldRef.current = new THREE.Group();
    }
    group.add(magneticFieldRef.current);
    magneticFieldRef.current.clear();

    const coil = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.2, 16, 100),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b })
    );
    coil.rotation.x = Math.PI / 2;
    group.add(coil);

    const loops = generateMagneticLoops(2.5, Math.min(10, Math.max(4, coilTurns)));
    loops.forEach((points) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])), 3)
      );
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.55, 0.7, 0.5 + magneticFieldStrength * 0.05),
        transparent: true,
        opacity: 0.6,
      });
      const line = new THREE.Line(geometry, material);
      magneticFieldRef.current?.add(line);
    });
  }, [magneticFieldStrength, coilTurns, sceneGroups]);

  useEffect(() => {
    const group = sceneGroups.media;
    group.clear();
    if (!mediaParticlesRef.current) {
      mediaParticlesRef.current = new THREE.Group();
    }
    group.add(mediaParticlesRef.current);
    mediaParticlesRef.current.clear();

    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 2.5, 32, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.2 })
    );
    tube.rotation.x = Math.PI / 2;
    group.add(tube);

    const particleCount = Math.floor(20 + mediaFlowSpeed * 12);
    for (let i = 0; i < particleCount; i += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x22c55e })
      );
      particle.position.set(
        Math.sin(i) * 2,
        0.6 + (i % 5) * 0.15,
        Math.cos(i) * 2
      );
      mediaParticlesRef.current?.add(particle);
    }
  }, [mediaFlowSpeed, sceneGroups]);

  useEffect(() => {
    const camera = cameraRef.current;
    const container = containerRef.current;
    if (!camera || !container) {
      return;
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const plane = dragPlane;

    const getPointer = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const getPlaneIntersection = (event: PointerEvent) => {
      getPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);
      return intersection;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!sceneRef.current) {
        return;
      }
      getPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(
        sceneRef.current.children,
        true
      ) as THREE.Intersection<THREE.Object3D>[];

      if (mode === "electrostatics") {
        const chargeHit = intersects.find(
          (item) => item.object.userData.chargeId
        );
        if (chargeHit) {
          const chargeId = chargeHit.object.userData.chargeId as string;
          const offset = getPlaneIntersection(event).sub(getWorldPosition(chargeHit.object));
          dragStateRef.current = { type: "charge", id: chargeId, offset };
          return;
        }
      }

      if (mode === "dc" || mode === "ac" || mode === "safety") {
        const terminalHit = intersects.find(
          (item) => item.object.userData.terminal !== undefined
        );
        if (connectMode && terminalHit) {
          const terminal = terminalHit.object.userData as TerminalRef;
          if (!connectStartRef.current) {
            connectStartRef.current = terminal;
          } else if (connectStartRef.current.componentId !== terminal.componentId) {
            onConnectTerminals(connectStartRef.current, terminal);
            connectStartRef.current = null;
          }
          return;
        }

        const componentHit = intersects.find(
          (item) => item.object.userData.componentId
        );
        if (componentHit) {
          const componentId = componentHit.object.userData.componentId as string;
          onSelectComponent(componentId);
          const offset = getPlaneIntersection(event).sub(getWorldPosition(componentHit.object));
          dragStateRef.current = { type: "component", id: componentId, offset };
        } else {
          onSelectComponent(null);
        }
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragStateRef.current) {
        return;
      }
      const intersection = getPlaneIntersection(event);
      if (dragStateRef.current.type === "component") {
        const mesh = componentMeshesRef.current.get(dragStateRef.current.id);
        if (!mesh) {
          return;
        }
        mesh.position.copy(intersection.sub(dragStateRef.current.offset));
      }
      if (dragStateRef.current.type === "charge") {
        const mesh = chargeMeshesRef.current.get(dragStateRef.current.id);
        if (!mesh) {
          return;
        }
        mesh.position.copy(intersection.sub(dragStateRef.current.offset));
      }
    };

    const onPointerUp = () => {
      if (!dragStateRef.current) {
        return;
      }
      if (dragStateRef.current.type === "component") {
        const mesh = componentMeshesRef.current.get(dragStateRef.current.id);
        if (mesh) {
          onMoveComponent(dragStateRef.current.id, {
            x: mesh.position.x,
            y: mesh.position.y,
            z: mesh.position.z,
          });
        }
      }
      if (dragStateRef.current.type === "charge") {
        const mesh = chargeMeshesRef.current.get(dragStateRef.current.id);
        if (mesh) {
          onMoveCharge(dragStateRef.current.id, {
            x: mesh.position.x,
            y: mesh.position.y,
            z: mesh.position.z,
          });
        }
      }
      dragStateRef.current = null;
    };

    const domElement = rendererRef.current?.domElement;
    if (!domElement) {
      return () => {};
    }
    domElement.addEventListener("pointerdown", onPointerDown);
    domElement.addEventListener("pointermove", onPointerMove);
    domElement.addEventListener("pointerup", onPointerUp);
    domElement.addEventListener("pointerleave", onPointerUp);

    return () => {
      domElement.removeEventListener("pointerdown", onPointerDown);
      domElement.removeEventListener("pointermove", onPointerMove);
      domElement.removeEventListener("pointerup", onPointerUp);
      domElement.removeEventListener("pointerleave", onPointerUp);
    };
  }, [
    connectMode,
    dragPlane,
    mode,
    onConnectTerminals,
    onMoveCharge,
    onMoveComponent,
    onSelectComponent,
  ]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("component-type") as ComponentType | "";
    if (!type) {
      return;
    }
    const camera = cameraRef.current;
    const plane = planeRef.current;
    if (!camera || !plane || !containerRef.current) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const pointer = new THREE.Vector2();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(plane);
    if (intersects.length) {
      const point = intersects[0].point;
      onAddComponent(type, { x: point.x, y: point.y + 0.1, z: point.z });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[520px] w-full overflow-hidden rounded-2xl border border-gray-800 bg-gray-950"
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
    >
      <div className="absolute left-4 top-4 rounded-full bg-gray-900/80 px-3 py-1 text-xs text-gray-300">
        {mode === "dc" && "DC Circuit Builder"}
        {mode === "ac" && "AC Circuit Lab"}
        {mode === "safety" && "Safety Diagnostics"}
        {mode === "electrostatics" && "Electrostatics"}
        {mode === "media" && "Current in Media"}
        {mode === "magnetism" && "Magnetism & Induction"}
      </div>
    </div>
  );
}

const createComponentMesh = (component: LabComponent) => {
  const definition = COMPONENT_LIBRARY[component.type];
  let geometry: THREE.BufferGeometry;
  switch (component.type) {
    case "battery":
      geometry = new THREE.CylinderGeometry(0.4, 0.4, 1.4, 32);
      break;
    case "capacitor":
      geometry = new THREE.BoxGeometry(1.2, 0.5, 0.6);
      break;
    case "inductor":
      geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 48);
      break;
    case "bulb":
      geometry = new THREE.SphereGeometry(0.5, 32, 32);
      break;
    case "ammeter":
    case "voltmeter":
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.6, 24);
      break;
    default:
      geometry = new THREE.BoxGeometry(1, 0.5, 0.6);
  }
  const material = new THREE.MeshStandardMaterial({
    color: definition.color,
    metalness: 0.2,
    roughness: 0.4,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = { componentId: component.id };

  const terminalMaterial = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
  const terminalGeometry = new THREE.SphereGeometry(0.12, 16, 16);
  const terminalLeft = new THREE.Mesh(terminalGeometry, terminalMaterial);
  const terminalRight = new THREE.Mesh(terminalGeometry, terminalMaterial);
  terminalLeft.position.set(-TERMINAL_OFFSET, 0, 0);
  terminalRight.position.set(TERMINAL_OFFSET, 0, 0);
  terminalLeft.userData = { componentId: component.id, terminal: 0 };
  terminalRight.userData = { componentId: component.id, terminal: 1 };
  mesh.add(terminalLeft, terminalRight);

  return mesh;
};

const getTerminalMeshes = (mesh: THREE.Mesh) =>
  mesh.children.filter(
    (child: THREE.Object3D) => child.userData.terminal !== undefined
  ) as THREE.Mesh[];
