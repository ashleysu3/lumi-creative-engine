import { expect, it } from 'vitest';
import { generateCreativeSet } from '../src/index.js';
import type { ModelProvider, ModelRequest } from '../src/providers/modelProvider.js';

class BatchStubProvider implements ModelProvider {
  calls: ModelRequest<unknown>[] = [];

  async generate<TInput,TOutput>(request:ModelRequest<TInput>):Promise<TOutput> {
    this.calls.push(request as ModelRequest<unknown>);
    if (request.responseSchemaName === 'RefinedCreativeRouteBatch') {
      const input = request.input as { routeSeeds:Array<any> };
      return {
        routes:input.routeSeeds.map((route:any,index:number)=>({
          routeId:route.id,
          conceptName:`Refined ${index+1}`,
          singleBigIdea:route.singleBigIdea,
          primaryHook:`Specific hook ${index+1}: ${route.singleBigIdea}`,
          visualSummary:`Distinct visual execution ${index+1} for ${route.format}.`,
          whyItFits:'Specific to this audience, offer, and selected route.',
          scores:{ strategicClarity:88, visualStopPower:82, relevance:91, specificity:86, glanceComprehension:84 }
        }))
      } as TOutput;
    }
    if (request.responseSchemaName === 'RefinedCreativeBriefBatch') {
      const input = request.input as { concepts:Array<{route:any;briefSeed:any}> };
      return {
        briefs:input.concepts.map((concept,index)=>({
          routeId:concept.route.id,
          headline:`Finished headline ${index+1}`,
          supportingCopy:`Useful support ${index+1}`,
          cta:'Learn more',
          visualConcept:`Concrete visual ${index+1} using the selected format and supplied brand system.`,
          composition:'Mobile-first composition with a clear focal point and protected text-safe area.',
          focalPoint:'Primary subject',
          mustInclude:[],
          mustAvoid:[]
        }))
      } as TOutput;
    }
    throw new Error(`Unexpected schema ${request.responseSchemaName}`);
  }
}

it('uses two coordinated model calls for a whole creative set by default', async () => {
  const provider = new BatchStubProvider();
  const output = await generateCreativeSet({
    requestId:'batch-test',
    offer:{ name:'Lumi', summary:'Turns an offer into strategic Meta ad concepts.', offerType:'SaaS', proof:[], claimsAllowed:[], claimsProhibited:[] },
    audience:{ description:'Business owners running Meta ads.', desires:['better ad ideas'], pains:['generic creative'], objections:['AI looks generic'], customerLanguage:['I never know what ad to make next.'] },
    brand:{
      colors:{ primary:['#111111'], secondary:[], accent:['#ee77aa'], background:['#ffffff'], prohibited:[] },
      typography:{ headlineFamily:'Fraunces', bodyFamily:'Poppins', allowedWeights:[400,600], notes:[] },
      photography:{ founderLed:false, styleNotes:[], avoid:[] },
      logoAssetIds:[], motifs:[], avoid:[]
    },
    mediaAssets:[],
    angles:[{ id:'angle-1', name:'Stop guessing', coreThesis:'Your offer should determine what ad creative you make.' }],
    requestedCreativeCount:6,
    preferredFormats:[], excludedFormats:[]
  }, { modelProvider:provider });

  expect(output.concepts).toHaveLength(6);
  expect(provider.calls).toHaveLength(2);
  expect(provider.calls.map(c=>c.responseSchemaName)).toEqual(['RefinedCreativeRouteBatch','RefinedCreativeBriefBatch']);
  expect(output.concepts[0].route.conceptName).toBe('Refined 1');
  expect(output.concepts[5].brief.headline).toBe('Finished headline 6');
});
