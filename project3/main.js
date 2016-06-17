// Arc 13302010063 宋文博

var SOLID_VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec2 a_TexCoord;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'varying vec2 v_TexCoord;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_TexCoord = a_TexCoord;\n' +
  '}\n';

// Fragment shader for single color drawing
var SOLID_FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'uniform sampler2D u_Sampler;\n' +
  'varying vec2 v_TexCoord;\n' +
  'void main() {\n' +
  '  gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +
  '}\n';

// Vertex shader for texture drawing
var TEXTURE_VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' +
  'attribute vec2 a_TexCoord;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'uniform vec3 u_LightPosition;\n' + // Position of the light source (in the world coordinate system)
  'varying float v_NdotL;\n' +
  'varying vec2 v_TexCoord;\n' +
  'varying vec3 v_AmbientLight;\n' +
  'void main() {\n' +
  '  vec3 lightColor = vec3(0.5, 0.5, 0.6);\n' +
  '  vec3 lightDirection = vec3(-0.35, 0.35, 0.87);\n' + // Light direction(World coordinate)
  '  vec3 u_AmbientLight = vec3(0.5, 0.5, 0.5);\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  '  v_NdotL = max(dot(normal, lightDirection), 0.0);\n' +
  '  v_TexCoord = a_TexCoord;\n' +
  '  v_AmbientLight = u_AmbientLight;\n' +
  '}\n';

// Fragment shader for texture drawing
var TEXTURE_FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'uniform sampler2D u_Sampler;\n' +
  'varying vec2 v_TexCoord;\n' +
  'varying float v_NdotL;\n' +
  'varying vec3 v_AmbientLight;\n' +
  'void main() {\n' +
  '  vec4 color = texture2D(u_Sampler, v_TexCoord);\n' +
  '  gl_FragColor = vec4(color.rgb * v_NdotL, color.a) + vec4(color.rgb * v_AmbientLight, color.a);\n' +
  '}\n';

var OBJ_VSHADER_SOURCE =
  'attribute vec4 a_Position;\n'+
  'attribute vec4 a_Normal;\n'+
  'uniform mat4 u_modelMatrix;\n'+    //模型矩阵
  'uniform mat4 u_normalMatrix;\n'+   //法向量矩阵
  'uniform vec3 u_LightPosition;\n'+  //点光源位置
  'uniform vec3 u_LightDirection;\n'+ //平行光光线方向
  'uniform vec3 u_AmbientLight;\n'+   //环境光颜色
  'uniform vec3 u_LightColor;\n'+     //点光源颜色
  'uniform mat4 u_mvpMatrix;\n'+
  'uniform vec4 u_Color;\n'+
  'varying vec4 v_Color;\n'+
  'varying float v_Dist;\n'+
  'void main(){\n'+
  ' gl_Position = u_mvpMatrix * a_Position;\n'+
  ' vec3 normal = normalize(vec3(u_normalMatrix * a_Normal));\n'+
  ' vec3 normalDir = normalize(vec3(a_Normal.xyz));\n'+
  ' vec4 vertexPosition = u_modelMatrix * a_Position;\n'+       
  //计算质点位置
  ' vec3 lightDirection = normalize(u_LightPosition - vec3(vertexPosition));\n'+ 
  //计算点光源光线向量
  ' float nDotL = max(dot(normal,lightDirection), 0.0);\n'+
  ' float nDotLDir = max(dot(normal,u_LightDirection), 0.0);\n'+
  ' vec3 diffuse = u_LightColor * u_Color.rgb * nDotL;\n'+
  ' vec3 diffuseDir = u_Color.rgb * nDotLDir;\n'+
  ' vec3 ambient = u_AmbientLight * u_Color.rgb;\n' +     
    //计算环境光反射
  ' v_Color = vec4(diffuseDir + diffuse + ambient, u_Color.a);\n'+
  ' v_Dist = distance(u_modelMatrix * a_Position, vec4(u_LightPosition, 1));\n'+
  '}\n';

