/*
 * 
 */

var onMouseDown = null;
var destroyFunction = null;
var displayLayerInfo = null;

var _renderData = null;
var _graphData = null;

var playLoop;

var maxLayerDist = 1000;
var minLayerDist = 150;
var centerY = -1000;
//constants for node sizes
var maxDeg = 120;
var widthCoeff = 25;


function getRenderData() {
    if (_renderData == null) {
        _renderData = new RenderData();
    }
    return _renderData;
}

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

function RenderData() {
    // renderer
    this.renderer = new THREE.WebGLRenderer( {
        antialias: true,
        preserveDrawingBuffer: true,   // required to support .toDataURL()
    });

    //renderer.setClearColor( scene.fog.color );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.renderer.setClearColor( 0xffffff );
    this.renderer.sortObjects = false;

    this.controls = null;

	this.currentCamera = null;

    var that = this;

    //perspective camera
    this.usePerspectiveCamera = function(currentPosition) {
        
        that.camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 100000);

        if (currentPosition) {
            that.camera.position.x = currentPosition.x; 
            that.camera.position.y = currentPosition.y; 
            that.camera.position.z = currentPosition.z;
        }

        if (that.controls == null) {
            that.controls = new THREE.OrbitControls( that.camera, document.getElementById("container") );
        } else {
            that.controls.object = that.camera;
        }
        that.currentCamera = "Perspective";
        // Limit maximum scroll distance; it should be definitely smaller than the
        // FAR parameter of the camera
        that.controls.maxDistance = 90000;
        that.controls.zoom = 1;
        that.controls.addEventListener( 'change', function() { that.render();} );
    };


    this.useOrthographicCamera = function(currentPosition) {
        that.camera = new THREE.OrthographicCamera( 2 * window.innerWidth / - 1, 2 * window.innerWidth / 1, 2 * window.innerHeight / 1, 2 * window.innerHeight / - 1, -5000, 100000 );
        //
        
        if(currentPosition){
            that.camera.position.x = currentPosition.x; 
            that.camera.position.y = currentPosition.y; 
            that.camera.position.z = currentPosition.z;
            
        }

        if (that.controls == null) {
            that.controls = new THREE.OrbitControls( that.camera, document.getElementById("container") );
        } else {
            that.controls.object = that.camera;
        }
        that.currentCamera = "Orthographic";
        // Limit maximum scroll distance; it should be definitely smaller than the
        // FAR parameter of the camera
        that.controls.maxDistance = 90000;//this.controls.maxDistance; //90000;
        that.controls.zoom = 1;
        that.controls.addEventListener( 'change', function() { that.render();} );
    };

    this.usePerspectiveCamera();

    this.updateAspect = function() {
        var canvas = $("#container canvas");
        that.camera.aspect = window.innerWidth / window.innerHeight;
        that.camera.updateProjectionMatrix();
        that.renderer.setSize(window.innerWidth, window.innerHeight);
        that.render();
    };


    this.container = document.getElementById( 'container' );
    this.container.appendChild( this.renderer.domElement );

    /*
    this.stats = new Stats();
    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.bottom= '0px';
    this.stats.domElement.style.zIndex = 100;
    this.container.appendChild( this.stats.domElement );
    */

    this.scene = new THREE.Scene();

    //this.vertex_geometry = new THREE.BoxGeometry( 20, 20, 20);

    window.addEventListener('resize', function onWindowResize() {
        console.log("UPDATE");
        that.updateAspect();
    }, false);

    this.render = function render() {
        that.renderer.render(that.scene, that.camera);
        //that.stats.update();
    };
}


function RenderDataSVG(currentPosition) {
    // renderer
    this.renderer = new THREE.SVGRenderer( { antialias: true } );
    //renderer.setClearColor( scene.fog.color );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.renderer.setClearColor( 0xffffff );
    this.renderer.sortObjects = false;

    this.camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 100000 );

    if(currentPosition){
        this.camera.position.x = currentPosition.x; 
        this.camera.position.y = currentPosition.y; 
        this.camera.position.z = currentPosition.z;
    }


    var that = this;

    this.container = document.getElementById( 'container' );
    this.container.appendChild( this.renderer.domElement );

    window.addEventListener('resize', function onWindowResize() {
        that.camera.aspect = window.innerWidth / window.innerHeight;
        that.camera.updateProjectionMatrix();

        that.renderer.setSize( window.innerWidth, window.innerHeight );

        that.render();
    }, false);

    this.scene = new THREE.Scene();

    //this.vertex_geometry = new THREE.BoxGeometry( 20, 20, 20);

    this.render = function render() {
        that.renderer.render(that.scene, that.camera);
    };
}


