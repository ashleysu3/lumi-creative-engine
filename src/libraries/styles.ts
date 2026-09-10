export type CreativeStyle = {
  id: string;
  name: string;
  description: string;
  traits: string[];
  avoid: string[];
};

export const CREATIVE_STYLES: CreativeStyle[] = [
  { id:'luxury-editorial', name:'Luxury Editorial', description:'Refined magazine sensibility interpreted through the brand system.', traits:['strong type hierarchy','whitespace','premium photography','restrained graphic devices'], avoid:['generic beige luxury','off-brand serif substitution'] },
  { id:'handwritten-lofi', name:'Handwritten Lo-Fi', description:'Casual marked-up visual language with human imperfection.', traits:['annotations','marker strokes','native photos','diary energy'], avoid:['illegible handwriting','over-decoration'] },
  { id:'clean-swiss', name:'Clean Swiss', description:'Grid-led clarity and typographic discipline.', traits:['alignment','high contrast','minimal ornament','structured spacing'], avoid:['sterile corporate feel'] },
  { id:'direct-response', name:'Direct Response', description:'Fast comprehension and benefit-first hierarchy without cheap-looking tactics.', traits:['bold hook','clear CTA','proof emphasis','simple visual path'], avoid:['fake urgency','clutter','spammy badges'] },
  { id:'feminine-magazine', name:'Feminine Magazine', description:'Editorial, expressive and polished without becoming overly girly.', traits:['layered type','photo-led layouts','subtle texture','elegant composition'], avoid:['default pink palette','script-font overload'] },
  { id:'iphone-native', name:'iPhone Native', description:'Feels captured and posted by a real person.', traits:['natural crop','casual framing','platform-native overlays','minimal polish'], avoid:['studio-perfect imagery','fake phone UI'] },
  { id:'y2k-editorial', name:'Y2K Editorial', description:'Playful early-digital references adapted to current brand.', traits:['unexpected scale','chrome-like accents when brand-safe','sticker logic','cropped type'], avoid:['nostalgia that overwhelms offer'] },
  { id:'newspaper', name:'Newspaper', description:'Dense editorial contrast, serif-forward hierarchy and column-inspired structure.', traits:['headline drama','rules/lines','caption details','ink-like texture'], avoid:['tiny unreadable body copy'] },
  { id:'scrapbook', name:'Scrapbook', description:'Layered tactile collage with intentional imperfection.', traits:['cut-paper edges','tape','photos','notes'], avoid:['visual chaos','too many motifs'] },
  { id:'bold-modern-saas', name:'Bold Modern SaaS', description:'Product-forward modern software design without generic AI tropes.', traits:['real UI','strong typography','clean contrast','focused feature story'], avoid:['floating laptop mockups','AI brains','robots','meaningless gradients'] }
];

export const getStyle = (id:string) => CREATIVE_STYLES.find(s => s.id === id);
