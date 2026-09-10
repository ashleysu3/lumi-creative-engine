import type { CarouselRenderSpec, CarouselSlide, StaticRenderSpec, TextOverlay } from './compileCreativeOutput.js';
import type { CompositionProvider, RenderedAsset } from './renderProvider.js';

function escapeXml(value:string):string {
  return value.replace(/[&<>"']/g,char=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;' }[char] ?? char));
}

function wrapAll(text:string,maxChars:number):string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines:string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || candidate.length <= maxChars) current = candidate;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
}

function fitBlock(text:string,width:number,startFont:number,minFont:number,maxLines:number,lineRatio=1.14) {
  let fontSize = startFont;
  let lines:string[] = [];
  while (fontSize >= minFont) {
    const approxChars = Math.max(7,Math.floor(width/(fontSize*0.54)));
    lines = wrapAll(text,approxChars);
    if (lines.length <= maxLines) break;
    fontSize -= 2;
  }
  if (lines.length > maxLines && fontSize < minFont) {
    fontSize = Math.max(32,minFont-8);
    const approxChars = Math.max(7,Math.floor(width/(fontSize*0.54)));
    lines = wrapAll(text,approxChars);
  }
  const lineHeight = Math.round(fontSize*lineRatio);
  return { lines,fontSize,lineHeight,height:Math.max(lineHeight,lines.length*lineHeight) };
}

function transformText(value:string,transform?:string) {
  if (transform === 'uppercase') return value.toUpperCase();
  if (transform === 'lowercase') return value.toLowerCase();
  if (transform === 'capitalize') return value.replace(/\b\w/g,c=>c.toUpperCase());
  return value;
}

function roleStyle(spec:StaticRenderSpec|CarouselRenderSpec,role:'headline'|'body'|'cta'|'eyebrow') {
  const roles = spec.design.typographyRoles ?? {};
  const token = roles[role] ?? (role === 'body' ? roles['support'] : undefined);
  return {
    family:token?.family ?? (role === 'headline' ? spec.design.headlineFont : spec.design.bodyFont) ?? (role === 'headline' ? 'Georgia, serif' : 'Arial, sans-serif'),
    weight:token?.weight ?? (role === 'headline' || role === 'cta' ? 700 : 400),
    transform:token?.textTransform,
    tracking:token?.tracking ?? 0
  };
}

function textSvg(args:{
  text:string;x:number;y:number;width:number;startFont:number;minFont:number;maxLines:number;fontFamily:string;fontWeight:number;fill:string;anchor?:'start'|'middle';transform?:string;tracking?:number;lineRatio?:number;
}):{svg:string;height:number;fontSize:number} {
  const value = transformText(args.text,args.transform);
  const fitted = fitBlock(value,args.width,args.startFont,args.minFont,args.maxLines,args.lineRatio);
  const anchor = args.anchor ?? 'start';
  const letterSpacing = args.tracking ? ` letter-spacing="${args.tracking}"` : '';
  const svg = `<text x="${args.x}" y="${args.y}" fill="${escapeXml(args.fill)}" font-family="${escapeXml(args.fontFamily)}" font-size="${fitted.fontSize}" font-weight="${args.fontWeight}" text-anchor="${anchor}" dominant-baseline="hanging"${letterSpacing}>${fitted.lines.map((line,index)=>`<tspan x="${args.x}" dy="${index===0?0:fitted.lineHeight}">${escapeXml(line)}</tspan>`).join('')}</text>`;
  return { svg,height:fitted.height,fontSize:fitted.fontSize };
}

function palette(spec:StaticRenderSpec|CarouselRenderSpec){
  const [background='#ffffff',ink='#111111',accent='#d977a8',secondary='#f2eee8'] = spec.design.colors;
  return { background,ink,accent,secondary };
}

function preserveAspect(anchor:StaticRenderSpec['cropAnchor'],fit:'cover'|'contain'='cover') {
  if (fit === 'contain') return 'xMidYMid meet';
  if (anchor === 'top') return 'xMidYMin slice';
  if (anchor === 'bottom') return 'xMidYMax slice';
  return 'xMidYMid slice';
}

function imageSvg(asset:RenderedAsset|undefined,x:number,y:number,width:number,height:number,anchor:StaticRenderSpec['cropAnchor']='center',opacity=1,fit:'cover'|'contain'='cover'):string {
  if (!asset?.url) return '';
  return `<image href="${escapeXml(asset.url)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="${preserveAspect(anchor,fit)}" opacity="${opacity}"/>`;
}

function findOverlay(spec:StaticRenderSpec,role:TextOverlay['role']){
  return spec.overlays.find(item=>item.role===role)?.text;
}

