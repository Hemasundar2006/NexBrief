import {useState} from 'react';
import {api} from './api';
export default function PackageImageUpload({value,onChange}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function upload(file){if(!file)return;setError('');if(file.size>2097152||!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('Choose a PNG, JPEG or WebP image under 2 MB.');return;}setBusy(true);try{const dataUri=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});const result=await api('/workflow/package-image',{method:'POST',body:JSON.stringify({dataUri})});onChange(result.data.url);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <div><label>Package cover<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>upload(e.target.files?.[0])}/></label>{busy&&<p role="status">Uploading image…</p>}{error&&<p role="alert">{error}</p>}{value&&<><img src={value} alt="Package cover preview" style={{maxWidth:'100%',maxHeight:180,objectFit:'contain'}}/><button type="button" onClick={()=>onChange('')}>Remove image</button></>}</div>;
}
