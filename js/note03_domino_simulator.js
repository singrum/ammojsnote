

import * as THREE from '../node_modules/three/build/three.module.js';
import {OrbitControls} from '../node_modules/three/examples/jsm/controls/OrbitControls.js';


class App {
	constructor() {
        const drawButton = document.querySelector("#draw");
        this._drawButton = drawButton;
        const backButton = document.querySelector("#back")
        this._backButton = backButton;
        const dragButton = document.querySelector("#drag");
        this._dragButton = dragButton;

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
        this._dominoStack = [];
        this._isDrawOn = false;
        this.color = Math.floor(Math.random() * 0xffffff);


		this._setupCamera();
		this._setupLight();
        this._setupBackground();
        this._setupAmmo();
		this._setupControls();
        this._setupBackButton();
        this._setupDrawButton();

		window.onresize = this.resize.bind(this);
		this.resize();

		requestAnimationFrame(this.render.bind(this));
	}

    _setupBackground(){
        this._scene.background = new THREE.Color(0x222222)
    }

    _setupDrawButton(){
        this.thredhold = 0.5;

        const distance = (point1, point2)=>Math.hypot(point1[0] - point2[0], point1[1] - point2[1]);
        const screenToPlane = point /**arr.x,y 형식 */=>{
            const raycaster = new THREE.Raycaster();
            
            const pt = {
                x: (point[0] / this._divContainer.clientWidth) * 2 - 1,
                y: - (point[1] / this._divContainer.clientHeight) * 2 + 1
            }
            raycaster.setFromCamera(pt, this._camera)
            const interObj = raycaster.intersectObjects([this._plane])
            if(interObj.length === 0){
                return;
            }
            return [interObj[0].point.x, interObj[0].point.z]
        }

        const touchstartEvent = evt=>{
            this.prevPoint = null;
            this.currPoint = screenToPlane([evt.touches[0].clientX, evt.touches[0].clientY]);
            if(! this.currPoint) return;
            this.distance = 0;
            this.makeFlag = false;
        }

        const touchmoveEvent = evt=>{
            if(! this.currPoint) return;
            
            if (this.makeFlag){
                
                this.putDomino(this.prevDominoPoint, this.currDominoPoint)
                this.distance = 0;
                this.makeFlag = false;
            }
            if(! this.prevPoint){
                this.prevDominoPoint = null;
                this.currDominoPoint = this.currPoint
            }
            if(this.distance > this.thredhold){
                
                this.makeFlag = true;
                this.prevDominoPoint = this.currDominoPoint;
                this.currDominoPoint = this.currPoint;
            }
            this.prevPoint = this.currPoint;
            this.currPoint = screenToPlane([evt.touches[0].clientX, evt.touches[0].clientY])
            this.distance = distance(this.currDominoPoint, this.currPoint)
            
            if(! this.currPoint) return;
        }

        const pulldown = evt=>{
            if(this._dominoStack.length === 0){
                return;
            }
            const raycaster = new THREE.Raycaster();
            const width = this._divContainer.clientWidth;
            const height = this._divContainer.clientHeight;
            const pt = {
                x: (evt.touches[0].clientX / width) * 2 - 1,
                y: - (evt.touches[0].clientY / height) * 2 + 1
            }
            raycaster.setFromCamera(pt, this._camera);
                
            const interObj = raycaster.intersectObjects(this._dominoStack)
            
            if(interObj[0])this.pull(interObj[0]);
        }
        

        this._drawButton.addEventListener("touchstart",()=>{
            if(!this._isDrawOn){
                this._drawButton.style.backgroundColor = "white";
                this._dragButton.style.backgroundColor = "rgba(256,256,256,0.5)";
                this._controls.enabled = false
                window.addEventListener("touchstart", touchstartEvent);
                window.addEventListener("touchmove", touchmoveEvent);
                window.removeEventListener("touchstart", pulldown);
                this._isDrawOn = !this._isDrawOn
            }
        })
        this._dragButton.addEventListener("touchstart", ()=>{
            if(this._isDrawOn){
                this._drawButton.style.backgroundColor = "rgba(256,256,256,0.5)";
                this._dragButton.style.backgroundColor = "white";
                this._controls.enabled = true;
                window.removeEventListener("touchstart", touchstartEvent);
                window.removeEventListener("touchmove", touchmoveEvent);
                window.addEventListener("touchstart", pulldown);
                this._isDrawOn = !this._isDrawOn
            }
        })
    }


    _setupBackButton(){
        this._backButton.addEventListener('touchstart', evt => {
            this._backButton.style.backgroundColor = "white";
            if(this._dominoStack.length === 0) return;
            
            const domino = this._dominoStack.pop()
            this._scene.remove(domino)
            this._physicsWorld.removeRigidBody(domino.physicsBody)
        }, false)
        this._backButton.addEventListener("touchend", evt=>{
            this._backButton.style.backgroundColor = "rgba(256,256,256,0.5)"
        })
    }