function GraphData() {
    this.node_meshes = [];
    this.layer_nodes = [];
    this.edge_coordinates = [];

    this.layer_cones = [];
    this.layer_timestamp_offsets = [];
    this.layer_line_materials = [
        new THREE.LineBasicMaterial( { color: 0xA00000, opacity: 0.2, transparent: true, linewidth: 1 } ),
        new THREE.LineBasicMaterial( { color: 0x0A0000, opacity: 0.2, transparent: true, linewidth: 1 } ),
        new THREE.LineBasicMaterial( { color: 0x00A000, opacity: 0.2, transparent: true, linewidth: 1 } )
    ];

    this.vertexMaterial = new THREE.MeshFaceMaterial([
        new THREE.MeshBasicMaterial({color:0x000000, fog: false}),
        new THREE.MeshBasicMaterial({color:0x0000ff, fog: false}),
    ]);

    this.coneMaterial = [
        new THREE.MeshBasicMaterial({color:0xA00000, opacity: 0.4, transparent: true, fog: false}),
        new THREE.MeshBasicMaterial({color:0x0A0000, opacity: 0.4, transparent: true, fog: false}),
        new THREE.MeshBasicMaterial({color:0x00A000, opacity: 0.4, transparent: true, fog: false}),
    ];


    this.layer_index = 0;

    this.neighborhood_material = new THREE.LineBasicMaterial( { color: 0x006400, transparent: true, linewidth: 3 } );

    this.layer_lines = [];

    this.vertices_mesh = [];
    this.vertices_geom = []; //new THREE.Geometry();

    this.highlight_material = new THREE.MeshBasicMaterial({color:0x006400, fog: false});
    this.highlight_meshes = [];
    this.highlight_geometries = [];

    this.neighborhood = null;
    this.neighborhood_lines = [];

    this.layer_info = {};

    this.selected_timestamps = {};
}

function animate(controls) {
    requestAnimationFrame(function() { animate(controls); });
    controls.update();
}

function addArrows(edges, a_positions, a_indices) {
    for (var j=1; j < edges.length; j += 2 ) {
        var A = new THREE.Vector3(edges[j-1].x, edges[j-1].y, edges[j-1].z);
        var B = new THREE.Vector3(edges[j].x, edges[j].y, edges[j].z);
        if (A.equals(B)) {
            continue;
        }

        var dir = B.clone().sub(A).normalize();
        var length = 100;
        var hex = 0xffff00;

        var coneGeometry = new THREE.CylinderGeometry( 0, 0.5, 1, 5, 1 );
        coneGeometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, - 0.5, 0 ) );
        var cone = new THREE.Mesh( coneGeometry, new THREE.MeshBasicMaterial( { color: hex } ) );

        cone.matrixAutoUpdate = false;

        cone.scale.set( 5, 10, 1);
        var distance = A.distanceTo(B);
        if (distance < 2) {
            if (B.distanceTo(A) < 2) {
            }
        }
        cone.position.copy(A.add(dir.clone().multiplyScalar(A.distanceTo(B)-2)));

        var axis = new THREE.Vector3();
        var radians;
        if ( dir.y > 0.99999 ) {
            cone.quaternion.set( 0, 0, 0, 1 );
        } else if ( dir.y < - 0.99999 ) {
            cone.quaternion.set( 1, 0, 0, 0 );
        } else {
            axis.set( dir.z, 0, - dir.x ).normalize();
            radians = Math.acos( dir.y );
            cone.quaternion.setFromAxisAngle( axis, radians );
        }

        cone.updateMatrix();
        cone.updateMatrixWorld(true);

        from_mesh(cone, a_positions, a_indices)
    }
}