var OBJ_FSHADER_SOURCE=
  '#ifdef GL_ES\n'+
  'precision mediump float;\n'+
  '#endif\n'+
  'varying vec4 v_Color;\n'+
  'varying float v_Dist;\n'+
  'uniform vec2 u_FogDist;\n'+
  'uniform vec3 u_FogColor;\n'+
  'void main(){\n'+
  //设置线性雾化
  ' float fogFactor = clamp((u_FogDist.y - v_Dist) / (u_FogDist.y, u_FogDist.x), 0.0, 1.0);\n'+
  ' vec3 color = mix(u_FogColor, vec3(v_Color), fogFactor);\n'+
  ' gl_FragColor = vec4(color, v_Color.a);\n'+
  '}\n';

var forward,backward,left,right,up,down;
var rotatek,rotatej;
var alreadyrot;
var time, lastTime;
var g_objArr=new Array(0);
var g_oArr = new Array(0);
var g_FogColor = new Float32Array([0.05, 0.0, 0.0]);
var g_FogDist = new Float32Array([100, 150]);
var eyeMatric = new Matrix4();
eyeMatric.setScale(CameraPara.eye[0],CameraPara.eye[1],CameraPara.eye[2]);


function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  var solidProgram = createProgram(gl, SOLID_VSHADER_SOURCE, SOLID_FSHADER_SOURCE);
  var texProgram = createProgram(gl, TEXTURE_VSHADER_SOURCE, TEXTURE_FSHADER_SOURCE);
  var objProgram = initColorObj(gl, OBJ_VSHADER_SOURCE, OBJ_FSHADER_SOURCE);
  if (!solidProgram || !texProgram || !objProgram) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Get storage locations of attribute and uniform variables in program object for floor drawing
  solidProgram.a_Position = gl.getAttribLocation(solidProgram, 'a_Position');
  solidProgram.a_TexCoord = gl.getAttribLocation(solidProgram, 'a_TexCoord');
  solidProgram.u_MvpMatrix = gl.getUniformLocation(solidProgram, 'u_MvpMatrix');
  solidProgram.u_Sampler = gl.getUniformLocation(solidProgram, 'u_Sampler');

  // Get storage locations of attribute and uniform variables in program object for texture drawing
  texProgram.a_Position = gl.getAttribLocation(texProgram, 'a_Position');
  texProgram.a_Normal = gl.getAttribLocation(texProgram, 'a_Normal');
  texProgram.a_TexCoord = gl.getAttribLocation(texProgram, 'a_TexCoord');
  texProgram.u_MvpMatrix = gl.getUniformLocation(texProgram, 'u_MvpMatrix');
  texProgram.u_NormalMatrix = gl.getUniformLocation(texProgram, 'u_NormalMatrix');
  texProgram.u_Sampler = gl.getUniformLocation(texProgram, 'u_Sampler');
  texProgram.u_AmbientLight = gl.getUniformLocation(texProgram, 'u_AmbientLight');

  // Get storage locations of attribute and uniform variables in program object for texture drawing

  if (solidProgram.a_Position < 0 || solidProgram.a_TexCoord < 0 ||
      !solidProgram.u_MvpMatrix || !solidProgram.u_Sampler || 
      texProgram.a_Position < 0 || texProgram.a_Normal < 0 || texProgram.a_TexCoord < 0 ||
      !texProgram.u_MvpMatrix || !texProgram.u_NormalMatrix || !texProgram.u_Sampler
       ) { 
    console.log('Failed to get the storage location of attribute or uniform variable'); 
    return;
  }

  // Set the vertex information
  var cube = initVertexBuffers(gl);
  if (!cube) {
    console.log('Failed to set the vertex information');
    return;
  }


  var floor = initFloorBuffers(gl);
  if (!floor) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Set texture
  var texture1 = initTextures(gl, solidProgram, "./image/floor.jpg");
  if (!texture1) {
    console.log('Failed to intialize the texture1.');
    return;
  }
  
  // Set texture
  var texture2 = initTextures(gl, texProgram, "./image/boxface.bmp");
  if (!texture2) {
    console.log('Failed to intialize the texture2.');
    return;
  }

  // Set the clear color and enable the depth test
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Calculate the view projection matrix
  var viewProjMatrix = new Matrix4();
  viewProjMatrix.setPerspective(CameraPara.fov, canvas.width/canvas.height, CameraPara.near, CameraPara.far);
  viewProjMatrix.lookAt(CameraPara.eye[0], CameraPara.eye[1], CameraPara.eye[2], CameraPara.at[0], CameraPara.at[1], CameraPara.at[2], CameraPara.up[0], CameraPara.up[1], CameraPara.up[2]);

  var currentAngle = 0.0; // Current rotation angle (degrees)
  forward = 0.0;
  backward = 0.0;
  left = 0.0;
  right = 0.0;
  up = 0.0;
  down = 0.0;
  rotatej = 0.0;
  rotatek = 0.0;
  alreadyrot = 0.0;
  shutlight = 0.0;
  document.onkeydown = keyDown;
  document.onkeyup = keyUp;

  for(var i = 0; i < ObjectList.length; i++){
    readOBJFile(gl, ObjectList[i], 1.0, true);
  }

  lastTime = performance.now()/1000;
  var tick = function() {
    var messageBox = document.getElementById("messageBox");
  
    messageBox.innerHTML = '关灯请按c，再次按c开灯（即控制摄像机附带的点光源）<br>' +
    'wsad控制前后左右，rf控制上下，jk控制视角旋转';

    time = performance.now()/1000;
    currentAngle = animate(currentAngle);  // Update current rotation angle
    alreadyrot += (rotatej - rotatek) * Math.PI/180 * ROT_VELOCITY * (time - lastTime);

    viewProjMatrix.translate((forward-backward)*MOVE_VELOCITY*(time-lastTime)* Math.sin(alreadyrot)+(left-right)*MOVE_VELOCITY*(time-lastTime)* Math.cos(alreadyrot),(down-up)*MOVE_VELOCITY*(time-lastTime),(forward-backward)*MOVE_VELOCITY*(time-lastTime)* Math.cos(alreadyrot)+(right-left)*MOVE_VELOCITY*(time-lastTime)* Math.sin(alreadyrot));
    eyeMatric.translate((forward-backward)*MOVE_VELOCITY*(time-lastTime)* Math.sin(alreadyrot)+(left-right)*MOVE_VELOCITY*(time-lastTime)* Math.cos(alreadyrot),(down-up)*MOVE_VELOCITY*(time-lastTime),(forward-backward)*MOVE_VELOCITY*(time-lastTime)* Math.cos(alreadyrot)+(right-left)*MOVE_VELOCITY*(time-lastTime)* Math.sin(alreadyrot));
    //eye.VectorCross(new Vector3(forward-backward)*MOVE_VELOCITY*(time-lastTime)* Math.sin(alreadyrot)+(left-right)*MOVE_VELOCITY*(time-lastTime)* Math.cos(alreadyrot),(down-up)*MOVE_VELOCITY*(time-lastTime),(forward-backward)*MOVE_VELOCITY*(time-lastTime)* Math.cos(alreadyrot)+(right-left)*MOVE_VELOCITY*(time-lastTime)* Math.sin(alreadyrot));

    if ((rotatek-rotatej)!=0) {
      viewProjMatrix.rotate(ROT_VELOCITY*(time-lastTime),0.0,rotatek-rotatej,0.0);
      eyeMatric.rotate(ROT_VELOCITY*(time-lastTime),0.0,rotatek-rotatej,0.0);
    };
    //console.log(forward);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffers
    // Draw a cube with texture

    
    drawTexCube(gl, texProgram, cube, texture2, 0, currentAngle, viewProjMatrix);
    drawfloor(gl, solidProgram, floor, texture1, 0, currentAngle, viewProjMatrix);

    for(var i = 0 ; i < g_objArr.length; i++){
      checkComplete(gl, i);
    }
    for(var i =0 ; i < g_oArr.length; i++){
      setFlash(g_oArr[i], currentAngle);
      drawColorObj(gl, objProgram, g_oArr[i], viewProjMatrix);
    }
    //drawObject(gl, objProgram, currentAngle, viewProjMatrix, model);
    
    lastTime = time;
    window.requestAnimationFrame(tick, canvas);
  };
  tick();
}



