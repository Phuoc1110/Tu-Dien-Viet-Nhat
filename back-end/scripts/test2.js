import { checkTextGrammar } from '../src/service/textlintService.js';
checkTextGrammar('私は毎日りんごをを食べます。').then(result => console.log("Result:", JSON.stringify(result, null, 2))).catch(console.error);
