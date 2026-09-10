export type ProductionTreatment = {
  id: string;
  name: string;
  mediaTypes: Array<'static'|'video'|'carousel'>;
  feel: string;
  bestFor: string[];
  constraints: string[];
};

export const PRODUCTION_TREATMENTS: ProductionTreatment[] = [
  { id:'raw-iphone', name:'Raw iPhone', mediaTypes:['static','video'], feel:'Casual, immediate, real-life, low-production.', bestFor:['trust','founder-led','UGC','micro-moments'], constraints:['Preserve authenticity','Avoid excessive polish'] },
  { id:'polished-studio', name:'Polished Studio', mediaTypes:['static','video'], feel:'Controlled lighting, premium, intentional.', bestFor:['premium offers','authority','product'], constraints:['Must still feel specific to brand'] },
  { id:'handheld-ugc', name:'Handheld UGC', mediaTypes:['video'], feel:'Creator-native handheld delivery.', bestFor:['cold traffic','demos','relatability'], constraints:['Quick opening','Natural performance'] },
  { id:'screen-native', name:'Screen Recording Native', mediaTypes:['video'], feel:'Direct product interaction with minimal production.', bestFor:['SaaS','apps','workflow demos'], constraints:['One outcome per video','Readable cursor/zoom'] },
  { id:'designed-motion', name:'Designed Motion Graphic', mediaTypes:['video'], feel:'Brand-led graphic motion and typography.', bestFor:['frameworks','belief shifts','announcements'], constraints:['Short text beats','Mobile-first'] },
  { id:'editorial-still', name:'Editorial Still', mediaTypes:['static','carousel'], feel:'Magazine-like typography, photography and whitespace.', bestFor:['premium positioning','founder brands','strong statements'], constraints:['Respect brand fonts','Intentional negative space'] },
  { id:'lofi-app-native', name:'Lo-Fi App Native', mediaTypes:['static','carousel'], feel:'Feels like a note, post, message or screenshot found in-feed.', bestFor:['pattern interruption','confessions','lists'], constraints:['Do not over-design','Never expose production labels'] },
  { id:'creator-selfie', name:'Creator Selfie', mediaTypes:['static','video'], feel:'Face-forward personal delivery with native framing.', bestFor:['trust','founder POV','identity hooks'], constraints:['Face must remain unobstructed','Natural crop'] },
  { id:'cinematic-broll', name:'Cinematic B-Roll', mediaTypes:['video'], feel:'Intentional visual storytelling and atmosphere.', bestFor:['aspiration','story','lifestyle'], constraints:['Every shot must support message','Avoid generic stock montage'] },
  { id:'product-editorial', name:'Product Editorial', mediaTypes:['static','carousel'], feel:'Premium product/interface focus with restrained typography.', bestFor:['SaaS','ecommerce','feature-to-benefit'], constraints:['Product remains legible','No decorative clutter'] }
];

export const getTreatment = (id:string) => PRODUCTION_TREATMENTS.find(t => t.id === id);