function initVertexBuffers(gl) {
  // Create a cube
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3

  var vertices = new Float32Array(boxRes.vertex);

  var normals = new Float32Array([   // Normal
     0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,     // v0-v1-v2-v3 front
     1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,     // v0-v3-v4-v5 right
     0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,     // v0-v5-v6-v1 up
    -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,     // v1-v6-v7-v2 left
     0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,     // v7-v4-v3-v2 down
     0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0      // v4-v7-v6-v5 back
  ]);

  var texCoords = new Float32Array(boxRes.texCoord);

  var indices = new Uint8Array(boxRes.index);

  var o = new Object(); // Utilize Object to to return multiple buffer objects together

  // Write vertex information to buffer object
  o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
  o.normalBuffer = initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT);
  o.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
  o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);
  if (!o.vertexBuffer || !o.texCoordBuffer || !o.normalBuffer || !o.indexBuffer) return null; 

  o.numIndices = indices.length;

  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return o;
}

function initFloorBuffers(gl){
    var vertices = new Float32Array(floorRes.vertex);
    var texCoords = new Float32Array(floorRes.texCoord);
    var indices = new Uint8Array(floorRes.index);

    var o = new Object(); // Utilize Object to to return multiple buffer objects together

    // Write vertex information to buffer object
    o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    o.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
    o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);
    if (!o.vertexBuffer || !o.texCoordBuffer || !o.indexBuffer){
       return null; 
     };

    o.numIndices = indices.length;

    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return o;
  }

