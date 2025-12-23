// Three.js 3D Flying Robot - Loading glTF Model
class FlyingRobot3D {
    constructor(containerId) {
        console.log('🚀 FlyingRobot3D constructor called');

        // First, replace the CSS robot with our container
        const angelContainer = document.querySelector('.animated-angel-container');
        if (angelContainer) {
            const flyingRobot = angelContainer.querySelector('.flying-robot');
            if (flyingRobot) {
                console.log('Replacing CSS robot with Three.js container');
                flyingRobot.outerHTML = `<div id="${containerId}" style="width: 200px; height: 200px; position: relative;"></div>`;
            }
        }

        this.container = document.getElementById(containerId);
        console.log('Container element:', this.container);
        if (!this.container) {
            console.error('❌ Container not found!');
            return;
        }

        // Animation state machine (start parked in rest area)
        this.state = 'PARKED'; // Robot starts in rest area

        // Parking coordinates (center position, facing forward)
        this.parkingPosition = { x: 0, y: -0.5, z: 0 };
        this.parkingRotation = { x: 0, y: 0, z: 0 };

        // Transition progress
        this.transitionProgress = 0;
        this.transitionSpeed = 0.02; // Adjust for faster/slower transitions

        // Store original position for smooth transitions
        this.startPosition = { x: 0, y: -0.5, z: 0 };
        this.startRotation = { x: 0, y: 0, z: 0 };

        this.init();
        this.loadModel();
        this.animate();
        this.setupControls();
        this.setupInitialState();
    }

    setupInitialState() {
        // Set parking spot as occupied since robot starts parked
        const parkingSpot = document.querySelector('.robot-parking-spot');
        if (parkingSpot) {
            parkingSpot.classList.add('occupied');
        }
    }

    // Control container movement around screen
    setContainerRoaming(isRoaming) {
        const container = document.querySelector('.animated-angel-container');
        const parkingSpot = document.querySelector('.robot-parking-spot');

        if (container) {
            if (isRoaming) {
                // Move container to body to escape parent stacking contexts
                document.body.appendChild(container);

                // Switch to fixed positioning and animate around screen
                container.style.setProperty('position', 'fixed', 'important');
                container.style.top = '10%';
                container.style.left = '80%';
                container.style.transform = 'none';
                container.style.setProperty('z-index', '99999', 'important'); // Force highest z-index
                container.style.pointerEvents = 'auto'; // Enable pointer events
                container.style.animation = 'flyAroundScreen 25s ease-in-out infinite';
                console.log('🚀 Roaming - z-index:', window.getComputedStyle(container).zIndex, 'position:', window.getComputedStyle(container).position);
            } else {
                // Move container back inside parking spot
                if (parkingSpot) {
                    parkingSpot.insertBefore(container, parkingSpot.firstChild);
                }

                // Switch to absolute positioning overlapping rest area
                container.style.setProperty('position', 'absolute', 'important');
                container.style.top = '41%';
                container.style.left = '40%';
                container.style.transform = 'translate(-50%, -50%)';
                container.style.setProperty('z-index', '10', 'important');
                container.style.pointerEvents = 'none'; // Disable pointer events
                container.style.animation = 'none';
                console.log('🏠 Parked - z-index:', window.getComputedStyle(container).zIndex);
            }
        }
    }

    // Linear interpolation helper
    lerp(start, end, progress) {
        return start + (end - start) * progress;
    }

    // Easing function for smooth transitions
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    setupControls() {
        const stopBtn = document.getElementById('stopRoamingBtn');
        const moveBtn = document.getElementById('moveAroundBtn');
        const parkingSpot = document.querySelector('.robot-parking-spot');

        if (stopBtn && moveBtn) {
            stopBtn.addEventListener('click', () => {
                this.parkRobot();
                stopBtn.classList.add('hidden');
                moveBtn.classList.remove('hidden');
                if (parkingSpot) parkingSpot.classList.add('occupied');
            });

            moveBtn.addEventListener('click', () => {
                this.resumeRoaming();
                moveBtn.classList.add('hidden');
                stopBtn.classList.remove('hidden');
                if (parkingSpot) parkingSpot.classList.remove('occupied');
            });
        }
    }

    parkRobot() {
        console.log('🏠 parkRobot called, robot exists:', !!this.robot, 'current state:', this.state);

        if (!this.robot) {
            console.warn('⚠️ Robot not loaded yet, cannot park');
            return;
        }

        if (this.state === 'PARKING' || this.state === 'PARKED') {
            console.log('Already parking or parked');
            return;
        }

        console.log('🏠 Parking robot...');
        this.state = 'PARKING';
        this.transitionProgress = 0;

        // Stop container movement
        this.setContainerRoaming(false);

        // Store current position and rotation as start point
        this.startPosition = {
            x: this.robot.position.x,
            y: this.robot.position.y,
            z: this.robot.position.z
        };
        this.startRotation = {
            x: this.robot.rotation.x,
            y: this.robot.rotation.y,
            z: this.robot.rotation.z
        };

        console.log('Start position:', this.startPosition);
        console.log('Target position:', this.parkingPosition);
    }

