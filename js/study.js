

import * as THREE from '../node_modules/three/build/three.module.js';
import {OrbitControls} from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import {mergeBufferGeometries, mergeGroups} from "../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js"


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
        this.pos = new THREE.Vector3();
        this.quat = new THREE.Quaternion();
        this.softBodies = [];

		this._setupCamera();
		this._setupLight();
        this._setupAmmo();
		this._setupControls();
        this._setupShot();

		window.onresize = this.resize.bind(this);
		this.resize();

		requestAnimationFrame(this.render.bind(this));
	}
	_setupModel() {
		this._createTable();
        // this._createZenga();
        this._createbox();
        // this._createCup();
        // this._mergeTest();
        this._createSoftBody();
	}

    _createSoftBody(){
        this.pos.set( 0, - 0.5, 0 );
        this.quat.set( 0, 0, 0, 1 );
        var volumeMass = 15;

        var sphereGeometry = new THREE.SphereBufferGeometry( 1.5, 40, 25 );
        sphereGeometry.translate( 5, 5, 0 );
        this.createSoftVolume( sphereGeometry, volumeMass, 250 );

        var boxGeometry = new THREE.BufferGeometry().fromGeometry( new THREE.BoxGeometry( 1, 1, 5, 4, 4, 20 ) );
        boxGeometry.translate( -2, 5, 0 );
        this.createSoftVolume( boxGeometry, volumeMass, 120 );





    }

    processGeometry(bufGeometry){
        var geometry = bufGeometry;

        // Merge the vertices so the triangle soup is converted to indexed triangles
        var vertsDiff = geometry.mergeVertices();

        // Convert again to BufferGeometry, indexed
        var indexedBufferGeom = createIndexedBufferGeometryFromGeometry( geometry );

        // Create index arrays mapping the indexed vertices to bufGeometry vertices
        mapIndices( bufGeometry, indexedBufferGeom );
    }
    createIndexedBufferGeometryFromGeometry( geometry ) {

        var numVertices = geometry.vertices.length;
        var numFaces = geometry.faces.length;

        var bufferGeom = new THREE.BufferGeometry();
        var vertices = new Float32Array( numVertices * 3 );
        var indices = new ( numFaces * 3 > 65535 ? Uint32Array : Uint16Array )( numFaces * 3 );

        for ( var i = 0; i < numVertices; i++ ) {

            var p = geometry.vertices[ i ];

            var i3 = i * 3;

            vertices[ i3 ] = p.x;
            vertices[ i3 + 1 ] = p.y;
            vertices[ i3 + 2 ] = p.z;

        }

        for ( var i = 0; i < numFaces; i++ ) {

            var f = geometry.faces[ i ];

            var i3 = i * 3;

            indices[ i3 ] = f.a;
            indices[ i3 + 1 ] = f.b;
            indices[ i3 + 2 ] = f.c;

        }

        bufferGeom.setIndex( new THREE.BufferAttribute( indices, 1 ) );
        bufferGeom.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );

        return bufferGeom;
    }
    isEqual( x1, y1, z1, x2, y2, z2 ) {
        var delta = 0.000001;
        return Math.abs( x2 - x1 ) < delta &&
                Math.abs( y2 - y1 ) < delta &&
                Math.abs( z2 - z1 ) < delta;
    }
    mapIndices( bufGeometry, indexedBufferGeom ) {

        // Creates ammoVertices, ammoIndices and ammoIndexAssociation in bufGeometry

        var vertices = bufGeometry.attributes.position.array;
        var idxVertices = indexedBufferGeom.attributes.position.array;
        var indices = indexedBufferGeom.index.array;

        var numIdxVertices = idxVertices.length / 3;
        var numVertices = vertices.length / 3;

        bufGeometry.ammoVertices = idxVertices;
        bufGeometry.ammoIndices = indices;
        bufGeometry.ammoIndexAssociation = [];

        for ( var i = 0; i < numIdxVertices; i++ ) {

            var association = [];
            bufGeometry.ammoIndexAssociation.push( association );

            var i3 = i * 3;

            for ( var j = 0; j < numVertices; j++ ) {
                var j3 = j * 3;
                if ( isEqual( idxVertices[ i3 ], idxVertices[ i3 + 1 ],  idxVertices[ i3 + 2 ],
                              vertices[ j3 ], vertices[ j3 + 1 ], vertices[ j3 + 2 ] ) ) {
                    association.push( j3 );
                }
            }

        }

    }
    createSoftVolume( bufferGeom, mass, pressure ) {

        this.processGeometry( bufferGeom );

        var volume = new THREE.Mesh( bufferGeom, new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ) );
        volume.castShadow = true;
        volume.receiveShadow = true;
        volume.frustumCulled = false;
        scene.add( volume );

        textureLoader.load( "../textures/colors.png", function( texture ) {
            volume.material.map = texture;
            volume.material.needsUpdate = true;
        } );

        // Volume physic object

        var volumeSoftBody = softBodyHelpers.CreateFromTriMesh(
            physicsWorld.getWorldInfo(),
            bufferGeom.ammoVertices,
            bufferGeom.ammoIndices,
            bufferGeom.ammoIndices.length / 3,
            true );

        var sbConfig = volumeSoftBody.get_m_cfg();
        sbConfig.set_viterations( 40 );
        sbConfig.set_piterations( 40 );

        // Soft-soft and soft-rigid collisions
        sbConfig.set_collisions( 0x11 );

        // Friction
        sbConfig.set_kDF( 0.1 );
        // Damping
        sbConfig.set_kDP( 0.01 );
        // Pressure
        sbConfig.set_kPR( pressure );
        // Stiffness
        volumeSoftBody.get_m_materials().at( 0 ).set_m_kLST( 0.9 );
        volumeSoftBody.get_m_materials().at( 0 ).set_m_kAST( 0.9 );

        volumeSoftBody.setTotalMass( mass, false )
        Ammo.castObject( volumeSoftBody, Ammo.btCollisionObject ).getCollisionShape().setMargin( margin );
        physicsWorld.addSoftBody( volumeSoftBody, 1, -1 );
        volume.userData.physicsBody = volumeSoftBody;
        // Disable deactivation
        volumeSoftBody.setActivationState( 4 );

        this.softBodies.push( volume );

    }

    _mergeTest(){
        const pos = {x : 0, y : 2, z : 0};
        const cubeGeom = new THREE.BoxGeometry(6,6,6)
        cubeGeom.translate(0,10,0)
        const cube = new THREE.Mesh(cubeGeom, new THREE.MeshPhysicalMaterial({color : 0xff0000,wireframe: true}))
        
        // this._scene.add(cube);
        const sphereGeom =  new THREE.SphereGeometry(2,32,16)
        const sphere = new THREE.Mesh(sphereGeom, new THREE.MeshPhysicalMaterial({color:0x0000ff, wireframe : true}))
        // this._scene.add(sphere)
        
        const merge = new THREE.Mesh(mergeBufferGeometries([cubeGeom, sphereGeom]), new THREE.MeshPhysicalMaterial({color:0x0000ff, wireframe : true}))
        merge.position.set(pos.x, pos.y, pos.z);
        this._scene.add(merge)
        this.castShadow = true;
        this.receiveShadow = true;





        const mass = 1;

        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(merge.rotation)

        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
        const motionState = new Ammo.btDefaultMotionState(transform);
        const colShape = this.geometry2physicsShape(merge.geometry, true);

        const localInertia = new Ammo.btVector3(0,0,0);
        colShape.calculateLocalInertia(mass, localInertia);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);
        body.setRestitution(0.5);
        this._physicsWorld.addRigidBody(body);

        merge.physicsBody = body;

    }
    geometry2physicsShape(geometry, concave = false){
        if(concave){
            const vertices = geometry.attributes.position.array;
            const indices = geometry.index.array;

            // Create a btTriangleMesh and add triangles to it
            const triangleMesh = new Ammo.btTriangleMesh();
            const vertex1 = new Ammo.btVector3();
            const vertex2 = new Ammo.btVector3();
            const vertex3 = new Ammo.btVector3();
            for (let i = 0; i < indices.length; i += 3) {
                const index1 = indices[i] * 3;
                const index2 = indices[i + 1] * 3;
                const index3 = indices[i + 2] * 3;
                vertex1.setValue(vertices[index1], vertices[index1 + 1], vertices[index1 + 2]);
                vertex2.setValue(vertices[index2], vertices[index2 + 1], vertices[index2 + 2]);
                vertex3.setValue(vertices[index3], vertices[index3 + 1], vertices[index3 + 2]);
                triangleMesh.addTriangle(vertex1, vertex2, vertex3, true);
            }

            // Create a btConvexTriangleMeshShape from the btTriangleMesh
            const shape = new Ammo.btConvexTriangleMeshShape(triangleMesh);
            return shape
        }
        else{
            // Get the vertices and faces of the geometry
            const vertices = new Float32Array(geometry.attributes.position.array);
            
            
            // Create a new btConvexHullShape and add the vertices to it
            const shape = new Ammo.btConvexHullShape();
            for (let i = 0; i < vertices.length; i += 3) {
            const vertex = new Ammo.btVector3(vertices[i], vertices[i + 1], vertices[i + 2]);
            shape.addPoint(vertex);
            }
            return shape
        }

        
        
        
    }

    

    _setupShot(){
        const raycaster = new THREE.Raycaster();
        window.addEventListener("click", event =>{
            if(!event.ctrlKey) return;
            const width = this._divContainer.clientWidth;
            const height = this._divContainer.clientHeight;
            const pt = {
                x: (event.clientX / width) * 2 - 1,
                y: - (event.clientY / height) * 2 + 1
            }
            raycaster.setFromCamera(pt, this._camera);
            const tmpPos = new THREE.Vector3();
            tmpPos.copy(raycaster.ray.origin);

            const pos = {x: tmpPos.x, y: tmpPos.y, z: tmpPos.z};
            const radius = 0.25;
            const quat = {x: 0, y: 0, z: 0, w:1};
            const mass = 1;

            const ball = new THREE.Mesh(
                new THREE.SphereGeometry(radius),
                new THREE.MeshStandardMaterial({color: 0xff0000, metalness: 0.7, roughness: 0.4})
            )
            ball.position.set(pos.x, pos.y, pos.z);
            this._scene.add(ball);
            ball.castShadow = true

            const transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
            transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
            const motionState = new Ammo.btDefaultMotionState( transform );
            const colShape = new Ammo.btSphereShape( radius );
            colShape.calculateLocalInertia( mass);

            const rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape);
            const body = new Ammo.btRigidBody( rbInfo );

            this._physicsWorld.addRigidBody( body );

            tmpPos.copy(raycaster.ray.direction);
            tmpPos.multiplyScalar(20);

            body.setLinearVelocity( new Ammo.btVector3( tmpPos.x, tmpPos.y, tmpPos.z ) );
            body.setRestitution(0.5)
            ball.physicsBody = body;        
        })
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


    _createbox(){

        const pos = {x: 5, y: 5,z: 5};
        const scale = {x : 1, y : 2, z: 3};
        const boxGeometry = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
        const boxMaterial = new THREE.MeshPhysicalMaterial({color : 0xb3e3ff}); 
        
        
        const box = new THREE.Mesh(boxGeometry, boxMaterial);

        



        const mass = 1;
        
        
        box.position.set(pos.x, pos.y, pos.z)
        

        
        box.castShadow = true;
        box.receiveShadow = true;
        this._scene.add(box)

        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(box.rotation)

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
        body.setRestitution(0.5);
        this._physicsWorld.addRigidBody(body);

        box.physicsBody = body;
    }














    _setupAmmo(){
        Ammo().then(() => {
            const overlappingPairCache = new Ammo.btDbvtBroadphase();
            const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
            const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
            const solver = new Ammo.btSequentialImpulseConstraintSolver();
            const softBodySolver = new Ammo.btDefaultSoftBodySolver();
            const physicsWorld = new Ammo.btSoftRigidDynamicsWorld(
                dispatcher, overlappingPairCache, solver, collisionConfiguration, softBodySolver);
            physicsWorld.setGravity(new Ammo.btVector3(0, -9.807, 0));
            physicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(0, -9.807, 0));
            this._physicsWorld = physicsWorld;
            
            this._setupModel();
        })
    }

	_setupControls(){
		new OrbitControls(this._camera, this._divContainer);
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
        body.setRestitution(0.5)
        this._physicsWorld.addRigidBody(body)

    }


	_setupCamera() {
		const width = this._divContainer.clientWidth;
		const height = this._divContainer.clientHeight;
		const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
		camera.position.set(0,10,10)
        camera.lookAt(0,0,0)
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
            this._physicsWorld.stepSimulation(deltaTime, 10);
            
            

            this._scene.traverse(obj3d => {
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