function displayEdgesInitial(keys, graphData, scene) {
    graphData.layer_lines = [];

    graphData.layer_starts = [];

    for (var i=0; i < graphData.edge_coordinates.length; i++) {  
        var verts = [];
        var starts = [];
        var starts_arrows = []
        var a_indices = [];
        var a_positions = [];
        var indices = [];

        $.each(keys, function(foo, key) {
            starts.push({edges: verts.length, arrows: a_indices.length});
            if (graphData.edge_coordinates[i][key] !== undefined) {
               verts = verts.concat(graphData.edge_coordinates[i][key]);
               var edges = graphData.edge_coordinates[i][key];
               if (graphData.directed) {
                   addArrows(edges, a_positions, a_indices);
                }
            }
        });

        starts.push({edges: verts.length, arrows: a_indices.length});
        graphData.layer_starts.push(starts);

        var positions = new Float32Array( verts.length * 3 );

        var vs = [];

        for (var j=0; j < verts.length; j++) {
            indices.push(j);
            positions[j*3] = verts[j].x;
            positions[j*3+1] = verts[j].y;
            positions[j*3+2] = verts[j].z;

        }

        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute( 'index', new THREE.BufferAttribute( new Uint32Array(a_indices), 1 ) );
        geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array(a_positions), 3 ) );
        geometry.computeBoundingSphere();
        geometry.computeVertexNormals();

        bg = addGeomentry(geometry, graphData.coneMaterial[i], scene);
        bg.scale.set( 5, 10, 1);
        graphData.layer_cones.push(bg);

        var bg = new THREE.BufferGeometry();
        bg.addAttribute( 'index', new THREE.BufferAttribute( new Uint32Array(indices), 1 ) );
        bg.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );

        bg.computeBoundingSphere();
        graphData.layer_lines.push(new THREE.Line(bg, graphData.layer_line_materials[i], THREE.LinePieces));
        scene.add( graphData.layer_lines[i] );
    }
}
function from_mesh(mesh, positions, indices) {

    for ( var i = 0; i < mesh.geometry.faces.length; i += 1 ) {
        indices.push((positions.length/3)+mesh.geometry.faces[i].a);
        indices.push(positions.length/3+mesh.geometry.faces[i].b);
        indices.push(positions.length/3+mesh.geometry.faces[i].c);
    }

    for ( var i = 0; i < mesh.geometry.vertices.length; i += 1 ) {
        var v = mesh.geometry.vertices[i].clone().applyMatrix4(mesh.matrixWorld);
        var i3 = i * 3;
        positions.push(v.x);
        positions.push(v.y);
        positions.push(v.z);
    }
}

function displayEdges(start, end, graphData, scene) {
     for (var i=0; i < graphData.edge_coordinates.length; i++) {  
        var bg = graphData.layer_lines[i].geometry;
        bg.drawcalls.splice(0, 1);
        bg.addDrawCall(graphData.layer_starts[i][start].edges, graphData.layer_starts[i][end].edges-graphData.layer_starts[i][start].edges);

        var bg = graphData.layer_cones[i].geometry;

        bg.drawcalls.splice(0, 1);
        bg.addDrawCall(graphData.layer_starts[i][start].arrows, graphData.layer_starts[i][end].arrows-graphData.layer_starts[i][start].arrows);
    }
}

/*
*  Create a node mesh object and merged it with `parent_geometry`.
*/
function addNode(node, parent_geometry, materialIndex, graphData, scale, layer_node_meshes) {
    var scl = scale; 
    if(scl <= 2){scl = 1};


    if( scl == 3  ){ 
        //circle args = radius, #segments in circle
        var tmp_geometry = new THREE.CircleGeometry( scl, 8 );  
        //var tmp_geometry = new THREE.BoxGeometry( 20 + scl, 20 + scl, 20 + scl);
    } else {
        var tmp_geometry = new THREE.SphereGeometry( scl, 0, 0 );
    }
    var mesh = new THREE.Mesh(tmp_geometry);
    mesh.position.x = node.coords.x;
    mesh.position.y = node.coords.y;
    mesh.position.z = node.coords.z;

    mesh.updateMatrix();
    mesh.updateMatrixWorld(true);
    mesh.node_id = node.id;
    mesh.degree = node.degree;
    node.mesh = mesh;

    parent_geometry.merge(mesh.geometry, mesh.matrix, materialIndex);
    layer_node_meshes.push(mesh);
}

function addEdge(source, target, year, edge_coordinates) {
    var edge_coords = edge_coordinates[year];
    if (edge_coords === undefined) {
        edge_coordinates[year] = [];
        edge_coords = edge_coordinates[year];
    }

    edge_coords.push(source.coords);
    edge_coords.push(target.coords);
}

function transformTo2D(coords, layer_id, width) {
    var new_coords = {};
    new_coords.x = coords[0]*4;
    new_coords.y = coords[1]*4;
    new_coords.z = 0;

    if (layer_id > 0) {
        new_coords.x += 400 + (layer_id) * (4 * width);
    }

    return new_coords;
}

function transformTo3D(coords, layer_id, y_step) {
    var new_coords = {};

    new_coords.x = coords[0];
    new_coords.y = y_step * (layer_id);
    new_coords.z = coords[1];

    return new_coords;
}

