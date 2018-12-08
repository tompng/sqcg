const ikaVertexCode = `
precision mediump float;
uniform vec3 v000, v001, v010, v011, v100, v101, v110, v111;
uniform vec3 vx000, vx001, vx010, vx011, vx100, vx101, vx110, vx111;
uniform vec3 vy000, vy001, vy010, vy011, vy100, vy101, vy110, vy111;
uniform vec3 vz000, vz001, vz010, vz011, vz100, vz101, vz110, vz111;
attribute vec3 tan1, tan2;
vec3 tangentTransform(vec3 p, vec3 delta) {
  vec3 a1 = p * p * (3.0 - 2.0 * p);
  vec3 a0 = 1.0 - a1;
  vec3 b0 = p * (1.0 - p) * (1.0 - p);
  vec3 b1 = p * p * (p - 1.0);
  vec3 da1 = 6.0 * p * (1.0 - p) * delta;
  vec3 da0 = -da1;
  vec3 db0 = (1.0 + p * (3.0 * p - 4.0)) * delta;
  vec3 db1 = p * (3.0 * p - 2.0) * delta;
  return (
    v000 * (da0.x * a0.y * a0.z + a0.x * da0.y * a0.z + a0.x * a0.y * da0.z)+
    v001 * (da0.x * a0.y * a1.z + a0.x * da0.y * a1.z + a0.x * a0.y * da1.z)+
    v010 * (da0.x * a1.y * a0.z + a0.x * da1.y * a0.z + a0.x * a1.y * da0.z)+
    v011 * (da0.x * a1.y * a1.z + a0.x * da1.y * a1.z + a0.x * a1.y * da1.z)+
    v100 * (da1.x * a0.y * a0.z + a1.x * da0.y * a0.z + a1.x * a0.y * da0.z)+
    v101 * (da1.x * a0.y * a1.z + a1.x * da0.y * a1.z + a1.x * a0.y * da1.z)+
    v110 * (da1.x * a1.y * a0.z + a1.x * da1.y * a0.z + a1.x * a1.y * da0.z)+
    v111 * (da1.x * a1.y * a1.z + a1.x * da1.y * a1.z + a1.x * a1.y * da1.z)+
    vx000 * (db0.x * a0.y * a0.z + b0.x * da0.y * a0.z + b0.x * a0.y * da0.z)+
    vx001 * (db0.x * a0.y * a1.z + b0.x * da0.y * a1.z + b0.x * a0.y * da1.z)+
    vx010 * (db0.x * a1.y * a0.z + b0.x * da1.y * a0.z + b0.x * a1.y * da0.z)+
    vx011 * (db0.x * a1.y * a1.z + b0.x * da1.y * a1.z + b0.x * a1.y * da1.z)+
    vx100 * (db1.x * a0.y * a0.z + b1.x * da0.y * a0.z + b1.x * a0.y * da0.z)+
    vx101 * (db1.x * a0.y * a1.z + b1.x * da0.y * a1.z + b1.x * a0.y * da1.z)+
    vx110 * (db1.x * a1.y * a0.z + b1.x * da1.y * a0.z + b1.x * a1.y * da0.z)+
    vx111 * (db1.x * a1.y * a1.z + b1.x * da1.y * a1.z + b1.x * a1.y * da1.z)+
    vy000 * (da0.x * b0.y * a0.z + a0.x * db0.y * a0.z + a0.x * b0.y * da0.z)+
    vy001 * (da0.x * b0.y * a1.z + a0.x * db0.y * a1.z + a0.x * b0.y * da1.z)+
    vy010 * (da0.x * b1.y * a0.z + a0.x * db1.y * a0.z + a0.x * b1.y * da0.z)+
    vy011 * (da0.x * b1.y * a1.z + a0.x * db1.y * a1.z + a0.x * b1.y * da1.z)+
    vy100 * (da1.x * b0.y * a0.z + a1.x * db0.y * a0.z + a1.x * b0.y * da0.z)+
    vy101 * (da1.x * b0.y * a1.z + a1.x * db0.y * a1.z + a1.x * b0.y * da1.z)+
    vy110 * (da1.x * b1.y * a0.z + a1.x * db1.y * a0.z + a1.x * b1.y * da0.z)+
    vy111 * (da1.x * b1.y * a1.z + a1.x * db1.y * a1.z + a1.x * b1.y * da1.z)+
    vz000 * (da0.x * a0.y * b0.z + a0.x * da0.y * b0.z + a0.x * a0.y * db0.z)+
    vz001 * (da0.x * a0.y * b1.z + a0.x * da0.y * b1.z + a0.x * a0.y * db1.z)+
    vz010 * (da0.x * a1.y * b0.z + a0.x * da1.y * b0.z + a0.x * a1.y * db0.z)+
    vz011 * (da0.x * a1.y * b1.z + a0.x * da1.y * b1.z + a0.x * a1.y * db1.z)+
    vz100 * (da1.x * a0.y * b0.z + a1.x * da0.y * b0.z + a1.x * a0.y * db0.z)+
    vz101 * (da1.x * a0.y * b1.z + a1.x * da0.y * b1.z + a1.x * a0.y * db1.z)+
    vz110 * (da1.x * a1.y * b0.z + a1.x * da1.y * b0.z + a1.x * a1.y * db0.z)+
    vz111 * (da1.x * a1.y * b1.z + a1.x * da1.y * b1.z + a1.x * a1.y * db1.z)
  );
}
vec3 transform(vec3 p) {
  vec3 a1 = p * p * (3.0 - 2.0 * p);
  vec3 a0 = 1.0 - a1;
  vec3 b0 = p * (1.0 - p) * (1.0 - p);
  vec3 b1 = p * p * (p - 1.0);
  return (
    v000 * a0.x * a0.y * a0.z +
    v001 * a0.x * a0.y * a1.z +
    v010 * a0.x * a1.y * a0.z +
    v011 * a0.x * a1.y * a1.z +
    v100 * a1.x * a0.y * a0.z +
    v101 * a1.x * a0.y * a1.z +
    v110 * a1.x * a1.y * a0.z +
    v111 * a1.x * a1.y * a1.z +
    vx000 * b0.x * a0.y * a0.z +
    vx001 * b0.x * a0.y * a1.z +
    vx010 * b0.x * a1.y * a0.z +
    vx011 * b0.x * a1.y * a1.z +
    vx100 * b1.x * a0.y * a0.z +
    vx101 * b1.x * a0.y * a1.z +
    vx110 * b1.x * a1.y * a0.z +
    vx111 * b1.x * a1.y * a1.z +
    vy000 * a0.x * b0.y * a0.z +
    vy001 * a0.x * b0.y * a1.z +
    vy010 * a0.x * b1.y * a0.z +
    vy011 * a0.x * b1.y * a1.z +
    vy100 * a1.x * b0.y * a0.z +
    vy101 * a1.x * b0.y * a1.z +
    vy110 * a1.x * b1.y * a0.z +
    vy111 * a1.x * b1.y * a1.z +
    vz000 * a0.x * a0.y * b0.z +
    vz001 * a0.x * a0.y * b1.z +
    vz010 * a0.x * a1.y * b0.z +
    vz011 * a0.x * a1.y * b1.z +
    vz100 * a1.x * a0.y * b0.z +
    vz101 * a1.x * a0.y * b1.z +
    vz110 * a1.x * a1.y * b0.z +
    vz111 * a1.x * a1.y * b1.z
  );
}

#ifdef SHADOW_CASTING

void main() {
  vec3 pos = transform(position);
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1);
}

#else

varying vec2 vtexcoord;
varying vec3 vnormal;
varying vec3 vViewPosition;
#include <common>
#include <shadowmap_pars_vertex>

void main() {
  vec4 worldPosition = vec4(transform(position), 1);
  vec3 ta = tangentTransform(position, tan1);
  vec3 tb = tangentTransform(position, tan2);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
  vnormal = normalize(cross(ta, tb));
  vtexcoord = uv.xy;
  vViewPosition = -(modelViewMatrix * worldPosition).xyz;
  #include <shadowmap_vertex>
}

#endif
`
const ikaFragmentCode = `
precision mediump float;
uniform sampler2D map;
uniform sampler2D shadowmap;
varying vec2 vtexcoord;
varying vec3 vnormal;
varying vec4 worldPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {
  vec4 diffuseColor = texture2D(map, vtexcoord);
  vec3 normal = normalize((viewMatrix * vec4(vnormal, 0)).xyz);
  float specularStrength;
  vec3 diffuse = vec3(1, 1, 1);
  vec3 emissive = vec3(1, 1, 1);
  vec3 specular = vec3(1, 1, 1);
  float shininess = 0.5;
  float opacity = 1.0;
  ReflectedLight reflectedLight = ReflectedLight( vec3(0), vec3(0), vec3(0), vec3(0));
  vec3 totalEmissiveRadiance = emissive;
  #include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
  gl_FragColor.rgb = (reflectedLight.directDiffuse + 0.1) * diffuseColor.rgb;
}
`


const ikaDepthFragmentCode = `
precision mediump float;
void main() {
  gl_FragColor = vec4(0, 0, 0, 0);
}
`
function ikaShader(uniforms) {
  return window.aaa = new THREE.ShaderMaterial({
    vertexShader: ikaVertexCode,
    fragmentShader: ikaFragmentCode,
    uniforms: { ...THREE.UniformsLib.lights, ...uniforms },
    lights: true
  })
}

function ikaDepthShader(uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader: ikaVertexCode,
    fragmentShader: THREE.ShaderLib.depth.fragmentShader,
    defines: { DEPTH_PACKING: THREE.RGBADepthPacking, SHADOW_CASTING: true },
    uniforms
  });
}
