(() => {
const editorElement=document.getElementById("code-editor");
const languageSelect=document.getElementById("language-select");
const runButton=document.getElementById("run-code");
const resetButton=document.getElementById("reset-code");
const output=document.getElementById("output-content");
const status=document.getElementById("run-status");
const meta=document.getElementById("execution-meta");
const starter={cpp:'#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}',java:'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}',python:'# Write your code here\n',javascript:'// Write your code here\n'};
const monacoLanguage={cpp:"cpp",java:"java",python:"python",javascript:"javascript"};
let editor=null;
const params=new URLSearchParams(location.search);
const question=params.get("question");
const topic=params.get("topic");
if(question)document.getElementById("question-context").textContent=(topic?topic+" • ":"")+question;
const fallback=document.createElement("textarea");
fallback.className="fallback-editor";
fallback.style.cssText="width:100%;height:480px;padding:16px;border:0;resize:vertical;font:14px/1.5 Consolas,monospace";
const getCode=()=>editor?editor.getValue():fallback.value;
const setCode=value=>{if(editor)editor.setValue(value);else fallback.value=value;};
const updateLanguage=lang=>{if(editor)monaco.editor.setModelLanguage(editor.getModel(),monacoLanguage[lang]);};
const loadFallback=()=>{editorElement.appendChild(fallback);fallback.value=starter[languageSelect.value];};
if(window.require){require.config({paths:{vs:"https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs"}});require(["vs/editor/editor.main"],()=>{editor=monaco.editor.create(editorElement,{value:starter.cpp,language:"cpp",theme:"vs",automaticLayout:true,minimap:{enabled:false},fontSize:14,scrollBeyondLastLine:false,wordWrap:"on"});});}else loadFallback();
languageSelect.addEventListener("change",()=>{setCode(starter[languageSelect.value]);updateLanguage(languageSelect.value);});
resetButton.addEventListener("click",()=>setCode(starter[languageSelect.value]));
runButton.addEventListener("click",async()=>{
const sourceCode=getCode();
if(!sourceCode.trim()){output.textContent="Write some code before running it.";return;}
runButton.disabled=true;status.textContent="Running…";output.textContent="Submitting your code to the compiler…";meta.textContent="";
try{
const response=await fetch("/api/compiler/run",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({language:languageSelect.value,sourceCode,stdin:document.getElementById("custom-input").value})});
const result=await response.json();
if(!response.ok)throw new Error(result.error||"Unable to run code.");
status.textContent=result.status||"Finished";
const sections=[];
if(result.stdout)sections.push(result.stdout);
if(result.compileOutput)sections.push("Compilation output:\n"+result.compileOutput);
if(result.stderr)sections.push("Error:\n"+result.stderr);
output.textContent=sections.join("\n\n")||"Program finished with no output.";
meta.textContent=[result.time?("Time: "+result.time+"s"):null,result.memory?("Memory: "+result.memory+" KB"):null].filter(Boolean).join(" • ");
}catch(error){status.textContent="Failed";output.textContent=error.message;}finally{runButton.disabled=false;}
});
})();