function createLayer(data, area, layer_id, graphData, coordinateTransformer, dataWidth, degreeSelector) {
    layer_edge_coordinates = {};
    graphData.edge_coordinates.push(layer_edge_coordinates);
    graphData.neighborhood.push(data.neighborhood);

    var scaleParam =  Math.max( dataWidth / 100  , 500);
    var maxDegLayer = Math.min( degreeSelector(data.maxDeg), maxDeg );
    
    var nodes = graphData.layer_nodes[layer_id];
    var layer_node_geom = new THREE.Geometry();
    var layer_node_meshes = [];
    $.each(data.coords, function(node_id, node_data) {
        var node_coords = node_data[0];
        var node_common = node_data[1];
        var node_degree = degreeSelector(node_data);

        var source = {};
        source.id = node_id;
        source.degree = node_degree

        source.coords = coordinateTransformer(node_coords, layer_id);

        nodes[node_id] = source;

        var scale = ( node_degree / maxDegLayer ) * ( ( dataWidth * widthCoeff ) / scaleParam ) 

        if( node_common == 1){  
            addNode(source, layer_node_geom, 1, graphData, scale, layer_node_meshes);
        }
        else { 
            addNode(source, layer_node_geom, 0, graphData, scale, layer_node_meshes);
        }
    });
    graphData.node_meshes.push(layer_node_meshes);
    graphData.vertices_geom.push(layer_node_geom);

    $.each(data.edges, function(i, points) {
        var source = nodes[points[0]];

        var target = nodes[points[1]];
        var year = points[2];
        addEdge(source, target, year, layer_edge_coordinates);
    });

    var layer_info = {
        node_count: Object.keys(nodes).length,
        edge_count: data.edge_ct
    };
    return { nodes: nodes, info: layer_info };
}

function createGraph2D(data, renderData) {
    renderData.D3 = false;
    renderData.usePerspectiveCamera();
    renderData.controls.noRotate = true;

    // Limit panning
    renderData.controls.minYPan = -2000;
    renderData.controls.maxYPan = 2000;
    renderData.controls.minXPan = data.layer_ct * data.width2 * -1.5;
    renderData.controls.maxXPan = data.layer_ct * data.width2 * 3;

    var y_range = 3000;
    renderData.camera.position.z = y_range * 10;
    renderData.controls.maxDistance = y_range * 5;

     createGraph(data, renderData, function(coords, layer_id) {
        return transformTo2D(coords, layer_id, data.width2);
    }, true);
}

function createGraph3D(data, renderData, degreeSelector) {
    var y_range = data.width2;
    var y_step = Math.max( Math.min(y_range / data.layer_ct / 2 , maxLayerDist ) , minLayerDist);

    y_range = (data.layer_ct-1) * y_step;

    renderData.D3 = true;
    renderData.usePerspectiveCamera();
    renderData.controls.noRotate = false;

    // Limit panning
    renderData.controls.minYPan = -2000;
    renderData.controls.maxYPan = 2000;
    renderData.controls.minXPan = data.width2 * -1.5;
    renderData.controls.maxXPan = data.width2 * 2;

    // attempt to center the graph to camera wrt its size
    // inspired by http://stackoverflow.com/questions/13350875/three-js-width-of-view/13351534#13351534
    var vFOV = renderData.camera.fov * Math.PI / 180; 
    var ratio = 2 * Math.tan( vFOV / 2 );
    var aspect = window.innerWidth / window.innerHeight; 
    var d1 = y_range / ratio;
    var d2 = data.width2 / (ratio * aspect)
    var dist = Math.max(d1, d2);

    renderData.camera.position.z = 1.5 * dist;
    renderData.camera.position.x = 0;
    renderData.camera.position.y = y_range * 0.5;
    renderData.controls.target = new THREE.Vector3(0, 0.5 * y_range, 0);
    console.log(renderData.camera.position);
    
    createGraph(data, renderData, function(coords, layer_id) {
        return transformTo3D(coords, layer_id, y_step);
    }, true, degreeSelector);
}

function createGraph3DStatic(data, renderData) {
    var y_range = data.width2;
    var y_step = Math.max( Math.min(y_range / (data.layer_ct-1) / 2 , maxLayerDist ) , minLayerDist);

    y_range = data.layer_ct * y_step;



    createGraph(data, renderData, function(coords, layer_id) {
        return transformTo3D(coords, layer_id, y_step);
    }, false);
}

