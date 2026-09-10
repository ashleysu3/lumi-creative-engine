import type { CarouselRenderSpec, CarouselSlide, StaticRenderSpec, TextOverlay } from './compileCreativeOutput.js';
import type { CompositionProvider, RenderedAsset } from './renderProvider.js';

function escapeXml(value:string):string {
  return value.replace(/[&<>"']/g,char=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;' }[char] ?? char));
}

function wrapText(text:string,maxChars:number,maxLines:number):string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines:string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) current = candidate;
    else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines-1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  const consumed = lines.join(' ').split(/\s+/).length;
  if (consumed < words.length && lines.length) {
    const last = lines.length-1;
    lines[last] = `${lines[last].replace(/[.,;:!?]?$/,'')}…`;
  }
  return lines;
}

function textSvg(args:{
  text:string;x:number;y:number;width:number;fontSize:number;lineHeight:number;fontFamily:string;fontWeight:number;fill:string;maxLines:number;anchor?:'start'|'middle';
}):string {
  const approxChars = Math.max(8,Math.floor(args.width/(args.fontSize*0.55)));
  const lines = wrapText(args.text,approxChars,args.maxLines);
  const anchor = args.anchor ?? 'start';
  return `<text x="${args.x}" y="${args.y}" fill="${escapeXml(args.fill)}" font-family="${escapeXml(args.fontFamily)}" font-size="${args.fontSize}" font-weight="${args.fontWeight}" text-anchor="${anchor}" dominant-baseline="hanging">${lines.map((line,index)=>`<tspan x="${args.x}" dy="${index===0?0:args.lineHeight}">${escapeXml(line)}</tspan>`).join('')}</text>`;
}

function palette(spec:StaticRenderSpec|CarouselRenderSpec){
  const [background='#ffffff',ink='#111111',accent='#d977a8',secondary='#f2eee8'] = spec.design.colors;
  return { background,ink,accent,secondary };
}

function imageSvg(asset:RenderedAsset|undefined,x:number,y:number,width:number,height:number,opacity=1):string {
  if (!asset?.url) return '';
  return `<image href="${escapeXml(asset.url)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" opacity="${opacity}"/>`;
}

function findOverlay(spec:StaticRenderSpec,role:TextOverlay['role']){
  return spec.overlays.find(item=>item.role===role)?.text;
}

