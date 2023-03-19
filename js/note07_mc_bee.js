

import * as THREE from '../node_modules/three/build/three.module.js';
import {OrbitControls} from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from "../node_modules/three/examples/jsm/loaders/GLTFLoader.js"


class App {
	constructor() {
		const divContainer = document.querySelector("#webgl_container");
		this._divContainer = divContainer;

		const renderer = new THREE.WebGLRenderer({ antialias: true });
		
		divContainer.appendChild(renderer.domElement);

        renderer.shadowMap.enabled = true;
		this._renderer = renderer;
		renderer.setSize(window.innerWidth, window.innerHeight);
		const scene = new THREE.Scene();
		this._scene = scene;
        this._clock = new THREE.Clock();
        this._time = 0;
        this._step = 0.1
        this._setupBackground();
		this._setupCamera();
		this._setupLight();
        this._setupAmmo();
		this._setupControls();
        

		window.onresize = this.resize.bind(this);
		this.resize();

		
	}
    _setupBackground(){
        this._scene.background = new THREE.Color(0xdddddd)
    }
    _setupModel() {
        const gltfLoader = new GLTFLoader()
        gltfLoader.load(
            '../src/mc_hive/source/model.gltf',(gltf1)=>{
                gltfLoader.load(
                    '../src/mc_bee/scene.gltf',(gltf2)=>{
                        
                        const hive = gltf1.scene
                        hive.scale.set(10,10,10)
                        this._scene.add(hive)
                        hive.traverse( function( node ) { if ( node.isMesh ) { node.castShadow = true; }} );
                        

                        

                        this.beeGltf = gltf2;
                                           
                        this._mixer = new THREE.AnimationMixer(this.beeGltf.scene);
                        const animationAction = this._mixer.clipAction(this.beeGltf.animations[0]);
                        animationAction.play();
                        console.log()
                        console.log(animationAction)

                        



                        const beeModel = gltf2.scene;
                        this.beeModel = beeModel;
                        const body = beeModel.children[0].children[0].children[0].children[0]
                        body.children.splice(2,1)
                        
                        const temp = new THREE.Box3().setFromObject( body )
                        const aabbPos = {x : (temp.min.x + temp.max.x)/2,
                            y : (temp.min.y + temp.max.y)/2,
                            z : (temp.min.z + temp.max.z)/2
                        };
                        
                           const aabb = {
                            min : {x : temp.min.x - aabbPos.x,
                                y : temp.min.y - aabbPos.y,
                                z : temp.min.z - aabbPos.z},
                            max : {x : temp.max.x - aabbPos.x,
                                y : temp.max.y - aabbPos.y,
                                z : temp.max.z - aabbPos.z
                            }
                        };
                        
                        beeModel.position.set(-aabbPos.x, -aabbPos.y, -aabbPos.z)
                        
                        this.group = new THREE.Mesh();
                        this.group.add(beeModel);
                        this.group.aabb = aabb
                        this._scene.add(this.group)
                        console.log(this.group)
                        
                        



                        this._createTable();
                        

                        requestAnimationFrame(this.render.bind(this));
                    }
                )
            }
        )
    }
    addClone(obj){

        const LVRange = [0,20]
        const YRange = [30,50]
        const AVRange = [0,5]
                        
        const clone = new THREE.Mesh();
        clone.add(this.beeModel);
        



        this.setPhysics(clone, obj.aabb)
        clone.rotation.set(0,Math.PI,0)
        this._scene.add(clone)
        clone.traverse( function( node ) { if ( node.isMesh ) { node.castShadow = true; }} );

        const randomR = Math.random() * (LVRange[1] - LVRange[0]) + LVRange[0];
        const randomY = Math.random() * (YRange[1] - YRange[0]) + YRange[0];
        const randomT = Math.random() * Math.PI * 2;
        clone.physicsBody.setLinearVelocity( new Ammo.btVector3( randomR * Math.cos(randomT), randomY, randomR * Math.sin(randomT)))
        clone.physicsBody.setAngularVelocity(new Ammo.btVector3(Math.random() * (AVRange[1] - AVRange[0]) + AVRange[0] - (AVRange[0] + AVRange[1]) / 2,
        Math.random() * (AVRange[1] - AVRange[0]) + AVRange[0] - (AVRange[0] + AVRange[1]) / 2,
        Math.random() * (AVRange[1] - AVRange[0]) + AVRange[0] - (AVRange[0] + AVRange[1]) / 2))
    }
    setPhysics(obj, box3){
        const pos = {x: 0, y: 20,z: 0};
        const scale = {x : box3.max.x - box3.min.x, y : box3.max.y - box3.min.y, z : box3.max.z - box3.min.z};
        const mass = 1;
        obj.position.set(pos.x,pos.y,pos.z)
        
        
        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(obj.rotation)

        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
        const motionState = new Ammo.btDefaultMotionState(transform);
        const colShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5));

        const localInertia = new Ammo.btVector3(0,0,0);
        colShape.calculateLocalInertia(mass, localInertia);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);
        body.setRestitution(0.4);
        body.setFriction(0.8);
        this._physicsWorld.addRigidBody(body);

        obj.physicsBody = body;
    }


    debugPoint(pos){
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute([pos.x, pos.y, pos.z], 3)
        );

        const material = new THREE.PointsMaterial({
            color:0xff38a2,
            size: 5,
            sizeAttenuation : false
        })
        const points = new THREE.Points(geometry, material);
        this._scene.add(points)
    }



    _setupAmmo(){
        Ammo().then(() => {
            const overlappingPairCache = new Ammo.btDbvtBroadphase();
            const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
            const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
            const solver = new Ammo.btSequentialImpulseConstraintSolver();

            const physicsWorld = new Ammo.btDiscreteDynamicsWorld(
                dispatcher, overlappingPairCache, solver, collisionConfiguration);
            physicsWorld.setGravity(new Ammo.btVector3(0, -50, 0));

            this._physicsWorld = physicsWorld;
            this._setupModel();
        })
    }

	_setupControls(){
        const touchSphere = new THREE.Mesh(new THREE.SphereGeometry(7,64,32),  new THREE.MeshBasicMaterial({visible: false}));
        const isTouchHive = point => {
            const raycaster = new THREE.Raycaster();
            
            const pt = {
                x: (point[0] / this._divContainer.clientWidth) * 2 - 1,
                y: - (point[1] / this._divContainer.clientHeight) * 2 + 1
            }
            raycaster.setFromCamera(pt, this._camera)
            const interObj = raycaster.intersectObject(touchSphere)
            if(interObj.length === 0){
                return;
            }
            return true;
        }
		new OrbitControls(this._camera, this._divContainer);


        
        touchSphere.position.set(0,13,0)
        this._scene.add(touchSphere);

        const touchstartEvent = evt=>{
            this.currPoint = [evt.touches[0].clientX, evt.touches[0].clientY]
            if(! this.currPoint) return;
            
            if(! isTouchHive(this.currPoint)){
                return;
            }
            this.addClone(this.group)
        }
        window.addEventListener("touchstart", touchstartEvent)

	}

    _createTable(){
        
        const scale = {x:100, y:0.5, z: 100};
        const position = {x: 0, y: -scale.y / 2, z: 0};

        const plane = new THREE.Mesh(new THREE.PlaneGeometry(scale.x, scale.z), new THREE.MeshBasicMaterial({visible: false}));
        plane.position.set(position.x, position.y + scale.y / 2, position.z)
        plane.rotation.x = THREE.MathUtils.degToRad(-90);
        this._scene.add(plane)
        this._plane = plane
        

        const tableGeometry = new THREE.BoxGeometry();
        const tableMaterial = new THREE.MeshPhongMaterial({color: 0x878787});
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        
        
        table.position.set(position.x, position.y, position.z);
        table.scale.set(scale.x, scale.y, scale.z);
        table.receiveShadow = true;
        this._scene.add(table)
        this._table = table;

        const transform = new Ammo.btTransform();
        const quaternion = {x: 0, y: 0, z: 0, w: 1};
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
        transform.setRotation(
            new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
        const motionState = new Ammo.btDefaultMotionState(transform);
        const colShape = new Ammo.btBoxShape(
            new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5));

        const mass = 0;
        colShape.calculateLocalInertia(mass);
        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape);
        const body = new Ammo.btRigidBody(rbInfo);
        body.setRestitution(0.3)
        this._physicsWorld.addRigidBody(body)

    }


	_setupCamera() {
		const width = this._divContainer.clientWidth;
		const height = this._divContainer.clientHeight;
		const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
		camera.position.set(40,40,80)
        camera.lookAt(0,0,0)
		this._camera = camera;
	}

	_setupLight() {
        const ambientLight = new THREE.AmbientLight(0xffffff,0.8);
        this._scene.add(ambientLight);

		const color = 0xffffff;
		const intensity = 0.9;
		const light = new THREE.DirectionalLight(color, intensity);
		light.position.set(0, 40, 0);
		this._scene.add(light);

        light.castShadow = true;
        light.shadow.mapSize.width = light.shadow.mapSize.height = 2048;
        light.shadow.camera.left = light.shadow.camera.bottom = -100;
        light.shadow.camera.right = light.shadow.camera.top = 100;
        light.shadow.radius = 2
	}



	resize() {
		const width = this._divContainer.clientWidth;
		const height = this._divContainer.clientHeight;

		this._camera.aspect = width / height;
		this._camera.updateProjectionMatrix();

		this._renderer.setSize(width, height);
	}

	render() {
		this._renderer.render(this._scene, this._camera);
		this.update();
		requestAnimationFrame(this.render.bind(this));
	}

	update() {
		this.time  += this.step
		
        const deltaTime = this._clock.getDelta();
        this._mixer.update(deltaTime);

        
        
        if(this._physicsWorld){
            this._physicsWorld.stepSimulation(deltaTime, 10);
            
            

            this._scene.children.forEach(obj3d => {
                if(obj3d instanceof THREE.Mesh){
                    
                    const objThree = obj3d;
                    const objAmmo = objThree.physicsBody;
                    if(objAmmo){
                        const motionState = objAmmo.getMotionState();
                        if(motionState){
                            
                            let tmpTrans = this._tmpTrans;
                            if(tmpTrans === undefined) tmpTrans = this._tmpTrans = new Ammo.btTransform();
                            motionState.getWorldTransform(tmpTrans);
                            
                            const pos = tmpTrans.getOrigin();
                            const quat = tmpTrans.getRotation();

                            objThree.position.set(pos.x(), pos.y(), pos.z());
                            objThree.quaternion.set(quat.x(), quat.y(), quat.z(), quat.w());
                        }
                    }
                }
            })
        }
	}
}

window.onload = function () {
	new App();
};