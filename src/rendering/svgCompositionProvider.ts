import type { CarouselRenderSpec, CarouselSlide, StaticRenderSpec, TextOverlay } from './compileCreativeOutput.js';
import type { CompositionProvider, RenderedAsset } from './renderProvider.js';

function escapeXml(value:string):string {
  return value.replace(/[&<>"']/g,char=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&apos;' }[char] ?? char));
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
  const hardMin = Math.max(18,Math.min(minFont,30));
  while (fontSize >= hardMin) {
    const approxChars = Math.max(7,Math.floor(width/(fontSize*0.54)));
    lines = wrapAll(text,approxChars);
    if (lines.length <= maxLines) break;
    fontSize -= 2;
  }
  if (!lines.length) lines = wrapAll(text,Math.max(7,Math.floor(width/(Math.max(fontSize,hardMin)*0.54))));
  fontSize = Math.max(fontSize,hardMin);
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
  const defs = `<defs><filter id="shadow"><feDropShadow dx="0" dy="12" stdDeviation="18" flood-opacity="0.16"/></filter><linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.03"/><stop offset="0.52" stop-color="#000" stop-opacity="0.12"/><stop offset="1" stop-color="#000" stop-opacity="0.82"/></linearGradient></defs>`;
  let body = `<rect width="${width}" height="${height}" fill="${escapeXml(background)}"/>`;
  let variant = spec.layoutVariant;
  if (!scene && ['split-card','editorial-overlay','native-caption'].includes(variant)) variant = 'statement-emphasis';

  if (variant === 'comparison-split' && spec.comparison) {
    body += `<rect width="${width}" height="${height}" fill="${escapeXml(background)}"/>`;
    body += `<rect x="${pad}" y="72" width="92" height="8" rx="4" fill="${escapeXml(accent)}"/>`;
    const h = textSvg({text:headline,x:pad,y:116,width:safeWidth,startFont:62,minFont:40,maxLines:3,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:ink,transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    const cardsY = Math.max(390,160+h.height);
    const gap = 26;
    const cardW = (safeWidth-gap)/2;
    const cardH = Math.max(430,Math.min(610,height-cardsY-(cta?190:90)));
    const leftX = pad;
    const rightX = pad+cardW+gap;
    body += `<rect x="${leftX}" y="${cardsY}" width="${cardW}" height="${cardH}" rx="30" fill="${escapeXml(secondary)}"/>`;
    body += `<rect x="${rightX}" y="${cardsY}" width="${cardW}" height="${cardH}" rx="30" fill="${escapeXml(ink)}"/>`;
    const leftLabel = textSvg({text:spec.comparison.leftLabel,x:leftX+34,y:cardsY+38,width:cardW-68,startFont:20,minFont:18,maxLines:1,fontFamily:eyebrowStyle.family,fontWeight:700,fill:ink,transform:'uppercase',tracking:1.5});
    const rightLabel = textSvg({text:spec.comparison.rightLabel,x:rightX+34,y:cardsY+38,width:cardW-68,startFont:20,minFont:18,maxLines:1,fontFamily:eyebrowStyle.family,fontWeight:700,fill:background,transform:'uppercase',tracking:1.5});
    body += leftLabel.svg+rightLabel.svg;
    const leftText = textSvg({text:spec.comparison.leftText,x:leftX+34,y:cardsY+108,width:cardW-68,startFont:40,minFont:28,maxLines:7,fontFamily:headlineStyle.family,fontWeight:650,fill:ink});
    const rightText = textSvg({text:spec.comparison.rightText,x:rightX+34,y:cardsY+108,width:cardW-68,startFont:40,minFont:28,maxLines:7,fontFamily:headlineStyle.family,fontWeight:650,fill:background});
    body += leftText.svg+rightText.svg;
    const arrowY = cardsY+Math.min(cardH-80,Math.max(235,Math.max(leftText.height,rightText.height)+145));
    body += `<path d="M ${width/2-24} ${arrowY} L ${width/2+24} ${arrowY}" stroke="${escapeXml(accent)}" stroke-width="8" stroke-linecap="round"/><path d="M ${width/2+8} ${arrowY-14} L ${width/2+25} ${arrowY} L ${width/2+8} ${arrowY+14}" fill="none" stroke="${escapeXml(accent)}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (cta) body += buttonSvg(spec,cta,pad,height-128,330,accent,background);
  } else if (variant === 'split-card') {
    const imageH = 575;
    body += imageSvg(scene,0,0,width,imageH,spec.cropAnchor);
    const panelY = 540;
    body += `<rect x="0" y="${panelY}" width="${width}" height="${height-panelY}" rx="38" fill="${escapeXml(background)}"/>`;
    body += `<rect x="${pad}" y="${panelY+48}" width="70" height="8" rx="4" fill="${escapeXml(accent)}"/>`;
    const h = textSvg({text:headline,x:pad,y:panelY+82,width:safeWidth,startFont:64,minFont:38,maxLines:5,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:ink,transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    const ctaY = height-128;
    const supportY = panelY+102+h.height;
    if (support && supportY < (cta ? ctaY-100 : height-95)) {
      const s = textSvg({text:support,x:pad,y:supportY,width:safeWidth,startFont:27,minFont:21,maxLines:3,fontFamily:bodyStyle.family,fontWeight:bodyStyle.weight,fill:ink,transform:bodyStyle.transform,tracking:bodyStyle.tracking,lineRatio:1.25});
      body += s.svg;
    }
    if (cta) body += buttonSvg(spec,cta,pad,ctaY,360,accent,background);
  } else if (variant === 'editorial-overlay') {
    body += imageSvg(scene,0,0,width,height,spec.cropAnchor);
    body += `<rect width="${width}" height="${height}" fill="url(#scrim)"/>`;
    const headlineY = height-620;
    body += `<rect x="${pad}" y="${headlineY-38}" width="74" height="8" rx="4" fill="${escapeXml(accent)}"/>`;
    const h = textSvg({text:headline,x:pad,y:headlineY,width:safeWidth,startFont:64,minFont:36,maxLines:5,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:'#ffffff',transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    const ctaY = height-120;
    const supportY = height-220;
    if (support && headlineY+h.height < supportY-22) {
      const s = textSvg({text:support,x:pad,y:supportY,width:760,startFont:24,minFont:20,maxLines:2,fontFamily:bodyStyle.family,fontWeight:500,fill:'#ffffff',transform:bodyStyle.transform,tracking:bodyStyle.tracking,lineRatio:1.22});
      body += s.svg;
    }
    if (cta) body += buttonSvg(spec,cta,pad,ctaY,330,accent,'#ffffff');
  } else if (variant === 'native-caption') {
    body += imageSvg(scene,0,0,width,height,spec.cropAnchor);
    const panelH = 520;
    const panelY = height-panelH-38;
    body += `<rect x="42" y="${panelY}" width="${width-84}" height="${panelH}" rx="30" fill="${escapeXml(background)}" opacity="0.97"/>`;
    const h = textSvg({text:headline,x:82,y:panelY+48,width:width-164,startFont:54,minFont:34,maxLines:4,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:ink,transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    const ctaY = height-128;
    const supportY = panelY+70+h.height;
    if (support && supportY < (cta ? ctaY-92 : height-85)) {
      const s = textSvg({text:support,x:82,y:supportY,width:width-164,startFont:25,minFont:20,maxLines:2,fontFamily:bodyStyle.family,fontWeight:bodyStyle.weight,fill:ink,lineRatio:1.22});
      body += s.svg;
    }
    if (cta) body += buttonSvg(spec,cta,82,ctaY,330,accent,background);
  } else if (variant === 'screenshot-frame') {
    body += `<rect x="42" y="42" width="${width-84}" height="${height-84}" rx="40" fill="${escapeXml(secondary)}"/>`;
    const h = textSvg({text:headline,x:pad,y:86,width:safeWidth,startFont:58,minFont:38,maxLines:4,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:ink,transform:headlineStyle.transform,tracking:headlineStyle.tracking});
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
      const s = textSvg({text:support,x:pad,y:frameY+frameH+32,width:safeWidth,startFont:25,minFont:20,maxLines:2,fontFamily:bodyStyle.family,fontWeight:bodyStyle.weight,fill:ink,lineRatio:1.22});
      body += s.svg;
    }
  } else if (variant === 'app-native') {
    body += `<rect width="${width}" height="${height}" fill="${escapeXml(secondary)}"/>`;
    body += `<rect x="70" y="120" width="${width-140}" height="${height-240}" rx="44" fill="${escapeXml(background)}" filter="url(#shadow)"/>`;
    body += `<circle cx="116" cy="174" r="9" fill="${escapeXml(accent)}"/><circle cx="144" cy="174" r="9" fill="${escapeXml(accent)}" opacity="0.55"/>`;
    const h = textSvg({text:headline,x:120,y:252,width:width-240,startFont:62,minFont:38,maxLines:5,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:ink,transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    if (support) {
      const s = textSvg({text:support,x:120,y:292+h.height,width:width-240,startFont:28,minFont:22,maxLines:4,fontFamily:bodyStyle.family,fontWeight:bodyStyle.weight,fill:ink,lineRatio:1.25});
      body += s.svg;
    }
    if (cta) body += buttonSvg(spec,cta,120,height-238,width-240,accent,background);
  } else if (variant === 'statement-emphasis') {
    body += `<rect width="${width}" height="${height}" fill="${escapeXml(secondary)}"/>`;
    body += `<rect x="44" y="44" width="${width-88}" height="${height-88}" rx="40" fill="${escapeXml(background)}"/>`;
    body += `<circle cx="${width-165}" cy="170" r="105" fill="${escapeXml(accent)}" opacity="0.10"/>`;
    body += `<rect x="84" y="90" width="88" height="8" rx="4" fill="${escapeXml(accent)}"/>`;
    const h = textSvg({text:headline,x:84,y:150,width:width-168,startFont:72,minFont:40,maxLines:4,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:ink,transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    if (support) {
      const cardY = Math.max(610,220+h.height);
      const cardH = Math.min(430,height-cardY-100);
      body += `<rect x="84" y="${cardY}" width="${width-168}" height="${cardH}" rx="34" fill="${escapeXml(ink)}"/>`;
      body += `<rect x="118" y="${cardY+42}" width="52" height="7" rx="4" fill="${escapeXml(accent)}"/>`;
      const s = textSvg({text:support,x:118,y:cardY+88,width:width-236,startFont:36,minFont:24,maxLines:5,fontFamily:bodyStyle.family,fontWeight:600,fill:background,lineRatio:1.24});
      body += s.svg;
    }
    if (cta) body += buttonSvg(spec,cta,84,height-132,340,accent,background);
  } else if (variant === 'cta-card') {
    body += `<rect width="${width}" height="${height}" fill="${escapeXml(ink)}"/>`;
    body += `<circle cx="${width-120}" cy="150" r="220" fill="${escapeXml(accent)}" opacity="0.18"/>`;
    body += `<circle cx="110" cy="${height-80}" r="180" fill="${escapeXml(secondary)}" opacity="0.08"/>`;
    body += `<rect x="${pad}" y="140" width="96" height="8" rx="4" fill="${escapeXml(accent)}"/>`;
    const h = textSvg({text:headline,x:pad,y:220,width:safeWidth,startFont:82,minFont:44,maxLines:4,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:background,transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    if (support) {
      const s = textSvg({text:support,x:pad,y:260+h.height,width:760,startFont:30,minFont:22,maxLines:3,fontFamily:bodyStyle.family,fontWeight:bodyStyle.weight,fill:background,lineRatio:1.25});
      body += s.svg;
    }
    if (cta) body += buttonSvg(spec,cta,pad,880,390,accent,'#ffffff');
    body += `<path d="M ${pad} 1080 C 300 1010, 520 1140, 820 1030" fill="none" stroke="${escapeXml(accent)}" stroke-width="7" stroke-linecap="round" opacity="0.75"/>`;
  } else {
    body += `<rect width="${width}" height="${height}" fill="${escapeXml(background)}"/>`;
    body += `<rect x="${pad}" y="${pad}" width="96" height="8" rx="4" fill="${escapeXml(accent)}"/>`;
    body += `<circle cx="${width-160}" cy="180" r="110" fill="${escapeXml(secondary)}"/>`;
    const h = textSvg({text:headline,x:pad,y:170,width:safeWidth,startFont:76,minFont:40,maxLines:5,fontFamily:headlineStyle.family,fontWeight:headlineStyle.weight,fill:ink,transform:headlineStyle.transform,tracking:headlineStyle.tracking});
    body += h.svg;
    if (support) {
      const sY = Math.max(610,220+h.height);
      const s = textSvg({text:support,x:pad,y:sY,width:800,startFont:30,minFont:22,maxLines:4,fontFamily:bodyStyle.family,fontWeight:bodyStyle.weight,fill:ink,lineRatio:1.28});
      body += s.svg;
      body += `<rect x="${pad}" y="${Math.min(height-260,sY+s.height+40)}" width="${safeWidth}" height="2" fill="${escapeXml(secondary)}"/>`;
    }
    if (scene) body += imageSvg(scene,width-400,height-400,320,320,spec.cropAnchor,0.94);
    if (cta) body += buttonSvg(spec,cta,pad,height-132,350,accent,background);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs}${body}</svg>`;
}

function slideToStatic(spec:CarouselRenderSpec,slide:CarouselSlide,index:number):StaticRenderSpec {
  const overlay:TextOverlay[] = [
    { role:'headline',text:slide.headline,placement:'primary',maxLines:6 },
    ...((slide.subhead ?? slide.body) ? [{ role:'support' as const,text:(slide.subhead ?? slide.body)!,placement:'secondary',maxLines:4 }] : []),
    ...(slide.cta ? [{ role:'cta' as const,text:slide.cta,placement:'lower',maxLines:1 }] : [])
  ];
  const isComparison = Boolean(slide.comparison) || slide.layoutType === 'split-comparison';
  const comparison = slide.comparison ?? (isComparison ? {
    leftLabel:'CURRENT',leftText:slide.body ?? slide.subhead ?? slide.headline,
    rightLabel:'SHIFT',rightText:slide.headline
  } : undefined);
  const variant:StaticRenderSpec['layoutVariant'] = slide.layoutType === 'cta-card' || slide.layoutType === 'minimal-close'
    ? 'cta-card'
    : isComparison
      ? 'comparison-split'
      : slide.layoutType === 'statement-emphasis'
        ? 'statement-emphasis'
        : slide.visualType === 'type-led'
          ? 'statement-card'
          : index === 0 && slide.visualType === 'hybrid'
            ? 'editorial-overlay'
            : 'statement-emphasis';
  return {
    kind:'static',mode:'scene-only',aspectRatio:'4:5',width:spec.width,height:spec.height,
    scenePrompt:slide.visualDescription,negativePrompt:slide.prohibitedRenderText,
    primaryAssetId:index===0 ? spec.primaryAssetId : undefined,assetSource:index===0 ? spec.assetSource : 'generated',
    cropAnchor:spec.cropAnchor,layoutVariant:variant,comparison,annotations:[],
    design:spec.design,overlays:overlay,layoutRules:spec.continuityRules,generationReady:true
  };
}

/** Deterministic composition layer. Every output is one fixed 4:5 asset; carousel slides are composed independently. */
export class SvgCompositionProvider implements CompositionProvider {
  async composeStatic(spec:StaticRenderSpec,scene?:RenderedAsset):Promise<RenderedAsset> {
    const svg = staticSvg(spec,scene);
    return { url:svgDataUrl(svg),width:spec.width,height:spec.height,mimeType:'image/svg+xml' };
  }

  async composeCarousel(spec:CarouselRenderSpec,scenes:Array<RenderedAsset|undefined>=[]):Promise<RenderedAsset[]> {
    return Promise.all(spec.slides.map((slide,index)=>this.composeStatic(slideToStatic(spec,slide,index),scenes[index])));
  }
}
