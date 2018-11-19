const ikaTriangles = coordsShrink3D()
const ikaSections = createIkaSections(8)
function createIkaSections(step) {
  const sections = []
  for (let i = 0; i < step; i++) {
    for (let j = 0; j < step; j++) {
      const xmin = (2 * i / step - 1) * 1.3 + 0.3
      const ymin = (2 * j / step - 1) * 1.3
      const size = 1.3 * 2 / step
      const tris = trimTriangles(ikaTriangles, xmin, ymin, size)
      if (!tris.length) continue
      const sec = { triangles: tris, xmin, ymin, size, i, j }
      sec.geometry = geometryFromIkaSection(sec)
      sections.push(sec)
    }
  }
  return sections
}

function geometryFromIkaSection(section) {
  const vertices = []
  const indices = []
  const normals = []
  const tan1 = []
  const tan2 = []
  const uvs = []
  const indicesMap = {}
  const r0 = Math.sqrt(section.xmin ** 2 + section.ymin ** 2)
  for (const triangle of section.triangles) {
    for (const p of triangle) {
      const key = [p.x, p.y, p.z]
      let index = indicesMap[key]
      if (index === undefined) {
        index = vertices.length / 3
        indicesMap[key] = index
        if (p.z < 0.5) {
          uvs.push((section.xmin / r0 + 1) / 2, (section.ymin / r0 + 1) / 2)
        } else {
          const x = section.xmin + section.size * p.x
          const y = section.ymin + section.size * p.y
          uvs.push((x + 1) / 2, (y + 1) / 2)
        }
        vertices.push(p.x, p.y, p.z)
        let t1
        if (p.nz === 0) {
          t1 = { x: 0, y: 0, z: 1 }
        } else {
          const tr = Math.sqrt(1 + (p.nx / p.nz) ** 2)
          t1 = { x: 1 / tr, y: 0, z: -p.nx / p.nz / tr}
        }
        const t2 = {
          x: t1.z * p.ny - t1.y * p.nz,
          y: t1.x * p.nz - t1.z * p.nx,
          z: t1.y * p.nx - t1.x * p.ny,
        }
        normals.push(p.nx, p.ny, p.nz)
        tan1.push(t1.x, t1.y, t1.z)
        tan2.push(t2.x, t2.y, t2.z)
      }
      indices.push(index)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
  geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  geometry.addAttribute('tan1', new THREE.BufferAttribute(new Float32Array(tan1), 3))
  geometry.addAttribute('tan2', new THREE.BufferAttribute(new Float32Array(tan2), 3))
  geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1))
  return geometry
}



class Squid {
  constructor(sections, step, texture) {
    this.xysize = sections[0].size
    this.zsize = 1
    this.step = step
    this.texture = texture
    this.initializeMesh(sections)
    this.initializeJelly()
    this.updateMorph()
  }
  initializeMesh(sections) {
    this.meshGroup = new THREE.Group()
    this.sections = sections.map(section => {
      const material = ikaShader({ map: { value: this.texture } })
      const mesh = new THREE.Mesh(section.geometry, material)
      this.meshGroup.add(mesh)
      return { ...section, mesh, material}
    })
  }
  updateMorph() {
    function each3(f) {
      for (let i = 0; i < 8; i++) f((i >> 2) & 1, (i >> 1) & 1, i & 1)
    }
    for (const sec of this.sections) {
      const i = sec.i
      const j = sec.j
      const uniforms = {}
      each3((x,y,z) => {
        const v = this.jelly[i + x][j + y][z]
        sec.material.uniforms['v' + x + y + z] = { value: new THREE.Vector3(v.x, v.y, v.z) }
        sec.material.uniforms['vx' + x + y + z] = { value: new THREE.Vector3(v.xx, v.yx, v.zx) }
        sec.material.uniforms['vy' + x + y + z] = { value: new THREE.Vector3(v.xy, v.yy, v.zy) }
        sec.material.uniforms['vz' + x + y + z] = { value: new THREE.Vector3(v.xz, v.yz, v.zz) }
      })
    }
  }
  eachCoord(f) {
    for (let i = 0; i <= this.step; i++) {
      for (let j = 0; j <= this.step; j++) {
        for (let k = 0; k < 2; k++) {
          f(i, j, k)
        }
      }
    }
  }
  updateJelly(t) {
    const a = 4 * Math.cos(t)
    const b = 4 * Math.sin(t)
    this.eachCoord((i, j, k) => {
      const p = this.jelly[i][j][k]
      p.x = this.xysize * (i - this.step / 2) + 0.1 * Math.sin(3 * p.x - 4 * t)
      p.y = this.xysize * (j - this.step / 2)
      p.z = this.zsize * (k - 0.5) + 0.1 * Math.sin(a * p.x + b * p.y - 2 * t) + 0.5
    })
    this.calculateJellyXYZ()
    this.updateMorph()
  }
  calculateJellyXYZ() {
    this.eachCoord((i, j, k) => {
      const ia = i === 0 ? 0 : i - 1
      const ib = i === this.step ? this.step : i + 1
      const ja = j === 0 ? 0 : j - 1
      const jb = j === this.step ? this.step : j + 1
      const p = this.jelly[i][j][k]
      p.xx = (this.jelly[ib][j][k].x - this.jelly[ia][j][k].x) / (ib - ia)
      p.yx = (this.jelly[ib][j][k].y - this.jelly[ia][j][k].y) / (ib - ia)
      p.zx = (this.jelly[ib][j][k].z - this.jelly[ia][j][k].z) / (ib - ia)
      p.xy = (this.jelly[i][jb][k].x - this.jelly[i][ja][k].x) / (jb - ja)
      p.yy = (this.jelly[i][jb][k].y - this.jelly[i][ja][k].y) / (jb - ja)
      p.zy = (this.jelly[i][jb][k].z - this.jelly[i][ja][k].z) / (jb - ja)
      p.xz = this.jelly[i][j][1].x - this.jelly[i][j][0].x
      p.yz = this.jelly[i][j][1].y - this.jelly[i][j][0].y
      p.zz = this.jelly[i][j][1].z - this.jelly[i][j][0].z
    })
  }
  initializeJelly() {
    this.jelly = []
    this.eachCoord((i, j, k) => {
      this.jelly[i] = this.jelly[i] || []
      this.jelly[i][j] = this.jelly[i][j] || []
      this.jelly[i][j][k] = {
        x: this.xysize * (i - this.step / 2),
        y: this.xysize * (j - this.step / 2),
        z: this.zsize * (k - 0.5),
        vx: 0,
        vy: 0,
        vz: 0
      }
    })
    this.calculateJellyXYZ()
  }
}