function svgDataUrl(svg:string):string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buttonSvg(spec:StaticRenderSpec,text:string,x:number,y:number,maxWidth:number,fill:string,textFill:string) {
  const body = roleStyle(spec,'cta');
  const width = Math.min(maxWidth,Math.max(190,text.length*17+76));
  const radius = spec.design.components?.cornerRadius ? 18 : 34;
  const label = textSvg({text,x:x+width/2,y:y+21,width:width-50,startFont:25,minFont:21,maxLines:1,fontFamily:body.family,fontWeight:body.weight,fill:textFill,anchor:'middle',transform:body.transform,tracking:body.tracking});
  return `<rect x="${x}" y="${y}" width="${width}" height="70" rx="${radius}" fill="${escapeXml(fill)}"/>${label.svg}`;
}

function staticSvg(spec:StaticRenderSpec,scene?:RenderedAsset):string {
  const { width,height } = spec;
  const { background,ink,accent,secondary } = palette(spec);
  const headline = findOverlay(spec,'headline') ?? '';
  const support = findOverlay(spec,'support');
  const cta = findOverlay(spec,'cta');
  const headlineStyle = roleStyle(spec,'headline');
  const bodyStyle = roleStyle(spec,'body');
  const eyebrowStyle = roleStyle(spec,'eyebrow');
  const pad = 72;
  const safeWidth = width-pad*2;
  const defs = `<defs><filter id="shadow"><feDropShadow dx="0" dy="12" stdDeviation="18" flood-opacity="0.16"/></filter><linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.02"/><stop offset="1" stop-color="#000" stop-opacity="0.72"/></linearGradient></defs>`;
  let body = `<rect width="${width}" height="${height}" fill="${escapeXml(background)}"/>`;

  if (spec.layoutVariant === 'comparison-split' && spec.comparison) {
    const h = textSvg({text:headline,x:pad,y:78,width:safeWidth,startFont:68,minFont:46,maxLines:4,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:ink,transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    const cardsY = Math.max(390,120+h.height);
    const gap = 24;
    const cardW = (safeWidth-gap)/2;
    const cardH = Math.min(650,height-cardsY-190);
    const leftX = pad;
    const rightX = pad+cardW+gap;
    body += `<rect x="${leftX}" y="${cardsY}" width="${cardW}" height="${cardH}" rx="30" fill="${escapeXml(secondary)}"/>`;
    body += `<rect x="${rightX}" y="${cardsY}" width="${cardW}" height="${cardH}" rx="30" fill="${escapeXml(ink)}"/>`;
    const leftLabel = textSvg({text:spec.comparison.leftLabel,x:leftX+34,y:cardsY+38,width:cardW-68,startFont:20,minFont:18,maxLines:1,fontFamily:eyebrowStyle.family,fontWeight:700,fill:ink,transform:'uppercase',tracking:1.5});
    const rightLabel = textSvg({text:spec.comparison.rightLabel,x:rightX+34,y:cardsY+38,width:cardW-68,startFont:20,minFont:18,maxLines:1,fontFamily:eyebrowStyle.family,fontWeight:700,fill:background,transform:'uppercase',tracking:1.5});
    body += leftLabel.svg+rightLabel.svg;
    const leftText = textSvg({text:spec.comparison.leftText,x:leftX+34,y:cardsY+105,width:cardW-68,startFont:42,minFont:30,maxLines:8,fontFamily:headlineStyle.family,fontWeight:650,fill:ink});
    const rightText = textSvg({text:spec.comparison.rightText,x:rightX+34,y:cardsY+105,width:cardW-68,startFont:42,minFont:30,maxLines:8,fontFamily:headlineStyle.family,fontWeight:650,fill:background});
    body += leftText.svg+rightText.svg;
    body += `<path d="M ${width/2-22} ${cardsY+cardH/2} L ${width/2+22} ${cardsY+cardH/2}" stroke="${escapeXml(accent)}" stroke-width="8" stroke-linecap="round"/><path d="M ${width/2+8} ${cardsY+cardH/2-14} L ${width/2+25} ${cardsY+cardH/2} L ${width/2+8} ${cardsY+cardH/2+14}" fill="none" stroke="${escapeXml(accent)}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (cta) body += buttonSvg(spec,cta,pad,height-130,330,accent,background);
  } else if (spec.layoutVariant === 'split-card') {
    const imageH = scene ? 650 : 0;
    if (scene) body += imageSvg(scene,0,0,width,imageH,spec.cropAnchor);
    const panelY = scene ? 610 : 0;
    body += `<rect x="0" y="${panelY}" width="${width}" height="${height-panelY}" rx="${scene?38:0}" fill="${escapeXml(background)}"/>`;
    body += `<rect x="${pad}" y="${panelY+48}" width="70" height="8" rx="4" fill="${escapeXml(accent)}"/>`;
    const h = textSvg({text:headline,x:pad,y:panelY+82,width:safeWidth,startFont:68,minFont:44,maxLines:5,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:ink,transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    const supportY = panelY+100+h.height;
    if (support && supportY < height-230) {
      const s = textSvg({text:support,x:pad,y:supportY,width:safeWidth,startFont:29,minFont:23,maxLines:4,fontFamily:bodyStyle.family,fontWeight:bodyStyle.weight,fill:ink,transform:bodyStyle.transform,tracking:bodyStyle.tracking,lineRatio:1.28});
      body += s.svg;
    }
    if (cta) body += buttonSvg(spec,cta,pad,height-135,360,accent,background);
  } else if (spec.layoutVariant === 'editorial-overlay') {
    body += scene ? imageSvg(scene,0,0,width,height,spec.cropAnchor) : `<rect width="${width}" height="${height}" fill="${escapeXml(secondary)}"/>`;
    body += `<rect width="${width}" height="${height}" fill="url(#scrim)"/>`;
    body += `<rect x="${pad}" y="${height-610}" width="74" height="8" rx="4" fill="${escapeXml(accent)}"/>`;
    const h = textSvg({text:headline,x:pad,y:height-565,width:safeWidth,startFont:72,minFont:46,maxLines:5,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:'#ffffff',transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    if (support) {
      const sY = Math.min(height-180,height-545+h.height+24);
      const s = textSvg({text:support,x:pad,y:sY,width:720,startFont:28,minFont:22,maxLines:3,fontFamily:bodyStyle.family,fontWeight:500,fill:'#ffffff',transform:bodyStyle.transform,tracking:bodyStyle.tracking,lineRatio:1.25});
      body += s.svg;
    }
    if (cta) body += buttonSvg(spec,cta,pad,height-125,330,accent,'#ffffff');
  } else if (spec.layoutVariant === 'native-caption') {
    body += scene ? imageSvg(scene,0,0,width,height,spec.cropAnchor) : `<rect width="${width}" height="${height}" fill="${escapeXml(secondary)}"/>`;
    const panelH = 430;
    body += `<rect x="42" y="${height-panelH-42}" width="${width-84}" height="${panelH}" rx="30" fill="${escapeXml(background)}" opacity="0.96"/>`;
    const h = textSvg({text:headline,x:82,y:height-panelH+4,width:width-164,startFont:58,minFont:40,maxLines:4,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:ink,transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    if (support) {
      const s = textSvg({text:support,x:82,y:height-panelH+30+h.height,width:width-164,startFont:27,minFont:22,maxLines:3,fontFamily:bodyStyle.family,fontWeight:bodyStyle.weight,fill:ink,lineRatio:1.25});
      body += s.svg;
    }
    if (cta) body += buttonSvg(spec,cta,82,height-135,330,accent,background);
  } else if (spec.layoutVariant === 'screenshot-frame') {
    body += `<rect x="42" y="42" width="${width-84}" height="${height-84}" rx="40" fill="${escapeXml(secondary)}"/>`;
    const h = textSvg({text:headline,x:pad,y:86,width:safeWidth,startFont:58,minFont:40,maxLines:4,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:ink,transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    const frameY = Math.max(315,120+h.height);
    const frameH = Math.min(690,height-frameY-220);
    body += `<rect x="${pad}" y="${frameY}" width="${safeWidth}" height="${frameH}" rx="28" fill="#ffffff" filter="url(#shadow)"/>`;
    if (scene) body += imageSvg(scene,pad+20,frameY+20,safeWidth-40,frameH-40,'center',1,'contain');
    const annotations = spec.annotations ?? [];
    annotations.slice(0,2).forEach((text,index)=>{
      const y = frameY+80+index*150;
      body += `<circle cx="${pad+52}" cy="${y}" r="18" fill="${escapeXml(accent)}"/><path d="M ${pad+70} ${y} L ${pad+150} ${y}" stroke="${escapeXml(accent)}" stroke-width="4" stroke-linecap="round"/>`;
      const a = textSvg({text,x:pad+165,y:y-20,width:430,startFont:22,minFont:18,maxLines:2,fontFamily:bodyStyle.family,fontWeight:650,fill:ink});
      body += a.svg;
    });
    if (support) {
      const s = textSvg({text:support,x:pad,y:frameY+frameH+32,width:safeWidth,startFont:26,minFont:21,maxLines:3,fontFamily:bodyStyle.family,fontWeight:bodyStyle.weight,fill:ink,lineRatio:1.25});
      body += s.svg;
    }
  } else if (spec.layoutVariant === 'app-native') {
    body += `<rect width="${width}" height="${height}" fill="${escapeXml(secondary)}"/>`;
    body += `<rect x="70" y="140" width="${width-140}" height="${height-280}" rx="44" fill="${escapeXml(background)}" filter="url(#shadow)"/>`;
    body += `<circle cx="116" cy="194" r="9" fill="${escapeXml(accent)}"/><circle cx="144" cy="194" r="9" fill="${escapeXml(accent)}" opacity="0.55"/>`;
    const h = textSvg({text:headline,x:120,y:278,width:width-240,startFont:64,minFont:42,maxLines:5,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:ink,transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    if (support) {
      const s = textSvg({text:support,x:120,y:320+h.height,width:width-240,startFont:30,minFont:23,maxLines:5,fontFamily:bodyStyle.family,fontWeight:bodyStyle.weight,fill:ink,lineRatio:1.28});
      body += s.svg;
    }
    if (cta) body += buttonSvg(spec,cta,120,height-265,width-240,accent,background);
  } else {
    body += `<rect x="${pad}" y="${pad}" width="${safeWidth}" height="8" rx="4" fill="${escapeXml(accent)}"/>`;
    const h = textSvg({text:headline,x:pad,y:190,width:safeWidth,startFont:78,minFont:46,maxLines:6,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:ink,transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    if (support) {
      const s = textSvg({text:support,x:pad,y:225+h.height,width:safeWidth,startFont:32,minFont:24,maxLines:5,fontFamily:bodyStyle.family,fontWeight:bodyStyle.weight,fill:ink,lineRatio:1.3});
      body += s.svg;
    }
    if (scene) body += imageSvg(scene,width-410,height-420,330,330,spec.cropAnchor,0.95);
    if (cta) body += buttonSvg(spec,cta,pad,height-135,350,accent,background);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs}${body}</svg>`;
}

function slideToStatic(spec:CarouselRenderSpec,slide:CarouselSlide,index:number):StaticRenderSpec {
  const overlay:TextOverlay[] = [
    { role:'headline',text:slide.headline,placement:'primary',maxLines:6 },
    ...((slide.subhead ?? slide.body) ? [{ role:'support' as const,text:(slide.subhead ?? slide.body)!,placement:'secondary',maxLines:4 }] : []),
    ...(slide.cta ? [{ role:'cta' as const,text:slide.cta,placement:'lower',maxLines:1 }] : [])
  ];
  const isComparison = slide.layoutType === 'split-comparison';
  const comparison = isComparison ? {
    leftLabel:'CURRENT',leftText:slide.body ?? slide.subhead ?? slide.headline,
    rightLabel:'SHIFT',rightText:slide.headline
  } : undefined;
  const variant:StaticRenderSpec['layoutVariant'] = slide.layoutType === 'minimal-close'
    ? 'statement-card'
    : isComparison
      ? 'comparison-split'
      : slide.visualType === 'type-led'
        ? 'statement-card'
        : index === 0 && slide.visualType === 'hybrid'
          ? 'editorial-overlay'
          : index % 2 === 0 ? 'split-card' : 'app-native';
  return {
    kind:'static',mode:'scene-only',aspectRatio:'4:5',width:spec.width,height:spec.height,
    scenePrompt:slide.visualDescription,negativePrompt:slide.prohibitedRenderText,
    primaryAssetId:index===0 ? spec.primaryAssetId : undefined,assetSource:index===0 ? spec.assetSource : 'generated',
    cropAnchor:spec.cropAnchor,layoutVariant:variant,comparison,annotations:[],
    design:spec.design,overlays:overlay,layoutRules:spec.continuityRules,generationReady:true
  };
}

/** Deterministic composition layer. It emits editable SVG assets; rasterization can preserve the exact composition later. */
export class SvgCompositionProvider implements CompositionProvider {
  async composeStatic(spec:StaticRenderSpec,scene?:RenderedAsset):Promise<RenderedAsset> {
    const svg = staticSvg(spec,scene);
    return { url:svgDataUrl(svg),width:spec.width,height:spec.height,mimeType:'image/svg+xml' };
  }

  async composeCarousel(spec:CarouselRenderSpec,scenes:Array<RenderedAsset|undefined>=[]):Promise<RenderedAsset[]> {
    return Promise.all(spec.slides.map((slide,index)=>this.composeStatic(slideToStatic(spec,slide,index),scenes[index])));
  }
}