function drawfloor(gl, program, o, texture, x, angle, viewProjMatrix){
    gl.useProgram(program); 

    initAttributeVariable(gl, program.a_Position, o.vertexBuffer);  // Vertex coordinates
    initAttributeVariable(gl, program.a_TexCoord, o.texCoordBuffer);// Texture coordinates
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer); // Bind indices

    // Bind texture object to texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);


    var scaleMatrix = new Matrix4();
    var modelMatrix = new Matrix4();
    var mvpMatrix = new Matrix4();

    mvpMatrix.set(viewProjMatrix);

    modelMatrix.setTranslate(floorRes.translate[0],floorRes.translate[1],floorRes.translate[2]);
    modelMatrix.scale(floorRes.scale[0],floorRes.scale[1],floorRes.scale[2]);

    mvpMatrix.multiply(modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);

    gl.drawElements(gl.TRIANGLES, o.numIndices, o.indexBuffer.type, 0);   // Draw

}

function initTextures(gl, program, texImagePath) {
  var texture = gl.createTexture();   // Create a texture object
  if (!texture) {
    console.log('Failed to create the texture object');
    return null;
  }

  var image = new Image();  // Create a image object
  if (!image) {
    console.log('Failed to create the image object');
    return null;
  }
  // Register the event handler to be called when image loading is completed
  image.onload = function() {
    // Write the image data to texture object
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image Y coordinate
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Pass the texure unit 0 to u_Sampler
    gl.useProgram(program);
    gl.uniform1i(program.u_Sampler, 0);

    gl.bindTexture(gl.TEXTURE_2D, null); // Unbind texture
  };

  // Tell the browser to load an Image
  image.src = texImagePath;

  return texture;
}

