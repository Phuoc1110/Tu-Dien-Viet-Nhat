import 'dotenv/config';
import { checkTextGrammar } from './src/service/textlintService.js';

async function run() {
    console.log("Testing checkTextGrammar...");
    const text = "昨日、自分のパソコンでUbuntuをインストールしている。しかし、ネットワークのエラーが発生したからため、必要なソフトウェアをダウンロードできないでした。";
    const result = await checkTextGrammar(text);
    console.log("Result:", JSON.stringify(result, null, 2));
}

run();

run();