function createGraph(data, renderData, coordinateTransformer, doAnimate, degreeSelector) {
    if (degreeSelector == undefined) {
        var degreeSelector = function(v) {
            return v[2];
        };
    }

    if (destroyFunction != null) {
        destroyFunction();
    }

    var graphData = new GraphData();

    // store globally
    _graphData = graphData;

    graphData.directed = data.directed;

    graphData.layers = data.layers;
    graphData.node_data = data.node_data;
    graphData.data_labels = data.data_labels;

    graphData.node_data_list = [];
    for (var key in graphData.node_data) {
      if (graphData.node_data.hasOwnProperty(key)) {
        graphData.node_data_list.push([key, graphData.node_data[key]]);
      }
    }

    if (graphData.node_data_list.length > 0) {
        $('#table-button').css("display", "block");
    }

    $("#clear-selection").click(function() {
        clearHighlightedObjects(renderData, graphData);
        $( "#selected_node" ).val("");
        renderData.render();
    });

    if (doAnimate) {
        animate(renderData.controls);
    }

    destroyFunction = function() {
        $('#table-button').hide();
        $('#slider-container').hide();
        $('#degreeOptions').hide();

        clearHighlightedObjects(renderData, graphData);

        if (graphData.layer_lines.length == 0) {
            return;
        }

        for (var i=0; i < graphData.layer_lines.length; i++) {
            renderData.scene.remove(graphData.layer_lines[i]);
            renderData.scene.remove(graphData.layer_cones[i]);
            graphData.layer_lines[i].geometry.dispose();
            graphData.layer_cones[i].geometry.dispose();
        }

        $.each(graphData.node_meshes, function(i, layer_node_meshes) {
            $.each(layer_node_meshes, function(i, obj) {
                obj.geometry.dispose();
            });
        });

        graphData.layer_lines = [];

        graphData.edge_coordinates= {};

        $.each(graphData.vertices_mesh, function(i, obj) {
            renderData.scene.remove(obj);
        });

        graphData.vertices_mesh = null;
        for (var i=0; i < graphData.vertices_geom.length; i++) {
            graphData.vertices_geom[i].dispose();
        }
        graphData.vertices_geom = [];

        renderData.layer_info = {};
        $("#info-container ul.dropdown-menu").children().remove();

        clearHighlightedObjects(renderData, graphData);

        renderData.render();
    };


    graphData.neighborhood = [];

    onMouseDown = window.addEventListener( 'mousedown', makeOnMouseDownHandler(renderData, graphData), false );

    var area = data.max_node_ct;
    var num_edges = data.edgect1 + data.edgect2;

    var y_range = data.width2; //3000;
    graphData.y_range = y_range;
    var y_step = Math.max( Math.min(y_range / (data.layer_ct-1) , maxLayerDist ) , minLayerDist);

    var node_cnt = 0;

    for (var i = 0; i < data.layer_ct; i++) {
        graphData.layer_nodes.push({});
        // NOTE: when changing y here, make sure to change it in transfromTo3D as well
        var y = (-y_range) + (y_step*(i));
        var res = createLayer(data.layers[i], area, i, graphData, coordinateTransformer, data.width, degreeSelector);
        graphData.layer_info[i] = res.info;
    }

    displayEdgesInitial(data.unique_keys, graphData, renderData.scene);

    displayEdges(0, data.unique_keys.length, graphData, renderData.scene);

    for (var i=0; i < graphData.vertices_geom.length; i++) {
        graphData.vertices_mesh.push(addGeomentry(graphData.vertices_geom[i], graphData.vertexMaterial, renderData.scene));
    }

    /*
     * The slider
     * Timestamps/years are used to generate unique keys for the containers array. 
     * At the moment, each key is year - min_year, so that the containers keys start from 0, which makes it simple for array indexing.
     * Once the slider is moved, the corresponding containers for the omitted timestamps are set to invisible
     */
    
    graphData.selected_timestamps = {};
    $.each(data.unique_keys, function(i, obj) {
        graphData.selected_timestamps[obj] = true;
    });

    function updateSlider(i, j) {
        $("#year").val( data.unique_keys[i].toString() + " - " + data.unique_keys[j].toString() );
        var selected_ts = data.unique_keys.slice( i, j )                    
        displayEdges(i, j, graphData, renderData.scene);
        graphData.selected_timestamps = {};
        $.each(selected_ts, function(i, obj) {
            graphData.selected_timestamps[obj] = true;
        });
        renderData.render();
    }

    $( "#slider" ).slider({ 
            min: 0,
            max: data.unique_keys.length - 1,
            step: 1, 
            values: [ 0, data.unique_keys.length - 1 ],
            range: true,
            slide: function( event, ui ) {
                var i = ui.values[ 0 ]; 
                var j = ui.values[ 1 ];
                updateSlider(i, j);
            }
    });

    function updateLayerDistance(dist) {
        clearHighlightedObjects(renderData, graphData);

        var base_pos = -dist;

        // Update y coordinate for meshes and layer_node mapping.
        // Note: this does not move any vertices, but is needed later for raycasting
        // when highlighting vertices
        $.each(graphData.node_meshes, function(i, layer_node_meshes){
            var new_pos = (base_pos + (i * dist));

            $.each(layer_node_meshes, function(j, mesh){
                mesh.position.y = new_pos;
                mesh.verticesNeedUpdate = true;
                mesh.updateMatrix();
                mesh.updateMatrixWorld();
            });

            var nodes = graphData.layer_nodes[i];
            for (var key in nodes) {
                nodes[key].coords.y = new_pos;
            }
        });

        // Move vertices (merged geometries) of each layer
        $.each(graphData.vertices_mesh, function(i, layerMesh) {
            layerMesh.position.y = (base_pos + (i * dist)) -  layerMesh.geometry.vertices[0].y;
            layerMesh.verticesNeedUpdate = true;
            layerMesh.updateMatrix();
            layerMesh.updateMatrixWorld();
        });

        function updatePosition(bg, new_y) {
             for (var j=0; j < bg.attributes.position.array.length; j++) {
                if( j % 3 == 1 ){
                    bg.attributes.position.array[j] = new_y;
                }
            }
            bg.attributes.position.needsUpdate = true;
        }

        // Move edges of each layer
        for (var i=0; i < graphData.edge_coordinates.length; i++) {  
            updatePosition(graphData.layer_lines[i].geometry, base_pos + (i * dist));
            updatePosition(graphData.layer_cones[i].geometry, base_pos + (i * dist));
        }
        renderData.render();
    }

    $( "#distanceSlider" ).slider({ 
            min: 0,
            max: graphData.y_range * 2,
            step: 50, 
            value: graphData.y_range,
            range: false,
            slide: function( event, ui ) {
                console.log("ping")
                var i = ui.value; 
                updateLayerDistance( i );
            }
    });

    $( "#year" ).val( data.unique_keys[0] + " - " + data.unique_keys[data.unique_keys.length - 1]);

    for (var i = 0; i < data.layer_ct; i++) {
        $("#info-container .layer-selection ul.dropdown-menu").append('<li role="presentation"><a role="menuitem" tabindex="-1" href="#" onclick="displayLayerInfo('+i+'); return 0;">Layer '+(i+1)+'</a></li>');
    }

    var oldLayer = 0;
    var layerCameraPos = {0: 0};
    for (var i = 1;  i < data.layers.length ; i++) {
        if (i==1) {
            layerCameraPos[i] = layerCameraPos[i-1] + 400 +  data.width2;
        } else {
            layerCameraPos[i] = layerCameraPos[i-1] + data.width2;
        }
    }

    displayLayerInfo = function(id) {
        graphData.layer_index = id;
        $("#info-container .layer-selection button.dropdown-toggle").text("Layer "+(id+1));
        //console.log($("#info-container .layer-selection button.dropdown-toggle"));
        $("#nrnodes").val(graphData.layer_info[id].node_count);
        $("#nredges").val(graphData.layer_info[id].edge_count);

        $("#nrcolor").val(graphData.layer_line_materials[id].color.getHexString());
        $("#nrcolor").css('background-color', '#'+graphData.layer_line_materials[id].color.getHexString());

        if (!renderData.D3) {
            renderData.controls.panLeft(renderData.camera.position.x - layerCameraPos[id]);
            renderData.controls.panUp(0 - renderData.camera.position.y);
        }
    }
    displayLayerInfo(0);


    displayShareUrl = function(){
        $("#url-container textarea").html( document.domain + data.url );   //
    }
    displayShareUrl();

    displayLayoutInfo = function(){
        if(data.layout){
            $("#layout").val( data.layout );   
        }
        else{
            $("#layout").val( "Fruchterman-Reingold" );   
        }
    }
    displayLayoutInfo();



    $("#info-container").slideDown();

    if (data.unique_keys.length > 1) {
        $("#slider-container").show();
    }

    if (data.directed) {
        $('#degreeOptions').show();
    }

    $('#nrcolor').colorpicker({ horizontal: true });
    $('#nrcolor').colorpicker().on('changeColor.colorpicker', function(event) {
        var hexStr = event.color.toHex();
        $("#nrcolor").css('background-color', hexStr);
        var color = parseInt(hexStr.slice(1, hexStr.length), 16);
        graphData.layer_lines[graphData.layer_index].material.color.setHex(color);

        if (graphData.directed) {
            graphData.layer_cones[graphData.layer_index].material.color.setHex(color);
        }
        renderData.render();
    });


    //replay tools
    function foo(start, end, round ) {
        $("#slider").slider("option", "values", [start, end]);
        updateSlider(start, end);
        displayEdges(start, end, graphData, renderData.scene);
        renderData.render();
    }


    function loopThrough(i, min, span) {
        if ($("#replay-mode").val() === "single") {
            foo(min, i, i-min );
        } else {
            foo(i-1, i-1+span, i-min );
            if ((i-1+span) >= data.unique_keys.length-1) {
                return
            }
        }
    }


    $('#graph-replay').click(function(e) {

        $('.graph-replay-buttons').hide()
        $('#graph-replay-pause').show();
        clearInterval( playLoop );
        
        var values = $("#slider").slider( "option", "values" );
        var min = values[0];
        var max = values[1];
        var span = max - min;
        
        if ($("#replay-mode").val() === "single") {
            span = 1;
            //max += 1;
            //always go till the end unless paused
            max = data.unique_keys.length;
        } else {
            max = data.unique_keys.length;
        }

        var mult = parseInt($("#replay-speed").val());
        
        var i=min+1;
        var round = i-min;
        

        displayEdges(min, values[1], graphData, renderData.scene);
        
        playLoop = setInterval( function() { 
                            
            var values = $("#slider").slider( "option", "values" );
            var current_max = values[1];
            if( current_max >= data.unique_keys.length - 1 ){
                $('.graph-replay-buttons').hide()
                $('#graph-replay').show();
                clearInterval( playLoop );
            }
            
            loopThrough(i,min,span) 
            i++;    
        } , round*(400/mult) )

    });

    $('#graph-replay-pause').click(function(e) {
        clearInterval( playLoop );

        var values = $("#slider").slider( "option", "values" );
        console.log("paused:", values);

        $('.graph-replay-buttons').hide();
        $('#graph-replay-continue').show();
    });
    
    $('#graph-replay-continue').click(function(e) {
        clearInterval( playLoop );

        $('.graph-replay-buttons').hide()
        $('#graph-replay-pause').show();

        var values = $("#slider").slider( "option", "values" );
        var min = values[0];
        var max = values[1];        
        var span = max - min;

        if ($("#replay-mode").val() === "single") {
            span = 1;
            //because we are contining
            min = max - 1;
            
            max = data.unique_keys.length;
            
        } else {
            max = data.unique_keys.length;
        }

        var mult = parseInt($("#replay-speed").val());
        
        var i=min+1;
        var round = i-min;
        
        //because we are contining, we do not need this
        //displayEdges(min, min, graphData, renderData.scene);
        
        playLoop = setInterval( function() { 
            
            var values = $("#slider").slider( "option", "values" );
            var current_max = values[1];
            if( current_max >= data.unique_keys.length - 1 ){
                $('.graph-replay-buttons').hide()
                $('#graph-replay').show();
                clearInterval( playLoop );
            }
            
            loopThrough(i,min,span) 
            i++;    
        } , round*(400/mult) )
    });


        var hot = null;
        $("#hide-table").click(function() {
            hot.destroy();
            $("#data-table").css("display", "none");
            //$("#container canvas").css("width", $(window).width());
            renderData.updateAspect();
            $("#hide-table").css("display", "none");
            $("#show-table").css("display", "block");
        });

        $("#show-table").click(function() {
            //$("#container canvas").css("width", $(window).width()-450);
            $("#container").css("float", "left");
            $("#data-table").css("display", "block");
            $("#data-table").css("height", $(window).height()-100);

            $("#show-table").css("display", "none");
            $("#hide-table").css("display", "block");
            var container = document.getElementById('data-table');
            var percentRenderer = function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.NumericRenderer.apply(this, arguments);
                td.style.color = (value < 0) ? 'red' : 'green';
            };

            hot = new Handsontable(container, {
                data: graphData.node_data_list,
                manualColumnResize: true,
                width: 400,
                colHeaders: ["Node"].concat(graphData.data_labels.slice(1)),
                rowHeaders: false,
                stretchH: 'all',
                columnSorting: true,
                contextMenu: false,
                className: "htCenter htMiddle",
                readOnly: true,
                multiSelect: false,
                columns: [
                  {data: 0, type: 'text'},
                  {data: 1, type: 'numeric', format: '0'},
                ]
            }); 
            Handsontable.hooks.add('afterSelection',function(r1, c1, r2, c2) {
                var row = hot.getDataAtRow(r1);
                // TODO focus on node
                window.setTimeout(function() {
                    for (var i=0; i < graphData.layer_nodes.length; i++) {
                        if (row[0] in graphData.layer_nodes[i]) {
                            clearHighlightedObjects(renderData, graphData);
                            highlightNode(graphData, renderData, graphData.layer_nodes[i][row[0]].mesh);
                            break;
                        }
                    }
                    renderData.render();
                }, 100);
            }, hot);

        });

    renderData.render();
}