function drawTexCube(gl, program, o, texture, x, angle, viewProjMatrix) {
  gl.useProgram(program);   // Tell that this program object is used

  // Assign the buffer objects and enable the assignment
  initAttributeVariable(gl, program.a_Position, o.vertexBuffer);  // Vertex coordinates
  initAttributeVariable(gl, program.a_Normal, o.normalBuffer);    // Normal
  initAttributeVariable(gl, program.a_TexCoord, o.texCoordBuffer);// Texture coordinates
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer); // Bind indices

  // Bind texture object to texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  drawCube(gl, program, o, x, angle, viewProjMatrix); // Draw
}

// Assign the buffer objects and enable the assignment
function initAttributeVariable(gl, a_attribute, buffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
}

function drawCube(gl, program, o, x, angle, viewProjMatrix) {
  gl.useProgram(program);
  // Coordinate transformation matrix
  var g_modelMatrix = new Matrix4();
  var g_mvpMatrix = new Matrix4();
  var g_normalMatrix = new Matrix4();

  // Calculate a model matrix
  g_modelMatrix.setTranslate(boxRes.translate[0], boxRes.translate[1], boxRes.translate[2]);
  g_modelMatrix.scale(boxRes.scale[0],boxRes.scale[1],boxRes.scale[2]);
  //g_modelMatrix.rotate(20.0, 1.0, 0.0, 0.0);
  //g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0);

  // Calculate transformation matrix for normals and pass it to u_NormalMatrix
  g_normalMatrix.setInverseOf(g_modelMatrix);
  g_normalMatrix.transpose();
  gl.uniformMatrix4fv(program.u_NormalMatrix, false, g_normalMatrix.elements);

  // Calculate model view projection matrix and pass it to u_MvpMatrix
  g_mvpMatrix.set(viewProjMatrix);
  g_mvpMatrix.multiply(g_modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

  gl.drawElements(gl.TRIANGLES, o.numIndices, o.indexBuffer.type, 0);   // Draw
}

function initArrayBufferForLaterUse(gl, data, num, type) {
  var buffer = gl.createBuffer();   // Create a buffer object
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // Keep the information necessary to assign to the attribute variable later
  buffer.num = num;
  buffer.type = type;

  return buffer;
}

function initElementArrayBufferForLaterUse(gl, data, type) {
  var buffer = gl.createBuffer();　  // Create a buffer object
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

  buffer.type = type;

  return buffer;
}

// Create a buffer object, assign it to attribute variables, and enable the assignment
function createEmptyArrayBuffer(gl, a_attribute, num, type) {
  var buffer =  gl.createBuffer();  // Create a buffer object
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);  // Assign the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);  // Enable the assignment

  return buffer;
}

var ANGLE_STEP = 30;   // The increments of rotation angle (degrees)

var last = Date.now(); // Last time that this function was called
function animate(angle) {
  var now = Date.now();   // Calculate the elapsed time
  var elapsed = now - last;
  last = now;
  // Update the current rotation angle (adjusted by the elapsed time)
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle % 360;
}