    resumeRoaming() {
        console.log('▶️ resumeRoaming called, current state:', this.state);

        if (this.state === 'ROAMING' || this.state === 'RESUMING') {
            console.log('Already roaming or resuming');
            return;
        }

        console.log('▶️ Resuming roaming...');
        this.state = 'RESUMING';
        this.transitionProgress = 0;

        // Start container movement around screen
        this.setContainerRoaming(true);
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            50,
            this.container.offsetWidth / this.container.offsetHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0.5, 4);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x7FFFD4, 1.5, 100);
        pointLight.position.set(3, 5, 3);
        pointLight.castShadow = true;
        this.scene.add(pointLight);

        const rimLight = new THREE.PointLight(0x00E5FF, 1, 100);
        rimLight.position.set(-3, 2, -3);
        this.scene.add(rimLight);

        const topLight = new THREE.PointLight(0xFFFFFF, 0.8, 100);
        topLight.position.set(0, 5, 0);
        this.scene.add(topLight);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    loadModel() {
        console.log('Loading glTF model...');

        const loader = new THREE.GLTFLoader();

        loader.load(
            'kawaii__cute_flying_robot/scene.gltf',
            (gltf) => {
                console.log('✅ Model loaded successfully!');
                this.robot = gltf.scene;

                // Scale and position the model
                this.robot.scale.set(1.5, 1.5, 1.5);
                this.robot.position.set(0, -0.5, 0);

                // Enable shadows
                this.robot.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                this.scene.add(this.robot);
                console.log('Robot added to scene');
            },
            (progress) => {
                const percent = (progress.loaded / progress.total * 100).toFixed(2);
                console.log(`Loading: ${percent}%`);
            },
            (error) => {
                console.error('❌ Error loading model:', error);
            }
        );
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (!this.robot) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        const time = Date.now() * 0.001;

        // Log state every 60 frames (about once per second) - DISABLED FOR PRODUCTION
        // if (Math.floor(time) % 2 === 0 && time % 1 < 0.016) {
        //     console.log('Current state:', this.state);
        // }

        switch (this.state) {
            case 'ROAMING':
                // Normal floating and rotation animations (increased amplitude for visibility)
                this.robot.rotation.y = Math.sin(time * 0.5) * 0.8; // Increased from 0.3
                this.robot.position.y = -0.5 + Math.sin(time * 2) * 0.4; // Increased from 0.15
                this.robot.rotation.x = Math.sin(time * 1.5) * 0.1; // Increased from 0.05
                this.robot.rotation.z = Math.cos(time * 1.5) * 0.08; // Increased from 0.03
                break;

            case 'PARKING':
                // Smooth transition to parking spot
                this.transitionProgress += this.transitionSpeed;

                if (this.transitionProgress >= 1) {
                    this.transitionProgress = 1;
                    this.state = 'PARKED';
                    console.log('✅ Robot parked');
                }

                const easedProgress = this.easeInOutCubic(this.transitionProgress);

                // Interpolate position
                this.robot.position.x = this.lerp(
                    this.startPosition.x,
                    this.parkingPosition.x,
                    easedProgress
                );
                this.robot.position.y = this.lerp(
                    this.startPosition.y,
                    this.parkingPosition.y,
                    easedProgress
                );
                this.robot.position.z = this.lerp(
                    this.startPosition.z,
                    this.parkingPosition.z,
                    easedProgress
                );

                // Interpolate rotation
                this.robot.rotation.x = this.lerp(
                    this.startRotation.x,
                    this.parkingRotation.x,
                    easedProgress
                );
                this.robot.rotation.y = this.lerp(
                    this.startRotation.y,
                    this.parkingRotation.y,
                    easedProgress
                );
                this.robot.rotation.z = this.lerp(
                    this.startRotation.z,
                    this.parkingRotation.z,
                    easedProgress
                );
                break;

                // Robot stays still at parking position
                // console.log('In PARKED state, setting position to:', this.parkingPosition); // Disabled for production
                this.robot.position.set(
                    this.parkingPosition.x,
                    this.parkingPosition.y,
                    this.parkingPosition.z
                );
                this.robot.rotation.set(
                    this.parkingRotation.x,
                    this.parkingRotation.y,
                    this.parkingRotation.z
                );
                break;

            case 'RESUMING':
                // Gradually resume animations
                this.transitionProgress += this.transitionSpeed;

                if (this.transitionProgress >= 1) {
                    this.transitionProgress = 1;
                    this.state = 'ROAMING';
                    console.log('✅ Roaming resumed');
                }

                // Start with small movements that gradually increase
                const resumeProgress = this.easeInOutCubic(this.transitionProgress);
                this.robot.rotation.y = Math.sin(time * 0.5) * 0.3 * resumeProgress;
                this.robot.position.y = -0.5 + Math.sin(time * 2) * 0.15 * resumeProgress;
                this.robot.rotation.x = Math.sin(time * 1.5) * 0.05 * resumeProgress;
                this.robot.rotation.z = Math.cos(time * 1.5) * 0.03 * resumeProgress;
                break;
        }

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🤖 Robot script loaded');
    console.log('Three.js available:', typeof THREE !== 'undefined');
    console.log('GLTFLoader available:', typeof THREE.GLTFLoader !== 'undefined');

    const robotContainer = document.getElementById('robot3d-container');
    console.log('Robot container found:', robotContainer);

    const angelContainer = document.querySelector('.animated-angel-container');
    console.log('Angel container found:', angelContainer);

    if (!robotContainer && angelContainer) {
        console.log('Creating Three.js robot...');
        try {
            new FlyingRobot3D('robot3d-container');
            console.log('✅ Robot initialized successfully');
        } catch (error) {
            console.error('❌ Robot initialization error:', error);
        }
    } else if (robotContainer) {
        console.log('Container already exists, initializing...');
        try {
            new FlyingRobot3D('robot3d-container');
            console.log('✅ Robot initialized successfully');
        } catch (error) {
            console.error('❌ Robot initialization error:', error);
        }
    } else {
        console.error('❌ No container found!');
    }
});