/*
 * adds a (merged) geometry to the scene
 */
function addGeomentry(geometry, material, scene) {
    geometry.computeFaceNormals();
    group = new THREE.Mesh(geometry, material);
    group.matrixAutoUpdate = false;
    group.updateMatrix();
    scene.add( group );
    return group;
}

function clearHighlightedObjects(renderData, graphData) {
    $("#popup").css("display", "none");
    for (var i=0; i < graphData.highlight_meshes.length; i++) {
        renderData.scene.remove(graphData.highlight_meshes[i]);
        graphData.highlight_meshes[i].geometry.dispose();

        renderData.scene.remove(graphData.neighborhood_lines[i]);
        graphData.neighborhood_lines[i].geometry.dispose();
        $("#clear-selection-tr").css("display", "none");
    }
    graphData.highlight_meshes = [];
    graphData.neighborhood_lines = [];
}

function highlightNeighbors(neighborhood_geometry, highlight_geom, graphData, node, node_id, layer_id) {
    var coords1 = node.position;
    var nodes = graphData.layer_nodes[layer_id];

    // highlight neighboring nodes and edges in the layer of the selected node
    $.each(graphData.layers[layer_id].neighborhood[node_id], function(i, obj) {
        if (!(obj[0] in nodes) || !(obj[1] in graphData.selected_timestamps)) {
            return;
        }
        var coords2 = nodes[obj[0]].coords;

        neighborhood_geometry.vertices.push(coords1);
        neighborhood_geometry.vertices.push(coords2);

        var mesh = nodes[obj[0]].mesh;
        highlight_geom.merge(mesh.geometry, mesh.matrix);
    });
}