function initColorObj(gl, VSHADER_SOURCE, FSHADER_SOURCE){
  var program = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);

  if(!program){
    console.log('Failed to intialize shaders.');
    return;
  }

  program.a_Position = gl.getAttribLocation(program, 'a_Position');
  program.u_Color = gl.getUniformLocation(program, 'u_Color');
  program.u_mvpMatrix = gl.getUniformLocation(program, 'u_mvpMatrix');
  program.a_Normal = gl.getAttribLocation(program, 'a_Normal');
  program.u_LightDirection = gl.getUniformLocation(program, 'u_LightDirection');
  program.u_AmbientLight = gl.getUniformLocation(program, 'u_AmbientLight');
  program.u_LightPosition = gl.getUniformLocation(program, 'u_LightPosition');
  program.u_LightColor = gl.getUniformLocation(program, 'u_LightColor');
  program.u_modelMatrix = gl.getUniformLocation(program, 'u_modelMatrix');
  program.u_normalMatrix = gl.getUniformLocation(program, 'u_normalMatrix');
  program.u_FogDist = gl.getUniformLocation(program, 'u_FogDist');
  program.u_FogColor = gl.getUniformLocation(program, 'u_FogColor');

  if(program.a_Position<0 || !program.u_Color || !program.u_mvpMatrix){
    console.log('Failed to get the attribute or uniform variables.');
    return;
  }
  return program;
}
function checkComplete(gl, i){
  var objdoc = g_objArr[i];
    if (objdoc != null && objdoc.isMTLComplete()){ // OBJ and all MTLs are available
      var obj = objdoc.resource;
      var o = onReadComplete(gl, obj, objdoc, g_oArr[i]);
      g_oArr.push(o);
      g_objArr[i] = null;
  }
}
function onReadComplete(gl, obj, objdoc, o) {
  var drawingInfo = objdoc.getDrawingInfo();

  if(!drawingInfo)
  {
    console.log('drawinginfo error');
    return;
  }

  var o = new Object();

  o.vertexBuffer = initArrayBufferForLaterUse(gl,drawingInfo.vertices, 3, gl.FLOAT); 
  o.normalBuffer = initArrayBufferForLaterUse(gl,drawingInfo.normals, 3, gl.FLOAT);
  o.indexBuffer = initElementArrayBufferForLaterUse(gl,drawingInfo.indices, gl.UNSIGNED_SHORT);
  o.numIndices = drawingInfo.indices.length;

  o.color = new Float32Array(obj.color);

  if(!o.vertexBuffer || !o.normalBuffer || !o.indexBuffer){
    console.log('Failed to intialize buffers of obj');
    return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);


  var modelMatrix = new Matrix4();
  modelMatrix.setIdentity();
  for(var i = 0; i<obj.transform.length ; i++){
    var p = obj.transform[i];
    if(p.type == "translate"){
      modelMatrix.translate(p.content[0], p.content[1], p.content[2]);
    }
    else if (p.type == "rotate"){
      modelMatrix.rotate(p.content[0], p.content[1], p.content[2], p.content[3]);
    }
    else if (p.type == "scale"){
      modelMatrix.scale(p.content[0], p.content[1], p.content[2]);
    }
  }
  o.name = objdoc.objects[0].name;
  o.modelMatrix = modelMatrix;
  var transMatrix = new Matrix4();
  transMatrix.setIdentity();
  o.transMatrix = transMatrix;

  return o;
}
function drawColorObj(gl, program, o, ViewProjMatrix){
  gl.useProgram(program);

  initAttributeVariable(gl, program.a_Position, o.vertexBuffer);
  initAttributeVariable(gl, program.a_Normal, o.normalBuffer);
  gl.uniform4f(program.u_Color, o.color[0], o.color[1], o.color[2], 1.0);

  var modelMatrix = new Matrix4();
  modelMatrix.set(o.modelMatrix).multiply(o.transMatrix);

  //设置光线
  gl.uniform3f(program.u_LightDirection, sceneDirectionLight[0], sceneDirectionLight[1], sceneDirectionLight[2]);
  gl.uniform3f(program.u_AmbientLight, sceneAmbientLight[0], sceneAmbientLight[1], sceneAmbientLight[2]);
  gl.uniform3f(program.u_LightPosition, eyeMatric.elements[0], eyeMatric.elements[5], eyeMatric.elements[10]);
  if (shutlight == 0) { 
      gl.uniform3f(program.u_LightColor, scenePointLightColor[0], scenePointLightColor[1], scenePointLightColor[2]);
  }else{
      gl.uniform3f(program.u_LightColor, 0, 0, 0);
  }
  //设置模型矩阵
  gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
  //设置法向矩阵
  var normalMatrix = new Matrix4();
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);
  //设置雾化因子
  gl.uniform3f(program.u_FogColor, g_FogColor[0], g_FogColor[1], g_FogColor[2]);
  gl.uniform2f(program.u_FogDist, g_FogDist[0], g_FogDist[1]);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer);

  var mvpMatrix = new Matrix4();
  mvpMatrix.set(ViewProjMatrix).multiply(modelMatrix);

  gl.uniformMatrix4fv(program.u_mvpMatrix, false, mvpMatrix.elements);

  gl.drawElements(gl.TRIANGLES, o.numIndices, o.indexBuffer.type, 0);
}

