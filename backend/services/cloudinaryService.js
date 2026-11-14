import {v2 as cloudinary} from 'cloudinary';

const configured=Boolean(process.env.CLOUDINARY_CLOUD_NAME&&process.env.CLOUDINARY_API_KEY&&process.env.CLOUDINARY_API_SECRET);
if(configured)cloudinary.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET,secure:true});
export function cloudinaryReady(){return configured;}
export async function uploadProjectFile(dataUri,publicId){if(!configured)throw Object.assign(new Error('Cloudinary is not configured on the backend.'),{status:503});return cloudinary.uploader.upload(dataUri,{folder:process.env.CLOUDINARY_FOLDER||'nexbrief/projects',public_id:publicId||undefined,resource_type:'auto',unique_filename:true});}