function showPopup(x, y, data, labels) {
    var table = '<table class="table table-striped" style="margin-bottom: 0 !important;">';
    if (labels.length == 0) {
        return;
    }

    $.each(data, function(i, obj) {
        table += '<tr>\n<td>'+labels[i]+'</td>\n<td>'+obj+'</td></tr>';
    });
    $("#popup").html(table);

    var viewportWidth = $(window).width() - $("#info-container").width();
    var viewportHeight = $(window).height() - $("#slider-container").height();
    var boxHeight = $("#popup").height();
    var boxWidth = $("#popup").width();
    var boxX = x + 20;
    var boxY = y;
    if ((boxY + boxHeight) > viewportHeight) {
        boxY = viewportHeight - boxHeight - 40;
    }

    if ((boxX + boxWidth) > viewportWidth) {
        boxX = boxX - boxWidth - 40;
    }

    $("#popup").css("position", "absolute")
        .css("left", boxX)
        .css("top", boxY)
        .css("display", "block");
}

function highlightNode(graphData, renderData, node) {

    var highlight_geom = new THREE.Geometry();
    var neighborhood_geometry = new THREE.Geometry();

    // highlight the selected node in the other layers, including an edge between the layers
    for (var i=0; i < graphData.layer_nodes.length; i++) {
        if (node.node_id in graphData.layer_nodes[i]) {
            var highlighted_node = graphData.layer_nodes[i][node.node_id].mesh.clone();
            highlightNeighbors(neighborhood_geometry, highlight_geom, graphData, highlighted_node, node.node_id, i);
            highlighted_node.scale.x += 0.3;
            highlighted_node.scale.y += 0.3;
            highlighted_node.scale.z += 0.3;
            highlight_geom.merge(highlighted_node.geometry, highlighted_node.matrix);
            neighborhood_geometry.vertices.push(node.position);
            neighborhood_geometry.vertices.push(graphData.layer_nodes[i][node.node_id].coords);
        }
    }

    neighborhood_line = new THREE.Line(neighborhood_geometry, graphData.neighborhood_material, THREE.LinePieces);
    renderData.scene.add(neighborhood_line);
    graphData.neighborhood_lines.push(neighborhood_line);

    graphData.highlight_meshes.push(addGeomentry(highlight_geom, graphData.highlight_material, renderData.scene));
}