    pull(object){
        

        const positionAttribute = object.object.geometry.getAttribute( 'position' );

        
        const vertex0_world = object.object.localToWorld((new THREE.Vector3()).fromBufferAttribute( positionAttribute, 0));
        const vertex1_world = object.object.localToWorld((new THREE.Vector3()).fromBufferAttribute( positionAttribute, 1))
        const vertex5_world = object.object.localToWorld((new THREE.Vector3()).fromBufferAttribute( positionAttribute, 5));
        
        if(object.faceIndex === 8 || object.faceIndex === 9){
            
            
            object.object.physicsBody.setAngularVelocity(new Ammo.btVector3(-(vertex0_world.x - vertex5_world.x)*10,-(vertex0_world.y - vertex5_world.y)*10,-(vertex0_world.z - vertex5_world.z)*10))
            object.object.physicsBody.setLinearVelocity(new Ammo.btVector3((vertex1_world.x - vertex0_world.x)*20,(vertex1_world.y - vertex0_world.y)*20,(vertex1_world.z - vertex0_world.z)*20))
            
        }
        if(object.faceIndex === 10 || object.faceIndex === 11){
            
            object.object.physicsBody.setAngularVelocity(new Ammo.btVector3((vertex0_world.x - vertex5_world.x)*10,(vertex0_world.y - vertex5_world.y)*10,(vertex0_world.z - vertex5_world.z)*10))
            object.object.physicsBody.setLinearVelocity(new Ammo.btVector3(-(vertex1_world.x - vertex0_world.x)*20,-(vertex1_world.y - vertex0_world.y)*20,-(vertex1_world.z - vertex0_world.z)*20))
        }
        
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

    putDomino(pos, look){
        if(this.color === 0xffffff) this.color = 0x000000
        this.color +=100;
        const scale = {x: 0.75, y: 1, z: 0.1};
        const dominoGeometry = new THREE.BoxGeometry();
        const dominoMaterial = new THREE.MeshPhysicalMaterial({color : Math.random() * 0xffffff, roughness : 1, }); 
 
        
        const domino = new THREE.Mesh(dominoGeometry, dominoMaterial);
        this._dominoStack.push(domino)
        const mass = 1;
        
        domino.scale.set(scale.x, scale.y, scale.z);
        domino.position.set(pos[0], scale.y / 2, pos[1])
        domino.lookAt(look[0], scale.y / 2, look[1]);
 
        
        domino.castShadow = true;
        domino.receiveShadow = true;
        this._scene.add(domino)

        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(domino.rotation)

        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos[0], scale.y / 2, pos[1]));
        transform.setRotation(new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
        const motionState = new Ammo.btDefaultMotionState(transform);
        const colShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5));

        const localInertia = new Ammo.btVector3(0,0,0);
        colShape.calculateLocalInertia(mass, localInertia);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);
        this._physicsWorld.addRigidBody(body);

        domino.physicsBody = body;
        body.setFriction(0.8);
        return domino

    }

    _setupAmmo(){
        Ammo().then(() => {
            const overlappingPairCache = new Ammo.btDbvtBroadphase();
            const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
            const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
            const solver = new Ammo.btSequentialImpulseConstraintSolver();

            const physicsWorld = new Ammo.btDiscreteDynamicsWorld(
                dispatcher, overlappingPairCache, solver, collisionConfiguration);
            physicsWorld.setGravity(new Ammo.btVector3(0, -9.807, 0));

            this._physicsWorld = physicsWorld;
            this._setupModel();
        })
    }

	_setupControls(){
		this._controls = new OrbitControls(this._camera, this._divContainer);
	}

    _createTable(){
        
        const scale = {x:30, y:0.5, z: 30};
        const position = {x: 0, y: -scale.y / 2, z: 0};

        const plane = new THREE.Mesh(new THREE.PlaneGeometry(scale.x, scale.z), new THREE.MeshBasicMaterial({visible: false}));
        plane.position.set(position.x, position.y + scale.y / 2, position.z)
        plane.rotation.x = THREE.MathUtils.degToRad(-90);
        this._scene.add(plane)
        this._plane = plane

        const tableGeometry = new THREE.BoxGeometry();
        const tableMaterial = new THREE.MeshPhongMaterial({color: 0xaaaaaa});
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
        this._physicsWorld.addRigidBody(body)
        body.setFriction(0.8);

    }
    
	_setupCamera() {
		const width = this._divContainer.clientWidth;
		const height = this._divContainer.clientHeight;
		const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
		camera.position.set(0,10,10)
		this._camera = camera;
	}

	_setupLight() {
        const ambientLight = new THREE.AmbientLight(0xffffff,0.3);
        this._scene.add(ambientLight);

		const color = 0xffffff;
		const intensity = 0.9;
		const light = new THREE.DirectionalLight(color, intensity);
		light.position.set(-10, 15, 10);
		this._scene.add(light);

        light.castShadow = true;
        light.shadow.mapSize.width = light.shadow.mapSize.height = 2048;
        light.shadow.camera.left = light.shadow.camera.bottom = -15;
        light.shadow.camera.right = light.shadow.camera.top = 15;
	}

	_setupModel() {
		this._createTable()
	}

	resize() {
		const width = this._divContainer.clientWidth;
		const height = this._divContainer.clientHeight;

		this._camera.aspect = width / height;
		this._camera.updateProjectionMatrix();

		this._renderer.setSize(width, height);
	}

	render(time) {
		this._renderer.render(this._scene, this._camera);
		this.update(time);
		requestAnimationFrame(this.render.bind(this));
	}

	update(time) {
		time *= 0.001;
		
        const deltaTime = this._clock.getDelta();
        
        if(this._physicsWorld){
            this._physicsWorld.stepSimulation(deltaTime);
            this._scene.traverse(obj3d => {
                if(obj3d instanceof THREE.Mesh){
                    
                    const objThree = obj3d;
                    const objAmmo = objThree.physicsBody;
                    if(objAmmo){
                        if(!objAmmo.isActive()) objAmmo.activate();
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