function readOBJFile(gl,obj,scale,reverse){
  var request = new XMLHttpRequest();

  request.onreadystatechange = function() {
    if (request.readyState === 4 && request.status !== 404) {
      onReadOBJFile(request.responseText, obj, gl, scale, reverse);
    }
  }
  request.open('GET', obj.objFilePath, true); // Create a request to acquire the file
  request.send();      
}
function onReadOBJFile(fileString, obj, gl, scale, reverse){
  var objdoc = new OBJDoc(obj.objFilePath);
  if(!objdoc.parse(fileString, scale, reverse)){
    console.log('obj error');
    return;
  }
  objdoc.resource = obj;
  g_objArr.push(objdoc);
}

function setFlash(o, currentAngle){
  var sin = Math.sin(currentAngle / 180 * Math.PI);
  var cos = Math.cos(currentAngle / 180 * Math.PI);
  if(o.name == 'bird'){
    var center = new Vector3([-8, 2, 2]);
    var p = new Vector3([-8.5, 2.5, 0]);
    var v = VectorMinus(center, p);
    var fv = VectorCross(v, new Vector3([0,1,0]));
    var newv = VectorAdd(VectorMultNum(v, 1 - cos), VectorMultNum(fv, VectorLength(v) * sin / VectorLength(fv)));

    o.transMatrix.setTranslate(newv.elements[0] + 2, 0, newv.elements[2] - 1.5);
    o.transMatrix.translate(0, Math.sin(currentAngle / 90 * Math.PI)/ 3 , 0);
    o.transMatrix.rotate(currentAngle, 0, 1, 0);
  }
  if(o.name == 'newstar')
  {
    o.transMatrix.setRotate(currentAngle, 0, 0, 1);
  }
  if(o.name == 'heart')
  {
    o.transMatrix.setRotate(currentAngle*2, 0, 0, -1);
  }
  if(o.name == 'moon')
  {
    o.transMatrix.setRotate(currentAngle*2, 0, 1, 0);
  }
}

function keyDown(e){
      if (e && e.keyCode == 74){//按j
        rotatej = 1;
      }
      if (e && e.keyCode == 75){//按k
        rotatek = 1;
      }
      if (e && e.keyCode == 87){//按w
        forward = 1;
      }
      if (e && e.keyCode == 83){//按s
        backward = 1;
      }
      if (e && e.keyCode == 65){//按a
        left = 1;
      }
      if (e && e.keyCode == 68){//按d
        right = 1;
      }
      if (e && e.keyCode == 82){//按r
        up = 1;
      }
      if (e && e.keyCode == 70){//按f
        down = 1;
      }
      if (e && e.keyCode == 67){//按f
        shutlight = 1-shutlight;
      }
    }


function keyUp(e){
      if (e && e.keyCode == 74){//松开j
        rotatej = 0;
      }
      if (e && e.keyCode == 75){//松开k
        rotatek = 0;
      }
      if (e && e.keyCode == 87){//松开w
        forward = 0;
      }
      if (e && e.keyCode == 83){//松开s
        backward = 0;
      }
      if (e && e.keyCode == 65){//松开a
        left = 0;
      }
      if (e && e.keyCode == 68){//松开d
        right = 0;
      }
      if (e && e.keyCode == 82){//松开r
        up = 0;
      }
      if (e && e.keyCode == 70){//松开f
        down = 0;
      }
    }