function svgDataUrl(svg:string):string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function staticSvg(spec:StaticRenderSpec,scene?:RenderedAsset):string {
  const { width,height } = spec;
  const { background,ink,accent,secondary } = palette(spec);
  const headline = findOverlay(spec,'headline') ?? '';
  const support = findOverlay(spec,'support');
  const cta = findOverlay(spec,'cta');
  const headlineFont = spec.design.headlineFont ?? 'Georgia, serif';
  const bodyFont = spec.design.bodyFont ?? 'Arial, sans-serif';
  const pad = 72;
  const safeWidth = width-pad*2;
  const defs = `<defs><filter id="shadow"><feDropShadow dx="0" dy="12" stdDeviation="18" flood-opacity="0.18"/></filter><linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.68"/></linearGradient></defs>`;
  let body = `<rect width="${width}" height="${height}" fill="${escapeXml(background)}"/>`;

  if (spec.layoutVariant === 'split-card') {
    const imageH = scene ? 700 : 0;
    if (scene) body += imageSvg(scene,0,0,width,imageH);
    const panelY = scene ? 650 : 0;
    body += `<rect x="0" y="${panelY}" width="${width}" height="${height-panelY}" rx="${scene?36:0}" fill="${escapeXml(background)}"/>`;
    body += `<rect x="${pad}" y="${panelY+54}" width="70" height="8" rx="4" fill="${escapeXml(accent)}"/>`;
    body += textSvg({text:headline,x:pad,y:panelY+92,width:safeWidth,fontSize:68,lineHeight:76,fontFamily:headlineFont,fontWeight:700,fill:ink,maxLines:4});
    if (support) body += textSvg({text:support,x:pad,y:panelY+400,width:safeWidth,fontSize:31,lineHeight:42,fontFamily:bodyFont,fontWeight:400,fill:ink,maxLines:3});
    if (cta) body += `<rect x="${pad}" y="${height-150}" width="${Math.min(360,Math.max(180,cta.length*19+80))}" height="72" rx="36" fill="${escapeXml(accent)}"/>${textSvg({text:cta,x:pad+36,y:height-130,width:300,fontSize:27,lineHeight:32,fontFamily:bodyFont,fontWeight:700,fill:background,maxLines:1})}`;
  } else if (spec.layoutVariant === 'editorial-overlay') {
    body += scene ? imageSvg(scene,0,0,width,height) : `<rect width="${width}" height="${height}" fill="${escapeXml(secondary)}"/>`;
    body += `<rect width="${width}" height="${height}" fill="url(#scrim)"/>`;
    body += `<rect x="${pad}" y="${height-570}" width="74" height="8" rx="4" fill="${escapeXml(accent)}"/>`;
    body += textSvg({text:headline,x:pad,y:height-520,width:safeWidth,fontSize:72,lineHeight:80,fontFamily:headlineFont,fontWeight:700,fill:'#ffffff',maxLines:4});
    if (support) body += textSvg({text:support,x:pad,y:height-205,width:700,fontSize:28,lineHeight:38,fontFamily:bodyFont,fontWeight:500,fill:'#ffffff',maxLines:2});
    if (cta) body += textSvg({text:cta,x:width-pad,y:height-105,width:260,fontSize:25,lineHeight:30,fontFamily:bodyFont,fontWeight:700,fill:'#ffffff',maxLines:1,anchor:'middle'});
  } else if (spec.layoutVariant === 'native-caption') {
    body += scene ? imageSvg(scene,0,0,width,height) : `<rect width="${width}" height="${height}" fill="${escapeXml(secondary)}"/>`;
    body += `<rect x="48" y="${height-440}" width="${width-96}" height="360" rx="28" fill="${escapeXml(background)}" opacity="0.95"/>`;
    body += textSvg({text:headline,x:84,y:height-396,width:width-168,fontSize:58,lineHeight:66,fontFamily:headlineFont,fontWeight:700,fill:ink,maxLines:3});
    if (support) body += textSvg({text:support,x:84,y:height-185,width:width-168,fontSize:27,lineHeight:36,fontFamily:bodyFont,fontWeight:400,fill:ink,maxLines:2});
  } else if (spec.layoutVariant === 'screenshot-frame') {
    body += `<rect x="50" y="50" width="${width-100}" height="${height-100}" rx="40" fill="${escapeXml(secondary)}"/>`;
    body += textSvg({text:headline,x:pad,y:100,width:safeWidth,fontSize:62,lineHeight:70,fontFamily:headlineFont,fontWeight:700,fill:ink,maxLines:3});
    const frameY = 360;
    body += `<rect x="${pad}" y="${frameY}" width="${safeWidth}" height="690" rx="28" fill="#ffffff" filter="url(#shadow)"/>`;
    if (scene) body += imageSvg(scene,pad+22,frameY+22,safeWidth-44,646);
    if (support) body += textSvg({text:support,x:pad,y:1090,width:safeWidth,fontSize:28,lineHeight:38,fontFamily:bodyFont,fontWeight:400,fill:ink,maxLines:2});
  } else if (spec.layoutVariant === 'app-native') {
    body += `<rect width="${width}" height="${height}" fill="${escapeXml(secondary)}"/>`;
    body += `<rect x="70" y="160" width="${width-140}" height="${height-320}" rx="44" fill="${escapeXml(background)}" filter="url(#shadow)"/>`;
    body += `<circle cx="116" cy="214" r="9" fill="${escapeXml(accent)}"/><circle cx="144" cy="214" r="9" fill="${escapeXml(accent)}" opacity="0.55"/>`;
    body += textSvg({text:headline,x:120,y:310,width:width-240,fontSize:66,lineHeight:76,fontFamily:headlineFont,fontWeight:700,fill:ink,maxLines:4});
    if (support) body += textSvg({text:support,x:120,y:720,width:width-240,fontSize:31,lineHeight:44,fontFamily:bodyFont,fontWeight:400,fill:ink,maxLines:4});
    if (cta) body += `<rect x="120" y="${height-330}" width="${width-240}" height="82" rx="22" fill="${escapeXml(accent)}"/>${textSvg({text:cta,x:width/2,y:height-307,width:width-300,fontSize:28,lineHeight:34,fontFamily:bodyFont,fontWeight:700,fill:background,maxLines:1,anchor:'middle'})}`;
  } else {
    body += `<rect x="${pad}" y="${pad}" width="${safeWidth}" height="8" rx="4" fill="${escapeXml(accent)}"/>`;
    body += textSvg({text:headline,x:pad,y:220,width:safeWidth,fontSize:78,lineHeight:88,fontFamily:headlineFont,fontWeight:700,fill:ink,maxLines:5});
    if (support) body += textSvg({text:support,x:pad,y:760,width:safeWidth,fontSize:34,lineHeight:46,fontFamily:bodyFont,fontWeight:400,fill:ink,maxLines:4});
    if (scene) body += imageSvg(scene,width-410,height-420,330,330,0.95);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs}${body}</svg>`;
}

function slideToStatic(spec:CarouselRenderSpec,slide:CarouselSlide,index:number):StaticRenderSpec {
  const overlay:TextOverlay[] = [
    { role:'headline',text:slide.headline,placement:'primary',maxLines:4 },
    ...((slide.subhead ?? slide.body) ? [{ role:'support' as const,text:(slide.subhead ?? slide.body)!,placement:'secondary',maxLines:3 }] : []),
    ...(slide.cta ? [{ role:'cta' as const,text:slide.cta,placement:'lower',maxLines:1 }] : [])
  ];
  const variants:StaticRenderSpec['layoutVariant'][] = ['editorial-overlay','split-card','statement-card','app-native'];
  return {
    kind:'static',mode:'scene-only',aspectRatio:'4:5',width:spec.width,height:spec.height,
    scenePrompt:slide.visualDescription,negativePrompt:slide.prohibitedRenderText,
    primaryAssetId:index===0 ? spec.primaryAssetId : undefined,assetSource:index===0 ? spec.assetSource : 'generated',
    layoutVariant:slide.visualType==='type-led' ? 'statement-card' : variants[index%variants.length],
    design:spec.design,overlays:overlay,layoutRules:spec.continuityRules,generationReady:true
  };
}

/**
 * Deterministic, dependency-free composition layer. It emits editable SVG assets
 * now; a rasterizer can later turn the exact same SVG into PNG without changing
 * strategy, copy, layout selection, or image generation.
 */
export class SvgCompositionProvider implements CompositionProvider {
  async composeStatic(spec:StaticRenderSpec,scene?:RenderedAsset):Promise<RenderedAsset> {
    const svg = staticSvg(spec,scene);
    return { url:svgDataUrl(svg),width:spec.width,height:spec.height,mimeType:'image/svg+xml' };
  }

  async composeCarousel(spec:CarouselRenderSpec,scenes:Array<RenderedAsset|undefined>=[]):Promise<RenderedAsset[]> {
    return Promise.all(spec.slides.map((slide,index)=>this.composeStatic(slideToStatic(spec,slide,index),scenes[index])));
  }
}
