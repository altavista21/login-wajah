import { mkdir,writeFile } from "node:fs/promises";
import { join } from "node:path";
const base="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
const files=["tiny_face_detector_model-weights_manifest.json","tiny_face_detector_model-shard1","face_landmark_68_model-weights_manifest.json","face_landmark_68_model-shard1","face_recognition_model-weights_manifest.json","face_recognition_model-shard1","face_recognition_model-shard2"];
const target=join(process.cwd(),"public","models");await mkdir(target,{recursive:true});
for(const file of files){const response=await fetch(`${base}/${file}`);if(!response.ok)throw new Error(`Gagal mengunduh ${file}: HTTP ${response.status}`);const bytes=new Uint8Array(await response.arrayBuffer());await writeFile(join(target,file),bytes);console.log(`OK ${file} (${bytes.byteLength} bytes)`);}
console.log("Model tersimpan di public/models.");