function makeOnMouseDownHandler(renderData, graphData) {
    return function onMouseDown( event ) {
        var update_scene = false;

        var mouse = new THREE.Vector2();
        mouse.x = ( event.clientX / renderData.renderer.domElement.width ) * 2 - 1;
        mouse.y = - ( ($(window).scrollTop()+event.clientY) / renderData.renderer.domElement.height) * 2 + 1;

        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera( mouse, renderData.camera );

        var intersects = [];
        $.each(graphData.node_meshes, function(i, layer_node_meshes) {
            intersects = intersects.concat(raycaster.intersectObjects(layer_node_meshes, raycaster));
        });

        var nearest_intersection = {
            distance: Math.pow(2,32) - 1,
        };

        console.log("found ", intersects.length, " intersections");
        $.each(intersects, function(i, obj) {
            if (nearest_intersection.distance > obj.distance) {
                nearest_intersection = obj;
            }
        });

         if (nearest_intersection.hasOwnProperty('object') && nearest_intersection.object.hasOwnProperty('node_id')) {


            if (!event.ctrlKey) {
                clearHighlightedObjects(renderData, graphData);
            }
            $("#clear-selection-tr").css("display", "");
            var selected_node = nearest_intersection.object;

            showPopup(event.clientX, event.clientY, graphData.node_data[selected_node.node_id], graphData.data_labels);

            update_scene = true;

            $( "#selected_node" ).val(selected_node.node_id);

            highlightNode(graphData, renderData, selected_node);
        }

        if (update_scene) {
            renderData.render();
        }
    }
}